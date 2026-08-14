import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";

export const getFirebaseConfig = () => {
  return {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || (typeof process !== "undefined" ? process.env.VITE_FIREBASE_API_KEY || "" : ""),
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || (typeof process !== "undefined" ? process.env.VITE_FIREBASE_AUTH_DOMAIN || "" : ""),
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || (typeof process !== "undefined" ? process.env.VITE_FIREBASE_PROJECT_ID || "" : ""),
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || (typeof process !== "undefined" ? process.env.VITE_FIREBASE_STORAGE_BUCKET || "" : ""),
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || (typeof process !== "undefined" ? process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "" : ""),
    appId: import.meta.env.VITE_FIREBASE_APP_ID || (typeof process !== "undefined" ? process.env.VITE_FIREBASE_APP_ID || "" : ""),
  };
};

export const isFirebaseConfigured = () => {
  const config = getFirebaseConfig();
  return Boolean(
    config.apiKey &&
      config.authDomain &&
      config.projectId &&
      config.storageBucket &&
      config.messagingSenderId &&
      config.appId,
  );
};

export const getFirebaseAuth = () => {
  if (!isFirebaseConfigured()) return null;
  const config = getFirebaseConfig();
  const app = getApps().length === 0 ? initializeApp(config) : getApp();
  return getAuth(app);
};

export const firebaseAuth = isFirebaseConfigured() ? getFirebaseAuth() : null;
export const isFirebaseReady = () => isFirebaseConfigured();

