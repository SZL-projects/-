// CORS utility for Vercel Serverless Functions
// מגביל גישה ל-origins מורשים בלבד

const ALLOWED_ORIGINS = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(',').map(o => o.trim())
  : ['http://localhost:5173'];

/**
 * מגדיר CORS headers בצורה מאובטחת
 * @returns {boolean} - false אם הבקשה נדחתה (OPTIONS)
 */
function setCorsHeaders(req, res) {
  const origin = req.headers.origin;

  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else if (!origin) {
    // בקשות ללא origin (Vercel internal routing)
    res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGINS[0]);
  }
  // אם origin לא מורשה - לא מגדירים Access-Control-Allow-Origin

  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-Requested-With, Accept, Content-Type, Authorization'
  );
  res.setHeader('Vary', 'Origin');
}

module.exports = { setCorsHeaders };
