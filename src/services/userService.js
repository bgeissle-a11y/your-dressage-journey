import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase-config';

const COLLECTION = 'users';

/**
 * User Service - Manages user profile documents in Firestore.
 * Unlike other collections, user docs use the auth UID as the document ID.
 */

/**
 * Create a user profile document (called after signup)
 * @param {string} userId - Firebase Auth UID
 * @param {object} data - { displayName, email }
 */
export async function createUser(userId, data) {
  try {
    await setDoc(doc(db, COLLECTION, userId), {
      displayName: data.displayName || '',
      email: data.email || '',
      role: 'pilot-user',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return { success: true, id: userId };
  } catch (error) {
    console.error('Error creating user:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get a user profile by ID
 * @param {string} userId - Firebase Auth UID
 */
export async function getUser(userId) {
  try {
    const docSnap = await getDoc(doc(db, COLLECTION, userId));
    if (docSnap.exists()) {
      return { success: true, data: { id: docSnap.id, ...docSnap.data() } };
    }
    return { success: false, error: 'User not found' };
  } catch (error) {
    console.error('Error getting user:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Update a user profile
 * @param {string} userId - Firebase Auth UID
 * @param {object} data - Fields to update
 */
export async function updateUser(userId, data) {
  try {
    await updateDoc(doc(db, COLLECTION, userId), {
      ...data,
      updatedAt: serverTimestamp()
    });
    return { success: true };
  } catch (error) {
    console.error('Error updating user:', error);
    return { success: false, error: error.message };
  }
}
