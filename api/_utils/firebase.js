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
  // Pattern 1: Full path /api/resource/123
  let match = url.match(new RegExp(`/api/${resourceName}/([^?/]+)`));
  if (match) return match[1];

  // Pattern 2: Relative path /resource/123
  match = url.match(new RegExp(`^/${resourceName}/([^?/]+)`));
  if (match) return match[1];

  // Pattern 3: Just the ID /123 (when Vercel strips the prefix)
  match = url.match(/^\/([^?/]+)$/);
  if (match && !url.includes(resourceName)) return match[1];

  return null;
}

module.exports = { initFirebase, extractIdFromUrl };
