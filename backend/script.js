const PASSWORD_HASH = "8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92";
const LOGIN_KEY = "mp_gate_ok";

/* ====== Utils ====== */
async function sha256Hex(text) {
  const enc = new TextEncoder().encode(text);
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2,"0")).join("");
}

/* ====== Elements ====== */
const loginGate = document.getElementById("loginGate");
const appShell  = document.getElementById("appShell");
const loginForm = document.getElementById("loginForm");
const loginMsg  = document.getElementById("loginMsg");
const btnLogout = document.getElementById("btnLogout");

/* ====== Gate Functions ====== */
function openApp() {
  loginGate.classList.add("hidden");
  appShell.classList.remove("hidden");
  initTabs(); // เปิดแอปแล้วค่อย init tabs
}
function closeApp() {
  appShell.classList.add("hidden");
  loginGate.classList.remove("hidden");
}

/* เปิดหน้ามา ถ้าเคยผ่าน gate แล้วให้เข้าเลย */
if (localStorage.getItem(LOGIN_KEY) === "1") openApp();

/* ฟอร์มล็อกอิน */
if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    loginMsg.textContent = "";
    const pass = (document.getElementById("password").value || "").trim();
    if (!pass) { loginMsg.textContent = "กรุณากรอกรหัสผ่าน"; return; }

    try {
      const hash = await sha256Hex(pass);
      if (hash === PASSWORD_HASH) {
        localStorage.setItem(LOGIN_KEY, "1");
        openApp();
      } else {
        loginMsg.textContent = "รหัสผ่านไม่ถูกต้อง";
      }
    } catch (err) {
      console.error(err);
      loginMsg.textContent = "เกิดข้อผิดพลาด โปรดลองอีกครั้ง";
    }
  });
}

/* ออกจากระบบ */
if (btnLogout) {
  btnLogout.addEventListener("click", () => {
    localStorage.removeItem(LOGIN_KEY);
    closeApp();
  });
}

/* ====== Tabs ====== */
function initTabs() {
  const buttons = document.querySelectorAll('.tab-btn');
  const panels = document.querySelectorAll('.tab-panel');

  const hashToTab = { 
    '#public': 'tab-rewards-public',
    '#staff': 'tab-staff-rewards',
    '#uplode': 'tab-uplode'
  };

  function showPanel(id) {
    panels.forEach(p => p.classList.toggle('hidden', p.id !== id));
    buttons.forEach(b => b.setAttribute('aria-selected', String(b.dataset.target === id)));
    localStorage.setItem('mp_active_tab', id);
  }

  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.target;
      showPanel(id);

      let hash = "";
      if (id === "tab-rewards-public") hash = "public";
      else if (id === "tab-staff-rewards") hash = "staff";
      else if (id === "tab-uplode") hash = "uplode";

      history.replaceState(null, "", "#" + hash);
    });
  });

  const fromHash = hashToTab[location.hash];
  const saved = localStorage.getItem('mp_active_tab') || 'tab-rewards-public';
  showPanel(fromHash || saved);

  window.addEventListener('hashchange', () => {
    const id = hashToTab[location.hash];
    if (id) showPanel(id);
  });
}
