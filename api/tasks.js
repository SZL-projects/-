// Vercel Serverless Function - /api/tasks
const { initFirebase, extractIdFromUrl } = require('./_utils/firebase');
const { authenticateToken, checkPermission } = require('./_utils/auth');
const { setCorsHeaders } = require('./_utils/cors');
const { writeAuditLog, buildChanges } = require('./_utils/auditLog');

module.exports = async (req, res) => {
  // CORS Headers
  setCorsHeaders(req, res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Parse body for POST/PUT/PATCH requests
  if (['POST', 'PUT', 'PATCH'].includes(req.method) && !req.body) {
    const getRawBody = require('raw-body');
    try {
      const rawBody = await getRawBody(req);
      req.body = JSON.parse(rawBody.toString());
    } catch (e) {
      req.body = {};
    }
  }

  try {
    const { db } = initFirebase();
    const user = await authenticateToken(req, db);

    const taskId = extractIdFromUrl(req.url, 'tasks');

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
        const permLevel = await checkPermission(user, db, 'tasks', 'view');

        const existingTaskData = doc.data();

        // רוכב עם הרשאת self יכול לעדכן רק סטטוס והערות של משימה המשויכת אליו
        if (permLevel === 'self') {
          if (existingTaskData.assigneeId !== user.id) {
            return res.status(403).json({ success: false, message: 'אין לך הרשאה לעדכן משימה זו' });
          }
        }

        const updateData = permLevel === 'self'
          ? { ...(req.body.status && { status: req.body.status }), ...(req.body.riderNotes !== undefined && { riderNotes: req.body.riderNotes }), updatedBy: user.id, updatedAt: new Date() }
          : { ...req.body, updatedBy: user.id, updatedAt: new Date() };

        await taskRef.update(updateData);
        const updatedDoc = await taskRef.get();
        const taskDiff = buildChanges(existingTaskData, req.body);
        await writeAuditLog(db, user, { action: 'update', entityType: 'task', entityId: taskId, entityName: updatedDoc.data().title || 'משימה', changes: taskDiff, description: `משימה עודכנה: ${updatedDoc.data().title || ''}` });

        return res.status(200).json({
          success: true,
          message: 'משימה עודכנה בהצלחה',
          task: { id: updatedDoc.id, ...updatedDoc.data() }
        });
      }

      if (req.method === 'DELETE') {
        await checkPermission(user, db, 'tasks', 'edit');

        const deletedTaskData = doc.data();
        await taskRef.delete();
        await writeAuditLog(db, user, { action: 'delete', entityType: 'task', entityId: taskId, entityName: deletedTaskData.title || 'משימה', description: `משימה נמחקה: ${deletedTaskData.title || ''}` });

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

      // סינון לפי הרשאות - self רואה רק משימות המשויכות אליו
      const permLevel = await checkPermission(user, db, 'tasks', 'view');

      if (permLevel === 'self') {
        if (riderId && riderId === user.id) {
          // riderId כבר מסנן לנתונים האישיים - אין צורך בסינון נוסף
        } else {
          query = query.where('assigneeId', '==', user.id);
        }
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
      await checkPermission(user, db, 'tasks', 'edit');

      const taskData = {
        ...req.body,
        createdBy: user.id,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const taskRef = await db.collection('tasks').add(taskData);
      const taskDoc = await taskRef.get();
      await writeAuditLog(db, user, { action: 'create', entityType: 'task', entityId: taskRef.id, entityName: req.body.title || 'משימה חדשה', description: `משימה חדשה נוצרה: ${req.body.title || ''}` });

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

    if (error.message.includes('token')) {
      return res.status(401).json({ success: false, message: error.message });
    }
    if (error.message.includes('הרשאה') || error.message.includes('authorized')) {
      return res.status(403).json({ success: false, message: error.message });
    }

    res.status(500).json({ success: false, message: error.message });
  }
};
