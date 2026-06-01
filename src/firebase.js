import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Firebase configuration placeholder
// Users can paste their real Firebase Config keys here.
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Initialize Firebase only if the apiKey is configured
let app;
let auth;
let db;

try {
  if (firebaseConfig.apiKey && firebaseConfig.apiKey !== "YOUR_API_KEY") {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    console.log("🔥 Firebase initialized successfully!");
  } else {
    console.log("ℹ️ Firebase config is empty. Using LocalStorage fallback mode.");
  }
} catch (error) {
  console.warn("⚠️ Firebase initialization failed, running in fallback mode:", error);
}

export { app, auth, db };
