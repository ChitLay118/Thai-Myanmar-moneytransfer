import { auth, db } from './firebase-config.js';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";
import { collection, addDoc, getDocs, query, where } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

let isLoginMode = true;

document.addEventListener('DOMContentLoaded', () => {
    const usernameField = document.getElementById('username-field');
    const usernameInput = document.getElementById('username');
    const formTitle = document.getElementById('form-title');
    const submitButton = document.getElementById('submit-button');
    const togglePrompt = document.getElementById('toggle-prompt');
    const toggleLink = document.getElementById('toggle-link');
    const authForm = document.getElementById('auth-form');

    // Update UI based on mode
    const updateUI = () => {
        if (isLoginMode) {
            usernameField.style.display = 'none';
            usernameInput.removeAttribute('required');
            formTitle.textContent = 'ဝင်ရောက်ကြည့်ရှုရန် အချက်အလက်များ ထည့်ပါ။';
            submitButton.textContent = 'ဝင်ရောက်ပါ';
            togglePrompt.textContent = 'အကောင့်မရှိသေးဘူးလား?';
            toggleLink.textContent = 'အကောင့်အသစ်ဖွင့်ပါ';
        } else {
            usernameField.style.display = 'block';
            usernameInput.setAttribute('required', 'required');
            formTitle.textContent = 'အကောင့်အသစ်ဖွင့်ရန် အချက်အလက်များ ဖြည့်ပါ။';
            submitButton.textContent = 'အကောင့်ဖွင့်ပါ';
            togglePrompt.textContent = 'အကောင့်ရှိပြီးသားလား?';
            toggleLink.textContent = 'ဝင်ရောက်ပါ';
        }
    };

    // Toggle mode
    toggleLink.addEventListener('click', (event) => {
        event.preventDefault();
        isLoginMode = !isLoginMode;
        updateUI();
    });

    // Handle form submission
    authForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const username = document.getElementById('username').value;
        
        try {
            if (isLoginMode) {
                // Login
                const userCredential = await signInWithEmailAndPassword(auth, email, password);
                const user = userCredential.user;
                
                // Get user data from Firestore
                const usersRef = collection(db, 'users');
                const q = query(usersRef, where("email", "==", email));
                const querySnapshot = await getDocs(q);
                
                let userData = { email: user.email, uid: user.uid };
                querySnapshot.forEach((doc) => {
                    userData = { ...userData, ...doc.data() };
                });
                
                localStorage.setItem('currentUser', JSON.stringify(userData));
                window.location.reload();
                
            } else {
                // Sign up
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                const user = userCredential.user;
                
                // Save user data to Firestore
                await addDoc(collection(db, 'users'), {
                    uid: user.uid,
                    email: email,
                    name: username || email.split('@')[0],
                    createdAt: new Date().toISOString()
                });
                
                const userData = {
                    email: email,
                    name: username || email.split('@')[0],
                    uid: user.uid
                };
                
                localStorage.setItem('currentUser', JSON.stringify(userData));
                window.location.reload();
            }
        } catch (error) {
            alert(`Error: ${error.message}`);
        }
    });

    updateUI();
});

// Password reset
window.resetPassword = async function() {
    const email = prompt("Please enter your email address:");
    if (email) {
        try {
            await sendPasswordResetEmail(auth, email);
            alert("Password reset email sent!");
        } catch (error) {
            alert(`Error: ${error.message}`);
        }
    }
};
