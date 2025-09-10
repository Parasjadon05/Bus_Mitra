// Firebase Configuration
// Replace these with your actual Firebase project configuration
export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "demo-api-key",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "demo-project.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "demo-project",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "demo-project.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "123456789",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "demo-app-id"
};

// Instructions for setting up Firebase:
// 1. Go to https://console.firebase.google.com/
// 2. Create a new project or select existing one
// 3. Enable Firestore Database
// 4. Go to Project Settings > General > Your apps
// 5. Add a web app and copy the config
// 6. Create a .env file in the root directory with the following variables:
//    VITE_FIREBASE_API_KEY=your-api-key
//    VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
//    VITE_FIREBASE_PROJECT_ID=your-project-id
//    VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
//    VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
//    VITE_FIREBASE_APP_ID=your-app-id
