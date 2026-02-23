/**
 * Sentry initialization for Cloud Functions
 *
 * Imported once at the top of index.js so every function invocation
 * automatically reports unhandled exceptions.
 */

const Sentry = require("@sentry/node");

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV || "production",
});

module.exports = Sentry;
