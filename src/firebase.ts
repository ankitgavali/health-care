// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCQu44Pdb2ioztb3nb-0SXyYy5uZJw9xXU",
  authDomain: "hospital-8e580.firebaseapp.com",
  projectId: "hospital-8e580",
  storageBucket: "hospital-8e580.firebasestorage.app",
  messagingSenderId: "795429929044",
  appId: "1:795429929044:web:4c4cc06f7060916a22adc1",
  measurementId: "G-ZWYMLQKSG1"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const analytics = typeof window !== "undefined" ? getAnalytics(app) : null;
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
