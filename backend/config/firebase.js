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
  // אם יש Service Account Key (מומלץ לפרודקשן)
  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    try {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
      app = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        storageBucket: firebaseConfig.storageBucket
      });
      console.log('✅ Firebase initialized with Service Account');
    } catch (parseError) {
      console.warn('⚠️ Failed to parse Service Account, using alternative method');
      // אם נכשל ה-parsing, נשתמש בשיטה אלטרנטיבית
      app = admin.initializeApp({
        credential: admin.credential.applicationDefault(),
        projectId: firebaseConfig.projectId,
        storageBucket: firebaseConfig.storageBucket
      });
    }
  } else {
    // ללא Service Account - ננסה Application Default Credentials
    app = admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      projectId: firebaseConfig.projectId,
      storageBucket: firebaseConfig.storageBucket
    });
  }

  console.log('✅ Firebase initialized successfully');
} catch (error) {
  console.error('❌ Firebase initialization error:', error.message);
  // אם הכל נכשל, ננסה בלי credentials (לא יעבוד לכתיבה, אבל לא יקרוס)
  console.warn('⚠️ Attempting initialization without credentials');
  try {
    app = admin.initializeApp({
      projectId: firebaseConfig.projectId,
      storageBucket: firebaseConfig.storageBucket
    });
  } catch (finalError) {
    console.error('❌ Final initialization attempt failed:', finalError.message);
    throw finalError;
  }
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
