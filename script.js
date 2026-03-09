/**
 * WY MovieBox - Main JavaScript Logic (v5.1 - Updated with Notification & Modern Profile)
 */

// Global state variables
let videos = {};
let translations = {};
let favorites = [];
let currentPlayingMovie = null;
let currentSettings = {};

const defaultSettings = {
    language: 'myanmar',
    theme: 'dark',
};

const ADULT_WEBVIEW_URL = 'https://allkar.vercel.app/';
const MODAPP_WEBVIEW_URL = 'https://world-tv-2-bywaiyan.vercel.app/';

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
        
        // Listen for notifications after data/firebase is ready
        listenNotifications();
    } catch (e) {
        console.error("Failed to load JSON data. Content will be empty.", e);
        const t = translations.myanmar || { Error: "Error", jsonError: "ရုပ်ရှင်ဒေတာများ ဖတ်ယူနိုင်ခြင်း မရှိပါ (JSON Error)။" };
        showCustomAlert(t.Error, t.jsonError);
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
    
    if (navBar) {
        navBar.classList.remove('pointer-events-none', 'opacity-50');
    }
    
    if (menuBar) {
        menuBar.classList.remove('pointer-events-none', 'opacity-50');
    }
}

window.initializeApp = async function() {
    console.log("Initializing WY MovieBox app...");
    
    await loadDataFromJSON(); 
    generateVideoIds(); 

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
    
    applySettings();
    enableButtons(); 
    
    const homeBtn = document.querySelector('.nav-btn[data-nav="home"]');
    if (homeBtn) {
        changeNav(homeBtn); 
    }
}

// -------------------------------------------------------------------------
// 2. NOTIFICATION MANAGEMENT (NEW LOGIC)
// -------------------------------------------------------------------------

window.toggleNotiModal = function() {
    const modal = document.getElementById('noti-modal');
    if (modal) {
        modal.classList.toggle('hidden');
        if (!modal.classList.contains('hidden')) {
            document.getElementById('noti-badge').classList.add('hidden');
        }
    }
}

function listenNotifications() {
    // Firebase database ကို နားထောင်ခြင်း (admin.js နဲ့ ချိတ်ဆက်ရန်)
    if (typeof firebase !== 'undefined') {
        firebase.database().ref('notifications').limitToLast(10).on('value', (snapshot) => {
            const notiList = document.getElementById('noti-list');
            const badge = document.getElementById('noti-badge');
            const data = snapshot.val();
            
            if (data && notiList) {
                badge.classList.remove('hidden');
                notiList.innerHTML = "";
                Object.values(data).reverse().forEach(noti => {
                    notiList.innerHTML += `
                        <div class="noti-item border-l-4 border-primary bg-gray-800/50 p-4 rounded-xl shadow-sm">
                            <h4 class="font-bold text-primary text-sm">${noti.title}</h4>
                            <p class="text-gray-300 text-xs mt-1 leading-relaxed">${noti.message}</p>
                            <span class="noti-time text-[10px] text-gray-500 mt-2 block">${noti.date || ''}</span>
                        </div>
                    `;
                });
            }
        });
    }
}

// -------------------------------------------------------------------------
// 3. UI AND VIEW MANAGEMENT
// -------------------------------------------------------------------------

function applySettings() {
    const lang = currentSettings.language;
    const body = document.getElementById('body-root');
    
    if (currentSettings.theme === 'light') {
        body.classList.add('light-mode');
        const header = document.getElementById('header-sticky');
        if (header) {
            header.classList.remove('bg-darkbg');
            header.classList.add('bg-midbg');
        }
    } else {
        body.classList.remove('light-mode');
        const header = document.getElementById('header-sticky');
        if (header) {
            header.classList.remove('bg-midbg');
            header.classList.add('bg-darkbg');
        }
    }

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
    localStorage.setItem('userSettings', JSON.stringify(currentSettings));
    applySettings();
}

window.changeNav = function(btn) {
    const nav = btn.dataset.nav;
    const navBtns = document.querySelectorAll('.nav-btn');
    const menuBar = document.getElementById('menu-bar');
    const playerContainer = document.getElementById('player-container');
    const currentTitleBar = document.querySelector('.max-w-3xl.mx-auto.flex.justify-between.items-center.mt-0.mb-6.px-2.w-full');
    const moviesContainer = document.getElementById('movies');
    
    navBtns.forEach(b => {
        b.classList.remove('text-primary', 'font-bold');
        b.classList.add('text-gray-400', 'hover:text-white');
    });

    btn.classList.add('text-primary', 'font-bold');
    btn.classList.remove('text-gray-400', 'hover:text-white'); 

    if (moviesContainer) moviesContainer.innerHTML = '';
    
    if (nav === 'profile' || nav === 'admin' || nav === 'modapp') {
        if (menuBar) menuBar.classList.add('hidden');
        if (playerContainer) playerContainer.classList.add('hidden');
        if (currentTitleBar) currentTitleBar.classList.add('hidden'); 
        if (moviesContainer) {
            moviesContainer.classList.remove('grid', 'grid-cols-2', 'sm:grid-cols-3', 'md:grid-cols-4', 'lg:grid-cols-5', 'gap-2', 'justify-items-center', 'px-0');
            moviesContainer.classList.add('flex', 'flex-col', 'w-full', 'pt-4'); 
        }
    } else {
        if (menuBar) menuBar.classList.remove('hidden');
        if (playerContainer) playerContainer.classList.remove('hidden');
        if (currentTitleBar) currentTitleBar.classList.remove('hidden'); 
        if (moviesContainer) {
            moviesContainer.classList.remove('flex', 'flex-col', 'w-full', 'pt-4');
            moviesContainer.classList.add('grid', 'grid-cols-2', 'sm:grid-cols-3', 'md:grid-cols-4', 'lg:grid-cols-5', 'gap-2', 'justify-items-center', 'px-0');
        }
    }

    switch (nav) {
        case 'home':
            const activeCategoryBtn = document.querySelector('.menu-btn.active-category') || document.querySelector('.menu-btn[data-category="action"]');
            if (activeCategoryBtn) showCategory(activeCategoryBtn.dataset.category, activeCategoryBtn);
            break;
        case 'trending': displayTrending(); break;
        case 'favorites': displayFavorites(); break;
        case 'admin': displayAdminPanel(); break;
        case 'profile': displayProfileSettings(); break;
        case 'modapp': 
            window.open(MODAPP_WEBVIEW_URL, '_blank'); 
            const homeBtn = document.querySelector('.nav-btn[data-nav="home"]');
            if (homeBtn) setTimeout(() => changeNav(homeBtn), 100);
            break;
    }
}

// -------------------------------------------------------------------------
// 4. RENDERING LOGIC (MODERNIZED PROFILE UI)
// -------------------------------------------------------------------------

function displayProfileSettings() {
    const moviesContainer = document.getElementById('movies');
    if (!moviesContainer) return;
    
    const currentUser = JSON.parse(localStorage.getItem('currentUser')) || {};
    const t = translations[currentSettings.language] || translations.myanmar;
    const userName = currentUser.name || currentUser.email?.split('@')[0] || 'User';

    moviesContainer.innerHTML = `
        <div class="max-w-md mx-auto w-full space-y-6 pb-24 px-2">
            <!-- Profile Card -->
            <div class="profile-gradient-card p-8 rounded-[2.5rem] shadow-2xl text-center relative overflow-hidden">
                <div class="relative z-10">
                    <div class="w-24 h-24 bg-white/20 backdrop-blur-md rounded-full mx-auto p-1 mb-4 border-2 border-white/50 overflow-hidden shadow-inner">
                        <img src="https://ui-avatars.com/api/?name=${userName}&background=random" class="rounded-full w-full h-full object-cover">
                    </div>
                    <h2 class="text-2xl font-bold text-white">${userName}</h2>
                    <p class="text-blue-100 text-xs opacity-80">${currentUser.email || ''}</p>
                    <span class="inline-block mt-2 px-3 py-1 bg-black/20 rounded-full text-[10px] text-white uppercase tracking-wider">
                        ${currentUser.role === 'admin' ? 'Administrator' : 'Verified Member'}
                    </span>
                </div>
                <div class="absolute -bottom-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
            </div>

            <!-- Preferences Section -->
            <div class="space-y-3">
                <h3 class="text-gray-500 text-[10px] font-bold uppercase tracking-[0.2em] ml-4">Preferences</h3>
                
                <div class="setting-item-card">
                    <div class="flex items-center space-x-4">
                        <div class="bg-blue-500/10 p-2.5 rounded-2xl text-blue-400 shadow-sm">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 0h3m-3-3a13.05 13.05 0 01-2.81 7.393L14.5 18"></path></svg>
                        </div>
                        <span class="font-semibold text-sm">Language</span>
                    </div>
                    <select onchange="changeLanguage(this.value)" class="bg-transparent text-sm text-gray-400 outline-none border-none cursor-pointer focus:ring-0">
                        <option value="myanmar" ${currentSettings.language === 'myanmar' ? 'selected' : ''}>မြန်မာ</option>
                        <option value="english" ${currentSettings.language === 'english' ? 'selected' : ''}>English</option>
                    </select>
                </div>

                <div class="setting-item-card" onclick="changeTheme(document.getElementById('theme-toggle').checked ? 'dark' : 'light')">
                    <div class="flex items-center space-x-4">
                        <div class="bg-yellow-500/10 p-2.5 rounded-2xl text-yellow-500 shadow-sm">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m12.728 0l-.707-.707M6.343 6.343l-.707-.707"></path></svg>
                        </div>
                        <span class="font-semibold text-sm">Dark Mode</span>
                    </div>
                    <input type="checkbox" id="theme-toggle" class="hidden" ${currentSettings.theme === 'dark' ? 'checked' : ''}>
                    <div class="w-10 h-5 bg-blue-600 rounded-full relative transition-colors shadow-inner">
                        <div class="absolute right-1 top-1 w-3 h-3 bg-white rounded-full transition-all ${currentSettings.theme === 'dark' ? 'translate-x-0' : '-translate-x-5'}"></div>
                    </div>
                </div>
            </div>

            <!-- Danger Zone -->
            <div class="pt-4">
                <button onclick="logout()" class="w-full bg-red-500/5 hover:bg-red-500 text-red-500 hover:text-white p-5 rounded-[2rem] font-bold transition-all duration-300 flex items-center justify-center space-x-3 border border-red-500/10 shadow-sm">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
                    <span>အကောင့်မှ ထွက်ရန်</span>
                </button>
            </div>
            
            <button onclick="openAdultWebview()" class="w-full bg-gray-800/80 hover:bg-red-600 text-gray-400 hover:text-white p-4 rounded-3xl text-sm font-medium transition-all duration-300 flex items-center justify-center space-x-2 border border-gray-700">
                <span></span>
                <span>${t.adultContent || 'Adult Content (18+)'}</span>
            </button>
        </div>
    `;
}

// -------------------------------------------------------------------------
// 5. HELPER VIDEO FUNCTIONS (UNCHANGED CORE LOGIC)
// -------------------------------------------------------------------------

window.showCategory = function(category, btn) {
    const moviesContainer = document.getElementById('movies');
    if (!moviesContainer) return;
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
    moviesList.forEach(movie => moviesContainer.appendChild(createMovieCard(movie)));
};

function displayTrending() {
    const moviesContainer = document.getElementById('movies');
    if (!moviesContainer) return;
    const t = translations[currentSettings.language] || translations.myanmar;
    const trendingMovies = videos.trending || []; 
    moviesContainer.innerHTML = `<h2 class="text-xl font-bold text-center w-full mb-4 text-white/80 col-span-full">${t.trendingTitle || 'Trending Movies'}</h2>`;
    trendingMovies.forEach(movie => moviesContainer.appendChild(createMovieCard(movie)));
}

function displayFavorites() {
    const moviesContainer = document.getElementById('movies');
    if (!moviesContainer) return;
    const t = translations[currentSettings.language] || translations.myanmar;
    const favoriteMovies = favorites.map(id => findMovieById(id)).filter(movie => movie !== null);
    moviesContainer.innerHTML = `<h2 class="text-xl font-bold text-center w-full mb-4 text-white/80 col-span-full">${t.favoritesTitle || 'My Favorites'}</h2>`;
    if (favoriteMovies.length === 0) {
        moviesContainer.innerHTML += `<p class="text-center w-full text-gray-500 col-span-full py-20">${t.noFavorites || 'No favorites yet.'}</p>`;
        return;
    }
    favoriteMovies.forEach(movie => moviesContainer.appendChild(createMovieCard(movie)));
}

function createMovieCard(movie) {
    const movieId = movie.id; 
    const isFav = favorites.includes(movieId); 
    const t = translations[currentSettings.language] || translations.myanmar;
    const card = document.createElement('div');
    const bgColorClass = currentSettings.theme === 'light' ? 'bg-white' : 'bg-gray-800';
    
    card.className = `movie-card-bg ${bgColorClass} rounded-lg shadow-md hover:shadow-primary/50 transition duration-300 transform hover:scale-[1.03] overflow-hidden cursor-pointer w-full flex flex-col`;
    card.innerHTML = `
        <div class="relative w-full aspect-video" onclick="window.playVideo('${movieId}')"> 
            <img src="${movie.thumb}" class="w-full h-full object-cover absolute">
            ${isFav ? `<div class="absolute top-1 left-1 text-primary z-10"><svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg></div>` : ''}
        </div>
        <div class="p-2 flex flex-col flex-grow">
            <p class="text-[0.65rem] font-medium leading-tight mb-2 truncate">${movie.title}</p> 
            <button onclick="window.playVideo('${movieId}')" class="mt-auto text-[0.6rem] font-bold text-primary border border-primary/30 py-1.5 rounded-full hover:bg-primary hover:text-black transition">
                ${t.nowPlaying || 'Play Now'}
            </button>
        </div>
    `;
    return card;
}

window.playVideo = function(movieId) {
    const movie = findMovieById(movieId);
    if (!movie) return;
    currentPlayingMovie = movie;
    const iframePlayer = document.getElementById('iframePlayer');
    const currentMovieTitle = document.getElementById('current-movie-title');
    if (iframePlayer) iframePlayer.src = movie.src;
    if (currentMovieTitle) currentMovieTitle.textContent = movie.title;
    updateFavoriteButtonState(movieId);
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function findMovieById(id) {
    for (const category in videos) {
        const movie = videos[category].find(movie => movie.id === id);
        if (movie) return movie;
    }
    return null;
}

function updateFavoriteButtonState(movieId) {
    const favoriteBtn = document.getElementById('favorite-btn');
    if (favoriteBtn) {
        favoriteBtn.classList.toggle('text-red-500', favorites.includes(movieId));
        favoriteBtn.classList.toggle('text-gray-500', !favorites.includes(movieId));
    }
}

window.toggleFavorite = function() {
    if (!currentPlayingMovie) return;
    const index = favorites.indexOf(currentPlayingMovie.id);
    if (index > -1) favorites.splice(index, 1);
    else favorites.push(currentPlayingMovie.id);
    localStorage.setItem('favorites', JSON.stringify(favorites));
    updateFavoriteButtonState(currentPlayingMovie.id);
}

function toggleFullScreen() {
    const playerContainer = document.getElementById('player-container');
    if (!playerContainer) return;
    if (document.fullscreenElement) document.exitFullscreen();
    else playerContainer.requestFullscreen();
}

window.openAdultWebview = function() {
    const modal = document.getElementById('adult-webview-modal');
    if (!modal) {
        const newModal = document.createElement('div');
        newModal.id = 'adult-webview-modal';
        newModal.className = 'fixed inset-0 z-[120] flex flex-col bg-darkbg';
        newModal.innerHTML = `
            <header class="w-full bg-midbg border-b border-gray-700 p-4 flex justify-between items-center">
                <h2 class="text-xl font-bold text-primary">WY MovieBox 18+</h2>
                <button onclick="closeAdultWebview()" class="bg-primary text-black font-bold py-2 px-6 rounded-xl">Back</button>
            </header>
            <iframe id="adultWebviewIframe" src="${ADULT_WEBVIEW_URL}" class="flex-grow w-full border-none"></iframe>
        `;
        document.body.appendChild(newModal);
    } else modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

window.closeAdultWebview = function() {
    const modal = document.getElementById('adult-webview-modal');
    if (modal) {
        document.getElementById('adultWebviewIframe').src = 'about:blank';
        modal.classList.add('hidden');
        document.body.style.overflow = '';
    }
}

window.changeLanguage = function(lang) {
    currentSettings.language = lang;
    localStorage.setItem('userSettings', JSON.stringify(currentSettings));
    applySettings();
    changeNav(document.querySelector('.nav-btn.text-primary'));
}

// Admin Panel Logic (Placeholder for list loading)
function displayAdminPanel() {
    const moviesContainer = document.getElementById('movies');
    if (!moviesContainer) return;
    moviesContainer.innerHTML = `
        <div class="admin-panel p-4">
            <h2 class="text-2xl font-bold text-primary mb-6">Admin Dashboard</h2>
            <div class="admin-section">
                <h3 class="text-lg font-semibold mb-4">Notification Center</h3>
                <input type="text" id="admin-noti-title" class="admin-input" placeholder="Noti Title">
                <textarea id="admin-noti-msg" class="admin-input h-24 mt-2" placeholder="Message..."></textarea>
                <button onclick="window.sendNotification()" class="admin-btn mt-3 w-full">Send To All Users</button>
            </div>
        </div>
    `;
}
