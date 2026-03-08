import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAFHUysA2FDFKDJfU3eUVvYnybeATWqUvY",
  authDomain: "motorcycle-project-8a680.firebaseapp.com",
  projectId: "motorcycle-project-8a680",
  storageBucket: "motorcycle-project-8a680.firebasestorage.app",
  messagingSenderId: "768175576428",
  appId: "1:768175576428:web:b7631b44f1da0ff9660f49"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
