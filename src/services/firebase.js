/**
 * Firebase Client SDK Initialization
 * Firestore Database & Google Authentication
 */
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  getDoc,
  deleteDoc, 
  onSnapshot 
} from 'firebase/firestore';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged 
} from 'firebase/auth';

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
let auth = null;
let googleProvider = null;

try {
  app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  auth = getAuth(app);
  googleProvider = new GoogleAuthProvider();
  googleProvider.setCustomParameters({ prompt: 'select_account' });
} catch (e) {
  console.warn('Firebase 초기화 경고:', e);
}

// 마스터 관리자 이메일 (항상 전체 권한)
export const MASTER_ADMIN_EMAIL = 'inchul17.kim@gmail.com';

// 화이트리스트 관리 서비스 (Firestore 연동)
export const WhitelistService = {
  // 등록된 허용 이메일 목록 조회
  getAllowedEmails: async () => {
    const list = [MASTER_ADMIN_EMAIL];
    if (!db) return list;
    try {
      const snap = await getDocs(collection(db, 'system_whitelist'));
      snap.forEach(docSnap => {
        const email = docSnap.id.toLowerCase().trim();
        if (!list.includes(email)) {
          list.push(email);
        }
      });
      return list;
    } catch (e) {
      console.warn('화이트리스트 조회 에러:', e);
      return list;
    }
  },

  // 허용 이메일 등록 (마스터 권한)
  addAllowedEmail: async (email) => {
    if (!email || !db) return;
    const cleanEmail = email.toLowerCase().trim();
    try {
      await setDoc(doc(db, 'system_whitelist', cleanEmail), {
        email: cleanEmail,
        addedAt: new Date().toISOString(),
        addedBy: MASTER_ADMIN_EMAIL
      });
    } catch (e) {
      console.error('화이트리스트 추가 실패:', e);
      throw e;
    }
  },

  // 허용 이메일 제거
  removeAllowedEmail: async (email) => {
    if (!email || !db) return;
    const cleanEmail = email.toLowerCase().trim();
    if (cleanEmail === MASTER_ADMIN_EMAIL) return; // 마스터는 삭제 불가
    try {
      await deleteDoc(doc(db, 'system_whitelist', cleanEmail));
    } catch (e) {
      console.error('화이트리스트 삭제 실패:', e);
      throw e;
    }
  },

  // 특정 이메일이 허용 대상인지 검증
  isEmailAllowed: async (email) => {
    if (!email) return false;
    const cleanEmail = email.toLowerCase().trim();
    if (cleanEmail === MASTER_ADMIN_EMAIL) return true;
    
    if (!db) return false;
    try {
      const docSnap = await getDoc(doc(db, 'system_whitelist', cleanEmail));
      return docSnap.exists();
    } catch (e) {
      console.warn('화이트리스트 검증 오류:', e);
      return false;
    }
  }
};

export { app, db, auth, googleProvider, signInWithPopup, signOut, onAuthStateChanged };
