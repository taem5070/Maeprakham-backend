// set-claim.js
const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });

async function setAdmin(email) {
  const user = await admin.auth().getUserByEmail(email);
  await admin.auth().setCustomUserClaims(user.uid, { role: "admin" });
  // บังคับให้ต้องออกแล้วเข้าใหม่เพื่อรับ claim ล่าสุด
  await admin.auth().revokeRefreshTokens(user.uid);
  console.log("✅ set role=admin for:", user.email);
}

setAdmin("taem5090@gmail.com").catch(console.error);


// คำสั้งตั้งเป็น เเอดมินจัดการ 
// npm init -y
// npm i firebase-admin
// node set-claim.js
