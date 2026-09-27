// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
export const firebaseConfig = {
  apiKey: "AIzaSyBz80t7_OTRyfC1FNtFGksiToaFux3fGdk",
  authDomain: "hospital-care-3ad6c.firebaseapp.com",
  projectId: "hospital-care-3ad6c",
  storageBucket: "hospital-care-3ad6c.firebasestorage.app",
  messagingSenderId: "998889832128",
  appId: "1:998889832128:web:87827838f19093935c3725"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const analytics = typeof window !== "undefined" ? getAnalytics(app) : null;
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
