import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { REWARDS_PUBLIC_COLLECTION, REWARDS_PUBLIC_STORAGE_PREFIX } from "./api.rewards.js";

const { db, storage, auth, fs, st, ensureAuth } = window.__fb; // ⬅️ เพิ่ม ensureAuth
const { collection, doc, getDocs, getDoc, addDoc, updateDoc, deleteDoc, serverTimestamp, query, orderBy } = fs;
const { ref, uploadBytes, getDownloadURL, deleteObject } = st;

// DOM
const TBL = document.getElementById("rewardsTable");
const FORM = document.getElementById("rewardForm");
const FORM_TITLE = document.getElementById("formTitle");
const BTN_SAVE = document.getElementById("btnSave");
const BTN_CLEAR = document.getElementById("btnClear");
const BTN_REFRESH = document.getElementById("btnRefresh");
const STATUS = document.getElementById("saveStatus");
const SEARCH = document.getElementById("searchInput");

const F_ID = document.getElementById("rewardId");
const F_TITLE = document.getElementById("title");
const F_DESC = document.getElementById("description");
const F_POINTS = document.getElementById("points");
const F_STATUS = document.getElementById("status");
const F_IMAGE = document.getElementById("image");

let ALL = [];
let FILTERED = [];

// Utils
function toast(msg, type = "info") {
  STATUS.textContent = msg;
  STATUS.className = "text-sm " + (type === "error" ? "text-red-600" : "text-gray-500");
  if (msg) setTimeout(() => (STATUS.textContent = ""), 1800);
}
function clearForm() {
  F_ID.value = "";
  F_TITLE.value = "";
  F_DESC.value = "";
  F_POINTS.value = "";
  F_STATUS.value = "ON";
  F_IMAGE.value = "";
  FORM_TITLE.textContent = "เพิ่มของรางวัล";
}
function bindRowEvents() {
  document.querySelectorAll("[data-edit]").forEach(btn => {
    btn.addEventListener("click", async e => {
      const id = e.currentTarget.getAttribute("data-edit");
      const d = ALL.find(x => x.id === id);
      if (!d) return;
      F_ID.value = d.id;
      F_TITLE.value = d.title || "";
      F_DESC.value = d.description || "";
      F_POINTS.value = d.points ?? 0;
      F_STATUS.value = d.status || "ON";
      FORM_TITLE.textContent = "แก้ไขของรางวัล";
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  });
  document.querySelectorAll("[data-delete]").forEach(btn => {
    btn.addEventListener("click", async e => {
      const id = e.currentTarget.getAttribute("data-delete");
      if (!confirm("ลบรายการนี้?")) return;
      try {
        await ensureAuth(); // ⬅️ กัน auth ยังไม่พร้อม
        const snap = await getDoc(doc(db, REWARDS_PUBLIC_COLLECTION, id));
        if (snap.exists()) {
          const data = snap.data();
          if (data.imagePath) {
            try { await deleteObject(ref(storage, data.imagePath)); } catch (_) {}
          }
        }
        await deleteDoc(doc(db, REWARDS_PUBLIC_COLLECTION, id));
        toast("ลบสำเร็จ");
        await loadList();
      } catch (err) {
        console.error(err);
        toast("ลบไม่สำเร็จ", "error");
      }
    });
  });
}
function render(list) {
  TBL.innerHTML = list.map(d => {
    const t = d.updatedAt?.toDate?.() || d.updatedAt || null;
    const ts = t ? new Date(t).toLocaleString("th-TH") : "-";
    const img = d.imageUrl
      ? `<img src="${d.imageUrl}" class="w-16 h-16 object-cover rounded-xl border" />`
      : `<div class="w-16 h-16 rounded-xl bg-gray-100 border"></div>`;
    return `
      <tr class="border-b align-top">
        <td class="py-2 pr-3">${img}</td>
        <td class="py-2 pr-3">
          <div class="font-medium">${d.title || "-"}</div>
          <div class="text-gray-500 text-xs">${d.description || ""}</div>
        </td>
        <td class="py-2 pr-3">${d.points ?? 0}</td>
        <td class="py-2 pr-3">
          <span class="px-2 py-1 text-xs rounded-full ${d.status==='ON'?'bg-green-100 text-green-700':'bg-gray-100 text-gray-600'}">
            ${d.status || "-"}
          </span>
        </td>
        <td class="py-2 pr-3 text-gray-500 text-xs">${ts}</td>
        <td class="py-2 pr-3">
          <div class="flex gap-2">
            <button class="px-2 py-1 rounded-lg border" data-edit="${d.id}">แก้ไข</button>
            <button class="px-2 py-1 rounded-lg border text-red-600" data-delete="${d.id}">ลบ</button>
          </div>
        </td>
      </tr>
    `;
  }).join("");
  bindRowEvents();
}
function applyFilter() {
  const q = (SEARCH.value || "").trim().toLowerCase();
  if (!q) FILTERED = [...ALL];
  else {
    FILTERED = ALL.filter(d =>
      (d.title || "").toLowerCase().includes(q) ||
      (d.description || "").toLowerCase().includes(q)
    );
  }
  render(FILTERED);
}

// Core
async function loadList() {
  try {
    await ensureAuth(); // ⬅️ เพิ่ม
    TBL.innerHTML = `<tr><td colspan="6" class="py-6 text-center text-gray-500">กำลังโหลด...</td></tr>`;
    const qRef = query(collection(db, REWARDS_PUBLIC_COLLECTION), orderBy("updatedAt", "desc"));
    const snap = await getDocs(qRef);
    ALL = snap.docs.map(x => ({ id: x.id, ...x.data() }));
    applyFilter();
  } catch (err) {
    console.error(err);
    toast("โหลดรายการไม่สำเร็จ", "error");
    TBL.innerHTML = `<tr><td colspan="6" class="py-6 text-center text-red-600">โหลดไม่สำเร็จ</td></tr>`;
  }
}

async function saveReward(e) {
  e.preventDefault();
  BTN_SAVE.disabled = true;
  BTN_SAVE.textContent = "กำลังบันทึก...";
  try {
    await ensureAuth(); // ⬅️ เพิ่ม

    const id = F_ID.value.trim();
    const payload = {
      title: F_TITLE.value.trim(),
      description: F_DESC.value.trim(),
      points: Number(F_POINTS.value || 0),
      status: F_STATUS.value,
      updatedAt: serverTimestamp(),
    };
    if (!payload.title) throw new Error("กรุณากรอกชื่อของรางวัล");

    let docRef;
    if (id) {
      docRef = doc(db, REWARDS_PUBLIC_COLLECTION, id);
      await updateDoc(docRef, payload);
    } else {
      payload.createdAt = serverTimestamp();
      docRef = await addDoc(collection(db, REWARDS_PUBLIC_COLLECTION), payload);
    }
    const rewardId = id || docRef.id;

    const file = F_IMAGE.files && F_IMAGE.files[0];
    if (file) {
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
      const fileRef = ref(storage, `${REWARDS_PUBLIC_STORAGE_PREFIX}/${rewardId}/main.${ext}`);
      await uploadBytes(fileRef, file); // ตอนนี้มี token แล้ว
      const url = await getDownloadURL(fileRef);
      await updateDoc(doc(db, REWARDS_PUBLIC_COLLECTION, rewardId), {
        imageUrl: url,
        imagePath: fileRef.fullPath,
        updatedAt: serverTimestamp(),
      });
    }

    toast("บันทึกสำเร็จ");
    clearForm();
    await loadList();
  } catch (err) {
    console.error(err);
    toast(err.message || "บันทึกไม่สำเร็จ", "error");
  } finally {
    BTN_SAVE.disabled = false;
    BTN_SAVE.textContent = "บันทึก";
  }
}

// Events & Boot
FORM.addEventListener("submit", saveReward);
BTN_CLEAR.addEventListener("click", clearForm);
BTN_REFRESH.addEventListener("click", loadList);
SEARCH.addEventListener("input", applyFilter);

// Boot: ใช้ ensureAuth แทน onAuthStateChanged แบบเดิม
await ensureAuth();
loadList();
