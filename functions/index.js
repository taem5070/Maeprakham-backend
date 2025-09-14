import * as functions from "firebase-functions";
import admin from "firebase-admin";
if (!admin.apps.length) admin.initializeApp();

/**
 * setAdminRoleCallable
 * เฉพาะ “ผู้เรียกที่มี role=admin” เท่านั้นถึงจะตั้งสิทธิ์ให้คนอื่นได้
 * data: { email: string, role?: "admin" | null }  // role ไม่ใส่ = "admin"; ใส่ null = ล้างสิทธิ์
 */
export const setAdminRoleCallable = functions.https.onCall(async (data, context) => {
  // 1) ต้องล็อกอิน
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Please sign in.");
  }
  // 2) ผู้เรียกต้องเป็น admin อยู่แล้ว
  const callerClaims = context.auth.token || {};
  if (callerClaims.role !== "admin") {
    throw new functions.https.HttpsError("permission-denied", "Admin only.");
  }

  const email = (data?.email || "").trim().toLowerCase();
  // (ออปชัน) บังคับโดเมนเดียว
  // if (!email.endsWith("@yourdomain.com")) throw new functions.https.HttpsError("permission-denied","Invalid domain");

  if (!email) {
    throw new functions.https.HttpsError("invalid-argument", "email is required");
  }
  const role = data?.role === null ? null : (data?.role || "admin");

  const user = await admin.auth().getUserByEmail(email);
  const prev = user.customClaims || {};
  const next = { ...prev };
  if (role) next.role = role; else delete next.role;

  await admin.auth().setCustomUserClaims(user.uid, next);
  await admin.auth().revokeRefreshTokens(user.uid);

  return { ok: true, uid: user.uid, email: user.email, role: role || null };
});
