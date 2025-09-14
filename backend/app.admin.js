import { api } from "./api.admin.js";

/* ---------- Helpers: ปุ่มโหลด ---------- */
function withButton(btn, busyText, task) {
  const textEl = btn.querySelector("[data-text]") || btn;
  const spinEl = btn.querySelector("[data-spin]");
  const oldText = textEl.textContent;
  btn.disabled = true;
  textEl.textContent = busyText || oldText;
  if (spinEl) spinEl.classList.remove("hidden");
  return Promise.resolve().then(task).finally(() => {
    btn.disabled = false;
    textEl.textContent = oldText;
    if (spinEl) spinEl.classList.add("hidden");
  });
}
function wrapLoading(fnName, btnId, busyText) {
  const orig = window[fnName];
  if (typeof orig !== "function") return;
  window[fnName] = async function (...args) {
    const btn = document.getElementById(btnId);
    if (!btn) return orig.apply(this, args);
    return withButton(btn, busyText || "กำลังทำงาน...", () => Promise.resolve(orig.apply(this, args)));
  };
}
const toTF = (v) => (String(v).toUpperCase() === "TRUE" ? "TRUE" : "FALSE");

/* ---------- STAFFS ---------- */
window.loadStaffs = async function loadStaffs() {
  try {
    const data = await api.getStaffs();
    const list = data.data || [];
    const table = document.getElementById("staffTable");
    table.innerHTML = "";
    list.forEach((staff, index) => {
      const sid = staff._id || staff.StaffID || "";
      const row = document.createElement("tr");
      row.innerHTML = `
        <td data-label="StaffID"   class="border px-4 py-2">${staff.StaffID || sid}</td>
        <td data-label="Username"  class="border px-4 py-2">${staff.Username || ""}</td>
        <td data-label="Password"  class="border px-4 py-2">•••••</td>
        <td data-label="Name"      class="border px-4 py-2">${staff.Name || ""}</td>
        <td data-label="BranchID"  class="border px-4 py-2">${staff.BranchID || ""}</td>
        <td data-label="Role"      class="border px-4 py-2">${staff.Role || ""}</td>
        <td data-label="Status"    class="border px-4 py-2">${staff.Status || ""}</td>
        <td data-label="จัดการ"    class="border px-4 py-2">
          <button onclick="editStaff(${index})" class="text-blue-600">✏️</button>
          <button onclick="deleteStaff('${sid}')" class="text-red-600 ml-2">🗑️</button>
        </td>`;
      table.appendChild(row);
    });
    window.staffList = list;
  } catch (err) { alert(`❌ ${err.message}`); }
};

window.openStaffModal = function (editing = false) {
  document.getElementById("staffModal").classList.remove("hidden");
  document.getElementById("staffModalTitle").innerText = editing ? "แก้ไขพนักงาน" : "เพิ่มพนักงานใหม่";
  window.isEditingStaff = editing;
};
window.closeStaffModal = function () {
  document.getElementById("staffModal").classList.add("hidden");
  document.querySelectorAll("#staffModal input, #staffModal select").forEach(el => el.value = "");
  window.editIndex = null;
};
window.editStaff = function (index) {
  const s = (window.staffList || [])[index] || {};
  document.getElementById("modalUsername").value = s.Username || "";
  document.getElementById("modalPassword").value = "";
  document.getElementById("modalName").value     = s.Name || "";
  document.getElementById("modalBranch").value   = s.BranchID || "";
  document.getElementById("modalRole").value     = s.Role || "staff";
  document.getElementById("modalStatus").value   = s.Status || "active";
  window.editIndex = index;
  openStaffModal(true);
};
window.saveStaff = async function saveStaff() {
  const Username = document.getElementById("modalUsername").value.trim();
  const Password = document.getElementById("modalPassword").value.trim();
  const Name     = document.getElementById("modalName").value.trim();
  const BranchID = document.getElementById("modalBranch").value.trim();
  const Role     = document.getElementById("modalRole").value;
  const Status   = document.getElementById("modalStatus").value;

  try {
    if (!Username) throw new Error("กรุณากรอก Username");
    if (!Name)     throw new Error("กรุณากรอกชื่อพนักงาน");
    if (window.editIndex == null && await api.isUsernameTaken(Username)) {
      throw new Error("Username นี้ถูกใช้แล้ว");
    }
    const current = window.editIndex != null ? (window.staffList || [])[window.editIndex] : null;
    if (window.editIndex != null) {
      await api.updateStaff({ _id: current?._id || current?.StaffID, Username, Password, Name, BranchID, Role, Status });
    } else {
      await api.addStaff({ Username, Password, Name, BranchID, Role, Status });
    }
    alert("✅ บันทึกข้อมูลพนักงานสำเร็จ");
    closeStaffModal();
    loadStaffs();
  } catch (err) { alert(`❌ ${err.message}`); }
};
window.deleteStaff = async function deleteStaff(staffId) {
  if (!confirm("ยืนยันลบพนักงาน?")) return;
  try {
    await api.deleteStaff({ _id: staffId });
    alert("🗑️ ลบพนักงานสำเร็จ");
    loadStaffs();
  } catch (err) { alert(`❌ ${err.message}`); }
};

/* ---------- REWARDS (Admin) ---------- */
window.loadRewards = async function loadRewards() {
  try {
    const data = await api.getRewards();
    const list = data.data || [];
    const table = document.getElementById("rewardTable");
    table.innerHTML = "";
    list.forEach((r, index) => {
      const rid = r._id || r.rewardID || "";
      const row = document.createElement("tr");
      row.innerHTML = `
        <td data-label="rewardID"   class="border px-4 py-2">${r.rewardID || rid}</td>
        <td data-label="rewardName" class="border px-4 py-2">${r.rewardName || ""}</td>
        <td data-label="points"     class="border px-4 py-2">${r.points ?? 0}</td>
        <td data-label="active"     class="border px-4 py-2">${toTF(r.active)}</td>
        <td data-label="startDate"  class="border px-4 py-2">${r.startDate || ""}</td>
        <td data-label="endDate"    class="border px-4 py-2">${r.endDate || ""}</td>
        <td data-label="stock"      class="border px-4 py-2">${r.stock ?? 0}</td>
        <td data-label="จัดการ"     class="border px-4 py-2">
          <button onclick="editReward(${index})" class="text-blue-600">✏️</button>
          <button onclick="deleteReward('${rid}')" class="text-red-600 ml-2">🗑️</button>
        </td>`;
      table.appendChild(row);
    });
    window.rewardList = list;
  } catch (err) { alert(`❌ ${err.message}`); }
};

window.openRewardModal = function (editing = false) {
  document.getElementById("rewardModal").classList.remove("hidden");
  document.getElementById("rewardModalTitle").innerText = editing ? "แก้ไขรางวัล" : "เพิ่มรางวัล";
  window.isEditingReward = editing;
};
window.closeRewardModal = function () {
  document.getElementById("rewardModal").classList.add("hidden");
  document.querySelectorAll("#rewardModal input, #rewardModal select").forEach(el => el.value = "");
  window.editRewardIndex = null;
};
window.editReward = function (index) {
  const r = (window.rewardList || [])[index] || {};
  document.getElementById("rewardName").value = r.rewardName || "";
  document.getElementById("points").value    = r.points ?? 0;
  document.getElementById("active").value    = toTF(r.active);
  document.getElementById("startDate").value = r.startDate || "";
  document.getElementById("endDate").value   = r.endDate || "";
  document.getElementById("stock").value     = r.stock ?? 0;
  window.editRewardIndex = index;
  openRewardModal(true);
};
window.saveReward = async function saveReward() {
  const rewardName = document.getElementById("rewardName").value.trim();
  const points     = document.getElementById("points").value;
  const active     = toTF(document.getElementById("active").value);
  const startDate  = document.getElementById("startDate").value;
  const endDate    = document.getElementById("endDate").value;
  const stock      = document.getElementById("stock").value;
  try {
    if (!rewardName) throw new Error("กรุณากรอกชื่อรางวัล");
    if (points === "") throw new Error("กรุณากรอกแต้มที่ใช้");
    if (stock  === "") throw new Error("กรุณากรอกสต็อก");
    const current = window.editRewardIndex != null ? (window.rewardList || [])[window.editRewardIndex] : null;
    if (window.editRewardIndex != null) {
      await api.updateReward({ _id: current?._id || current?.rewardID, rewardName, points, active, startDate, endDate, stock });
    } else {
      await api.addReward({ rewardName, points, active, startDate, endDate, stock });
    }
    alert("✅ บันทึกรางวัลสำเร็จ");
    closeRewardModal();
    loadRewards();
  } catch (err) { alert(`❌ ${err.message}`); }
};
window.deleteReward = async function deleteReward(rewardId) {
  if (!confirm("ยืนยันลบรางวัล?")) return;
  try {
    await api.deleteReward({ _id: rewardId });
    alert("🗑️ ลบรางวัลสำเร็จ");
    loadRewards();
  } catch (err) { alert(`❌ ${err.message}`); }
};

/* ---------- Boot & wrap buttons ---------- */
document.addEventListener("DOMContentLoaded", () => {
  wrapLoading("saveStaff",   "saveStaffBtn",   "กำลังบันทึก...");
  wrapLoading("saveReward",  "saveRewardBtn",  "กำลังบันทึก...");
  wrapLoading("loadStaffs",  "loadStaffsBtn",  "กำลังโหลด...");
  wrapLoading("loadRewards", "loadRewardsBtn", "กำลังโหลด...");
  loadStaffs();
  loadRewards();
});
