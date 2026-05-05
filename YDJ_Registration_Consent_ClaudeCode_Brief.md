**YOUR DRESSAGE JOURNEY**

**Registration Consent Flow**

***Claude Code Implementation Brief — Pre-Launch Required***

**Purpose:** Add a Terms of Service and Privacy Policy consent checkbox to the new user registration flow. This is required by Stripe before payment processing can go live, and is standard legal practice for any subscription product.

# **Part 1: Prompts to Give Claude Code**

Use these prompts in sequence in a Claude Code session. Read the current registration file first before issuing any prompt.

## **Prompt 1 — Orient Claude Code**

**Copy and send this first:** Read the current user registration or sign-up component. It may be at src/pages/Register.jsx, src/pages/SignUp.jsx, src/auth/Register.jsx, or a similar path. Also check firebase authentication setup. Tell me: (1) the exact file path of the registration form, (2) where the "Create Account" or equivalent submit button is, (3) what currently happens on submit, and (4) whether there is any existing consent or terms acknowledgment UI.

## **Prompt 2 — Add the Consent Checkbox**

**Send this after Prompt 1:** In the registration form, add a consent checkbox with the following requirements:1. Place it immediately above the Create Account submit button.2. The checkbox must be unchecked by default.3. The Create Account button must be disabled (and visually muted) until the checkbox is checked.4. The checkbox label text must be exactly: "I have read and agree to the Terms of Service and Privacy Policy."5. "Terms of Service" must be a hyperlink to https://yourdressagejourney.com/terms opening in a new tab.6. "Privacy Policy" must be a hyperlink to https://yourdressagejourney.com/privacy opening in a new tab.7. Do not use an HTML \<form\> tag if this is a React component — use onClick and onChange handlers instead.8. Match the existing design system: use the same input/label styling as other form fields in this component.

## **Prompt 3 — Record Consent in Firestore**

**Send this after Prompt 2:** When a new user successfully creates their account, record their Terms of Service consent in Firestore. Write the following fields to /riders/{userId}/settings/consent:  tosVersion: "1.2"  privacyVersion: "1.0"  consentDate: server timestamp (use serverTimestamp() from Firebase)  consentMethod: "registration-checkbox"  ipAddress: do not collectThis write should happen immediately after the Firebase Auth user is created, as part of the same account-creation flow. It should not block the user from proceeding if it fails — wrap it in a try/catch and log errors, but continue to the post-registration redirect regardless.

## **Prompt 4 — Firestore Security Rule**

**Send this after Prompt 3:** Add a Firestore security rule for the new consent document at /riders/{userId}/settings/consent. The rule should: (1) allow the authenticated user to write their own consent document on creation, (2) never allow the user to modify or delete it after creation — it is an immutable audit record, (3) allow the authenticated user to read their own consent document. Follow the same pattern already in place for /riders/{userId}/settings/privacy and /riders/{userId}/settings/notifications.

## **Prompt 5 — Verify and Show Me**

**Send this after Prompt 4:** Show me the updated registration component from top to bottom. Confirm: (1) the checkbox is present and unchecked by default, (2) the Create Account button is disabled until the checkbox is checked, (3) both links open in a new tab, (4) the Firestore write on successful registration is in place, (5) no \<form\> tags were introduced. Then start the dev server and take a screenshot of the registration page so I can visually confirm the placement.

# **Part 2: Technical Specification**

This section is for reference. Claude Code should derive implementation details from the actual codebase, but these specs define the required behavior.

## **Firestore Schema**

**New document: /riders/{userId}/settings/consent**

// Written once at account creation. Immutable after creation.

{

  tosVersion:      "1.2",          // string — version of ToS agreed to

  privacyVersion:  "1.0",          // string — version of Privacy Policy agreed to

  consentDate:     serverTimestamp(), // Firestore Timestamp

  consentMethod:   "registration-checkbox" // string — always this value

}

## **Security Rule**

match /riders/{userId}/settings/consent {

  // User can create their consent record once

  allow create: if request.auth \!= null

                && request.auth.uid \== userId;

  // User can read their own record

  allow read: if request.auth \!= null

               && request.auth.uid \== userId;

  // No updates or deletes — this is an immutable audit record

  allow update, delete: if false;

}

## **UI Behavior Requirements**

* **Checkbox default state:** Unchecked. Never pre-checked.

* **Button disabled state:** Create Account button has disabled attribute and reduced opacity (e.g., opacity: 0.5, cursor: not-allowed) until checkbox is checked. Enabling is instant on checkbox check — no debounce needed.

* **Link behavior:** target="\_blank" rel="noopener noreferrer" on both links. They open the published public URLs.

* **Error handling:** If the Firestore consent write fails after successful auth creation, log the error but do not block the user. The auth record exists; the consent write can be retried or audited separately.

* **No re-prompting:** Do not show the consent checkbox again after account creation. It is a one-time gate.

## **Checkbox Label Text (exact)**

**Use this exact wording:** I have read and agree to the Terms of Service and Privacy Policy.

Both "Terms of Service" and "Privacy Policy" are linked as described. The period is outside the links. No additional marketing language or pre-consent is needed.

## **Placement**

The checkbox and its label sit between the last form field (password or password confirm) and the Create Account button. There should be comfortable spacing — approximately the same vertical gap as between other form fields. It should not feel cramped against the button.

# **Part 3: Implementation Checklist**

| Task | File | Notes |
| :---- | :---- | :---- |
| Consent checkbox added to registration form | Register.jsx (or equiv.) | *Unchecked by default* |
| Submit button disabled until checked | Register.jsx (or equiv.) | *Visual state \+ disabled attr* |
| ToS link opens in new tab | Register.jsx (or equiv.) | *yourdressagejourney.com/terms* |
| Privacy link opens in new tab | Register.jsx (or equiv.) | *yourdressagejourney.com/privacy* |
| Consent written to Firestore on account creation | Register.jsx \+ auth flow | */riders/{uid}/settings/consent* |
| Firestore security rule added | firestore.rules | *Immutable after create* |
| Error handling: consent write failure non-blocking | Register.jsx (or equiv.) | *try/catch, log only* |
| Visual review: screenshot confirmed | — | *Run dev server, confirm placement* |

# **Part 4: Out of Scope for This Brief**

* Existing logged-in users — no retroactive consent prompt required; existing accounts are grandfathered under pilot terms

* Version bump flow — prompting existing users to re-consent when ToS is updated is a future feature, not required at launch

* Email confirmation of consent — not required; Firestore record is sufficient

* Admin consent reporting dashboard — not required at launch

――――――――――――――――――――――――――――――

*YDJ Registration Consent Implementation Brief — Your Training Journey, LLC — April 2026\. For Claude Code handoff.*