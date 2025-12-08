// Import Firebase modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyD__QvXIdX1iE3SwhiGP00lTDz8PO9qrXo",
    authDomain: "moviebox-b10da.firebaseapp.com",
    projectId: "moviebox-b10da",
    storageBucket: "moviebox-b10da.firebasestorage.app",
    messagingSenderId: "178535518366",
    appId: "1:178535518366:web:1160ac704c5194a8c16b8f",
    measurementId: "G-C4W8MJ6R83"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Export for use in other files
export { auth, db };
