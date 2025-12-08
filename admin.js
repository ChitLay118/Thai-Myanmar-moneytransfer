import { db, storage } from './firebase-config.js';
import { collection, addDoc, getDocs, updateDoc, doc, deleteDoc } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-storage.js";

// Add video to Firebase
window.addVideo = async function() {
    const title = document.getElementById('video-title').value;
    const url = document.getElementById('video-url').value;
    const thumb = document.getElementById('video-thumb').value;
    const category = document.getElementById('video-category').value;
    
    if (!title || !url) {
        alert("Please fill in title and URL");
        return;
    }
    
    try {
        // Add to Firestore
        await addDoc(collection(db, 'videos'), {
            title: title,
            src: url,
            thumb: thumb || 'https://placehold.co/300x200/1a1a1a/cccccc?text=WY',
            category: category,
            addedBy: JSON.parse(localStorage.getItem('currentUser')).email,
            addedAt: new Date().toISOString()
        });
        
        alert("Video added successfully!");
        
        // Clear inputs
        document.getElementById('video-title').value = '';
        document.getElementById('video-url').value = '';
        document.getElementById('video-thumb').value = '';
        
    } catch (error) {
        alert(`Error: ${error.message}`);
    }
};

// Add advertisement
window.addAdvertisement = async function() {
    const adUrl = document.getElementById('ad-url').value;
    
    if (!adUrl) {
        alert("Please enter an ad URL");
        return;
    }
    
    try {
        // Check if it's an image or video
        const isImage = adUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i);
        const isVideo = adUrl.match(/\.(mp4|webm|ogg|mov)$/i);
        
        if (!isImage && !isVideo) {
            alert("Please enter a valid image or video URL");
            return;
        }
        
        await addDoc(collection(db, 'advertisements'), {
            url: adUrl,
            type: isImage ? 'image' : 'video',
            addedBy: JSON.parse(localStorage.getItem('currentUser')).email,
            addedAt: new Date().toISOString(),
            active: true
        });
        
        alert("Advertisement added successfully!");
        document.getElementById('ad-url').value = '';
        
    } catch (error) {
        alert(`Error: ${error.message}`);
    }
};

// Load user list
async function loadUserList() {
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
                    </div>
                    <div class="text-xs text-gray-500">
                        ${new Date(user.createdAt).toLocaleDateString()}
                    </div>
                </div>
            `;
        });
        
        document.getElementById('user-list').innerHTML = userListHTML || 'No users found';
        
    } catch (error) {
        console.error("Error loading users:", error);
        document.getElementById('user-list').innerHTML = 'Error loading users';
    }
}
