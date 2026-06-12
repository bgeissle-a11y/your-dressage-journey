/**
 * mailer — minimal transactional email transport.
 *
 * Single chokepoint for outbound mail from Cloud Functions. Today it uses
 * Nodemailer over Google Workspace SMTP (app password in Secret Manager).
 * To migrate to Resend later, swap the body of `sendMail` only — callers and
 * the function signature stay the same.
 *
 * Credentials are read from runtime env (bound via defineSecret in index.js):
 *   SMTP_USER     — the Workspace mailbox address (also the From: address)
 *   SMTP_PASSWORD — a Google app password for that mailbox
 *
 * sendMail throws on failure. Callers that must never let a mail failure
 * affect their primary path (e.g. signup) are responsible for try/catch.
 */

const nodemailer = require("nodemailer");

let cachedTransport = null;

function getTransport() {
  if (cachedTransport) return cachedTransport;

  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;
  if (!user || !pass) {
    throw new Error(
      "SMTP_USER / SMTP_PASSWORD not configured — cannot send mail."
    );
  }

  cachedTransport = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: { user, pass },
  });
  return cachedTransport;
}

/**
 * Send a plain-text email.
 * @param {object} opts
 * @param {string} opts.to       Recipient address
 * @param {string} opts.subject  Subject line
 * @param {string} opts.text     Plain-text body
 * @returns {Promise<void>}
 */
async function sendMail({ to, subject, text }) {
  const transport = getTransport();
  const from = process.env.SMTP_USER;
  await transport.sendMail({ from, to, subject, text });
}

module.exports = { sendMail };
