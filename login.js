// ========== login.js ==========
import { app } from './firebase-config.js';
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-auth.js";

const auth = getAuth(app);

// إذا كان الأدمن مسجل دخول أصلاً، بنحوله للوحة فوراً
onAuthStateChanged(auth, (user) => {
    if (user) {
        window.location.href = 'admin.html';
    }
});

const loginForm = document.getElementById('loginForm');
const errorMsg = document.getElementById('errorMsg');
const loginBtn = document.getElementById('loginBtn');

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('adminEmail').value;
    const password = document.getElementById('adminPassword').value;
    
    loginBtn.innerText = "جاري التحقق...";
    loginBtn.disabled = true;
    errorMsg.style.display = 'none';

    try {
        await signInWithEmailAndPassword(auth, email, password);
        // إذا نجح التسجيل، بنحوله لصفحة الأدمن
        window.location.href = 'admin.html';
    } catch (error) {
        console.error("خطأ في تسجيل الدخول:", error);
        errorMsg.style.display = 'block';
        loginBtn.innerText = "تسجيل الدخول";
        loginBtn.disabled = false;
    }
});