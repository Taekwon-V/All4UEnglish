/**
 * Firebase Client SDK Initialization
 * Firestore Database & Cloud Storage Adapter
 */
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  deleteDoc, 
  onSnapshot 
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAGa7Awl9YpZN82OtrC_cWnu5SK8sNQdPI",
  authDomain: "all4uenglish.firebaseapp.com",
  projectId: "all4uenglish",
  storageBucket: "all4uenglish.firebasestorage.app",
  messagingSenderId: "895846432472",
  appId: "1:895846432472:web:031baae77f57be6daf61ad",
  measurementId: "G-0ZNHVGVK3D"
};

let app = null;
let db = null;

try {
  app = initializeApp(firebaseConfig);
  db = getFirestore(app);
} catch (e) {
  console.warn('Firebase 초기화 경고:', e);
}

export { app, db };
