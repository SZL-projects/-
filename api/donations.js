// Vercel Serverless Function - /api/donations
const { initFirebase, extractIdFromUrl } = require('./_utils/firebase');
const { authenticateToken } = require('./_utils/auth');
const googleDriveService = require('./_services/googleDriveService');
const getRawBody = require('raw-body');
const Busboy = require('busboy');
const { Readable } = require('stream');

module.exports = async (req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Parse body for POST/PUT requests (except multipart/form-data)
  if (['POST', 'PUT', 'PATCH'].includes(req.method) && !req.body && !req.headers['content-type']?.includes('multipart/form-data')) {
    try {
      const rawBody = await getRawBody(req);
      const bodyText = rawBody.toString();
      req.body = bodyText && bodyText.trim() !== '' ? JSON.parse(bodyText) : {};
    } catch (e) {
      console.error('Body parsing error:', e.message);
      req.body = {};
    }
  }

  try {
    const { db } = initFirebase();

    // Initialize Google Drive service with Firestore
    googleDriveService.setFirestore(db);
    await googleDriveService.initialize();

    const user = await authenticateToken(req, db);

    const url = req.url.split('?')[0];
    const donationId = extractIdFromUrl(req.url, 'donations');

    // ==================== UPLOAD FILE ====================
    if (url.endsWith('/upload-file') && req.method === 'POST') {
      return new Promise(async (resolve, reject) => {
        try {
          const rawBody = await getRawBody(req, {
            length: req.headers['content-length'],
            limit: '10mb'
          });

          const bufferStream = Readable.from(rawBody);
          const busboy = Busboy({ headers: req.headers });

          let fileBuffer = null;
          let fileName = '';
          let mimeType = '';
          let donationIdField = '';
          let folderId = '';
          let fileReceived = false;

          busboy.on('file', (fieldname, file, info) => {
            try {
              fileName = Buffer.from(info.filename, 'latin1').toString('utf8');
            } catch (e) {
              fileName = info.filename;
            }
            mimeType = info.mimeType;
            fileReceived = true;

            const chunks = [];
            file.on('data', (data) => chunks.push(data));
            file.on('end', () => {
              fileBuffer = Buffer.concat(chunks);
            });
          });

          busboy.on('field', (fieldname, value) => {
            if (fieldname === 'donationId') donationIdField = value;
            if (fieldname === 'folderId') folderId = value;
          });

          busboy.on('finish', async () => {
            try {
              if (!fileReceived || !fileBuffer) {
                res.status(400).json({ success: false, message: 'לא הועלה קובץ' });
                return resolve();
              }

              if (!folderId) {
                res.status(400).json({ success: false, message: 'מזהה תיקייה הוא שדה חובה' });
                return resolve();
              }

              const fileData = await googleDriveService.uploadFile(
                fileName,
                fileBuffer,
                folderId,
                mimeType
              );

              // עדכון מסמכי התרומה אם יש מזהה
              if (donationIdField) {
                const donationDoc = await db.collection('donations').doc(donationIdField).get();
                if (donationDoc.exists) {
                  const donationData = donationDoc.data();
                  const documents = donationData.documents || [];
                  documents.push({
                    fileId: fileData.id,
                    filename: fileData.name,
                    originalName: fileName,
                    mimeType: mimeType,
                    webViewLink: fileData.webViewLink,
                    uploadDate: new Date(),
                    uploadedBy: user.id
                  });
                  await db.collection('donations').doc(donationIdField).update({
                    documents,
                    updatedAt: new Date(),
                    updatedBy: user.id
                  });
                }
              }

              res.json({
                success: true,
                message: 'קובץ הועלה בהצלחה',
                file: fileData
              });
              resolve();
            } catch (error) {
              console.error('Error in busboy finish handler:', error);
              res.status(500).json({ success: false, message: error.message });
              resolve();
            }
          });

          busboy.on('error', (error) => {
            console.error('Busboy error:', error);
            res.status(500).json({ success: false, message: 'שגיאה בעיבוד הקובץ: ' + error.message });
            resolve();
          });

          bufferStream.pipe(busboy);
        } catch (error) {
          console.error('Error setting up busboy:', error);
          res.status(500).json({ success: false, message: 'שגיאה באתחול העלאת הקובץ: ' + error.message });
          resolve();
        }
      });
    }

    // ==================== STATISTICS ====================
    if (url.endsWith('/statistics') && req.method === 'GET') {
      const snapshot = await db.collection('donations').get();

      let totalAmount = 0;
      let countByPaymentMethod = {};

      snapshot.forEach(doc => {
        const data = doc.data();
        totalAmount += data.amount || 0;
        countByPaymentMethod[data.paymentMethod] = (countByPaymentMethod[data.paymentMethod] || 0) + 1;
      });

      return res.json({
        success: true,
        statistics: {
          totalCount: snapshot.size,
          totalAmount,
          countByPaymentMethod
        }
      });
    }

    // ==================== GET BY RIDER ====================
    if (url.includes('/rider/') && req.method === 'GET') {
      const match = url.match(/\/rider\/([^/]+)/);
      const riderId = match ? match[1] : null;

      if (!riderId) {
        return res.status(400).json({ success: false, message: 'מזהה רוכב חסר' });
      }

      const { limit = 50 } = req.query;
      const limitNum = Math.min(parseInt(limit), 200);

      let donations = [];
      try {
        const snapshot = await db.collection('donations')
          .where('riderId', '==', riderId)
          .orderBy('donationDate', 'desc')
          .limit(limitNum)
          .get();
        donations = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      } catch (queryError) {
        const snapshot = await db.collection('donations')
          .where('riderId', '==', riderId)
          .limit(limitNum)
          .get();
        donations = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      }

      return res.json({
        success: true,
        count: donations.length,
        donations
      });
    }

    // ==================== SINGLE DONATION BY ID ====================
    if (donationId && !url.includes('/rider/') && !url.includes('/statistics') && !url.includes('/upload-file')) {
      const donationRef = db.collection('donations').doc(donationId);
      const doc = await donationRef.get();

      if (!doc.exists) {
        return res.status(404).json({ success: false, message: 'תרומה לא נמצאה' });
      }

      if (req.method === 'GET') {
        return res.json({
          success: true,
          donation: { id: doc.id, ...doc.data() }
        });
      }

      if (req.method === 'PUT') {
        const updateData = {
          ...req.body,
          updatedBy: user.id,
          updatedAt: new Date()
        };

        delete updateData.id;
        delete updateData.donationNumber;
        delete updateData.createdAt;
        delete updateData.createdBy;

        if (updateData.donationDate) {
          updateData.donationDate = new Date(updateData.donationDate);
        }

        await donationRef.update(updateData);
        const updatedDoc = await donationRef.get();

        return res.json({
          success: true,
          message: 'תרומה עודכנה בהצלחה',
          donation: { id: updatedDoc.id, ...updatedDoc.data() }
        });
      }

      if (req.method === 'DELETE') {
        await donationRef.delete();

        return res.json({
          success: true,
          message: 'תרומה נמחקה בהצלחה'
        });
      }
    }

    // ==================== COLLECTION OPERATIONS ====================
    if (req.method === 'GET') {
      const { search, paymentMethod, riderId, limit = 100 } = req.query;
      const limitNum = Math.min(parseInt(limit), 500);

      let query = db.collection('donations');

      if (paymentMethod) {
        query = query.where('paymentMethod', '==', paymentMethod);
      }
      if (riderId) {
        query = query.where('riderId', '==', riderId);
      }

      let donations = [];
      try {
        const snapshot = await query.orderBy('donationDate', 'desc').limit(limitNum).get();
        donations = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      } catch (queryError) {
        const snapshot = await query.limit(limitNum).get();
        donations = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      }

      if (search) {
        const searchLower = search.toLowerCase();
        donations = donations.filter(d =>
          d.donationNumber?.toLowerCase().includes(searchLower) ||
          d.riderName?.toLowerCase().includes(searchLower) ||
          d.notes?.toLowerCase().includes(searchLower) ||
          String(d.amount).includes(searchLower)
        );
      }

      return res.json({
        success: true,
        count: donations.length,
        donations
      });
    }

    if (req.method === 'POST') {
      if (!req.body.riderId) {
        return res.status(400).json({ success: false, message: 'רוכב הוא שדה חובה' });
      }
      if (!req.body.amount || req.body.amount <= 0) {
        return res.status(400).json({ success: false, message: 'סכום תרומה חייב להיות גדול מאפס' });
      }

      // יצירת מספר תרומה אוטומטי
      const year = new Date().getFullYear();
      let count = 1;
      try {
        const countSnapshot = await db.collection('donations')
          .where('createdAt', '>=', new Date(year, 0, 1))
          .where('createdAt', '<', new Date(year + 1, 0, 1))
          .get();
        count = countSnapshot.size + 1;
      } catch (e) {
        const allSnapshot = await db.collection('donations').get();
        count = allSnapshot.size + 1;
      }
      const donationNumber = `D-${year}-${String(count).padStart(5, '0')}`;

      const donationData = {
        donationNumber,
        riderId: req.body.riderId,
        riderName: req.body.riderName || '',
        amount: Number(req.body.amount),
        paymentMethod: req.body.paymentMethod || 'credit_card',
        donationDate: req.body.donationDate ? new Date(req.body.donationDate) : new Date(),
        notes: req.body.notes || '',
        documents: req.body.documents || [],
        createdBy: user.id,
        createdAt: new Date(),
        updatedBy: user.id,
        updatedAt: new Date()
      };

      const donationRef = await db.collection('donations').add(donationData);
      const donationDoc = await donationRef.get();

      return res.status(201).json({
        success: true,
        message: 'תרומה נוצרה בהצלחה',
        donation: { id: donationRef.id, ...donationDoc.data() }
      });
    }

    return res.status(405).json({ success: false, message: 'Method not allowed' });

  } catch (error) {
    console.error('API error:', error.message, error.stack);

    if (error.message.includes('token')) {
      return res.status(401).json({ success: false, message: error.message });
    }
    if (error.message.includes('הרשאה') || error.message.includes('authorized')) {
      return res.status(403).json({ success: false, message: error.message });
    }

    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
