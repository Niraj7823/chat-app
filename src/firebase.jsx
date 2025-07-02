// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDto5cfLJOltO69zo1D0f6yIiXhVLyGlIo",
  authDomain: "live-chat-app-3f35a.firebaseapp.com",
  projectId: "live-chat-app-3f35a",
  storageBucket: "live-chat-app-3f35a.firebasestorage.app",
  messagingSenderId: "1031927203831",
  appId: "1:1031927203831:web:3558e741ed79519044d0f2",
  measurementId: "G-GCFCNWVF0E",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

export const auth = getAuth(app);
export const db = getFirestore(app);
