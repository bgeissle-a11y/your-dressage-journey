/**
 * Authentication helpers for Firebase Functions v2 onCall
 *
 * v2 onCall functions automatically decode the Firebase Auth ID token
 * from the client SDK's httpsCallable() call. The decoded token is
 * available at request.auth (with uid, token, etc.).
 *
 * These helpers provide:
 * - validateAuth: ensures the caller is authenticated, returns uid
 * - validateOwnership: ensures the caller owns a specific Firestore document
 */

const { HttpsError } = require("firebase-functions/v2/https");
const { db } = require("./firebase");

/**
 * Validates that the request has an authenticated user.
 * Call this at the top of any onCall function that requires auth.
 *
 * @param {object} request - The v2 onCall request object
 * @returns {string} The authenticated user's UID
 * @throws {HttpsError} with code 'unauthenticated' if no auth present
 */
function validateAuth(request) {
  if (!request.auth) {
    throw new HttpsError(
      "unauthenticated",
      "You must be signed in to use this feature."
    );
  }
  return request.auth.uid;
}

/**
 * Validates that the authenticated user owns a Firestore document.
 * Checks the document's userId field against the caller's UID.
 * Also respects the soft-delete convention (isDeleted flag).
 *
 * @param {string} collectionName - The Firestore collection
 * @param {string} docId - The document ID to check
 * @param {string} uid - The authenticated user's UID (from validateAuth)
 * @returns {Promise<object>} The document data if ownership is valid
 * @throws {HttpsError} 'not-found' if document doesn't exist or is soft-deleted
 * @throws {HttpsError} 'permission-denied' if user doesn't own the document
 */
async function validateOwnership(collectionName, docId, uid) {
  const docRef = db.collection(collectionName).doc(docId);
  const docSnap = await docRef.get();

  if (!docSnap.exists) {
    throw new HttpsError("not-found", "Document not found.");
  }

  const data = docSnap.data();

  if (data.userId !== uid) {
    throw new HttpsError(
      "permission-denied",
      "You do not have permission to access this document."
    );
  }

  if (data.isDeleted) {
    throw new HttpsError("not-found", "Document not found.");
  }

  return data;
}

module.exports = { validateAuth, validateOwnership };
