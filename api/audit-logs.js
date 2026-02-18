// Vercel Serverless Function - /api/audit-logs
const { initFirebase } = require('./_utils/firebase');
const { authenticateToken, checkPermission } = require('./_utils/auth');

module.exports = async (req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const { db } = initFirebase();
    const user = await authenticateToken(req, db);
    await checkPermission(user, db, 'audit_logs', 'view');

    // Extract sub-route from URL
    const urlWithoutQuery = req.url.split('?')[0];
    let subRoute = null;

    let match = urlWithoutQuery.match(/\/api\/audit-logs\/([^/]+)/);
    if (!match) match = urlWithoutQuery.match(/\/audit-logs\/([^/]+)/);
    if (!match) match = urlWithoutQuery.match(/^\/([^/]+)/);
    if (match) subRoute = match[1];

    // GET /api/audit-logs/users - רשימת משתמשים ייחודיים מהלוגים
    if (subRoute === 'users') {
      const snapshot = await db.collection('auditLogs')
        .orderBy('timestamp', 'desc')
        .limit(1000)
        .get();

      const usersMap = {};
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.userId && data.userName) {
          usersMap[data.userId] = {
            id: data.userId,
            name: data.userName,
          };
        }
      });

      return res.status(200).json({
        success: true,
        users: Object.values(usersMap),
      });
    }

    // GET /api/audit-logs - קבלת לוגים עם פילטרים
    const { userId, action, entityType, search, dateFrom, dateTo, limit = 100 } = req.query;
    const limitNum = Math.min(parseInt(limit) || 100, 500);

    let query = db.collection('auditLogs').orderBy('timestamp', 'desc');

    if (userId) {
      query = query.where('userId', '==', userId);
    }
    if (action) {
      query = query.where('action', '==', action);
    }
    if (entityType) {
      query = query.where('entityType', '==', entityType);
    }

    query = query.limit(limitNum);
    const snapshot = await query.get();
    let logs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Client-side filtering for search, dateFrom, dateTo
    if (search) {
      const searchLower = search.toLowerCase();
      logs = logs.filter(log =>
        log.userName?.toLowerCase().includes(searchLower) ||
        log.description?.toLowerCase().includes(searchLower) ||
        log.entityType?.toLowerCase().includes(searchLower)
      );
    }

    if (dateFrom) {
      const fromDate = new Date(dateFrom);
      logs = logs.filter(log => {
        const logDate = log.timestamp?.toDate ? log.timestamp.toDate() :
          log.timestamp?._seconds ? new Date(log.timestamp._seconds * 1000) :
          new Date(log.timestamp);
        return logDate >= fromDate;
      });
    }

    if (dateTo) {
      const toDateVal = new Date(dateTo);
      toDateVal.setHours(23, 59, 59, 999);
      logs = logs.filter(log => {
        const logDate = log.timestamp?.toDate ? log.timestamp.toDate() :
          log.timestamp?._seconds ? new Date(log.timestamp._seconds * 1000) :
          new Date(log.timestamp);
        return logDate <= toDateVal;
      });
    }

    return res.status(200).json({
      success: true,
      logs,
      count: logs.length,
    });

  } catch (error) {
    console.error('Audit logs error:', error);

    if (error.message.includes('token')) {
      return res.status(401).json({ success: false, message: error.message });
    }
    if (error.message.includes('הרשאה') || error.message.includes('authorized')) {
      return res.status(403).json({ success: false, message: error.message });
    }

    res.status(500).json({ success: false, message: error.message });
  }
};
