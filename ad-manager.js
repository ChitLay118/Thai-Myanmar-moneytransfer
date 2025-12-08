import { db } from './firebase-config.js';
import { collection, getDocs, query, where, orderBy, limit } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

// Check and show ad on app open
document.addEventListener('DOMContentLoaded', async () => {
    // Check if user has seen ad today
    const lastAdDate = localStorage.getItem('lastAdDate');
    const today = new Date().toDateString();
    
    if (lastAdDate !== today) {
        await showAd();
        localStorage.setItem('lastAdDate', today);
    }
});

async function showAd() {
    try {
        // Get active ads from Firebase
        const adsRef = collection(db, 'advertisements');
        const q = query(adsRef, where("active", "==", true), orderBy("addedAt", "desc"), limit(1));
        const snapshot = await getDocs(q);
        
        if (!snapshot.empty) {
            const ad = snapshot.docs[0].data();
            const adModal = document.getElementById('ad-modal');
            const adContent = document.getElementById('ad-content');
            
            if (ad.type === 'image') {
                adContent.innerHTML = `
                    <img src="${ad.url}" alt="Advertisement" class="w-full h-auto rounded-lg">
                `;
            } else {
                adContent.innerHTML = `
                    <video src="${ad.url}" controls autoplay class="w-full h-auto rounded-lg"></video>
                `;
            }
            
            adModal.classList.remove('hidden');
        }
    } catch (error) {
        console.error("Error loading ad:", error);
    }
}

// Close ad modal
window.closeAdModal = function() {
    document.getElementById('ad-modal').classList.add('hidden');
};
