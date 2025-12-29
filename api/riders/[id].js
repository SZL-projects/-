// Vercel Serverless Function - /api/riders/[id]
const { initFirebase } = require('../_utils/firebase');
const { authenticateToken, checkAuthorization } = require('../_utils/auth');

module.exports = async (req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { id } = req.query;

  if (!id) {
    return res.status(400).json({
      success: false,
      message: 'ID לא סופק'
    });
  }

  try {
    const { db } = initFirebase();
    const user = await authenticateToken(req, db);

    const riderRef = db.collection('riders').doc(id);
    const doc = await riderRef.get();

    if (!doc.exists) {
      return res.status(404).json({
        success: false,
        message: 'רוכב לא נמצא'
      });
    }

    // GET - קבלת רוכב לפי ID
    if (req.method === 'GET') {
      // רוכב יכול לראות רק את עצמו
      if (user.role === 'rider' && user.riderId !== id) {
        return res.status(403).json({
          success: false,
          message: 'אין הרשאה לצפות ברוכב זה'
        });
      }

      return res.status(200).json({
        success: true,
        rider: {
          id: doc.id,
          ...doc.data()
        }
      });
    }

    // PUT - עדכון רוכב
    if (req.method === 'PUT') {
      checkAuthorization(user, ['super_admin', 'manager', 'secretary']);

      const updateData = {
        ...req.body,
        updatedBy: user.id,
        updatedAt: new Date()
      };

      await riderRef.update(updateData);
      const updatedDoc = await riderRef.get();

      return res.status(200).json({
        success: true,
        message: 'רוכב עודכן בהצלחה',
        rider: {
          id: updatedDoc.id,
          ...updatedDoc.data()
        }
      });
    }

    // DELETE - מחיקת רוכב
    if (req.method === 'DELETE') {
      checkAuthorization(user, ['super_admin']);

      await riderRef.delete();

      return res.status(200).json({
        success: true,
        message: 'רוכב נמחק בהצלחה'
      });
    }

    return res.status(405).json({
      success: false,
      message: 'Method not allowed'
    });

  } catch (error) {
    console.error('Rider [id] error:', error);

    if (error.message.includes('token') || error.message.includes('authorized')) {
      return res.status(401).json({
        success: false,
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
