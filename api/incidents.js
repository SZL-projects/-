// Vercel Serverless Function - /api/incidents
const { initFirebase } = require('./_utils/firebase');
const { authenticateToken } = require('./_utils/auth');
const { setCorsHeaders } = require('./_utils/cors');
const getRawBody = require('raw-body');

function isRiderOnly(user) {
  const roles = Array.isArray(user.roles) ? user.roles : [user.role];
  return roles.every(r => r === 'rider');
}

function extractIncidentId(url) {
  // /api/incidents/:id or /api/incidents/:id/upload-photo
  const match = url.match(/\/incidents\/([^/?\s]+)/);
  return match ? match[1] : null;
}

async function generateIncidentNumber(db) {
  const year = new Date().getFullYear();
  const snapshot = await db.collection('incidents')
    .orderBy('createdAt', 'desc')
    .limit(1)
    .get();
  const lastNum = snapshot.empty ? 0 : (snapshot.docs[0].data().incidentNumber?.split('-')[2] || 0);
  const nextNum = parseInt(lastNum) + 1;
  return `INC-${year}-${String(nextNum).padStart(4, '0')}`;
}

module.exports = async (req, res) => {
  setCorsHeaders(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  // Parse body
  if (['POST', 'PUT', 'PATCH'].includes(req.method) && !req.body &&
      !req.headers['content-type']?.includes('multipart/form-data')) {
    try {
      const raw = await getRawBody(req);
      const text = raw.toString();
      req.body = text && text.trim() !== '' ? JSON.parse(text) : {};
    } catch {
      req.body = {};
    }
  }

  try {
    const { db } = initFirebase();
    const user = await authenticateToken(req, db);
    const url = req.url.split('?')[0];
    const incidentId = extractIncidentId(url);

    // ===== POST /:id/upload-photo =====
    if (url.endsWith('/upload-photo') && req.method === 'POST') {
      const Busboy = require('busboy');
      const { Readable } = require('stream');
      const googleDriveService = require('./_services/googleDriveService');
      googleDriveService.setFirestore(db);
      await googleDriveService.initialize();

      const doc = await db.collection('incidents').doc(incidentId).get();
      if (!doc.exists) return res.status(404).json({ success: false, message: 'אירוע לא נמצא' });

      return new Promise(async (resolve) => {
        try {
          const rawBody = await getRawBody(req, { length: req.headers['content-length'], limit: '11mb' });
          const bufferStream = Readable.from(rawBody);
          const busboy = Busboy({ headers: req.headers });

          let fileBuffer = null;
          let fileName = '';
          let mimeType = '';

          busboy.on('file', (fieldname, file, info) => {
            try { fileName = Buffer.from(info.filename, 'latin1').toString('utf8'); }
            catch { fileName = info.filename; }
            mimeType = info.mimeType;
            const chunks = [];
            file.on('data', d => chunks.push(d));
            file.on('end', () => { fileBuffer = Buffer.concat(chunks); });
          });

          busboy.on('finish', async () => {
            if (!fileBuffer) {
              res.status(400).json({ success: false, message: 'לא הועלה קובץ' });
              return resolve();
            }
            const rootFolderId = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID;
            if (!rootFolderId) {
              res.status(500).json({ success: false, message: 'Google Drive לא מחובר' });
              return resolve();
            }
            const folder = await googleDriveService.findOrCreateFolder('אירועים', rootFolderId);
            const incidentNumber = doc.data().incidentNumber || incidentId;
            const fullFileName = `${incidentNumber}_${fileName}`;
            const fileData = await googleDriveService.uploadFile(fullFileName, fileBuffer, folder.id, mimeType);

            const existing = doc.data();
            const photos = existing.photos || [];
            photos.push({ fileId: fileData.id, name: fullFileName, url: fileData.webViewLink || '' });
            await db.collection('incidents').doc(incidentId).update({ photos, updatedAt: new Date() });

            res.json({ success: true, file: fileData });
            resolve();
          });

          busboy.on('error', err => { res.status(500).json({ success: false, message: err.message }); resolve(); });
          bufferStream.pipe(busboy);
        } catch (err) {
          res.status(500).json({ success: false, message: err.message });
          resolve();
        }
      });
    }

    // ===== GET / - רשימה =====
    if (!incidentId && req.method === 'GET') {
      let query = db.collection('incidents');
      if (isRiderOnly(user)) {
        query = query.where('createdBy', '==', user.id);
      }
      const snapshot = await query.orderBy('createdAt', 'desc').limit(200).get();
      const incidents = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      return res.json({ success: true, count: incidents.length, incidents });
    }

    // ===== GET /:id =====
    if (incidentId && req.method === 'GET') {
      const doc = await db.collection('incidents').doc(incidentId).get();
      if (!doc.exists) return res.status(404).json({ success: false, message: 'אירוע לא נמצא' });
      const incident = { id: doc.id, ...doc.data() };
      if (isRiderOnly(user) && incident.createdBy !== user.id) {
        return res.status(403).json({ success: false, message: 'אין הרשאה' });
      }
      return res.json({ success: true, incident });
    }

    // ===== POST / - יצירה =====
    if (!incidentId && req.method === 'POST') {
      const incidentNumber = await generateIncidentNumber(db);
      const data = {
        ...req.body,
        incidentNumber,
        status: 'new',
        createdBy: user.id,
        createdByName: `${user.firstName} ${user.lastName}`.trim(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const docRef = await db.collection('incidents').add(data);
      return res.status(201).json({ success: true, incident: { id: docRef.id, ...data } });
    }

    // ===== PUT /:id - עדכון =====
    if (incidentId && req.method === 'PUT') {
      const docRef = db.collection('incidents').doc(incidentId);
      const doc = await docRef.get();
      if (!doc.exists) return res.status(404).json({ success: false, message: 'אירוע לא נמצא' });
      if (isRiderOnly(user) && doc.data().createdBy !== user.id) {
        return res.status(403).json({ success: false, message: 'אין הרשאה' });
      }
      const updateData = { ...req.body, updatedAt: new Date(), updatedBy: user.id };
      await docRef.update(updateData);
      return res.json({ success: true, incident: { id: incidentId, ...doc.data(), ...updateData } });
    }

    // ===== DELETE /:id =====
    if (incidentId && req.method === 'DELETE') {
      if (isRiderOnly(user)) return res.status(403).json({ success: false, message: 'אין הרשאה' });
      const doc = await db.collection('incidents').doc(incidentId).get();
      if (!doc.exists) return res.status(404).json({ success: false, message: 'אירוע לא נמצא' });
      await db.collection('incidents').doc(incidentId).delete();
      return res.json({ success: true, message: 'אירוע נמחק' });
    }

    return res.status(404).json({ success: false, message: 'נתיב לא נמצא' });

  } catch (error) {
    console.error('Incidents API error:', error);
    if (error.message?.includes('token') || error.message?.includes('Token')) {
      return res.status(401).json({ success: false, message: error.message });
    }
    return res.status(500).json({ success: false, message: error.message });
  }
};
