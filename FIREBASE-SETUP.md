# Firebase Setup Guide for Your Dressage Journey

This guide will walk you through setting up Firebase for your project. **Estimated time: 15-20 minutes**

---

## Prerequisites

- Google account (Gmail)
- Your Dressage Journey project cloned locally
- Node.js installed

---

## Step 1: Create Firebase Project

1. **Go to Firebase Console**
   - Visit: https://console.firebase.google.com/
   - Sign in with your Google account

2. **Create New Project**
   - Click "Add project" or "Create a project"
   - Enter project name: `your-dressage-journey` (or your preferred name)
   - Click "Continue"

3. **Google Analytics (Optional)**
   - Toggle OFF if you don't need analytics right now
   - Or leave ON and select/create an Analytics account
   - Click "Create project"
   - Wait 30-60 seconds for project creation

4. **Click "Continue"** when the project is ready

---

## Step 2: Enable Authentication

1. **Navigate to Authentication**
   - In the left sidebar, click "Build" → "Authentication"
   - Click "Get started"

2. **Enable Email/Password Sign-in**
   - Click on "Sign-in method" tab
   - Find "Email/Password" in the providers list
   - Click on it to expand
   - Toggle "Enable" to ON
   - Click "Save"

3. **Configure Email Verification (Recommended)**
   - Go to "Templates" tab
   - Click "Email address verification"
   - Customize the email template if desired
   - Click "Save"

---

## Step 3: Create Firestore Database

1. **Navigate to Firestore Database**
   - In the left sidebar, click "Build" → "Firestore Database"
   - Click "Create database"

2. **Choose Database Mode**
   - Select "Start in **test mode**" (for development)
   - Click "Next"

   > **Note:** Test mode allows unrestricted access for 30 days. We'll add security rules later before launch.

3. **Select Location**
   - Choose a location close to your users
   - Recommended for US: `us-central1` or `us-east1`
   - Click "Enable"
   - Wait for database creation (30-60 seconds)

---

## Step 4: Get Firebase Configuration

1. **Go to Project Settings**
   - Click the gear icon (⚙️) next to "Project Overview" in the left sidebar
   - Select "Project settings"

2. **Scroll Down to "Your apps"**
   - If you see "There are no apps in your project", continue to step 3
   - If you see an existing web app, skip to step 4

3. **Add Web App**
   - Click the web icon `</>` (looks like code brackets)
   - Enter app nickname: `Your Dressage Journey Web App`
   - **DO NOT** check "Also set up Firebase Hosting" (we're using Netlify)
   - Click "Register app"

4. **Copy Configuration Values**
   - You'll see a `firebaseConfig` object that looks like this:

   ```javascript
   const firebaseConfig = {
     apiKey: "AIzaSyC...",
     authDomain: "your-project.firebaseapp.com",
     projectId: "your-project-id",
     storageBucket: "your-project.appspot.com",
     messagingSenderId: "123456789",
     appId: "1:123456789:web:abc123"
   };
   ```

5. **Keep this tab open** - you'll need these values in the next step

---

## Step 5: Add Credentials to Your Project

1. **Open your project in VS Code** (or your code editor)

2. **Locate the `.env` file** in the root directory
   - If you can't see it, it might be hidden
   - In VS Code: View → Show Hidden Files

3. **Open `.env` and replace the placeholder values:**

   ```env
   VITE_FIREBASE_API_KEY=AIzaSyC...  # Copy from apiKey
   VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com  # Copy from authDomain
   VITE_FIREBASE_PROJECT_ID=your-project-id  # Copy from projectId
   VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com  # Copy from storageBucket
   VITE_FIREBASE_MESSAGING_SENDER_ID=123456789  # Copy from messagingSenderId
   VITE_FIREBASE_APP_ID=1:123456789:web:abc123  # Copy from appId
   ```

4. **Save the file**

   > **IMPORTANT:** Never commit the `.env` file to Git! It's already in `.gitignore` for safety.

---

## Step 6: Test Your Configuration

1. **Open a terminal** in your project directory

2. **Start the development server:**
   ```bash
   npm run dev
   ```

3. **Check the console output**
   - If you see: `VITE ready in XXX ms` → ✅ Success!
   - If you see Firebase errors → double-check your `.env` values

4. **Open the app in your browser:**
   - Go to: `http://localhost:3000` (or the port shown in terminal)
   - Open browser DevTools (F12)
   - Check the Console tab
   - You should NOT see any Firebase errors
   - If you see "Missing required Firebase environment variables" → recheck your `.env` file

5. **Stop the server:**
   - Press `Ctrl+C` in the terminal

---

## Step 7: Set Up Firestore Security Rules (Important!)

Right now your database is in "test mode" which allows anyone to read/write. Before launch, we'll need proper security rules.

1. **In Firebase Console, go to Firestore Database**
2. **Click the "Rules" tab**
3. **You'll see the current test mode rules:**
   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /{document=**} {
         allow read, write: if request.time < timestamp.date(2026, 3, 7);
       }
     }
   }
   ```

4. **For now, keep test mode** - we'll update these rules in Phase 6 once authentication is implemented

   > **Note:** Firebase will email you 7 days before test mode expires!

---

## Verification Checklist

Before moving to Phase 2, verify:

- ✅ Firebase project created
- ✅ Authentication enabled (Email/Password)
- ✅ Firestore database created (test mode)
- ✅ Web app registered
- ✅ `.env` file populated with real credentials
- ✅ App runs locally without Firebase errors
- ✅ `.env` is in `.gitignore` (it is!)

---

## Next Steps

Once Firebase is configured:
1. **Phase 2:** Build authentication system (Sign up, Sign in, Password reset)
2. **Phase 3:** Create Firestore service files for data management
3. **Phase 4:** Convert HTML forms to React components

---

## Troubleshooting

### "Firebase: Error (auth/invalid-api-key)"
- Double-check your `VITE_FIREBASE_API_KEY` in `.env`
- Make sure there are no extra spaces or quotes
- Restart the dev server after changing `.env`

### "Missing required Firebase environment variables"
- Make sure your `.env` file is in the **root directory** (same level as `package.json`)
- Make sure variable names start with `VITE_` (required by Vite)
- Restart the dev server

### "Module not found: firebase"
- Run: `npm install` to ensure dependencies are installed

### Port 3000 already in use
- Vite will automatically use port 3001, 3002, etc.
- Or stop other applications using port 3000

---

## Resources

- **Firebase Documentation:** https://firebase.google.com/docs
- **Firestore Quickstart:** https://firebase.google.com/docs/firestore/quickstart
- **Firebase Auth Web Guide:** https://firebase.google.com/docs/auth/web/start
- **Vite Environment Variables:** https://vite.dev/guide/env-and-mode

---

## Need Help?

If you encounter any issues:
1. Check the browser console (F12) for specific error messages
2. Check the terminal for build/runtime errors
3. Verify all values in `.env` match Firebase Console exactly
4. Make sure you restarted the dev server after editing `.env`

Contact your developer if problems persist!
