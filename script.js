/**
 * WY MovieBox - Main JavaScript Logic (v4.1 - With Auth Fixed)
 */

// Global state variables
let videos = {};
let translations = {};
let favorites = [];
let currentPlayingMovie = null;
let currentSettings = {};
let currentUser = null;
let allVideos = []; // Combined videos from JSON and Firebase

const defaultSettings = {
    language: 'myanmar',
    theme: 'dark',
};

const ADULT_WEBVIEW_URL = 'https://allkar.vercel.app/';
const MODAPP_WEBVIEW_URL = 'https://wyap-pstore.vercel.app/';

// Import Firebase modules (for logout)
import { auth } from './firebase-config.js';
import { signOut } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";

// Check authentication status
function checkAuth() {
    const user = JSON.parse(localStorage.getItem('currentUser'));
    console.log("Checking auth, user in localStorage:", user ? user.email : "No user");
    
    if (user && user.uid) {
        currentUser = user;
        console.log("User found, showing main app");
        
        // Show main app
        document.getElementById('login-screen').classList.add('hidden');
        document.getElementById('main-app').classList.remove('hidden');
        
        // Check if admin
        if (user.email === 'yan260702@gmail.com' || user.role === 'admin') {
            const adminBtn = document.getElementById('admin-btn');
            if (adminBtn) {
                adminBtn.classList.remove('hidden');
                console.log("Admin button shown");
            }
        }
        
        // Initialize app
        initializeApp();
    } else {
        console.log("No user found, showing login screen");
        // Login screen is already shown by auth.js
    }
}

// Remove or update the tempLogin function
window.tempLogin = function() {
    // Clear any existing login
    localStorage.removeItem('currentUser');
    
    // Show login screen
    document.getElementById('login-screen').classList.remove('hidden');
    document.getElementById('main-app').classList.add('hidden');
    
    // Auto-fill test credentials
    document.getElementById('email').value = 'test@test.com';
    document.getElementById('password').value = '123456';
    
    // Switch to login mode if not already
    if (window.toggleToLoginMode) {
        window.toggleToLoginMode();
    }
};

// Add this function to help testing
window.toggleToLoginMode = function() {
    // This will be called from auth.js
    console.log("Switching to login mode");
};

// Logout function
window.logout = async function() {
    try {
        await signOut(auth);
        localStorage.removeItem('currentUser');
        currentUser = null;
        alert("ထွက်ရန် အောင်မြင်ပါသည်။");
        showLoginScreen();
    } catch (error) {
        console.error("Logout error:", error);
        localStorage.removeItem('currentUser');
        showLoginScreen();
    }
};

// Temporary bypass for testing - Remove this in production
window.tempLogin = function() {
    const userData = {
        email: 'test@test.com',
        name: 'Test User',
        uid: 'test-123',
        role: 'user'
    };
    localStorage.setItem('currentUser', JSON.stringify(userData));
    window.location.reload();
};

// -------------------------------------------------------------------------
// 1. DATA FETCHING AND INITIALIZATION
// -------------------------------------------------------------------------

async function loadDataFromJSON() {
    try {
        const response = await fetch('data.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        videos = data.videos || {};
        translations = data.translations || {};
        console.log("Data loaded successfully from JSON.");
        
        // Combine all videos for searching
        allVideos = [];
        for (const category in videos) {
            if (Array.isArray(videos[category])) {
                videos[category].forEach(video => {
                    video.category = category;
                    allVideos.push(video);
                });
            }
        }
    } catch (e) {
        console.error("Failed to load JSON data. Content will be empty.", e);
        const t = translations.myanmar || { Error: "Error", jsonError: "ရုပ်ရှင်ဒေတာများ ဖတ်ယူနိုင်ခြင်း မရှိပါ (JSON Error)။" };
        showCustomAlert(t.Error, t.jsonError);
    }
}

// Load videos from Firebase
async function loadVideosFromFirebase() {
    try {
        const { db } = await import('./firebase-config.js');
        const { collection, getDocs } = await import("https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js");
        
        const videosRef = collection(db, 'videos');
        const snapshot = await getDocs(videosRef);
        
        snapshot.forEach((doc) => {
            const video = doc.data();
            const category = video.category || 'action';
            
            if (!videos[category]) {
                videos[category] = [];
            }
            
            // Add Firebase video
            videos[category].push({
                id: 'fb_' + doc.id,
                title: video.title,
                src: video.src,
                thumb: video.thumb,
                addedBy: video.addedBy,
                addedAt: video.addedAt
            });
            
            // Add to all videos array
            video.category = category;
            allVideos.push(video);
        });
        
        console.log(`Loaded ${snapshot.size} videos from Firebase`);
    } catch (error) {
        console.error("Error loading videos from Firebase:", error);
    }
}

function generateVideoIds() {
    let idCounter = 1;
    for (const category in videos) {
        videos[category] = videos[category].map(movie => {
            if (!movie.id) {
                movie.id = 'v' + idCounter++;
            }
            return movie;
        });
    }
}

function enableButtons() {
    const navBar = document.getElementById('nav-bar');
    const menuBar = document.getElementById('menu-bar');
    const loadingIndicator = document.getElementById('loading-indicator');
    
    if (loadingIndicator) {
        loadingIndicator.remove();
    }
    
    navBar.classList.remove('pointer-events-none', 'opacity-50');
    menuBar.classList.remove('pointer-events-none', 'opacity-50');
}

window.initializeApp = async function() {
    console.log("Initializing app...");
    
    // 1. Load Data from JSON
    await loadDataFromJSON();
    
    // 2. Load Data from Firebase
    await loadVideosFromFirebase();
    
    generateVideoIds();
    
    // 3. Load Local State (Settings/Favorites)
    const storedSettings = localStorage.getItem('userSettings');
    const storedFavorites = localStorage.getItem('favorites');
    
    try {
        currentSettings = storedSettings ? { ...defaultSettings, ...JSON.parse(storedSettings) } : { ...defaultSettings };
    } catch (e) {
        currentSettings = { ...defaultSettings };
    }
    
    try {
        favorites = storedFavorites ? JSON.parse(storedFavorites) : [];
        if (!Array.isArray(favorites)) favorites = [];
    } catch (e) {
        favorites = [];
    }
    
    // 4. Apply Settings (Theme and Language)
    applySettings();
    
    // 5. Enable Buttons
    enableButtons();
    
    // 6. Show user profile info
    updateUserProfileDisplay();
    
    const homeBtn = document.querySelector('.nav-btn[data-nav="home"]');
    if (homeBtn) {
        changeNav(homeBtn);
    } else {
        console.error("Home navigation button not found.");
    }
};

// -------------------------------------------------------------------------
// 2. LOCAL STORAGE AND FAVORITES HANDLING
// -------------------------------------------------------------------------

function saveFavorites() {
    try {
        localStorage.setItem('favorites', JSON.stringify(favorites));
    } catch (e) {
        console.error("Error saving favorites:", e);
    }
}

window.toggleFavorite = function() {
    if (!currentPlayingMovie || !currentPlayingMovie.id) return;

    const movieId = currentPlayingMovie.id;
    const index = favorites.indexOf(movieId);

    if (index > -1) {
        favorites.splice(index, 1);
    } else {
        favorites.push(movieId);
    }

    saveFavorites();
    updateFavoriteButtonState(movieId);
    
    const activeNav = document.querySelector('.nav-btn.text-primary')?.dataset.nav;
    if (activeNav === 'favorites') {
        displayFavorites();
    }
}

function updateFavoriteButtonState(movieId) {
    const favoriteBtn = document.getElementById('favorite-btn');
    if (!favoriteBtn) return;

    if (favorites.includes(movieId)) {
        favoriteBtn.classList.add('text-red-500');
        favoriteBtn.classList.remove('text-gray-500');
    } else {
        favoriteBtn.classList.add('text-gray-500');
        favoriteBtn.classList.remove('text-red-500');
    }
}

// -------------------------------------------------------------------------
// 3. UI AND VIEW MANAGEMENT (Navigation Logic)
// -------------------------------------------------------------------------

function applySettings() {
    const lang = currentSettings.language;
    const body = document.getElementById('body-root');
    
    // Theme Application
    if (currentSettings.theme === 'light') {
        body.classList.add('light-mode');
        document.getElementById('header-sticky').classList.remove('bg-darkbg');
        document.getElementById('header-sticky').classList.add('bg-midbg');
    } else {
        body.classList.remove('light-mode');
        document.getElementById('header-sticky').classList.remove('bg-midbg');
        document.getElementById('header-sticky').classList.add('bg-darkbg');
    }

    // Language Application
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.dataset.i18n;
        if (translations[lang] && translations[lang][key]) {
            el.textContent = translations[lang][key];
        } else if (translations.myanmar && translations.myanmar[key]) {
            el.textContent = translations.myanmar[key];
        }
    });
}

window.changeTheme = function(theme) {
    currentSettings.theme = theme;
    try {
        localStorage.setItem('userSettings', JSON.stringify(currentSettings));
    } catch (e) {
        console.error("Error saving settings:", e);
    }
    
    applySettings();
    
    const activeNavBtn = document.querySelector('.nav-btn.text-primary');
    if (activeNavBtn) {
        changeNav(activeNavBtn);
    }
}

window.changeNav = function(btn) {
    const nav = btn.dataset.nav;
    const navBtns = document.querySelectorAll('.nav-btn');
    const menuBar = document.getElementById('menu-bar');
    const playerContainer = document.getElementById('player-container');
    const currentTitleBar = document.querySelector('.max-w-3xl.mx-auto.flex.justify-between.items-center.mt-0.mb-6.px-2.w-full');
    const moviesContainer = document.getElementById('movies');
    
    // Reset all nav buttons
    navBtns.forEach(b => {
        b.classList.remove('text-primary', 'font-bold');
        b.classList.add('text-gray-400', 'hover:text-white');
    });

    // Set active nav button
    btn.classList.add('text-primary', 'font-bold');
    btn.classList.remove('text-gray-400', 'hover:text-white');

    // Reset grid/flex properties before content load
    moviesContainer.innerHTML = '';
    
    // Header/Player visibility and Layout Control
    if (nav === 'profile' || nav === 'admin') {
        menuBar.classList.add('hidden');
        playerContainer.classList.add('hidden');
        if (currentTitleBar) currentTitleBar.classList.add('hidden');
        
        moviesContainer.classList.remove('grid', 'grid-cols-2', 'sm:grid-cols-3', 'md:grid-cols-4', 'lg:grid-cols-5', 'gap-2', 'justify-items-center', 'px-0');
        moviesContainer.classList.add('flex', 'flex-col', 'w-full', 'pt-4');
    } else {
        menuBar.classList.remove('hidden');
        playerContainer.classList.remove('hidden');
        if (currentTitleBar) currentTitleBar.classList.remove('hidden');
        
        moviesContainer.classList.remove('flex', 'flex-col', 'w-full', 'pt-4');
        moviesContainer.classList.add('grid', 'grid-cols-2', 'sm:grid-cols-3', 'md:grid-cols-4', 'lg:grid-cols-5', 'gap-2', 'justify-items-center', 'px-0');
    }

    // Load Content
    switch (nav) {
        case 'home':
            const activeCategoryBtn = document.querySelector('.menu-btn.active-category') || document.querySelector('.menu-btn[data-category="action"]');
            if (activeCategoryBtn) {
                showCategory(activeCategoryBtn.dataset.category, activeCategoryBtn);
            } else if (videos.action) {
                showCategory('action', document.querySelector('.menu-btn[data-category="action"]'));
            } else {
                const t = translations[currentSettings.language] || translations.myanmar;
                moviesContainer.innerHTML = `<h2 class="text-xl font-bold text-center w-full mb-4 text-white/80 col-span-full">${t.noContent || 'No Content Available'}</h2>`;
            }
            break;

        case 'trending':
            document.querySelectorAll('.menu-btn').forEach(btn => {
                btn.classList.remove('active-category', 'active-category-blue', 'text-white', 'bg-gray-800');
                btn.classList.add('bg-gray-800', 'text-white', 'hover:bg-gray-700');
            });
            displayTrending();
            break;

        case 'favorites':
            document.querySelectorAll('.menu-btn').forEach(btn => {
                btn.classList.remove('active-category', 'active-category-blue', 'text-white', 'bg-gray-800');
                btn.classList.add('bg-gray-800', 'text-white', 'hover:bg-gray-700');
            });
            displayFavorites();
            break;
            
        case 'admin':
            document.querySelectorAll('.menu-btn').forEach(btn => {
                btn.classList.remove('active-category', 'active-category-blue', 'text-white', 'bg-gray-800');
                btn.classList.add('bg-gray-800', 'text-white', 'hover:bg-gray-700');
            });
            displayAdminPanel();
            break;

        case 'profile':
            document.querySelectorAll('.menu-btn').forEach(btn => {
                btn.classList.remove('active-category', 'active-category-blue', 'text-white', 'bg-gray-800');
                btn.classList.add('bg-gray-800', 'text-white', 'hover:bg-gray-700');
            });
            displayProfileSettings();
            break;
    }
}

window.changeLanguage = function(lang) {
    currentSettings.language = lang;
    try {
        localStorage.setItem('userSettings', JSON.stringify(currentSettings));
    } catch (e) {
        console.error("Error saving language:", e);
    }
    applySettings();
    const activeNavBtn = document.querySelector('.nav-btn.text-primary');
    if (activeNavBtn) {
        changeNav(activeNavBtn);
    }
}

// -------------------------------------------------------------------------
// 4. RENDERING LOGIC (Category/Trending/Favorites/Profile)
// -------------------------------------------------------------------------

window.showCategory = function(category, btn) {
    const moviesContainer = document.getElementById('movies');
    moviesContainer.innerHTML = '';
    
    document.querySelectorAll('.menu-btn').forEach(b => {
        b.classList.remove('active-category', 'active-category-blue', 'text-white');
        b.classList.add('bg-gray-800', 'text-white', 'hover:bg-gray-700');
    });

    if (btn) {
        btn.classList.add('active-category', 'active-category-blue', 'text-white');
        btn.classList.remove('bg-gray-800', 'hover:bg-gray-700');
    }

    const moviesList = videos[category] || [];
    if (moviesList.length === 0) {
        const t = translations[currentSettings.language] || translations.myanmar;
        moviesContainer.innerHTML = `<h2 class="text-xl font-bold text-center w-full mb-4 text-white/80 col-span-full">${t.noContent || 'No Content Available'}</h2>`;
        return;
    }

    moviesList.forEach(movie => {
        moviesContainer.appendChild(createMovieCard(movie));
    });
};

function displayTrending() {
    document.querySelectorAll('.menu-btn').forEach(b => {
        b.classList.remove('active-category', 'active-category-blue', 'text-white');
        b.classList.add('bg-gray-800', 'text-white', 'hover:bg-gray-700');
    });

    const moviesContainer = document.getElementById('movies');
    const t = translations[currentSettings.language] || translations.myanmar;
    
    const trendingMovies = videos.trending || [];
    
    moviesContainer.innerHTML = `<h2 class="text-xl font-bold text-center w-full mb-4 text-white/80 col-span-full">${t.trendingTitle || 'Trending Movies'}</h2>`;
    
    if (trendingMovies.length === 0) {
        moviesContainer.innerHTML += `<p class="text-center w-full text-gray-500 col-span-full">${t.noContent || 'No Content Available'}</p>`;
        return;
    }

    trendingMovies.forEach(movie => {
        moviesContainer.appendChild(createMovieCard(movie));
    });
}

function displayFavorites() {
    document.querySelectorAll('.menu-btn').forEach(b => {
        b.classList.remove('active-category', 'active-category-blue', 'text-white');
        b.classList.add('bg-gray-800', 'text-white', 'hover:bg-gray-700');
    });

    const moviesContainer = document.getElementById('movies');
    const t = translations[currentSettings.language] || translations.myanmar;

    const favoriteMovies = favorites.map(id => findMovieById(id)).filter(movie => movie !== null);
    
    moviesContainer.innerHTML = `<h2 class="text-xl font-bold text-center w-full mb-4 text-white/80 col-span-full">${t.favoritesTitle || 'My Favorites'}</h2>`;

    if (favoriteMovies.length === 0) {
        moviesContainer.innerHTML += `<p class="text-center w-full text-gray-500 col-span-full">${t.noFavorites || 'No favorite movies added yet.'}</p>`;
        return;
    }

    favoriteMovies.forEach(movie => {
        moviesContainer.appendChild(createMovieCard(movie));
    });
}

function displayProfileSettings() {
    document.querySelectorAll('.menu-btn').forEach(b => {
        b.classList.remove('active-category', 'active-category-blue', 'text-white');
        b.classList.add('bg-gray-800', 'text-white', 'hover:bg-gray-700');
    });
    
    const moviesContainer = document.getElementById('movies');
    const t = translations[currentSettings.language] || translations.myanmar;
    
    moviesContainer.innerHTML = `
        <div class="max-w-md mx-auto w-full space-y-6">
            <h2 class="text-3xl font-bold text-primary mb-6">${t.profileTitle || 'User Profile'}</h2>
            
            <!-- User Info Card -->
            <div class="p-6 bg-gray-800 rounded-lg shadow-lg">
                <h3 class="text-xl font-semibold mb-4 text-cyan-400">အသုံးပြုသူအချက်အလက်</h3>
                
                <div class="space-y-3 mb-6">
                    <div class="flex justify-between items-center">
                        <span class="text-gray-300">အမည်:</span>
                        <span class="font-medium" id="profile-name">${currentUser?.name || 'N/A'}</span>
                    </div>
                    <div class="flex justify-between items-center">
                        <span class="text-gray-300">အီးမေးလ်:</span>
                        <span class="font-medium" id="profile-email">${currentUser?.email || 'N/A'}</span>
                    </div>
                    <div class="flex justify-between items-center">
                        <span class="text-gray-300">User ID:</span>
                        <span class="font-medium text-sm" id="profile-id">${currentUser?.uid?.substring(0, 12) || 'N/A'}...</span>
                    </div>
                    <div class="flex justify-between items-center">
                        <span class="text-gray-300">အကောင့်အမျိုးအစား:</span>
                        <span class="font-medium ${currentUser?.role === 'admin' ? 'text-red-400' : 'text-green-400'}" id="profile-role">
                            ${currentUser?.role === 'admin' ? 'Admin' : 'User'}
                        </span>
                    </div>
                </div>
                
                <div class="border-t border-gray-700 pt-4">
                    <h4 class="text-lg font-semibold mb-3">${t.settingsTitle || 'Settings'}</h4>
                    
                    <div class="flex justify-between items-center mb-4">
                        <p class="text-gray-300">${t.themeLabel || 'Theme:'}</p>
                        <select id="theme-select" onchange="changeTheme(this.value)" class="bg-gray-700 text-white p-2 rounded border border-gray-600">
                            <option value="dark" ${currentSettings.theme === 'dark' ? 'selected' : ''}>Dark</option>
                            <option value="light" ${currentSettings.theme === 'light' ? 'selected' : ''}>Light</option>
                        </select>
                    </div>

                    <div class="flex justify-between items-center mb-6">
                        <p class="text-gray-300">${t.languageLabel || 'Language:'}</p>
                        <select id="language-select" onchange="changeLanguage(this.value)" class="bg-gray-700 text-white p-2 rounded border border-gray-600">
                            <option value="myanmar" ${currentSettings.language === 'myanmar' ? 'selected' : ''}>${t.langMyanmar || 'Myanmar'}</option>
                            <option value="english" ${currentSettings.language === 'english' ? 'selected' : ''}>${t.langEnglish || 'English'}</option>
                        </select>
                    </div>
                    
                    <div class="space-y-3">
                        <button onclick="logout()" class="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 rounded transition duration-200">
                            အကောင့်မှထွက်ရန်
                        </button>
                        
                        <button onclick="localStorage.clear(); window.location.reload();" class="w-full bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-2.5 rounded transition duration-200">
                            ${t.resetData || 'Reset App Data'}
                        </button>
                    </div>
                </div>
            </div>

            <button onclick="openAdultWebview()" class="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-lg shadow-xl flex items-center justify-center space-x-2 transition duration-200">
                <span class="text-xl">🔞</span>
                <span class="text-lg" data-i18n="adultContent">လူကြီးကားများကြည့်ရန် (18+)</span>
            </button>
        </div>
    `;

    // Set select values
    const themeSelect = document.getElementById('theme-select');
    const languageSelect = document.getElementById('language-select');
    
    if (themeSelect) themeSelect.value = currentSettings.theme;
    if (languageSelect) languageSelect.value = currentSettings.language;
}

// Update user profile display in real-time
function updateUserProfileDisplay() {
    if (!currentUser) return;
    
    const profileName = document.getElementById('profile-name');
    const profileEmail = document.getElementById('profile-email');
    const profileId = document.getElementById('profile-id');
    const profileRole = document.getElementById('profile-role');
    
    if (profileName) profileName.textContent = currentUser.name || currentUser.email?.split('@')[0] || 'N/A';
    if (profileEmail) profileEmail.textContent = currentUser.email || 'N/A';
    if (profileId) profileId.textContent = (currentUser.uid?.substring(0, 12) || 'N/A') + '...';
    if (profileRole) {
        profileRole.textContent = currentUser.role === 'admin' ? 'Admin' : 'User';
        profileRole.className = `font-medium ${currentUser.role === 'admin' ? 'text-red-400' : 'text-green-400'}`;
    }
}

// Admin panel display
async function displayAdminPanel() {
    const moviesContainer = document.getElementById('movies');
    
    // Get categories from videos object
    const categories = Object.keys(videos).filter(cat => cat !== 'trending');
    
    moviesContainer.innerHTML = `
        <div class="admin-panel">
            <h2 class="text-2xl font-bold text-primary mb-6">Admin Panel</h2>
            
            <div class="admin-section">
                <h3 class="text-xl font-semibold mb-4 text-cyan-400">🎬 Video များထည့်ရန်</h3>
                <input type="text" id="video-title" class="admin-input" placeholder="Video Title (ဥပမာ: Avengers)">
                <input type="text" id="video-url" class="admin-input" placeholder="Video URL (YouTube embed or Mega.nz)">
                <input type="text" id="video-thumb" class="admin-input" placeholder="Thumbnail URL (Optional)">
                <select id="video-category" class="admin-input">
                    ${categories.map(cat => `<option value="${cat}">${cat}</option>`).join('')}
                </select>
                <button onclick="addVideo()" class="admin-btn mt-3">Video ထည့်ရန်</button>
                <div id="video-status" class="mt-2 text-sm"></div>
            </div>
            
            <div class="admin-section">
                <h3 class="text-xl font-semibold mb-4 text-cyan-400">📢 ကြော်ညာများထည့်ရန်</h3>
                <div class="mb-3">
                    <label class="block text-gray-300 mb-2">ကြော်ညာအမျိုးအစား:</label>
                    <div class="flex space-x-4 mb-3">
                        <label class="flex items-center">
                            <input type="radio" name="ad-type" value="image" checked class="mr-2">
                            <span class="text-gray-300">ပုံ</span>
                        </label>
                        <label class="flex items-center">
                            <input type="radio" name="ad-type" value="video" class="mr-2">
                            <span class="text-gray-300">ဗီဒီယို</span>
                        </label>
                    </div>
                </div>
                <input type="text" id="ad-url" class="admin-input" placeholder="Photo URL or Video URL">
                <button onclick="addAdvertisement()" class="admin-btn mt-3">ကြော်ညာထည့်ရန်</button>
                <div id="ad-status" class="mt-2 text-sm"></div>
            </div>
            
            <div class="admin-section">
                <h3 class="text-xl font-semibold mb-4 text-cyan-400">👥 User List</h3>
                <div id="user-list" class="user-list">
                    Loading users...
                </div>
            </div>
        </div>
    `;
    
    await loadUserList();
}

// Load user list for admin
async function loadUserList() {
    try {
        const { db } = await import('./firebase-config.js');
        const { collection, getDocs } = await import("https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js");
        
        const usersRef = collection(db, 'users');
        const snapshot = await getDocs(usersRef);
        
        let userListHTML = '';
        let userCount = 0;
        
        snapshot.forEach((doc) => {
            const user = doc.data();
            userCount++;
            userListHTML += `
                <div class="user-item">
                    <div>
                        <div class="font-medium">${user.name || user.email}</div>
                        <div class="text-sm text-gray-400">${user.email}</div>
                        <div class="text-xs ${user.role === 'admin' ? 'text-red-400' : 'text-blue-400'}">
                            ${user.role === 'admin' ? '👑 Admin' : '👤 User'}
                        </div>
                    </div>
                    <div class="text-xs text-gray-500 text-right">
                        <div>${new Date(user.createdAt).toLocaleDateString()}</div>
                        <div class="text-xs opacity-75">${user.uid?.substring(0, 8)}...</div>
                    </div>
                </div>
            `;
        });
        
        const userListElement = document.getElementById('user-list');
        if (userListElement) {
            userListElement.innerHTML = userListHTML || '<div class="text-center text-gray-500">No users found</div>';
            
            // Add user count header
            const header = `<div class="mb-3 text-sm text-gray-400">Total Users: ${userCount}</div>`;
            userListElement.innerHTML = header + userListElement.innerHTML;
        }
        
    } catch (error) {
        console.error("Error loading users:", error);
        const userListElement = document.getElementById('user-list');
        if (userListElement) {
            userListElement.innerHTML = '<div class="text-center text-red-400">Error loading users</div>';
        }
    }
}

// -------------------------------------------------------------------------
// 5. HELPER AND VIDEO FUNCTIONS
// -------------------------------------------------------------------------

function createMovieCard(movie) {
    const movieId = movie.id;
    const isFav = favorites.includes(movieId);
    const t = translations[currentSettings.language] || translations.myanmar;
    const card = document.createElement('div');
    const bgColorClass = currentSettings.theme === 'light' ? 'bg-white' : 'bg-gray-800';
    
    card.className = `movie-card-bg ${bgColorClass} rounded-lg shadow-md hover:shadow-primary/50 transition duration-300 transform hover:scale-[1.03] overflow-hidden cursor-pointer w-full flex flex-col`;
    card.setAttribute('data-movie-id', movieId);

    card.innerHTML = `
        <div class="relative w-full aspect-video" onclick="window.playVideo('${movieId}')">
            <img src="${movie.thumb}" alt="${movie.title}" onerror="this.onerror=null;this.src='https://placehold.co/100x100/1a1a1a/cccccc?text=WY'" class="w-full h-full object-cover rounded-t-lg absolute">
            ${isFav ? `<div class="absolute top-1 left-1 text-primary z-10">
                <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
            </div>` : ''}
            ${movie.addedBy ? `<div class="absolute top-1 right-1 text-xs bg-black/60 text-white px-1 rounded">FB</div>` : ''}
        </div>
        <div class="p-2 flex flex-col justify-between flex-grow">
            <p class="text-xs font-medium leading-tight mb-1 truncate" title="${movie.title}">${movie.title}</p>
            <button onclick="window.playVideo('${movieId}')" class="mt-1 text-xs font-semibold text-primary hover:text-black hover:bg-primary transition duration-200 py-1 px-2 rounded-full border border-primary">
                ${t.nowPlaying || 'Play Now'}
            </button>
        </div>
    `;
    return card;
}

window.playVideo = function(movieId) {
    const movie = findMovieById(movieId);
    
    if (!movie) {
        showCustomAlert("Error", "ရုပ်ရှင်ဒေတာရှာမတွေ့ပါ");
        return;
    }
    
    currentPlayingMovie = movie;

    document.getElementById('iframePlayer').src = movie.src;
    document.getElementById('current-movie-title').textContent = movie.title;
    
    updateFavoriteButtonState(movieId);
}

function findMovieById(id) {
    return allVideos.find(movie => movie.id === id) || null;
}

function toggleFullScreen() {
    const playerContainer = document.getElementById('player-container');
    if (document.fullscreenElement) {
        document.exitFullscreen();
    } else {
        playerContainer.requestFullscreen().catch(err => {
            console.error(`Error attempting to enable full-screen mode: ${err.message}`);
        });
    }
}

let alertTimeout;
window.showCustomAlert = function(title, message) {
    // Create alert modal if not exists
    let modal = document.getElementById('custom-alert-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'custom-alert-modal';
        modal.className = 'hidden fixed inset-0 bg-black/70 z-[100] flex items-center justify-center p-4';
        modal.innerHTML = `
            <div class="bg-midbg p-6 rounded-lg shadow-2xl max-w-sm w-full text-white">
                <h3 class="text-xl font-bold mb-3 text-primary" id="alert-title"></h3>
                <p id="alert-message" class="mb-4"></p>
                <button onclick="closeCustomAlert()" class="w-full bg-primary text-black font-semibold py-2 rounded-lg hover:bg-opacity-90 transition duration-200">OK</button>
            </div>
        `;
        document.body.appendChild(modal);
    }
    
    document.getElementById('alert-title').textContent = title;
    document.getElementById('alert-message').textContent = message;
    modal.classList.remove('hidden');
    clearTimeout(alertTimeout);
    alertTimeout = setTimeout(closeCustomAlert, 5000);
}

window.closeCustomAlert = function() {
    const modal = document.getElementById('custom-alert-modal');
    if (modal) modal.classList.add('hidden');
    clearTimeout(alertTimeout);
}

// -------------------------------------------------------------------------
// 6. ADULT WEBVIEW LOGIC
// -------------------------------------------------------------------------

window.openAdultWebview = function() {
    const modal = document.getElementById('adult-webview-modal');
    const iframe = document.getElementById('adultWebviewIframe');
    
    if (!modal) {
        // Create modal if not exists
        const newModal = document.createElement('div');
        newModal.id = 'adult-webview-modal';
        newModal.className = 'hidden fixed inset-0 z-[60] flex flex-col bg-darkbg';
        newModal.innerHTML = `
            <header class="w-full bg-midbg border-b border-gray-700 p-4 flex justify-between items-center sticky top-0 z-10">
                <h2 class="text-2xl font-bold text-primary">WY MovieBox</h2>
                <button onclick="closeAdultWebview()" class="bg-primary text-black font-semibold py-2 px-4 rounded-lg hover:bg-opacity-90 transition duration-200">
                    မူလစာမျက်နှာ
                </button>
            </header>
            <iframe id="adultWebviewIframe" src="${ADULT_WEBVIEW_URL}" frameborder="0" class="flex-grow w-full"></iframe>
        `;
        document.body.appendChild(newModal);
        modal = newModal;
        iframe = document.getElementById('adultWebviewIframe');
    }
    
    iframe.src = ADULT_WEBVIEW_URL;
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

window.closeAdultWebview = function() {
    const modal = document.getElementById('adult-webview-modal');
    const iframe = document.getElementById('adultWebviewIframe');
    
    if (modal) {
        if (iframe) iframe.src = 'about:blank';
        modal.classList.add('hidden');
        document.body.style.overflow = '';
    }
}

// Add video function for admin
window.addVideo = async function() {
    const title = document.getElementById('video-title').value.trim();
    const url = document.getElementById('video-url').value.trim();
    const thumb = document.getElementById('video-thumb').value.trim();
    const category = document.getElementById('video-category').value;
    const statusElement = document.getElementById('video-status');
    
    if (!title || !url) {
        if (statusElement) statusElement.innerHTML = '<span class="text-red-400">ကျေးဇူးပြု၍ Title နှင့် URL ထည့်ပါ</span>';
        return;
    }
    
    if (!currentUser) {
        if (statusElement) statusElement.innerHTML = '<span class="text-red-400">ကျေးဇူးပြု၍ အကောင့်ဝင်ပါ</span>';
        return;
    }
    
    try {
        const { db } = await import('./firebase-config.js');
        const { collection, addDoc } = await import("https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js");
        
        // Add to Firestore
        await addDoc(collection(db, 'videos'), {
            title: title,
            src: url,
            thumb: thumb || 'https://placehold.co/300x200/1a1a1a/cccccc?text=WY',
            category: category,
            addedBy: currentUser.email,
            addedAt: new Date().toISOString(),
            uid: currentUser.uid
        });
        
        // Add to local videos array immediately
        if (!videos[category]) {
            videos[category] = [];
        }
        
        const newVideoId = 'fb_new_' + Date.now();
        videos[category].push({
            id: newVideoId,
            title: title,
            src: url,
            thumb: thumb || 'https://placehold.co/300x200/1a1a1a/cccccc?text=WY',
            addedBy: currentUser.email,
            addedAt: new Date().toISOString()
        });
        
        // Clear inputs
        document.getElementById('video-title').value = '';
        document.getElementById('video-url').value = '';
        document.getElementById('video-thumb').value = '';
        
        if (statusElement) {
            statusElement.innerHTML = '<span class="text-green-400">✓ Video ထည့်သွင်းခြင်း အောင်မြင်ပါသည်!</span>';
            setTimeout(() => {
                statusElement.innerHTML = '';
            }, 3000);
        }
        
        // Refresh the current view if showing the same category
        const activeNav = document.querySelector('.nav-btn.text-primary')?.dataset.nav;
        if (activeNav === 'home') {
            const activeCategory = document.querySelector('.menu-btn.active-category')?.dataset.category;
            if (activeCategory === category) {
                showCategory(category, document.querySelector(`.menu-btn[data-category="${category}"]`));
            }
        }
        
    } catch (error) {
        console.error("Error adding video:", error);
        if (statusElement) {
            statusElement.innerHTML = `<span class="text-red-400">အမှား: ${error.message}</span>`;
        }
    }
};

// Add advertisement function for admin
window.addAdvertisement = async function() {
    const adUrl = document.getElementById('ad-url').value.trim();
    const adType = document.querySelector('input[name="ad-type"]:checked').value;
    const statusElement = document.getElementById('ad-status');
    
    if (!adUrl) {
        if (statusElement) statusElement.innerHTML = '<span class="text-red-400">ကျေးဇူးပြု၍ URL ထည့်ပါ</span>';
        return;
    }
    
    if (!currentUser) {
        if (statusElement) statusElement.innerHTML = '<span class="text-red-400">ကျေးဇူးပြု၍ အကောင့်ဝင်ပါ</span>';
        return;
    }
    
    // Validate URL
    const urlPattern = /^(https?:\/\/)/i;
    if (!urlPattern.test(adUrl)) {
        if (statusElement) statusElement.innerHTML = '<span class="text-red-400">မှန်ကန်သော URL တစ်ခုထည့်ပါ</span>';
        return;
    }
    
    try {
        const { db } = await import('./firebase-config.js');
        const { collection, addDoc } = await import("https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js");
        
        await addDoc(collection(db, 'advertisements'), {
            url: adUrl,
            type: adType,
            addedBy: currentUser.email,
            addedAt: new Date().toISOString(),
            active: true,
            uid: currentUser.uid
        });
        
        // Clear input
        document.getElementById('ad-url').value = '';
        
        if (statusElement) {
            statusElement.innerHTML = '<span class="text-green-400">✓ ကြော်ညာထည့်သွင်းခြင်း အောင်မြင်ပါသည်!</span>';
            setTimeout(() => {
                statusElement.innerHTML = '';
            }, 3000);
        }
        
    } catch (error) {
        console.error("Error adding advertisement:", error);
        if (statusElement) {
            statusElement.innerHTML = `<span class="text-red-400">အမှား: ${error.message}</span>`;
        }
    }
};

// Initial application load 
window.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    
    // Add temporary login button for testing (remove in production)
    const tempBtn = document.createElement('button');
    tempBtn.textContent = 'Test Login';
    tempBtn.className = 'fixed top-4 left-4 bg-red-500 text-white p-2 rounded text-xs z-[1000]';
    tempBtn.onclick = tempLogin;
    document.body.appendChild(tempBtn);
});
