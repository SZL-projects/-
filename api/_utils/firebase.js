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

module.exports = { initFirebase };
