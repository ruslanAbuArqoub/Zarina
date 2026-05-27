// ========== login.js ==========
import { app } from './firebase-config.js';
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, sendPasswordResetEmail, signOut } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-auth.js";

const auth = getAuth(app);
const LOGIN_GUARD_KEY = 'zarinaLoginGuard';
const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_TIME_MS = 15 * 60 * 1000;
const ADMIN_EMAILS = [
    'googgermal@gmail.com',
    'katia-abu-arqoub@admin.zarina'
];
const DEFAULT_ADMIN_EMAIL = ADMIN_EMAILS[0];
const isResetMode = new URLSearchParams(window.location.search).has('reset');

function isAdminEmail(email) {
    return ADMIN_EMAILS.includes((email || '').toLowerCase());
}

// إذا كان الأدمن مسجل دخول أصلاً، بنحوله للوحة فوراً
onAuthStateChanged(auth, (user) => {
    if (isResetMode) return;
    if (isAdminEmail(user?.email)) {
        localStorage.removeItem(LOGIN_GUARD_KEY);
        window.location.href = 'admin.html';
    } else if (user) {
        signOut(auth);
    }
});

const loginForm = document.getElementById('loginForm');
const errorMsg = document.getElementById('errorMsg');
const loginBtn = document.getElementById('loginBtn');
const resetPasswordBtn = document.getElementById('resetPasswordBtn');
const passwordInput = document.getElementById('adminPassword');
const togglePasswordBtn = document.getElementById('togglePasswordBtn');

togglePasswordBtn?.addEventListener('click', () => {
    const isHidden = passwordInput.type === 'password';
    passwordInput.type = isHidden ? 'text' : 'password';
    togglePasswordBtn.textContent = isHidden ? 'إخفاء' : 'إظهار';
    passwordInput.focus();
});

function readLoginGuard() {
    try {
        return JSON.parse(localStorage.getItem(LOGIN_GUARD_KEY) || '{}');
    } catch (error) {
        return {};
    }
}

function remainingLockTime() {
    const guard = readLoginGuard();
    return Math.max(0, (Number(guard.lockedUntil) || 0) - Date.now());
}

function registerFailedLogin() {
    const guard = readLoginGuard();
    const attempts = (Number(guard.attempts) || 0) + 1;
    localStorage.setItem(LOGIN_GUARD_KEY, JSON.stringify({
        attempts,
        lockedUntil: attempts >= MAX_LOGIN_ATTEMPTS ? Date.now() + LOCK_TIME_MS : 0
    }));
}

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const lockTime = remainingLockTime();
    if (lockTime > 0) {
        errorMsg.textContent = `تم إيقاف المحاولة مؤقتاً. جرّب بعد ${Math.ceil(lockTime / 60000)} دقيقة.`;
        errorMsg.style.display = 'block';
        return;
    }
    
    const email = document.getElementById('adminEmail').value;
    const password = passwordInput.value;
    
    loginBtn.innerText = "جاري التحقق...";
    loginBtn.disabled = true;
    errorMsg.style.display = 'none';

    try {
        const credential = await signInWithEmailAndPassword(auth, email, password);
        if (!isAdminEmail(credential.user.email)) {
            await signOut(auth);
            throw new Error('Unauthorized admin email');
        }
        localStorage.removeItem(LOGIN_GUARD_KEY);
        // إذا نجح التسجيل، بنحوله لصفحة الأدمن
        window.location.href = 'admin.html';
    } catch (error) {
        console.error("خطأ في تسجيل الدخول:", error);
        errorMsg.style.display = 'block';
        loginBtn.innerText = "تسجيل الدخول";
        registerFailedLogin();
        loginBtn.disabled = false;
    }
});

resetPasswordBtn?.addEventListener('click', async () => {
    const emailInput = document.getElementById('adminEmail');
    const email = (emailInput.value || DEFAULT_ADMIN_EMAIL).trim().toLowerCase();

    if (!isAdminEmail(email)) {
        errorMsg.textContent = 'اكتب إيميل الأدمن الصحيح حتى نرسل رابط إعادة التعيين.';
        errorMsg.style.display = 'block';
        emailInput.focus();
        return;
    }

    resetPasswordBtn.disabled = true;
    const originalText = resetPasswordBtn.textContent;
    resetPasswordBtn.textContent = 'جاري إرسال الرابط...';
    errorMsg.style.display = 'none';

    try {
        await sendPasswordResetEmail(auth, email);
        errorMsg.style.color = '#2F5D3A';
        errorMsg.textContent = 'تم إرسال رابط إعادة تعيين كلمة المرور على الإيميل.';
        errorMsg.style.display = 'block';
    } catch (error) {
        console.error('Password reset error:', error);
        errorMsg.style.color = '#C94C4C';
        errorMsg.textContent = 'ما قدرنا نرسل الرابط. تأكد أن الإيميل موجود في Firebase Authentication.';
        errorMsg.style.display = 'block';
    } finally {
        resetPasswordBtn.disabled = false;
        resetPasswordBtn.textContent = originalText;
    }
});
