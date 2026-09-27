// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
export const firebaseConfig = {
  apiKey: "AIzaSyBqteCYk9ZxDD7Ixq7PemfmxZ9NF2vf7OQ",
  authDomain: "hoapital-care.firebaseapp.com",
  projectId: "hoapital-care",
  storageBucket: "hoapital-care.firebasestorage.app",
  messagingSenderId: "186955954455",
  appId: "1:186955954455:web:3c797695bf65d16bdd1f52",
  measurementId: "G-VTKHWW2C60"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const analytics = typeof window !== "undefined" ? getAnalytics(app) : null;
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;