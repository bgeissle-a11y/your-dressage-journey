import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  where,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db, auth } from '../firebase-config';

/**
 * Force-refresh the Firebase Auth token before a write operation.
 * On iOS Safari, backgrounded tabs can leave the token stale, causing
 * Firestore security-rule rejections. This ensures a fresh token.
 */
async function ensureFreshToken() {
  try {
    if (auth.currentUser) {
      await auth.currentUser.getIdToken(true);
    }
  } catch (err) {
    console.warn('Token refresh failed:', err.message);
    // Continue anyway — the write will fail with a clearer auth error
    // if the token is truly invalid
  }
}

/**
 * Convert a Firestore error into a user-friendly message.
 */
function friendlyError(error) {
  const msg = error.message || '';
  const code = error.code || '';

  if (code === 'permission-denied' || msg.includes('Missing or insufficient permissions')) {
    return 'Your session may have expired. Please refresh the page or log out and back in, then try again.';
  }
  if (code === 'unavailable' || msg.includes('Failed to get document')) {
    return 'Unable to reach the server. Please check your internet connection and try again.';
  }
  if (code === 'not-found') {
    return 'This entry could not be found. It may have been deleted.';
  }
  if (msg.includes('network') || msg.includes('ECONNREFUSED') || msg.includes('fetch')) {
    return 'A network error occurred. Please check your connection and try again.';
  }
  return msg;
}

/**
 * Creates a base service with standard CRUD operations for a Firestore collection.
 * All documents are scoped to the authenticated user via userId.
 *
 * @param {string} collectionName - The Firestore collection name
 * @returns {object} - CRUD methods for the collection
 */
export function createBaseService(collectionName) {
  const colRef = collection(db, collectionName);

  return {
    /**
     * Create a new document in the collection
     * @param {string} userId - The authenticated user's UID
     * @param {object} data - The document data
     * @returns {object} - { success, id, error }
     */
    async create(userId, data) {
      try {
        await ensureFreshToken();
        const docRef = await addDoc(colRef, {
          userId,
          ...data,
          isDeleted: false,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        return { success: true, id: docRef.id };
      } catch (error) {
        console.error(`Error creating ${collectionName}:`, error);
        return { success: false, error: friendlyError(error) };
      }
    },

    /**
     * Read a single document by ID
     * @param {string} docId - The document ID
     * @returns {object} - { success, data, error }
     */
    async read(docId) {
      try {
        const docSnap = await getDoc(doc(db, collectionName, docId));
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.isDeleted) {
            return { success: false, error: 'Document has been deleted' };
          }
          return {
            success: true,
            data: { id: docSnap.id, ...formatTimestamps(data) }
          };
        }
        return { success: false, error: 'Document not found' };
      } catch (error) {
        console.error(`Error reading ${collectionName}:`, error);
        return { success: false, error: friendlyError(error) };
      }
    },

    /**
     * Read all documents for a user (excluding soft-deleted)
     * @param {string} userId - The authenticated user's UID
     * @param {object} options - { orderField, orderDirection, limitCount, startAfterDoc }
     * @returns {object} - { success, data, lastDoc, error }
     */
    async readAll(userId, options = {}) {
      try {
        const {
          orderField = 'createdAt',
          orderDirection = 'desc',
          limitCount = 50
        } = options;

        // Use only equality filters to avoid requiring composite indexes.
        // Sorting is done client-side after fetching.
        const q = query(
          colRef,
          where('userId', '==', userId),
          where('isDeleted', '==', false)
        );

        const querySnapshot = await getDocs(q);
        let data = querySnapshot.docs.map(d => ({
          id: d.id,
          ...formatTimestamps(d.data())
        }));

        // Client-side sort
        data.sort((a, b) => {
          const aVal = a[orderField] || '';
          const bVal = b[orderField] || '';
          if (aVal < bVal) return orderDirection === 'asc' ? -1 : 1;
          if (aVal > bVal) return orderDirection === 'asc' ? 1 : -1;
          return 0;
        });

        // Client-side limit
        if (limitCount && data.length > limitCount) {
          data = data.slice(0, limitCount);
        }

        return { success: true, data };
      } catch (error) {
        console.error(`Error reading all ${collectionName}:`, error);
        return { success: false, error: friendlyError(error) };
      }
    },

    /**
     * Update an existing document
     * @param {string} docId - The document ID
     * @param {object} data - The fields to update
     * @returns {object} - { success, error }
     */
    async update(docId, data) {
      try {
        await ensureFreshToken();
        const docRef = doc(db, collectionName, docId);
        await updateDoc(docRef, {
          ...data,
          updatedAt: serverTimestamp()
        });
        return { success: true };
      } catch (error) {
        console.error(`Error updating ${collectionName}:`, error);
        return { success: false, error: friendlyError(error) };
      }
    },

    /**
     * Soft delete a document (marks isDeleted = true)
     * @param {string} docId - The document ID
     * @returns {object} - { success, error }
     */
    async delete(docId) {
      try {
        await ensureFreshToken();
        const docRef = doc(db, collectionName, docId);
        await updateDoc(docRef, {
          isDeleted: true,
          deletedAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        return { success: true };
      } catch (error) {
        console.error(`Error deleting ${collectionName}:`, error);
        return { success: false, error: friendlyError(error) };
      }
    },

    /**
     * Query documents with custom filters
     * @param {string} userId - The authenticated user's UID
     * @param {string} field - The field to filter on
     * @param {string} operator - The comparison operator
     * @param {*} value - The value to compare
     * @returns {object} - { success, data, error }
     */
    async queryByField(userId, field, operator, value) {
      try {
        const q = query(
          colRef,
          where('userId', '==', userId),
          where('isDeleted', '==', false),
          where(field, operator, value)
        );

        const querySnapshot = await getDocs(q);
        const data = querySnapshot.docs.map(d => ({
          id: d.id,
          ...formatTimestamps(d.data())
        }));

        return { success: true, data };
      } catch (error) {
        console.error(`Error querying ${collectionName}:`, error);
        return { success: false, error: friendlyError(error) };
      }
    }
  };
}

/**
 * Convert Firestore Timestamps to ISO strings for consistent handling
 */
function formatTimestamps(data) {
  const formatted = { ...data };
  for (const key of Object.keys(formatted)) {
    if (formatted[key] instanceof Timestamp) {
      formatted[key] = formatted[key].toDate().toISOString();
    }
  }
  return formatted;
}
