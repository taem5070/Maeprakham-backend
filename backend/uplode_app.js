// app.js — UI layer (imports api.js)
import {
  onAuth, signIn, signOutUser,
  getMember, updateMember, migratePhone,
  getLogsByPhone, updateLog, softDeleteLog
} from "./uplode_api.js";

const $ = (id) => document.getElementById(id);
const show = (el) => el.classList.remove("hidden");
const hide = (el) => el.classList.add("hidden");

// ---------- Format helpers ----------
const fmtDate = (ts) => {
  try {
    if (!ts) return "-";
    if (ts?.toDate) return ts.toDate().toLocaleString();
    if (ts?.seconds) return new Date(ts.seconds * 1000).toLocaleString();
    const d = new Date(ts); return isNaN(d) ? "-" : d.toLocaleString();
  } catch { return "-"; }
};
const toLocalDatetimeInput = (ts) => {
  let d;
  if (ts?.toDate) d = ts.toDate();
  else if (ts?.seconds) d = new Date(ts.seconds * 1000);
  else if (ts) d = new Date(ts);
  else d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
const fromDatetimeInput = (v) => v ? new Date(v) : null;

// ---------- Auth UI ----------
onAuth(async (user, role) => {
  const loginBox   = $("loginBox");
  const adminPanel = $("adminPanel");
  const logoutBtn  = $("logoutBtn");
  const authInfo   = $("authInfo");
  const loginMsg   = $("loginMsg");

  if (!user) {
    hide(adminPanel); show(loginBox); hide(logoutBtn);
    authInfo.textContent = ""; loginMsg.textContent = "";
    return;
  }
  authInfo.textContent = `${user.email || user.uid} (${role || "no-role"})`;
  if (role === "admin") {
    $("adminUid").textContent = user.uid;
    show(adminPanel); hide(loginBox); show(logoutBtn);
    loginMsg.textContent = "";
  } else {
    hide(adminPanel); show(loginBox); hide(logoutBtn);
    loginMsg.textContent = "บัญชีนี้ไม่มีสิทธิ์ admin (role=admin)";
  }
});

$("loginBtn").onclick = async () => {
  const email = $("email").value.trim();
  const pass  = $("password").value;
  $("loginMsg").textContent = "";
  try { await signIn(email, pass); }
  catch (e) { $("loginMsg").textContent = e.message || "เข้าสู่ระบบไม่สำเร็จ"; }
};

$("logoutBtn").onclick = async () => { await signOutUser(); };

// ---------- Modal ----------
const modal = {
  el: () => $("editModal"),
  show() { show(this.el()); this.el().classList.add("flex"); },
  hide() { hide(this.el()); this.el().classList.remove("flex"); }
};
$("emCancel").onclick = () => modal.hide();

// ---------- Render tables ----------
function renderPointTable(rows) {
  if (!rows.length) return `<div class="p-3 text-gray-500">ไม่มีข้อมูล</div>`;
  const head = `
    <table class="min-w-[720px] w-full text-sm">
      <thead class="bg-gray-100">
        <tr>
          <th class="border px-2 py-1">Bill</th>
          <th class="border px-2 py-1">Amount</th>
          <th class="border px-2 py-1">Points</th>
          <th class="border px-2 py-1">Date</th>
          <th class="border px-2 py-1">Staff</th>
          <th class="border px-2 py-1">สถานะ</th>
          <th class="border px-2 py-1">จัดการ</th>
        </tr>
      </thead><tbody>`;
  const body = rows.map(r => `
    <tr>
      <td class="border px-2 py-1">${r.bill ?? "-"}</td>
      <td class="border px-2 py-1">${r.amount ?? 0}</td>
      <td class="border px-2 py-1">${r.pointsAdded ?? 0}</td>
      <td class="border px-2 py-1">${fmtDate(r.createdAt)}</td>
      <td class="border px-2 py-1">${r.staffId ?? "-"}</td>
      <td class="border px-2 py-1">${r.deleted ? 'ลบแล้ว' : '-'}</td>
      <td class="border px-2 py-1">
        <button class="bg-amber-600 text-white px-2 py-1 rounded mr-1" onclick="adminUI.editLog('point_logs','${r._id}')">แก้</button>
        <button class="bg-rose-600 text-white px-2 py-1 rounded" onclick="adminUI.softDelete('point_logs','${r._id}')">ลบ</button>
      </td>
    </tr>`).join("");
  return head + body + `</tbody></table>`;
}

function renderRedeemTable(rows) {
  if (!rows.length) return `<div class="p-3 text-gray-500">ไม่มีข้อมูล</div>`;
  const head = `
    <table class="min-w-[720px] w-full text-sm">
      <thead class="bg-gray-100">
        <tr>
          <th class="border px-2 py-1">Reward</th>
          <th class="border px-2 py-1">Points Used</th>
          <th class="border px-2 py-1">Date</th>
          <th class="border px-2 py-1">Staff</th>
          <th class="border px-2 py-1">สถานะ</th>
          <th class="border px-2 py-1">จัดการ</th>
        </tr>
      </thead><tbody>`;
  const body = rows.map(r => `
    <tr>
      <td class="border px-2 py-1">${r.rewardName ?? "-"}</td>
      <td class="border px-2 py-1">${r.pointsUsed ?? 0}</td>
      <td class="border px-2 py-1">${fmtDate(r.createdAt)}</td>
      <td class="border px-2 py-1">${r.staffId ?? "-"}</td>
      <td class="border px-2 py-1">${r.deleted ? 'ลบแล้ว' : '-'}</td>
      <td class="border px-2 py-1">
        <button class="bg-amber-600 text-white px-2 py-1 rounded mr-1" onclick="adminUI.editLog('redeem_logs','${r._id}')">แก้</button>
        <button class="bg-rose-600 text-white px-2 py-1 rounded" onclick="adminUI.softDelete('redeem_logs','${r._id}')">ลบ</button>
      </td>
    </tr>`).join("");
  return head + body + `</tbody></table>`;
}

// ---------- UI actions (uses API) ----------
window.adminUI = {
  async search() {
    const phone = $("phoneInput").value.trim();
    if (!phone) return alert("กรอกเบอร์");

    $("message").textContent = "กำลังโหลด...";
    hide($("memberCard")); hide($("logsWrap"));

    const mem = await getMember(phone);
    if (!mem) { $("message").textContent = "ไม่พบสมาชิกเบอร์นี้"; return; }

    show($("memberCard"));
    $("mPhone").value    = mem.phone || phone;
    $("mName").value     = mem.name  || "";
    $("mBirthday").value = mem.birthday ? new Date(mem.birthday).toISOString().slice(0,10) : "";
    $("mPoints").value   = mem.points ?? 0;

    const pointRows  = await getLogsByPhone("point_logs", phone);
    const redeemRows = await getLogsByPhone("redeem_logs", phone);

    $("pointTable").innerHTML  = renderPointTable(pointRows);
    $("redeemTable").innerHTML = renderRedeemTable(redeemRows);
    show($("logsWrap"));
    $("message").textContent = "โหลดเสร็จ";
  },

  async saveMember() {
    const phone = $("mPhone").value.trim();
    if (!phone) return;

    await updateMember(phone, {
      name: $("mName").value.trim() || null,
      birthday: $("mBirthday").value || null, // yyyy-mm-dd
      points: Number($("mPoints").value || 0),
    });
    $("message").textContent = "บันทึกสมาชิกเรียบร้อย";
  },

  async changePhonePrompt() {
    const oldPhone = $("mPhone").value.trim();
    const newPhone = prompt("กรอกเบอร์ใหม่ที่จะย้ายไป:", "");
    if (!newPhone || newPhone === oldPhone) return;
    if (!confirm(`ยืนยันย้าย ${oldPhone} → ${newPhone} ?`)) return;

    const res = await migratePhone(oldPhone, newPhone);
    $("phoneInput").value = newPhone;
    $("message").textContent = `ย้ายเบอร์สำเร็จ: point_logs ${res.pointUpdated} / redeem_logs ${res.redeemUpdated}`;
    await this.search();
  },

  async editLog(col, id) {
    const phone = $("mPhone").value.trim();
    const rows = col === "point_logs"
      ? await getLogsByPhone("point_logs", phone)
      : await getLogsByPhone("redeem_logs", phone);
    const d = rows.find(r => r._id === id);
    if (!d) return alert("ไม่พบรายการ");

    $("emId").value  = id;
    $("emCol").value = col;
    $("emDate").value = toLocalDatetimeInput(d.createdAt);

    const isPoint = col === "point_logs";
    ["emBillWrap","emAmountWrap","emPointsAddedWrap"]
      .forEach(id => $(id).classList.toggle("hidden", !isPoint));
    ["emRewardWrap","emPointsUsedWrap"]
      .forEach(id => $(id).classList.toggle("hidden",  isPoint));

    if (isPoint) {
      $("emBill").value        = d.bill ?? "";
      $("emAmount").value      = d.amount ?? 0;
      $("emPointsAdded").value = d.pointsAdded ?? 0;
    } else {
      $("emReward").value     = d.rewardName ?? "";
      $("emPointsUsed").value = d.pointsUsed ?? 0;
    }

    $("emSave").onclick = async () => {
      const payload = { createdAt: fromDatetimeInput($("emDate").value) };
      if (isPoint) {
        payload.bill        = $("emBill").value.trim();
        payload.amount      = Number($("emAmount").value || 0);
        payload.pointsAdded = Number($("emPointsAdded").value || 0);
      } else {
        payload.rewardName = $("emReward").value.trim();
        payload.pointsUsed = Number($("emPointsUsed").value || 0);
      }
      await updateLog(col, id, payload);
      modal.hide();
      $("message").textContent = "แก้ไขรายการสำเร็จ";
      await this.search();
    };

    modal.show();
  },

  async softDelete(col, id) {
    const reason = prompt("เหตุผลที่ลบ (soft delete):", "");
    await softDeleteLog(col, id, reason);
    $("message").textContent = "ทำเครื่องหมายลบเรียบร้อย (soft delete)";
    await this.search();
  }
};

// bind search button in HTML
window.admin = { search: () => adminUI.search() };
