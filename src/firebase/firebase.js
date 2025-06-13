// src/firebase/firebase.js
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Tes informations de configuration Firebase
const firebaseConfig = {
  apiKey: "AIzaSyDJrnZfQAAvSXsOu83Fd9ugq-Wb81YhAnc",
  authDomain: "projet-react-39b1f.firebaseapp.com",
  projectId: "projet-react-39b1f",
  storageBucket: "projet-react-39b1f.firebasestorage.app",
  messagingSenderId: "261519078244",
  appId: "1:261519078244:web:8c3e3459c9bca55ba5c071",
  measurementId: "G-W9EDT6RLZ7"
};

// Initialise Firebase
const app = initializeApp(firebaseConfig);

// Initialise les services Firebase
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db, app };
