/**
 * WY MovieBox - Main JavaScript Logic (v4.0 - With Auth)
 */

// Global state variables
let videos = {};
let translations = {};
let favorites = [];
let currentPlayingMovie = null;
let currentSettings = {};
let currentUser = null;

const defaultSettings = {
    language: 'myanmar',
    theme: 'dark',
};

const ADULT_WEBVIEW_URL = 'https://allkar.vercel.app/';
const MODAPP_WEBVIEW_URL = 'https://wyap-pstore.vercel.app/';

// Check authentication status
function checkAuth() {
    const user = JSON.parse(localStorage.getItem('currentUser'));
    if (user) {
        currentUser = user;
        showMainApp();
        if (user.email === 'yan260702@gmail.com') {
            document.getElementById('admin-btn').classList.remove('hidden');
        }
    } else {
        showLoginScreen();
    }
}

function showLoginScreen() {
    document.getElementById('login-screen').classList.remove('hidden');
    document.getElementById('main-app').classList.add('hidden');
}

function showMainApp() {
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('main-app').classList.remove('hidden');
    initializeApp();
}

// Logout function
window.logout = function() {
    localStorage.removeItem('currentUser');
    currentUser = null;
    showLoginScreen();
};

// Data loading and initialization
async function loadDataFromJSON() {
    try {
        const response = await fetch('data.json');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        videos = data.videos || {};
        translations = data.translations || {};
        console.log("Data loaded successfully from JSON.");
    } catch (e) {
        console.error("Failed to load JSON data.", e);
        showCustomAlert("Error", "ရုပ်ရှင်ဒေတာများ ဖတ်ယူနိုင်ခြင်း မရှိပါ။");
    }
}

function generateVideoIds() {
    let idCounter = 1;
    for (const category in videos) {
        videos[category] = videos[category].map(movie => {
            if (!movie.id) movie.id = 'v' + idCounter++;
            return movie;
        });
    }
}

function enableButtons() {
    const loadingIndicator = document.getElementById('loading-indicator');
    if (loadingIndicator) loadingIndicator.remove();
}

window.initializeApp = async function() {
    await loadDataFromJSON();
    generateVideoIds();
    
    const storedSettings = localStorage.getItem('userSettings');
    const storedFavorites = localStorage.getItem('favorites');
    
    currentSettings = storedSettings ? { ...defaultSettings, ...JSON.parse(storedSettings) } : { ...defaultSettings };
    favorites = storedFavorites ? JSON.parse(storedFavorites) : [];
    if (!Array.isArray(favorites)) favorites = [];
    
    applySettings();
    enableButtons();
    
    const homeBtn = document.querySelector('.nav-btn[data-nav="home"]');
    if (homeBtn) changeNav(homeBtn);
};

// ... (ကျန်တဲ့ function တွေကို မူရင်းအတိုင်းထားမယ် - တူညီတယ်)
// showCategory, displayTrending, displayFavorites, displayProfileSettings စသည်
// createMovieCard, playVideo, findMovieById စသည်

// Navigation function (updated for admin)
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

    // Reset grid/flex properties
    moviesContainer.innerHTML = '';
    
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
            if (activeCategoryBtn) showCategory(activeCategoryBtn.dataset.category, activeCategoryBtn);
            else if (videos.action) showCategory('action', document.querySelector('.menu-btn[data-category="action"]'));
            break;
        case 'trending':
            displayTrending();
            break;
        case 'favorites':
            displayFavorites();
            break;
        case 'admin':
            displayAdminPanel();
            break;
        case 'profile':
            displayProfileSettings();
            break;
    }
};

// Admin panel display
function displayAdminPanel() {
    const moviesContainer = document.getElementById('movies');
    
    moviesContainer.innerHTML = `
        <div class="admin-panel">
            <h2 class="text-2xl font-bold text-primary mb-6">Admin Panel</h2>
            
            <div class="admin-section">
                <h3 class="text-xl font-semibold mb-4">🎬 Video များထည့်ရန်</h3>
                <input type="text" id="video-title" class="admin-input" placeholder="Video Title">
                <input type="text" id="video-url" class="admin-input" placeholder="Video URL">
                <input type="text" id="video-thumb" class="admin-input" placeholder="Thumbnail URL">
                <select id="video-category" class="admin-input">
                    <option value="action">လှုပ်ရှားမှု</option>
                    <option value="drama">ဒရာမာ</option>
                    <option value="cartoon">ကာတွန်း</option>
                    <option value="romance">အချစ်</option>
                    <option value="myanmar">မြန်မာ</option>
                    <option value="trending">ခေတ်စားနေသည်</option>
                </select>
                <button onclick="addVideo()" class="admin-btn mt-2">Video ထည့်ရန်</button>
            </div>
            
            <div class="admin-section">
                <h3 class="text-xl font-semibold mb-4">📢 ကြော်ညာများထည့်ရန်</h3>
                <input type="text" id="ad-url" class="admin-input" placeholder="Photo URL or Video URL">
                <button onclick="addAdvertisement()" class="admin-btn mt-2">ကြော်ညာထည့်ရန်</button>
            </div>
            
            <div class="admin-section">
                <h3 class="text-xl font-semibold mb-4">👥 User List</h3>
                <div id="user-list" class="user-list">
                    Loading users...
                </div>
            </div>
        </div>
    `;
    
    loadUserList();
}

// Initialize on load
window.addEventListener('DOMContentLoaded', () => {
    checkAuth();
});
