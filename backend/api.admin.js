// Admin API (Staff & Rewards Admin)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getFirestore, collection, getDocs, addDoc, doc, setDoc, updateDoc, deleteDoc,
  serverTimestamp, query, orderBy
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyDvTJ5tEKo_J1r4l9zP-oi07yoj2I-UcZo",
  authDomain: "maeprakham.firebaseapp.com",
  projectId: "maeprakham",
  storageBucket: "maeprakham.appspot.com",
  messagingSenderId: "807144309923",
  appId: "1:807144309923:web:a9cdadc96074941ad66b16",
};

const app  = initializeApp(firebaseConfig);
const db   = getFirestore(app);
const auth = getAuth(app);

// แยกคอลเลกชัน Admin
const STAFFS_COLLECTION = "staffs";
const REWARDS_ADMIN_COLLECTION = "rewards_admin";

// auth helper
let _authReady;
function ensureAuth() {
  if (_authReady) return _authReady;
  _authReady = new Promise((resolve, reject) => {
    onAuthStateChanged(auth, (user) => {
      if (user) return resolve(user);
      signInAnonymously(auth).then(cred => resolve(cred.user)).catch(reject);
    }, reject);
  });
  return _authReady;
}

// utils
const toTF = (v) => (String(v).toUpperCase() === "TRUE" ? "TRUE" : "FALSE");
const tfToBool  = (v) => String(v).toUpperCase() === "TRUE";
const boolToTF  = (b) => (b ? "TRUE" : "FALSE");
async function sha256Hex(text) {
  const enc = new TextEncoder().encode(text);
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2,"0")).join("");
}
function genId(prefix){ const rand=Math.random().toString(36).slice(2,8).toUpperCase(); const ts=Date.now().toString(36).toUpperCase(); return `${prefix}-${ts}${rand}`; }

// API
export const api = {
  async getStaffs() {
    await ensureAuth();
    const q = query(collection(db, STAFFS_COLLECTION), orderBy("createdAt","desc"));
    const snap = await getDocs(q);
    const data = snap.docs.map(d => {
      const v = d.data();
      return { _id:d.id, StaffID:v.StaffID||d.id, Username:v.Username||"", Password:"", Name:v.Name||"", BranchID:v.BranchID||"", Role:v.Role||"staff", Status:v.Status||"active" };
    });
    return { data };
  },
  async addStaff(payload) {
    await ensureAuth();
    const { Username, Password, Name, BranchID, Role, Status } = payload;
    const id = genId("S");
    await setDoc(doc(db, STAFFS_COLLECTION, id), {
      StaffID:id, Username,
      PasswordHash: Password ? await sha256Hex(Password) : null,
      Name, BranchID, Role, Status,
      createdAt: serverTimestamp(), updatedAt: serverTimestamp()
    });
    return { status:"success", id };
  },
  async updateStaff(by) {
    await ensureAuth();
    const id = by._id || by.StaffID; if (!id) throw new Error("missing StaffID");
    const { Username, Password, Name, BranchID, Role, Status } = by;
    const updates = {
      ...(Username!==undefined && {Username}),
      ...(Name!==undefined && {Name}),
      ...(BranchID!==undefined && {BranchID}),
      ...(Role!==undefined && {Role}),
      ...(Status!==undefined && {Status}),
      updatedAt: serverTimestamp(),
    };
    if (Password !== undefined && Password !== "") updates.PasswordHash = await sha256Hex(Password);
    await updateDoc(doc(db, STAFFS_COLLECTION, id), updates);
    return { status:"updated" };
  },
  async deleteStaff(by) {
    await ensureAuth();
    const id = by._id || by.StaffID; if (!id) throw new Error("missing StaffID");
    await deleteDoc(doc(db, STAFFS_COLLECTION, id));
    return { status:"deleted" };
  },
  async isUsernameTaken(username) {
    const res = await this.getStaffs();
    return (res.data||[]).some(s => (s.Username||"").toLowerCase() === (username||"").toLowerCase());
  },

  async getRewards() {
    await ensureAuth();
    const q = query(collection(db, REWARDS_ADMIN_COLLECTION), orderBy("createdAt","desc"));
    const snap = await getDocs(q);
    const data = snap.docs.map(d => {
      const v = d.data();
      return { _id:d.id, rewardID:v.rewardID||d.id, rewardName:v.rewardName||"", points:v.points??0, active:boolToTF(!!v.active), startDate:v.startDate||"", endDate:v.endDate||"", stock:v.stock??0 };
    });
    return { data };
  },
  async addReward(payload) {
    await ensureAuth();
    const { rewardName, points, active, startDate, endDate, stock } = payload;
    const id = genId("R");
    await setDoc(doc(db, REWARDS_ADMIN_COLLECTION, id), {
      rewardID:id, rewardName,
      points:Number(points??0), active: tfToBool(active),
      startDate: startDate||"", endDate: endDate||"",
      stock:Number(stock??0),
      createdAt: serverTimestamp(), updatedAt: serverTimestamp()
    });
    return { status:"success", id };
  },
  async updateReward(by) {
    await ensureAuth();
    const id = by._id || by.rewardID; if (!id) throw new Error("missing rewardID");
    const updates = {};
    if ("rewardName" in by) updates.rewardName = by.rewardName;
    if ("points" in by)     updates.points     = Number(by.points??0);
    if ("active" in by)     updates.active     = tfToBool(by.active);
    if ("startDate" in by)  updates.startDate  = by.startDate||"";
    if ("endDate" in by)    updates.endDate    = by.endDate||"";
    if ("stock" in by)      updates.stock      = Number(by.stock??0);
    updates.updatedAt = serverTimestamp();
    await updateDoc(doc(db, REWARDS_ADMIN_COLLECTION, id), updates);
    return { status:"updated" };
  },
  async deleteReward(by) {
    await ensureAuth();
    const id = by._id || by.rewardID; if (!id) throw new Error("missing rewardID");
    await deleteDoc(doc(db, REWARDS_ADMIN_COLLECTION, id));
    return { status:"deleted" };
  },
};
