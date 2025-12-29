const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');
const { getStorage } = require('firebase-admin/storage');

// Firebase Configuration
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY || "AIzaSyAFHUysA2FDFKDJfU3eUVvYnybeATWqUvY",
  authDomain: process.env.FIREBASE_AUTH_DOMAIN || "motorcycle-project-8a680.firebaseapp.com",
  projectId: process.env.FIREBASE_PROJECT_ID || "motorcycle-project-8a680",
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "motorcycle-project-8a680.firebasestorage.app",
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || "768175576428",
  appId: process.env.FIREBASE_APP_ID || "1:768175576428:web:b7631b44f1da0ff9660f49"
};

// Initialize Firebase Admin
let app;
try {
  // ננסה קודם עם קובץ serviceAccountKey.json
  const path = require('path');
  const fs = require('fs');
  const serviceAccountPath = path.join(__dirname, '..', 'serviceAccountKey.json');

  if (fs.existsSync(serviceAccountPath)) {
    const serviceAccount = require(serviceAccountPath);
    app = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: firebaseConfig.projectId,
      databaseURL: `https://${firebaseConfig.projectId}.firebaseio.com`,
      storageBucket: firebaseConfig.storageBucket
    });
    console.log('✅ Firebase initialized with serviceAccountKey.json');
  }
  // אם יש Service Account Key ב-ENV (מומלץ לפרודקשן)
  else if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    try {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
      app = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        storageBucket: firebaseConfig.storageBucket
      });
      console.log('✅ Firebase initialized with Service Account from ENV');
    } catch (parseError) {
      console.error('❌ Failed to parse Service Account from ENV:', parseError.message);
      throw parseError;
    }
  } else {
    // למצב פיתוח - ללא credentials (לא מומלץ!)
    console.warn('⚠️ No service account found! Some features may not work.');
    console.warn('⚠️ Please add serviceAccountKey.json to backend folder');
    // ננסה Application Default Credentials
    app = admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      projectId: firebaseConfig.projectId,
      storageBucket: firebaseConfig.storageBucket
    });
  }

  console.log('✅ Firebase initialized successfully');
} catch (error) {
  console.error('❌ Firebase initialization error:', error.message);
  console.error('❌ Please download serviceAccountKey.json from Firebase Console');
  console.error('❌ Project Settings > Service Accounts > Generate New Private Key');
  throw error;
}

// Firestore Database
const db = getFirestore(app);
db.settings({ ignoreUndefinedProperties: true });

// Firebase Storage
const bucket = getStorage(app).bucket();

module.exports = {
  admin,
  db,
  bucket,
  firebaseConfig
};
