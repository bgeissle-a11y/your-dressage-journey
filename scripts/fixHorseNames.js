/**
 * One-time script to fix inconsistent horse names in debrief documents.
 *
 * Usage:
 *   node scripts/fixHorseNames.js                # dry run (preview changes)
 *   node scripts/fixHorseNames.js --commit       # apply changes to Firestore
 *
 * Requires: GOOGLE_APPLICATION_CREDENTIALS or Firebase Admin SDK service account
 *
 * Alternatively, run this fix directly in the browser console while logged in:
 *
 *   // In browser console on the live app:
 *   const { collection, getDocs, updateDoc, doc, query, where } = await import('firebase/firestore');
 *   const { db } = await import('./firebase-config');
 *   const uid = 'YOUR_UID_HERE';
 *   const q = query(collection(db, 'debriefs'), where('userId', '==', uid), where('horseName', '==', 'Rocket'));
 *   const snap = await getDocs(q);
 *   console.log(`Found ${snap.size} debriefs with horseName "Rocket"`);
 *   // To fix: snap.forEach(d => updateDoc(doc(db, 'debriefs', d.id), { horseName: 'Rocket Star' }));
 */

// This script is designed to be run from the browser console.
// See instructions above.
console.log('See comments in this file for browser console instructions.');
