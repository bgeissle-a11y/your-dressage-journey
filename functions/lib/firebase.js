/**
 * Firebase Admin SDK initialization (singleton)
 *
 * When deployed to Cloud Functions, initializeApp() automatically
 * picks up the service account credentials from the environment.
 * No service account key file is needed in production.
 */

const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { getAuth } = require("firebase-admin/auth");

const app = initializeApp();
const db = getFirestore(app);
const auth = getAuth(app);

module.exports = { app, db, auth };
