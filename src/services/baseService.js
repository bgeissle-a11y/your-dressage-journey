import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db } from '../firebase-config';

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
        return { success: false, error: error.message };
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
        return { success: false, error: error.message };
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
          limitCount = 50,
          startAfterDoc = null
        } = options;

        let q = query(
          colRef,
          where('userId', '==', userId),
          where('isDeleted', '==', false),
          orderBy(orderField, orderDirection),
          limit(limitCount)
        );

        if (startAfterDoc) {
          q = query(q, startAfter(startAfterDoc));
        }

        const querySnapshot = await getDocs(q);
        const data = querySnapshot.docs.map(d => ({
          id: d.id,
          ...formatTimestamps(d.data())
        }));

        const lastDoc = querySnapshot.docs[querySnapshot.docs.length - 1] || null;

        return { success: true, data, lastDoc };
      } catch (error) {
        console.error(`Error reading all ${collectionName}:`, error);
        return { success: false, error: error.message };
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
        const docRef = doc(db, collectionName, docId);
        await updateDoc(docRef, {
          ...data,
          updatedAt: serverTimestamp()
        });
        return { success: true };
      } catch (error) {
        console.error(`Error updating ${collectionName}:`, error);
        return { success: false, error: error.message };
      }
    },

    /**
     * Soft delete a document (marks isDeleted = true)
     * @param {string} docId - The document ID
     * @returns {object} - { success, error }
     */
    async delete(docId) {
      try {
        const docRef = doc(db, collectionName, docId);
        await updateDoc(docRef, {
          isDeleted: true,
          deletedAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        return { success: true };
      } catch (error) {
        console.error(`Error deleting ${collectionName}:`, error);
        return { success: false, error: error.message };
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
        return { success: false, error: error.message };
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
