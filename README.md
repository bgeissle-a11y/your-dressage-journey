# Your Dressage Journey

A web application for dressage riders to track their progress, document ride debriefs, and reflect on their journey.

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ installed
- Firebase account (for backend)
- Git configured

### Installation

1. Clone the repository:
```bash
git clone https://github.com/bgeissle-a11y/your-dressage-journey.git
cd your-dressage-journey
```

2. Install dependencies:
```bash
npm install
```

3. Configure Firebase:
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Create a new project or select existing
   - Get your config from Project Settings > General > Your apps
   - Update `src/firebase-config.js` with your Firebase credentials

4. Start the development server:
```bash
npm run dev
```

The app will open at [http://localhost:3000](http://localhost:3000)

## 📁 Project Structure

```
your-dressage-journey/
├── src/
│   ├── components/      # React components
│   ├── pages/          # Page components
│   ├── services/       # API and Firebase services
│   ├── firebase-config.js
│   ├── App.jsx
│   ├── App.css
│   ├── main.jsx
│   └── index.css
├── public/             # Static assets
├── legacy/            # Original HTML forms (reference)
├── index.html
├── vite.config.js
└── package.json
```

## 🛠️ Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build locally
- `npm run lint` - Run ESLint

## 🔥 Firebase Setup

### Initialize Firebase (First Time)

1. Login to Firebase:
```bash
firebase login
```

2. Initialize Firebase in your project:
```bash
firebase init
```

Select:
- ✓ Firestore (database)
- ✓ Hosting (web deployment)
- ✓ Functions (optional - for backend logic)

### Deploy to Firebase

```bash
npm run build
firebase deploy
```

## 📦 Tech Stack

- **React 19** - UI framework
- **Vite** - Build tool and dev server
- **Firebase** - Backend (Firestore, Auth, Hosting)
- **React Router** - Navigation

## 🗂️ Legacy HTML Forms

The original HTML forms have been moved to the `/legacy` folder for reference. These include:
- Post-ride debrief forms
- Rider profile forms
- Horse profile forms
- Reflection forms
- Observation forms

These will be converted to React components over time.

## 🚧 Development Roadmap

- [ ] Convert HTML forms to React components
- [ ] Set up Firebase Authentication
- [ ] Implement Firestore data structure
- [ ] Create rider dashboard
- [ ] Add data visualization
- [ ] Implement AI analysis features
- [ ] Mobile responsive design

## 📝 License

Private project - All rights reserved

## 👤 Author

bgeis (bgeissle@gmail.com)

---

**Note**: This project is in active development. For the complete setup guide, see `YDJ-Development-Setup-Guide.md` in the project root.
