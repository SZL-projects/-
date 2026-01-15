// Firebase Admin SDK initialization for Vercel Serverless Functions
const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');

let app;
let db;

// Initialize Firebase Admin (singleton pattern)
function initFirebase() {
  if (app) {
    return { admin, db };
  }

  try {
    // בדיקה אם כבר הוקם
    if (admin.apps.length > 0) {
      app = admin.apps[0];
    } else {
      // קריאת Service Account מ-ENV (Vercel)
      if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
        app = admin.initializeApp({
          credential: admin.credential.cert(serviceAccount)
        });
      } else {
        throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY not found in environment variables');
      }
    }

    db = getFirestore(app);
    db.settings({ ignoreUndefinedProperties: true });

    return { admin, db };
  } catch (error) {
    console.error('Firebase initialization error:', error);
    throw error;
  }
}

// Extract ID from Vercel URL path - handles multiple patterns
function extractIdFromUrl(url, resourceName) {
  console.log('🔍 [extractIdFromUrl] Input:', { url, resourceName });

  // מסיר query parameters אם יש
  const urlWithoutQuery = url.split('?')[0];
  console.log('🔍 [extractIdFromUrl] URL without query:', urlWithoutQuery);

  // Pattern 1: Full path /api/resource/123 or /api/resource/123/action
  let match = urlWithoutQuery.match(new RegExp(`/api/${resourceName}/([^/]+)`));
  if (match) {
    console.log('🔍 [extractIdFromUrl] Matched Pattern 1:', match[1]);
    return match[1];
  }

  // Pattern 2: Relative path /resource/123 or /resource/123/action
  match = urlWithoutQuery.match(new RegExp(`^/${resourceName}/([^/]+)`));
  if (match) {
    console.log('🔍 [extractIdFromUrl] Matched Pattern 2:', match[1]);
    return match[1];
  }

  // Pattern 3: Just the ID /123 or /123/action (when Vercel strips the prefix)
  match = urlWithoutQuery.match(/^\/([^/]+)/);
  if (match && !urlWithoutQuery.includes(resourceName)) {
    console.log('🔍 [extractIdFromUrl] Matched Pattern 3:', match[1]);
    return match[1];
  }

  console.log('🔍 [extractIdFromUrl] No match found, returning null');
  return null;
}

module.exports = { initFirebase, extractIdFromUrl };
