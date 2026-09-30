// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
export const firebaseConfig = {
  apiKey: "AIzaSyBYRST72eYxYAM5y5f8PxxFSO3KpDGwLzg",
  authDomain: "hospital-care-981d5.firebaseapp.com",
  projectId: "hospital-care-981d5",
  storageBucket: "hospital-care-981d5.firebasestorage.app",
  messagingSenderId: "388271453191",
  appId: "1:388271453191:web:c5a54bd6618f5390b566a2",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const analytics = typeof window !== "undefined" ? getAnalytics(app) : null;
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;