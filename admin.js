import { db } from './firebase-config.js';
import { collection, addDoc, getDocs, setDoc, doc, query, orderBy, limit } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

/**
 * ၁။ Notification ပို့သည့် Function (NEW)
 * Admin Panel ရှိ 'Send To All Users' ခလုတ်ကနေ ခေါ်သုံးပါမယ်။
 */
window.sendNotification = async function() {
    const title = document.getElementById('admin-noti-title').value.trim();
    const message = document.getElementById('admin-noti-msg').value.trim();

    if (!title || !message) {
        alert("ခေါင်းစဉ်နှင့် စာသား အပြည့်အစုံ ထည့်ပါဦး");
        return;
    }

    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (!currentUser) {
        alert("Admin အဖြစ် အကောင့်ဝင်ထားရန် လိုအပ်သည်");
        return;
    }

    try {
        // Firestore ရှိ 'notifications' collection ထဲကို သိမ်းမယ်
        await addDoc(collection(db, 'notifications'), {
            title: title,
            message: message,
            date: new Date().toLocaleString('en-GB', { 
                day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' 
            }),
            timestamp: new Date().getTime(),
            addedBy: currentUser.email
        });

        alert("အားလုံးထံ အကြောင်းကြားစာ ပို့ပြီးပါပြီ!");
        
        // Input တွေကို ပြန်ရှင်းမယ်
        document.getElementById('admin-noti-title').value = "";
        document.getElementById('admin-noti-msg').value = "";
    } catch (error) {
        console.error("Error sending notification:", error);
        alert(`ပို့ဆောင်မှု မအောင်မြင်ပါ: ${error.message}`);
    }
};

/**
 * ၂။ Video ထည့်သည့် Function (မူရင်းအတိုင်း)
 */
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
        document.getElementById('video-title').value = '';
        document.getElementById('video-url').value = '';
        document.getElementById('video-thumb').value = '';
        
    } catch (error) {
        console.error("Error adding video:", error);
        alert(`အမှား: ${error.message}`);
    }
};

/**
 * ၃။ ကြော်ညာထည့်သည့် Function (မူရင်းအတိုင်း)
 */
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

/**
 * ၄။ User List ကို ဆွဲထုတ်ပြသည့် Function (မူရင်းအတိုင်း)
 */
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
                        ${user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
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
