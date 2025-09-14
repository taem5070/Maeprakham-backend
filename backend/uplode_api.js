// api.js — Firebase API layer (no UI)

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  getFirestore, doc, getDoc, setDoc, updateDoc, deleteDoc,
  collection, query, where, getDocs, orderBy, writeBatch,
  limit, startAfter, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ===== Firebase Config =====
const firebaseConfig = {
  apiKey: "AIzaSyDvTJ5tEKo_J1r4l9zP-oi07yoj2I-UcZo",
  authDomain: "maeprakham.firebaseapp.com",
  projectId: "maeprakham",
  storageBucket: "maeprakham.appspot.com",
  appId: "1:807144309923:web:a9cdadc96074941ad66b16",
};

// ===== Init =====
const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getFirestore(app);

// ---------- Auth ----------
export const signIn = (email, password) =>
  signInWithEmailAndPassword(auth, email, password);

export const signOutUser = () => signOut(auth);

/** subscribe auth state; callback(user, roleOrNull) */
export const onAuth = (cb) =>
  onAuthStateChanged(auth, async (user) => {
    if (!user) return cb(null, null);
    const token = await user.getIdTokenResult(true);
    cb(user, token.claims?.role || null);
  });

// ---------- Helpers ----------
export async function assertAdmin() {
  const user = auth.currentUser;
  if (!user) throw new Error("โปรดเข้าสู่ระบบก่อน");
  const token = await user.getIdTokenResult(true);
  if (token.claims?.role !== "admin") throw new Error("บัญชีนี้ไม่มีสิทธิ์ admin");
  return user;
}

// ---------- Members ----------
export async function getMember(phone) {
  await assertAdmin();
  const snap = await getDoc(doc(db, "members", phone));
  return snap.exists() ? { id: phone, ...snap.data() } : null;
}

export async function updateMember(phone, payload) {
  await assertAdmin();
  await updateDoc(doc(db, "members", phone), {
    ...payload,
    updatedAt: serverTimestamp(),
    updatedBy: auth.currentUser?.uid || "unknown",
  });
}

/** migrate member phone + update all logs, then delete old doc */
export async function migratePhone(oldPhone, newPhone) {
  await assertAdmin();

  const oldRef  = doc(db, "members", oldPhone);
  const oldSnap = await getDoc(oldRef);
  if (!oldSnap.exists()) throw new Error("ไม่พบสมาชิกเก่า");

  const data = oldSnap.data();
  await setDoc(doc(db, "members", newPhone), {
    ...data, phone: newPhone,
    migratedFrom: oldPhone, migratedAt: serverTimestamp(),
    migratedBy: auth.currentUser?.uid || "unknown",
  });

  const bump = async (col) => {
    let last = null, total = 0;
    while (true) {
      const qy = query(
        collection(db, col),
        where("phone","==", oldPhone),
        limit(400),
        ...(last ? [startAfter(last)] : [])
      );
      const snap = await getDocs(qy);
      if (snap.empty) break;
      const batch = writeBatch(db);
      snap.docs.forEach(d => batch.update(d.ref, {
        phone: newPhone,
        editedAt: serverTimestamp(),
        editedBy: auth.currentUser?.uid || "unknown",
        editNote: `migrate phone ${oldPhone}→${newPhone}`,
      }));
      await batch.commit();
      total += snap.size;
      last = snap.docs[snap.docs.length - 1];
      if (snap.size < 400) break;
    }
    return total;
  };

  const c1 = await bump("point_logs");
  const c2 = await bump("redeem_logs");

  await deleteDoc(oldRef);
  return { pointUpdated: c1, redeemUpdated: c2 };
}

// ---------- Logs ----------
/** get logs by phone (with index fallback) */
export async function getLogsByPhone(col, phone) {
  await assertAdmin();
  try {
    const q1 = query(collection(db, col), where("phone","==", phone), orderBy("createdAt","desc"));
    const snap = await getDocs(q1);
    return snap.docs.map(d => ({ _id: d.id, ...d.data() }));
  } catch (e) {
    if (String(e.message || e).includes("index")) {
      const q2 = query(collection(db, col), where("phone","==", phone));
      const snap2 = await getDocs(q2);
      return snap2.docs.map(d => ({ _id: d.id, ...d.data() }))
        .sort((a,b) => (b?.createdAt?.seconds||0) - (a?.createdAt?.seconds||0));
    }
    throw e;
  }
}

export async function updateLog(col, id, data) {
  await assertAdmin();
  await updateDoc(doc(db, col, id), {
    ...data,
    editedAt: serverTimestamp(),
    editedBy: auth.currentUser?.uid || "unknown",
  });
}

export async function softDeleteLog(col, id, reason) {
  await assertAdmin();
  await updateDoc(doc(db, col, id), {
    deleted: true,
    deleteReason: reason || null,
    deletedAt: serverTimestamp(),
    deletedBy: auth.currentUser?.uid || "unknown",
  });
}

// expose for debugging (optional)
// export { auth, db };
