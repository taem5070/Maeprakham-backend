// Public API (Rewards Manager)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signInAnonymously } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  getFirestore, collection, doc, getDocs, getDoc, addDoc, setDoc, updateDoc, deleteDoc,
  serverTimestamp, query, orderBy
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import {
  getStorage, ref, uploadBytes, getDownloadURL, deleteObject
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyDvTJ5tEKo_J1r4l9zP-oi07yoj2I-UcZo",
  authDomain: "maeprakham.firebaseapp.com",
  projectId: "maeprakham",
  storageBucket: "maeprakham.firebasestorage.app",
  messagingSenderId: "807144309923",
  appId: "1:807144309923:web:a9cdadc96074941ad66b16",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);
const auth = getAuth(app);

// ชุดคอลเลกชัน/สโตเรจฝั่ง Public
export const REWARDS_PUBLIC_COLLECTION = "rewards_public";
export const REWARDS_PUBLIC_STORAGE_PREFIX = "rewards_public";

// รอให้มี user เสมอ (กัน CORS/401 ตอนเขียน/อัปโหลด)
let __authReady;
function ensureAuth() {
  if (__authReady) return __authReady;
  __authReady = new Promise((resolve, reject) => {
    onAuthStateChanged(auth, (user) => {
      if (user) return resolve(user);
      signInAnonymously(auth).then(cred => resolve(cred.user)).catch(reject);
    }, reject);
  });
  return __authReady;
}
ensureAuth().catch(console.error);

// expose ให้หน้า app ใช้
window.__fb = {
  db, storage, auth, ensureAuth,
  fs: { collection, doc, getDocs, getDoc, addDoc, setDoc, updateDoc, deleteDoc, serverTimestamp, query, orderBy },
  st: { ref, uploadBytes, getDownloadURL, deleteObject }
};
