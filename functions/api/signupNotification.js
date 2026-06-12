/**
 * signupNotification — founder visibility into new account creation.
 *
 * Trigger: onDocumentCreated for `users/{userId}`.
 *
 * The users/{userId} doc is created by the client on first auth-state change
 * (AuthContext writes { lastActivity }), so it appears once per new account.
 * The doc itself holds no PII — email and display name live in Firebase Auth —
 * so we read those from Auth using the doc id (which IS the uid).
 *
 * The entire point is visibility into accounts that never reach checkout, so
 * this fires on ACCOUNT creation, not subscription creation.
 *
 * Hard requirements (see access-gate brief):
 *   - Never throw in a way that affects the signup. The whole body is wrapped
 *     in try/catch; failures are logged + sent to Sentry, never rethrown.
 *   - Idempotent. onDocumentCreated fires once per create, and because we never
 *     throw the platform won't retry; a `signupNotifiedAt` marker is a second
 *     belt against any rare double-delivery.
 */

require("../lib/firebase"); // ensure admin app is initialized
const { getAuth } = require("firebase-admin/auth");
const { getFirestore } = require("firebase-admin/firestore");
const Sentry = require("@sentry/node");
const { sendMail } = require("../lib/mailer");

const NOTIFY_TO = process.env.SIGNUP_NOTIFY_TO || "barb@yourdressagejourney.com";

async function onUserCreated(event) {
  try {
    const userId = event.params.userId;
    const snap = event.data;
    const docData = snap ? snap.data() || {} : {};

    // Idempotency guard — skip if a prior run already notified for this doc.
    if (docData.signupNotifiedAt) return;

    // Email / name live in Auth, not the Firestore doc.
    let email = "(unknown)";
    let displayName = "";
    let created = "";
    try {
      const u = await getAuth().getUser(userId);
      email = u.email || "(unknown)";
      displayName = u.displayName || "";
      created = u.metadata.creationTime || "";
    } catch (authErr) {
      // No Auth user (e.g. an admin-scripted users doc) — still notify with
      // whatever we have rather than dropping the signal.
      console.warn(
        `signupNotification: no Auth user for ${userId}: ${authErr.message}`
      );
    }

    const createdAt = created || docData.lastActivity || "(unknown)";
    const subject = `New YDJ signup: ${email}`;
    const text = [
      "A new account was just created on Your Dressage Journey.",
      "",
      `Email: ${email}`,
      `Name: ${displayName || "(not provided)"}`,
      `UID: ${userId}`,
      `Created: ${createdAt}`,
      "",
      "This account has no subscription yet. It was flagged on account creation, not on checkout.",
    ].join("\n");

    await sendMail({ to: NOTIFY_TO, subject, text });

    // Best-effort marker; its own failure must not affect anything.
    try {
      await getFirestore()
        .collection("users")
        .doc(userId)
        .set({ signupNotifiedAt: new Date().toISOString() }, { merge: true });
    } catch (markErr) {
      console.warn(
        `signupNotification: marker write failed for ${userId}: ${markErr.message}`
      );
    }
  } catch (err) {
    // Swallow — a notification failure must never affect the signup itself.
    console.error("signupNotification failed:", err);
    try {
      Sentry.captureException(err);
    } catch (_) {
      /* Sentry best-effort */
    }
  }
}

module.exports = { onUserCreated };
