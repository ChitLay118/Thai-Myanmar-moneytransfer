import { auth, db } from './firebase-config.js';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  sendPasswordResetEmail,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";
import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where,
  setDoc,
  doc 
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

let isLoginMode = true;

// Simple alert function
function showAlert(message, type = 'error') {
    const alertDiv = document.getElementById('simple-alert');
    const alertMessage = document.getElementById('alert-message');
    
    if (alertDiv && alertMessage) {
        alertMessage.textContent = message;
        alertDiv.className = `fixed top-4 right-4 ${type === 'error' ? 'bg-red-600' : 'bg-green-600'} text-white p-4 rounded-lg shadow-lg z-[110] max-w-sm`;
        alertDiv.classList.remove('hidden');
        
        setTimeout(() => {
            alertDiv.classList.add('hidden');
        }, 5000);
    } else {
        alert(message);
    }
}

// Check auth state on page load
document.addEventListener('DOMContentLoaded', () => {
    console.log("Auth script loaded");
    
    // Check if user is already logged in
    const currentUser = localStorage.getItem('currentUser');
    if (currentUser) {
        console.log("Already logged in, showing main app");
        const userData = JSON.parse(currentUser);
        showMainApp(userData);
        return;
    }
    
    // Set up auth state listener
    onAuthStateChanged(auth, (user) => {
        console.log("Auth state changed:", user ? user.email : "No user");
        if (user) {
            // User just logged in
            loadUserData(user);
        } else {
            // User logged out
            localStorage.removeItem('currentUser');
            showLoginScreen();
        }
    });
    
    initLoginForm();
});

// Initialize login form
function initLoginForm() {
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
        
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        const username = document.getElementById('username').value.trim();
        
        if (!email || !password) {
            showAlert("ကျေးဇူးပြု၍ အီးမေးလ်နှင့် စကားဝှက်ထည့်ပါ။");
            return;
        }
        
        if (!isLoginMode && !username) {
            showAlert("ကျေးဇူးပြု၍ အမည်ထည့်ပါ။");
            return;
        }
        
        // Show loading state
        submitButton.disabled = true;
        submitButton.textContent = 'လုပ်ဆောင်နေသည်...';
        
        try {
            if (isLoginMode) {
                // Login
                console.log("Attempting login for:", email);
                const userCredential = await signInWithEmailAndPassword(auth, email, password);
                console.log("Login successful");
                // onAuthStateChanged will handle the rest
                
            } else {
                // Sign up
                console.log("Attempting to sign up:", email);
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                const user = userCredential.user;
                
                console.log("Sign up successful:", user.uid);
                
                // Save user data to Firestore
                const userDocRef = doc(db, 'users', user.uid);
                await setDoc(userDocRef, {
                    uid: user.uid,
                    email: email,
                    name: username || email.split('@')[0],
                    createdAt: new Date().toISOString(),
                    role: email === 'yan260702@gmail.com' ? 'admin' : 'user'
                });
                
                console.log("User data saved to Firestore");
                showAlert("အကောင့်ဖွင့်ခြင်း အောင်မြင်ပါသည်!", "success");
                
                // Switch to login mode
                isLoginMode = true;
                updateUI();
                
                // Clear form
                document.getElementById('email').value = '';
                document.getElementById('password').value = '';
                document.getElementById('username').value = '';
            }
        } catch (error) {
            console.error("Auth error:", error);
            
            // Reset button state
            submitButton.disabled = false;
            submitButton.textContent = isLoginMode ? 'ဝင်ရောက်ပါ' : 'အကောင့်ဖွင့်ပါ';
            
            // Better error messages in Burmese
            let errorMessage = "";
            switch (error.code) {
                case 'auth/email-already-in-use':
                    errorMessage = "ဤအီးမေးလ်ဖြင့် အကောင့်ရှိပြီးသားဖြစ်သည်။ ဝင်ရောက်ပါ။";
                    isLoginMode = true;
                    updateUI();
                    break;
                case 'auth/invalid-email':
                    errorMessage = "အီးမေးလ်လိပ်စာ မှားယွင်းနေပါသည်။";
                    break;
                case 'auth/weak-password':
                    errorMessage = "စကားဝှက်အားနည်းနေပါသည်။ အနည်းဆုံး ၆ လုံးရှိရပါမည်။";
                    break;
                case 'auth/user-not-found':
                    errorMessage = "ဤအီးမေးလ်ဖြင့် အကောင့်မရှိပါ။ အကောင့်အသစ်ဖွင့်ပါ။";
                    isLoginMode = false;
                    updateUI();
                    break;
                case 'auth/wrong-password':
                    errorMessage = "စကားဝှက် မှားယွင်းနေပါသည်။";
                    break;
                case 'auth/network-request-failed':
                    errorMessage = "အင်တာနက်ချိတ်ဆက်မှု ပြဿနာရှိပါသည်။";
                    break;
                case 'auth/too-many-requests':
                    errorMessage = "အကြိမ်အရေအတွက်များလွန်းပါသည်။ ခဏစောင့်ပါ။";
                    break;
                default:
                    errorMessage = `အမှားတစ်ခုဖြစ်ပွားခဲ့သည်: ${error.message}`;
            }
            
            showAlert(errorMessage);
        }
    });

    updateUI();
}

// Load user data from Firestore
async function loadUserData(user) {
    try {
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where("uid", "==", user.uid));
        const querySnapshot = await getDocs(q);
        
        let userData = { 
            email: user.email, 
            uid: user.uid,
            name: user.email.split('@')[0] 
        };
        
        if (!querySnapshot.empty) {
            querySnapshot.forEach((doc) => {
                userData = { ...userData, ...doc.data() };
            });
        }
        
        localStorage.setItem('currentUser', JSON.stringify(userData));
        console.log("User data saved to localStorage:", userData.email);
        
        showMainApp(userData);
        
    } catch (error) {
        console.error("Error loading user data:", error);
        showAlert("User data ဖတ်ရာတွင် အမှားဖြစ်နေပါသည်။");
    }
}

// Show/hide functions
window.showLoginScreen = function() {
    const loginScreen = document.getElementById('login-screen');
    const mainApp = document.getElementById('main-app');
    
    if (loginScreen) loginScreen.classList.remove('hidden');
    if (mainApp) mainApp.classList.add('hidden');
};

window.showMainApp = function(userData) {
    const loginScreen = document.getElementById('login-screen');
    const mainApp = document.getElementById('main-app');
    
    if (loginScreen) loginScreen.classList.add('hidden');
    if (mainApp) mainApp.classList.remove('hidden');
    
    // Store user data globally
    window.currentUser = userData;
    
    // Check if admin
    if (userData.email === 'yan260702@gmail.com' || userData.role === 'admin') {
        const adminBtn = document.getElementById('admin-btn');
        if (adminBtn) {
            adminBtn.classList.remove('hidden');
            console.log("Admin button shown");
        }
    }
    
    // Initialize main app
    if (window.initializeApp) {
        window.initializeApp();
    }
};

// Password reset
window.resetPassword = async function() {
    const email = prompt("ကျေးဇူးပြု၍ သင်၏အီးမေးလ်လိပ်စာထည့်ပါ:");
    if (email) {
        try {
            await sendPasswordResetEmail(auth, email);
            showAlert("စကားဝှက်ပြန်လည်သတ်မှတ်ရန် အီးမေးလ်ပို့ပြီးပါပြီ။", "success");
        } catch (error) {
            showAlert(`အမှား: ${error.message}`);
        }
    }
};

// Logout function
window.logout = async function() {
    try {
        await signOut(auth);
        localStorage.removeItem('currentUser');
        window.currentUser = null;
        showLoginScreen();
    } catch (error) {
        console.error("Logout error:", error);
        localStorage.removeItem('currentUser');
        showLoginScreen();
    }
};
