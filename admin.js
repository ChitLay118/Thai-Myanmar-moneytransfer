import { db } from './firebase-config.js';
import { collection, addDoc, getDocs, setDoc, doc } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

// Add video to Firebase
window.addVideo = async function() {
    const title = document.getElementById('video-title').value.trim();
    const url = document.getElementById('video-url').value.trim();
    const thumb = document.getElementById('video-thumb').value.trim();
    const category = document.getElementById('video-category').value;
    
    if (!title || !url) {
        alert("ကျေးဇူးပြု၍ Title နှင့် URL ထည့်ပါ");
        return;
    }
    
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (!currentUser) {
        alert("ကျေးဇူးပြု၍ အကောင့်ဝင်ပါ");
        return;
    }
    
    try {
        await addDoc(collection(db, 'videos'), {
            title: title,
            src: url,
            thumb: thumb || 'https://placehold.co/300x200/1a1a1a/cccccc?text=WY',
            category: category,
            addedBy: currentUser.email,
            addedAt: new Date().toISOString(),
            uid: currentUser.uid
        });
        
        alert("Video ထည့်သွင်းခြင်း အောင်မြင်ပါသည်!");
        
        // Clear inputs
        document.getElementById('video-title').value = '';
        document.getElementById('video-url').value = '';
        document.getElementById('video-thumb').value = '';
        
    } catch (error) {
        console.error("Error adding video:", error);
        alert(`အမှား: ${error.message}`);
    }
};

// Add advertisement
window.addAdvertisement = async function() {
    const adUrl = document.getElementById('ad-url').value.trim();
    
    if (!adUrl) {
        alert("ကျေးဇူးပြု၍ URL ထည့်ပါ");
        return;
    }
    
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (!currentUser) {
        alert("ကျေးဇူးပြု၍ အကောင့်ဝင်ပါ");
        return;
    }
    
    try {
        // Check if it's an image or video
        const isImage = adUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i);
        const isVideo = adUrl.match(/\.(mp4|webm|ogg|mov)$/i);
        
        if (!isImage && !isVideo) {
            alert("ကျေးဇူးပြု၍ ပုံသို့မဟုတ် ဗီဒီယို URL တစ်ခုထည့်ပါ");
            return;
        }
        
        await addDoc(collection(db, 'advertisements'), {
            url: adUrl,
            type: isImage ? 'image' : 'video',
            addedBy: currentUser.email,
            addedAt: new Date().toISOString(),
            active: true,
            uid: currentUser.uid
        });
        
        alert("ကြော်ညာထည့်သွင်းခြင်း အောင်မြင်ပါသည်!");
        document.getElementById('ad-url').value = '';
        
    } catch (error) {
        console.error("Error adding advertisement:", error);
        alert(`အမှား: ${error.message}`);
    }
};

// Load user list
window.loadUserList = async function() {
    try {
        const usersRef = collection(db, 'users');
        const snapshot = await getDocs(usersRef);
        
        let userListHTML = '';
        snapshot.forEach((doc) => {
            const user = doc.data();
            userListHTML += `
                <div class="user-item">
                    <div>
                        <div class="font-medium">${user.name || user.email}</div>
                        <div class="text-sm text-gray-400">${user.email}</div>
                        <div class="text-xs ${user.role === 'admin' ? 'text-red-400' : 'text-blue-400'}">
                            ${user.role === 'admin' ? ' Admin' : ' User'}
                        </div>
                    </div>
                    <div class="text-xs text-gray-500">
                        ${new Date(user.createdAt).toLocaleDateString()}
                    </div>
                </div>
            `;
        });
        
        const userListElement = document.getElementById('user-list');
        if (userListElement) {
            userListElement.innerHTML = userListHTML || '<div class="text-center text-gray-500">No users found</div>';
        }
        
    } catch (error) {
        console.error("Error loading users:", error);
        const userListElement = document.getElementById('user-list');
        if (userListElement) {
            userListElement.innerHTML = '<div class="text-center text-red-400">Error loading users</div>';
        }
    }
};
