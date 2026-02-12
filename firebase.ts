
import { initializeApp, getApp, getApps } from '@firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

/**
 * Firebase Configuration
 * Defaulting to your provided production keys.
 */
export const DEFAULT_FIREBASE_CONFIG = {
  apiKey: process.env.VITE_FIREBASE_API_KEY || "AIzaSyBHjDpWPj9VLgKr66Ugykr3OpTg7i3kP2Q",
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || "biomedical-dashboard-cfe95.firebaseapp.com",
  projectId: process.env.VITE_FIREBASE_PROJECT_ID || "biomedical-dashboard-cfe95",
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || "biomedical-dashboard-cfe95.firebasestorage.app",
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "1057558419911",
  appId: process.env.VITE_FIREBASE_APP_ID || "1:1057558419911:web:fd2eda95316d9021db21e2",
  measurementId: process.env.VITE_FIREBASE_MEASUREMENT_ID || "G-M84SEWBHQB"
};

// Helper to get configuration (either from localStorage override or default)
const getFirebaseConfig = () => {
  try {
    const saved = localStorage.getItem('BIOMED_CUSTOM_CONFIG');
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (err) {
    console.error("Failed to parse custom Firebase config:", err);
  }
  return DEFAULT_FIREBASE_CONFIG;
};

const firebaseConfig = getFirebaseConfig();

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export const isFirebaseConfigured = firebaseConfig.apiKey !== "YOUR_API_KEY";
export const hasCustomConfig = !!localStorage.getItem('BIOMED_CUSTOM_CONFIG');
