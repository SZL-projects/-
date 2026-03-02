// Vercel Serverless Function - /api/faults AND /api/donations AND /api/insurance-claims (combined to save function count)
const { initFirebase, extractIdFromUrl } = require('./_utils/firebase');
const { authenticateToken, checkPermission } = require('./_utils/auth');
const getRawBody = require('raw-body');
const { setCorsHeaders } = require('./_utils/cors');
const { writeAuditLog, buildChanges } = require('./_utils/auditLog');
const emailService = require('./_utils/emailService');

module.exports = async (req, res) => {
  // CORS Headers
  setCorsHeaders(req, res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Parse body for POST/PUT/PATCH requests (except multipart/form-data)
  if (['POST', 'PUT', 'PATCH'].includes(req.method) && !req.body && !req.headers['content-type']?.includes('multipart/form-data')) {
    try {
      const rawBody = await getRawBody(req);
      const bodyText = rawBody.toString();
      req.body = bodyText && bodyText.trim() !== '' ? JSON.parse(bodyText) : {};
    } catch (e) {
      req.body = {};
    }
  }

  try {
    const { db } = initFirebase();
    const user = await authenticateToken(req, db);

    const url = req.url.split('?')[0];

    // ==================== INSURANCE CLAIMS ROUTES ====================
    if (url.includes('/insurance-claims')) {
      return handleInsuranceClaimsRequest(req, res, db, user, url);
    }

    // ==================== DONATIONS ROUTES ====================
    if (url.includes('/donations')) {
      return handleDonationsRequest(req, res, db, user, url);
    }

    // ==================== FAULTS ROUTES ====================
    return handleFaultsRequest(req, res, db, user, url);

  } catch (error) {
    console.error('API error:', error);

    if (error.message.includes('token')) {
      return res.status(401).json({ success: false, message: error.message });
    }
    if (error.message.includes('הרשאה') || error.message.includes('authorized')) {
      return res.status(403).json({ success: false, message: error.message });
    }

    res.status(500).json({ success: false, message: error.message });
  }
};

// ==================== DONATIONS HANDLER ====================
async function handleDonationsRequest(req, res, db, user, url) {
  const donationId = extractIdFromUrl(req.url, 'donations');

  // POST /api/donations/upload-file
  if (url.endsWith('/upload-file') && req.method === 'POST') {
    const Busboy = require('busboy');
    const { Readable } = require('stream');

    return new Promise(async (resolve) => {
      try {
        const googleDriveService = require('./_services/googleDriveService');
        googleDriveService.setFirestore(db);
        await googleDriveService.initialize();

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
        });

        busboy.on('finish', async () => {
          try {
            if (!fileReceived || !fileBuffer) {
              res.status(400).json({ success: false, message: 'לא הועלה קובץ' });
              return resolve();
            }

            // תמיד להעלות לתיקיית "תרומות" קבועה ב-Drive
            const donationsFolder = await googleDriveService.findOrCreateFolder('תרומות', googleDriveService.rootFolderId);
            const targetFolderId = donationsFolder.id;

            const fileData = await googleDriveService.uploadFile(
              fileName, fileBuffer, targetFolderId, mimeType
            );

            if (donationIdField) {
              const donationDoc = await db.collection('donations').doc(donationIdField).get();
              if (donationDoc.exists) {
                const donationData = donationDoc.data();
                const documents = donationData.documents || [];
                documents.push({
                  fileId: fileData.id,
                  filename: fileData.name,
                  originalName: fileName,
                  mimeType,
                  webViewLink: fileData.webViewLink,
                  uploadDate: new Date(),
                  uploadedBy: user.id
                });
                await db.collection('donations').doc(donationIdField).update({
                  documents, updatedAt: new Date(), updatedBy: user.id
                });
              }
            }

            res.json({ success: true, message: 'קובץ הועלה בהצלחה', file: fileData });
            resolve();
          } catch (error) {
            console.error('Error in busboy finish handler:', error);
            res.status(500).json({ success: false, message: error.message });
            resolve();
          }
        });

        busboy.on('error', (error) => {
          res.status(500).json({ success: false, message: 'שגיאה בעיבוד הקובץ: ' + error.message });
          resolve();
        });

        bufferStream.pipe(busboy);
      } catch (error) {
        res.status(500).json({ success: false, message: error.message });
        resolve();
      }
    });
  }

  // GET /api/donations/statistics
  if (url.endsWith('/statistics') && req.method === 'GET') {
    const snapshot = await db.collection('donations').get();
    let totalDonations = 0;
    let totalExpenses = 0;
    let donationsCount = 0;
    let expensesCount = 0;
    let countByPaymentMethod = {};

    snapshot.forEach(doc => {
      const data = doc.data();
      const type = data.type || 'donation';
      if (type === 'expense') {
        totalExpenses += data.amount || 0;
        expensesCount++;
      } else {
        totalDonations += data.amount || 0;
        donationsCount++;
        countByPaymentMethod[data.paymentMethod] = (countByPaymentMethod[data.paymentMethod] || 0) + 1;
      }
    });

    return res.json({
      success: true,
      statistics: {
        totalCount: snapshot.size,
        donationsCount,
        expensesCount,
        totalDonations,
        totalExpenses,
        balance: totalDonations - totalExpenses,
        countByPaymentMethod
      }
    });
  }

  // GET /api/donations/rider/:riderId
  if (url.includes('/rider/') && req.method === 'GET') {
    const match = url.match(/\/rider\/([^/]+)/);
    const riderId = match ? match[1] : null;
    if (!riderId) return res.status(400).json({ success: false, message: 'מזהה רוכב חסר' });

    const { limit = 50 } = req.query;
    const limitNum = Math.min(parseInt(limit), 200);

    let donations = [];
    try {
      const snapshot = await db.collection('donations')
        .where('riderId', '==', riderId).orderBy('donationDate', 'desc').limit(limitNum).get();
      donations = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (e) {
      const snapshot = await db.collection('donations')
        .where('riderId', '==', riderId).limit(limitNum).get();
      donations = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }

    return res.json({ success: true, count: donations.length, donations });
  }

  // Single donation by ID
  if (donationId && !url.includes('/rider/') && !url.includes('/statistics') && !url.includes('/upload-file')) {
    const donationRef = db.collection('donations').doc(donationId);
    const doc = await donationRef.get();

    if (!doc.exists) {
      return res.status(404).json({ success: false, message: 'תרומה לא נמצאה' });
    }

    if (req.method === 'GET') {
      return res.json({ success: true, donation: { id: doc.id, ...doc.data() } });
    }

    if (req.method === 'PUT') {
      const updateData = { ...req.body, updatedBy: user.id, updatedAt: new Date() };
      delete updateData.id;
      delete updateData.createdAt;
      delete updateData.createdBy;
      if (updateData.donationDate) updateData.donationDate = new Date(updateData.donationDate);

      await donationRef.update(updateData);
      const updatedDoc = await donationRef.get();
      await writeAuditLog(db, user, { action: 'update', entityType: 'donation', entityId: donationId, entityName: updatedDoc.data().donationNumber || 'תרומה', description: 'תרומה עודכנה' });
      return res.json({ success: true, message: 'תרומה עודכנה בהצלחה', donation: { id: updatedDoc.id, ...updatedDoc.data() } });
    }

    if (req.method === 'DELETE') {
      const deletedData = doc.data();
      await donationRef.delete();
      await writeAuditLog(db, user, { action: 'delete', entityType: 'donation', entityId: donationId, entityName: deletedData.donationNumber || 'תרומה', description: 'תרומה נמחקה' });
      return res.json({ success: true, message: 'תרומה נמחקה בהצלחה' });
    }
  }

  // Collection operations
  if (req.method === 'GET') {
    const { search, paymentMethod, riderId, type, limit = 100 } = req.query;
    const limitNum = Math.min(parseInt(limit), 500);

    let query = db.collection('donations');
    if (type) query = query.where('type', '==', type);
    if (paymentMethod) query = query.where('paymentMethod', '==', paymentMethod);
    if (riderId) query = query.where('riderId', '==', riderId);

    let donations = [];
    try {
      const snapshot = await query.orderBy('donationDate', 'desc').limit(limitNum).get();
      donations = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (e) {
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

    return res.json({ success: true, count: donations.length, donations });
  }

  if (req.method === 'POST') {
    const entryType = req.body.type || 'donation';

    // ולידציה - רוכב חובה רק בתרומות
    if (entryType === 'donation' && !req.body.riderId) {
      return res.status(400).json({ success: false, message: 'רוכב הוא שדה חובה' });
    }
    if (!req.body.amount || req.body.amount <= 0) return res.status(400).json({ success: false, message: 'סכום חייב להיות גדול מאפס' });

    // מספר אסמכתא שהוזן, או אוטומטי
    let donationNumber = req.body.donationNumber;
    if (!donationNumber) {
      const year = new Date().getFullYear();
      const prefix = entryType === 'expense' ? 'E' : 'D';
      let count = 1;
      try {
        const countSnapshot = await db.collection('donations')
          .where('createdAt', '>=', new Date(year, 0, 1))
          .where('createdAt', '<', new Date(year + 1, 0, 1)).get();
        count = countSnapshot.size + 1;
      } catch (e) {
        const allSnapshot = await db.collection('donations').get();
        count = allSnapshot.size + 1;
      }
      donationNumber = `${prefix}-${year}-${String(count).padStart(5, '0')}`;
    }

    const donationData = {
      donationNumber,
      type: entryType,
      riderId: req.body.riderId || '',
      riderName: req.body.riderName || '',
      amount: Number(req.body.amount),
      paymentMethod: req.body.paymentMethod || (entryType === 'expense' ? 'other' : 'credit_card'),
      category: req.body.category || '',
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

    await writeAuditLog(db, user, { action: 'create', entityType: 'donation', entityId: donationRef.id, entityName: donationNumber, description: entryType === 'expense' ? 'הוצאה חדשה נוצרה' : 'תרומה חדשה נוצרה' });
    return res.status(201).json({
      success: true,
      message: 'תרומה נוצרה בהצלחה',
      donation: { id: donationRef.id, ...donationDoc.data() }
    });
  }

  return res.status(405).json({ success: false, message: 'Method not allowed' });
}

// ==================== FAULTS HANDLER ====================
async function handleFaultsRequest(req, res, db, user, url) {

  // POST /api/faults/upload-photo → העלאת תמונת תקלה ל-Google Drive
  if (url.endsWith('/upload-photo') && req.method === 'POST') {
    const Busboy = require('busboy');
    const { Readable } = require('stream');

    return new Promise(async (resolve) => {
      try {
        const googleDriveService = require('./_services/googleDriveService');
        googleDriveService.setFirestore(db);
        await googleDriveService.initialize();

        const rawBody = await getRawBody(req, {
          length: req.headers['content-length'],
          limit: '15mb'
        });

        const bufferStream = Readable.from(rawBody);
        const busboy = Busboy({ headers: req.headers });

        let fileBuffer = null;
        let fileName = 'photo.jpg';
        let mimeType = 'image/jpeg';
        let fileReceived = false;

        busboy.on('file', (fieldname, file, info) => {
          try {
            fileName = Buffer.from(info.filename, 'latin1').toString('utf8');
          } catch (e) {
            fileName = info.filename || 'photo.jpg';
          }
          mimeType = info.mimeType || 'image/jpeg';
          fileReceived = true;
          const chunks = [];
          file.on('data', (data) => chunks.push(data));
          file.on('end', () => { fileBuffer = Buffer.concat(chunks); });
        });

        busboy.on('finish', async () => {
          try {
            if (!fileReceived || !fileBuffer) {
              res.status(400).json({ success: false, message: 'לא הועלה קובץ' });
              return resolve();
            }

            // תיקייה ייעודית לתקלות (נפרדת מתרומות)
            const faultsFolder = await googleDriveService.findOrCreateFolder('תקלות', googleDriveService.rootFolderId);
            const fileData = await googleDriveService.uploadFile(fileName, fileBuffer, faultsFolder.id, mimeType);

            // URL לתצוגה ישירה (uc?export=view עובד ב-img tag לקבצים ציבוריים)
            const viewUrl = `https://drive.google.com/uc?export=view&id=${fileData.id}`;

            res.json({
              success: true,
              file: {
                fileId: fileData.id,
                url: viewUrl,
                webViewLink: fileData.webViewLink,
                name: fileData.name,
              }
            });
            resolve();
          } catch (error) {
            console.error('Error uploading fault photo to Drive:', error);
            res.status(500).json({ success: false, message: error.message });
            resolve();
          }
        });

        busboy.on('error', (error) => {
          res.status(500).json({ success: false, message: 'שגיאה בעיבוד הקובץ: ' + error.message });
          resolve();
        });

        bufferStream.pipe(busboy);
      } catch (error) {
        res.status(500).json({ success: false, message: error.message });
        resolve();
      }
    });
  }

  const faultId = extractIdFromUrl(req.url, 'faults');

  // Single fault operations
  if (faultId) {
    const faultRef = db.collection('faults').doc(faultId);
    const doc = await faultRef.get();

    if (!doc.exists) {
      return res.status(404).json({ success: false, message: 'תקלה לא נמצאה' });
    }

    if (req.method === 'GET') {
      return res.status(200).json({ success: true, fault: { id: doc.id, ...doc.data() } });
    }

    if (req.method === 'PUT') {
      await checkPermission(user, db, 'faults', 'edit');
      const existingFaultData = doc.data();
      const updateData = { ...req.body, updatedBy: user.id, updatedAt: new Date() };
      await faultRef.update(updateData);
      const updatedDoc = await faultRef.get();
      const faultDiff = buildChanges(existingFaultData, req.body);
      await writeAuditLog(db, user, { action: 'update', entityType: 'fault', entityId: faultId, entityName: updatedDoc.data().description?.substring(0, 40) || 'תקלה', changes: faultDiff, description: 'תקלה עודכנה' });
      return res.status(200).json({ success: true, message: 'תקלה עודכנה בהצלחה', fault: { id: updatedDoc.id, ...updatedDoc.data() } });
    }

    if (req.method === 'DELETE') {
      await checkPermission(user, db, 'faults', 'edit');
      const deletedFaultData = doc.data();

      // מחיקת תמונות מ-Google Drive
      const photos = deletedFaultData.photos || [];
      if (photos.length > 0) {
        try {
          const googleDriveService = require('./_services/googleDriveService');
          googleDriveService.setFirestore(db);
          await googleDriveService.initialize();
          for (const photo of photos) {
            const fileId = photo.fileId || photo.id;
            if (fileId) {
              try { await googleDriveService.deleteFile(fileId); } catch (e) { console.warn('Failed to delete photo from Drive:', fileId, e.message); }
            }
          }
        } catch (driveErr) {
          console.error('Error initializing Drive for photo deletion:', driveErr.message);
        }
      }

      await faultRef.delete();
      await writeAuditLog(db, user, { action: 'delete', entityType: 'fault', entityId: faultId, entityName: deletedFaultData.description?.substring(0, 40) || 'תקלה', description: 'תקלה נמחקה' });
      return res.status(200).json({ success: true, message: 'תקלה נמחקה בהצלחה' });
    }
  }

  // Collection operations
  if (req.method === 'GET') {
    const { search, severity, status, vehicleId, riderId, page = 1, limit = 20 } = req.query;
    const limitNum = Math.min(parseInt(limit), 100);
    const pageNum = parseInt(page);

    let query = db.collection('faults');

    if (severity) query = query.where('severity', '==', severity);
    if (status) query = query.where('status', '==', status);
    if (vehicleId) query = query.where('vehicleId', '==', vehicleId);
    if (riderId) query = query.where('reportedBy', '==', riderId);

    // סינון לפי הרשאות - self רואה רק תקלות של הכלי שלו
    const permLevel = await checkPermission(user, db, 'faults', 'view');

    if (permLevel === 'self' && user.riderId) {
      const riderSnapshot = await db.collection('riders').doc(user.riderId).get();
      if (riderSnapshot.exists) {
        const riderData = riderSnapshot.data();
        if (riderData.assignedVehicleId) {
          query = query.where('vehicleId', '==', riderData.assignedVehicleId);
        } else {
          return res.status(200).json({ success: true, count: 0, totalPages: 0, currentPage: 1, faults: [] });
        }
      }
    }

    // אם אין חיפוש - pagination
    if (!search) {
      let faults = [];
      try {
        let paginatedQuery = query.orderBy('createdAt', 'desc');
        if (pageNum > 1) {
          paginatedQuery = paginatedQuery.offset((pageNum - 1) * limitNum);
        }
        paginatedQuery = paginatedQuery.limit(limitNum);
        const snapshot = await paginatedQuery.get();
        faults = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      } catch (queryError) {
        console.warn('Faults query with orderBy failed, trying without:', queryError.message);
        const snapshot = await query.limit(limitNum).get();
        faults = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        faults.sort((a, b) => {
          const dateA = a.createdAt?.seconds || a.createdAt?._seconds || 0;
          const dateB = b.createdAt?.seconds || b.createdAt?._seconds || 0;
          return dateB - dateA;
        });
      }

      const countSnapshot = await db.collection('faults').count().get();
      const totalCount = countSnapshot.data().count;

      return res.status(200).json({
        success: true,
        count: totalCount,
        totalPages: Math.ceil(totalCount / limitNum),
        currentPage: pageNum,
        faults
      });
    }

    // חיפוש
    const snapshot = await query.get();
    let faults = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    const searchLower = search.toLowerCase();
    faults = faults.filter(fault =>
      fault.description?.toLowerCase().includes(searchLower) ||
      fault.faultType?.toLowerCase().includes(searchLower)
    );

    const startIndex = (pageNum - 1) * limitNum;
    const paginatedFaults = faults.slice(startIndex, startIndex + limitNum);

    return res.status(200).json({
      success: true,
      count: faults.length,
      totalPages: Math.ceil(faults.length / limitNum),
      currentPage: pageNum,
      faults: paginatedFaults
    });
  }

  if (req.method === 'POST') {
    const faultData = {
      ...req.body,
      reportedBy: user.id,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const faultRef = await db.collection('faults').add(faultData);
    const faultDoc = await faultRef.get();
    await writeAuditLog(db, user, { action: 'create', entityType: 'fault', entityId: faultRef.id, entityName: req.body.description?.substring(0, 40) || 'תקלה חדשה', description: 'תקלה חדשה דווחה' });

    // שליחת מייל התראה למנהלים
    try {
      const fault = { id: faultRef.id, ...faultDoc.data() };
      let vehicle = null;
      let rider = null;
      if (fault.vehicleId) {
        const vehicleDoc = await db.collection('vehicles').doc(fault.vehicleId).get();
        if (vehicleDoc.exists) vehicle = { id: vehicleDoc.id, ...vehicleDoc.data() };
      }
      if (fault.riderId) {
        const riderDoc = await db.collection('riders').doc(fault.riderId).get();
        if (riderDoc.exists) rider = { id: riderDoc.id, ...riderDoc.data() };
      }
      await emailService.sendNewFaultNotification(fault, vehicle, rider);
    } catch (emailErr) {
      console.error('Error sending fault notification email:', emailErr.message);
    }

    return res.status(201).json({
      success: true,
      message: 'תקלה דווחה בהצלחה',
      fault: { id: faultRef.id, ...faultDoc.data() }
    });
  }

  return res.status(405).json({ success: false, message: 'Method not allowed' });
}

// ==================== INSURANCE CLAIMS HANDLER ====================
async function handleInsuranceClaimsRequest(req, res, db, user, url) {
  const claimId = extractIdFromUrl(req.url, 'insurance-claims');

  // GET /api/insurance-claims/statistics
  if (url.endsWith('/statistics') && req.method === 'GET') {
    const { vehicleId } = req.query;
    let query = db.collection('insurance_claims');
    if (vehicleId) query = query.where('vehicleId', '==', vehicleId);

    const snapshot = await query.get();
    let totalClaimAmount = 0;
    let totalApprovedAmount = 0;
    let totalPaidAmount = 0;
    let countByStatus = {};
    let countByEventType = {};

    snapshot.forEach(doc => {
      const data = doc.data();
      totalClaimAmount += data.claimAmount || 0;
      totalApprovedAmount += data.approvedAmount || 0;
      totalPaidAmount += data.paidAmount || 0;
      countByStatus[data.status] = (countByStatus[data.status] || 0) + 1;
      countByEventType[data.eventType] = (countByEventType[data.eventType] || 0) + 1;
    });

    return res.json({
      success: true,
      statistics: { totalCount: snapshot.size, totalClaimAmount, totalApprovedAmount, totalPaidAmount, countByStatus, countByEventType }
    });
  }

  // GET /api/insurance-claims/vehicle/:vehicleId
  if (url.includes('/vehicle/') && req.method === 'GET') {
    const match = url.match(/\/vehicle\/([^/]+)/);
    const vehicleId = match ? match[1] : null;
    if (!vehicleId) return res.status(400).json({ success: false, message: 'מזהה כלי חסר' });

    const { limit = 50 } = req.query;
    let claims = [];
    try {
      const snapshot = await db.collection('insurance_claims')
        .where('vehicleId', '==', vehicleId).orderBy('eventDate', 'desc').limit(parseInt(limit)).get();
      claims = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (e) {
      const snapshot = await db.collection('insurance_claims')
        .where('vehicleId', '==', vehicleId).limit(parseInt(limit)).get();
      claims = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }
    return res.json({ success: true, count: claims.length, claims });
  }

  // GET /api/insurance-claims/rider/:riderId
  if (url.includes('/rider/') && req.method === 'GET') {
    const match = url.match(/\/rider\/([^/]+)/);
    const riderId = match ? match[1] : null;
    if (!riderId) return res.status(400).json({ success: false, message: 'מזהה רוכב חסר' });

    const { limit = 50 } = req.query;
    let claims = [];
    try {
      const snapshot = await db.collection('insurance_claims')
        .where('riderId', '==', riderId).orderBy('eventDate', 'desc').limit(parseInt(limit)).get();
      claims = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (e) {
      const snapshot = await db.collection('insurance_claims')
        .where('riderId', '==', riderId).limit(parseInt(limit)).get();
      claims = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }
    return res.json({ success: true, count: claims.length, claims });
  }

  // Single claim operations
  if (claimId && !url.includes('/vehicle/') && !url.includes('/rider/') && !url.includes('/statistics')) {
    const claimRef = db.collection('insurance_claims').doc(claimId);

    // PUT /api/insurance-claims/:id/submit|approve|reject|close
    const actionMatch = url.match(/\/insurance-claims\/[^/]+\/(submit|approve|reject|close)$/);
    if (actionMatch && req.method === 'PUT') {
      const action = actionMatch[1];
      await checkPermission(user, db, 'insurance_claims', 'edit');

      let updateData = { ...req.body, updatedBy: user.id, updatedAt: new Date() };

      if (action === 'submit') {
        updateData = { ...updateData, status: 'submitted', submittedAt: new Date() };
      } else if (action === 'approve') {
        if (!req.body.approvedAmount && req.body.approvedAmount !== 0) {
          return res.status(400).json({ success: false, message: 'סכום מאושר הוא שדה חובה לאישור תביעה' });
        }
        updateData = { ...updateData, status: 'approved', approvedAt: new Date() };
      } else if (action === 'reject') {
        if (!req.body.rejectionReason) {
          return res.status(400).json({ success: false, message: 'סיבת דחייה היא שדה חובה' });
        }
        updateData = { ...updateData, status: 'rejected', rejectedAt: new Date() };
      } else if (action === 'close') {
        updateData = { ...updateData, status: 'closed', closedAt: new Date(), closedBy: user.id };
      }

      await claimRef.update(updateData);
      const updatedDoc = await claimRef.get();
      await writeAuditLog(db, user, { action: 'status_change', entityType: 'insurance_claim', entityId: claimId, entityName: updatedDoc.data().claimNumber, description: `תביעת ביטוח - פעולה: ${action}` });
      return res.json({ success: true, message: 'תביעה עודכנה בהצלחה', claim: { id: updatedDoc.id, ...updatedDoc.data() } });
    }

    const doc = await claimRef.get();
    if (!doc.exists) {
      return res.status(404).json({ success: false, message: 'תביעה לא נמצאה' });
    }

    if (req.method === 'GET') {
      return res.json({ success: true, claim: { id: doc.id, ...doc.data() } });
    }

    if (req.method === 'PUT') {
      await checkPermission(user, db, 'insurance_claims', 'edit');
      const existingData = doc.data();
      const updateData = { ...req.body, updatedBy: user.id, updatedAt: new Date() };
      delete updateData.id;
      delete updateData.claimNumber;
      delete updateData.createdAt;
      delete updateData.createdBy;

      await claimRef.update(updateData);
      const updatedDoc = await claimRef.get();
      const diff = buildChanges(existingData, req.body);
      await writeAuditLog(db, user, { action: 'update', entityType: 'insurance_claim', entityId: claimId, entityName: updatedDoc.data().claimNumber, changes: diff, description: `תביעת ביטוח עודכנה: ${updatedDoc.data().claimNumber || ''}` });
      return res.json({ success: true, message: 'תביעה עודכנה בהצלחה', claim: { id: updatedDoc.id, ...updatedDoc.data() } });
    }

    if (req.method === 'DELETE') {
      await checkPermission(user, db, 'insurance_claims', 'edit');
      const deletedData = doc.data();
      await claimRef.delete();
      await writeAuditLog(db, user, { action: 'delete', entityType: 'insurance_claim', entityId: claimId, entityName: deletedData.claimNumber, description: `תביעת ביטוח נמחקה: ${deletedData.claimNumber || ''}` });
      return res.json({ success: true, message: 'תביעה נמחקה בהצלחה' });
    }
  }

  // Collection operations
  if (req.method === 'GET') {
    const { search, status, eventType, vehicleId, riderId, insuranceCompany, insuranceType, limit = 100 } = req.query;
    const limitNum = Math.min(parseInt(limit), 500);

    let query = db.collection('insurance_claims');
    if (status) query = query.where('status', '==', status);
    if (eventType) query = query.where('eventType', '==', eventType);
    if (vehicleId) query = query.where('vehicleId', '==', vehicleId);
    if (riderId) query = query.where('riderId', '==', riderId);
    if (insuranceCompany) query = query.where('insuranceCompany', '==', insuranceCompany);
    if (insuranceType) query = query.where('insuranceType', '==', insuranceType);

    let claims = [];
    try {
      const snapshot = await query.orderBy('eventDate', 'desc').limit(limitNum).get();
      claims = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (e) {
      const snapshot = await query.limit(limitNum).get();
      claims = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }

    if (search) {
      const searchLower = search.toLowerCase();
      claims = claims.filter(c =>
        c.claimNumber?.toLowerCase().includes(searchLower) ||
        c.externalClaimNumber?.toLowerCase().includes(searchLower) ||
        c.description?.toLowerCase().includes(searchLower) ||
        c.vehiclePlate?.toLowerCase().includes(searchLower) ||
        c.riderName?.toLowerCase().includes(searchLower) ||
        c.insuranceCompany?.toLowerCase().includes(searchLower)
      );
    }

    return res.json({ success: true, count: claims.length, claims });
  }

  if (req.method === 'POST') {
    if (!req.body.vehicleId) return res.status(400).json({ success: false, message: 'כלי הוא שדה חובה' });
    if (!req.body.eventType) return res.status(400).json({ success: false, message: 'סוג אירוע הוא שדה חובה' });
    if (!req.body.eventDate) return res.status(400).json({ success: false, message: 'תאריך אירוע הוא שדה חובה' });
    if (!req.body.description) return res.status(400).json({ success: false, message: 'תיאור האירוע הוא שדה חובה' });
    if (!req.body.insuranceCompany) return res.status(400).json({ success: false, message: 'חברת ביטוח היא שדה חובה' });
    if (!req.body.insuranceType) return res.status(400).json({ success: false, message: 'סוג ביטוח הוא שדה חובה' });

    // Generate claim number
    const year = new Date().getFullYear();
    let count = 1;
    try {
      const countSnapshot = await db.collection('insurance_claims')
        .where('createdAt', '>=', new Date(year, 0, 1))
        .where('createdAt', '<', new Date(year + 1, 0, 1)).get();
      count = countSnapshot.size + 1;
    } catch (e) {
      const allSnapshot = await db.collection('insurance_claims').get();
      count = allSnapshot.size + 1;
    }
    const claimNumber = `IC-${year}-${String(count).padStart(5, '0')}`;

    const claimData = {
      claimNumber,
      externalClaimNumber: req.body.externalClaimNumber || null,
      vehicleId: req.body.vehicleId,
      vehiclePlate: req.body.vehiclePlate || null,
      riderId: req.body.riderId || null,
      riderName: req.body.riderName || null,
      eventType: req.body.eventType,
      eventDate: req.body.eventDate ? new Date(req.body.eventDate) : new Date(),
      description: req.body.description,
      location: {
        address: req.body.location?.address || '',
        coordinates: { lat: req.body.location?.coordinates?.lat || null, lng: req.body.location?.coordinates?.lng || null }
      },
      insuranceCompany: req.body.insuranceCompany,
      insuranceType: req.body.insuranceType,
      policyNumber: req.body.policyNumber || '',
      status: req.body.status || 'draft',
      claimAmount: req.body.claimAmount || 0,
      approvedAmount: req.body.approvedAmount || 0,
      paidAmount: req.body.paidAmount || 0,
      documents: req.body.documents || [],
      appraiser: {
        name: req.body.appraiser?.name || '',
        phone: req.body.appraiser?.phone || '',
        email: req.body.appraiser?.email || '',
        appointmentDate: req.body.appraiser?.appointmentDate ? new Date(req.body.appraiser.appointmentDate) : null,
        reportDate: req.body.appraiser?.reportDate ? new Date(req.body.appraiser.reportDate) : null
      },
      relatedMaintenanceId: req.body.relatedMaintenanceId || null,
      relatedFaultId: req.body.relatedFaultId || null,
      notes: req.body.notes || [],
      submittedAt: null,
      approvedAt: null,
      rejectedAt: null,
      closedAt: null,
      rejectionReason: null,
      openedBy: user.id,
      closedBy: null,
      createdBy: user.id,
      createdAt: new Date(),
      updatedBy: user.id,
      updatedAt: new Date()
    };

    const claimRef = await db.collection('insurance_claims').add(claimData);
    const claimDoc = await claimRef.get();
    await writeAuditLog(db, user, { action: 'create', entityType: 'insurance_claim', entityId: claimRef.id, entityName: claimNumber, description: `תביעת ביטוח חדשה נוצרה: ${claimNumber}` });

    return res.status(201).json({
      success: true,
      message: 'תביעת ביטוח נוצרה בהצלחה',
      claim: { id: claimRef.id, ...claimDoc.data() }
    });
  }

  return res.status(405).json({ success: false, message: 'Method not allowed' });
}
