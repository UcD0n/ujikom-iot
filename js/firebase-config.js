// Firebase Configuration
// Project: monitoring-92e1e
// PENTING: Jangan commit file ini ke repository publik.
// Gunakan Firebase Security Rules untuk membatasi akses data.

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyB1pV2-DuNqUdYSOw4qjRlMvWSvV10grF0",
  authDomain: "iot---ujikom.firebaseapp.com",
  databaseURL: "https://iot---ujikom-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "iot---ujikom",
  storageBucket: "iot---ujikom.firebasestorage.app",
  messagingSenderId: "1012828515209",
  appId: "1:1012828515209:web:d011852fd1340c626fcf58",
  measurementId: "G-2Y44SR9LMN"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getDatabase(app);
export default app;
