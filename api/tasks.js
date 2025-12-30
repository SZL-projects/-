// Vercel Serverless Function - /api/tasks
const { initFirebase } = require('./_utils/firebase');
const { authenticateToken, checkAuthorization } = require('./_utils/auth');

module.exports = async (req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { db } = initFirebase();
    const user = await authenticateToken(req, db);

    const pathMatch = req.url.match(/\/api\/tasks\/([^?]+)/);
    const taskId = pathMatch ? pathMatch[1] : null;

    // Single task operations
    if (taskId) {
      const taskRef = db.collection('tasks').doc(taskId);
      const doc = await taskRef.get();

      if (!doc.exists) {
        return res.status(404).json({
          success: false,
          message: 'משימה לא נמצאה'
        });
      }

      if (req.method === 'GET') {
        return res.status(200).json({
          success: true,
          task: { id: doc.id, ...doc.data() }
        });
      }

      if (req.method === 'PUT') {
        checkAuthorization(user, ['super_admin', 'manager', 'secretary']);

        const updateData = {
          ...req.body,
          updatedBy: user.id,
          updatedAt: new Date()
        };

        await taskRef.update(updateData);
        const updatedDoc = await taskRef.get();

        return res.status(200).json({
          success: true,
          message: 'משימה עודכנה בהצלחה',
          task: { id: updatedDoc.id, ...updatedDoc.data() }
        });
      }

      if (req.method === 'DELETE') {
        checkAuthorization(user, ['super_admin']);

        await taskRef.delete();

        return res.status(200).json({
          success: true,
          message: 'משימה נמחקה בהצלחה'
        });
      }
    }

    // Collection operations
    if (req.method === 'GET') {
      const { search, status, priority, riderId, vehicleId, page = 1, limit = 100 } = req.query;

      let query = db.collection('tasks');

      if (status) {
        query = query.where('status', '==', status);
      }
      if (priority) {
        query = query.where('priority', '==', priority);
      }
      if (riderId) {
        query = query.where('riderId', '==', riderId);
      }
      if (vehicleId) {
        query = query.where('vehicleId', '==', vehicleId);
      }

      const snapshot = await query.limit(parseInt(limit)).get();
      let tasks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      if (search) {
        const searchLower = search.toLowerCase();
        tasks = tasks.filter(task =>
          task.title?.toLowerCase().includes(searchLower) ||
          task.description?.toLowerCase().includes(searchLower)
        );
      }

      return res.status(200).json({
        success: true,
        count: tasks.length,
        tasks
      });
    }

    if (req.method === 'POST') {
      checkAuthorization(user, ['super_admin', 'manager', 'secretary']);

      const taskData = {
        ...req.body,
        createdBy: user.id,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const taskRef = await db.collection('tasks').add(taskData);
      const taskDoc = await taskRef.get();

      return res.status(201).json({
        success: true,
        message: 'משימה נוצרה בהצלחה',
        task: { id: taskRef.id, ...taskDoc.data() }
      });
    }

    return res.status(405).json({
      success: false,
      message: 'Method not allowed'
    });

  } catch (error) {
    console.error('Tasks error:', error);

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
