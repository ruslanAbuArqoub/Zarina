import { collection, doc, onSnapshot, orderBy, query, serverTimestamp, setDoc } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js";
import { getMessaging, getToken, isSupported, onMessage } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-messaging.js";

const ADMIN_ORDER_NOTIFICATIONS_FLAG = '__zarinaAdminOrderNotificationsStarted';
const NOTIFIED_ORDER_IDS_KEY = 'zarinaAdminNotifiedOrderIdsV1';
const NOTIFICATION_PERMISSION_KEY = 'zarinaAdminNotificationPermissionAskedV1';
const FCM_PUBLIC_VAPID_KEY = 'BGsFhQVkLx9DoMajUimyAuwVSIBDqX41EcHrFtrmzO54u71na-bCFtfpT4ssYRIqaErATD9E6tDFzNwrYmFQHxw';

const ADMIN_NAMES_BY_EMAIL = {
    'katia-abu-arqoub@admin.zarina': 'كاتيا',
    'googgermal@gmail.com': 'كاتيا'
};

function getAdminName(user) {
    const email = user?.email?.toLowerCase() || '';
    return ADMIN_NAMES_BY_EMAIL[email] || user?.displayName || 'كاتيا';
}

function readNotifiedOrderIds() {
    try {
        const value = JSON.parse(localStorage.getItem(NOTIFIED_ORDER_IDS_KEY) || '[]');
        return Array.isArray(value) ? new Set(value) : new Set();
    } catch (error) {
        return new Set();
    }
}

function rememberNotifiedOrderId(orderId) {
    const ids = readNotifiedOrderIds();
    ids.add(orderId);
    localStorage.setItem(NOTIFIED_ORDER_IDS_KEY, JSON.stringify(Array.from(ids).slice(-120)));
}

function formatOrderTotal(order) {
    const amount = Number(order?.totalAmount) || 0;
    return `${amount.toFixed(2)} JD`;
}

function showAdminToast(message, detail = '') {
    const existing = document.getElementById('zarinaAdminNotificationToast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = 'zarinaAdminNotificationToast';
    toast.dir = 'rtl';
    toast.style.cssText = `
        position: fixed;
        top: 18px;
        left: 18px;
        z-index: 99999;
        width: min(360px, calc(100vw - 36px));
        background: #fffaf2;
        color: #2f241d;
        border: 1px solid #d9b56d;
        border-right: 5px solid #c94c4c;
        border-radius: 10px;
        box-shadow: 0 18px 45px rgba(47, 36, 29, 0.18);
        padding: 14px 16px;
        font-family: inherit;
        line-height: 1.6;
    `;
    toast.innerHTML = `
        <strong style="display:block; color:#8f2f2f; margin-bottom:4px;">${message}</strong>
        ${detail ? `<span style="display:block; font-size:0.92rem;">${detail}</span>` : ''}
    `;
    document.body.appendChild(toast);
    window.setTimeout(() => toast.remove(), 9000);
}

function canUseCloudMessaging() {
    return FCM_PUBLIC_VAPID_KEY && !FCM_PUBLIC_VAPID_KEY.includes('PASTE_YOUR');
}

async function registerAdminPushDevice(db, user, adminName) {
    if (!canUseCloudMessaging()) {
        showAdminToast('إشعارات الهاتف تحتاج مفتاح Firebase', 'أضف Web Push certificate key داخل admin-notifications.js مكان FCM_PUBLIC_VAPID_KEY.');
        return;
    }

    const supported = await isSupported().catch(() => false);
    if (!supported || !('serviceWorker' in navigator)) {
        showAdminToast('هذا المتصفح لا يدعم إشعارات الخلفية', 'على iPhone لازم يكون الموقع مضاف للشاشة الرئيسية ومفتوح من الأيقونة حتى تعمل Push Notifications.');
        return;
    }

    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
    const messaging = getMessaging();
    const token = await getToken(messaging, {
        vapidKey: FCM_PUBLIC_VAPID_KEY,
        serviceWorkerRegistration: registration
    });

    if (!token) {
        showAdminToast('لم يتم إنشاء رمز الإشعارات', 'تأكدي من السماح للإشعارات من إعدادات المتصفح.');
        return;
    }

    await setDoc(doc(db, 'adminTokens', token), {
        token,
        adminName,
        email: user?.email || '',
        uid: user?.uid || '',
        userAgent: navigator.userAgent,
        platform: navigator.platform || '',
        updatedAt: serverTimestamp()
    }, { merge: true });

    onMessage(messaging, (payload) => {
        const title = payload.notification?.title || payload.data?.title || `🚨 مرحبا ${adminName}`;
        const body = payload.notification?.body || payload.data?.body || 'اجاكِ طلب جديد على زارينا.';
        showAdminToast(title, body);
    });

    showAdminToast(`تم ربط إشعارات الهاتف يا ${adminName}`, 'أي طلب جديد ممكن يوصل كإشعار على الجهاز بعد تفعيل الإرسال من Cloud Function.');
}

function showPermissionPrompt(db, user, adminName) {
    if (!('Notification' in window) || Notification.permission !== 'default') return;
    if (sessionStorage.getItem(NOTIFICATION_PERMISSION_KEY) === 'shown') return;
    sessionStorage.setItem(NOTIFICATION_PERMISSION_KEY, 'shown');

    const prompt = document.createElement('div');
    prompt.id = 'zarinaNotificationPermissionPrompt';
    prompt.dir = 'rtl';
    prompt.style.cssText = `
        position: fixed;
        bottom: 18px;
        left: 18px;
        z-index: 99999;
        width: min(390px, calc(100vw - 36px));
        background: #2f5d3a;
        color: #fff;
        border-radius: 10px;
        box-shadow: 0 18px 45px rgba(47, 36, 29, 0.24);
        padding: 15px;
        font-family: inherit;
        line-height: 1.6;
    `;
    prompt.innerHTML = `
        <strong style="display:block; margin-bottom:4px;">مرحبا ${adminName}</strong>
        <span style="display:block; font-size:0.94rem; margin-bottom:12px;">فعلي إشعارات زارينا حتى يوصلك تنبيه محترم فور وصول طلب جديد.</span>
        <div style="display:flex; gap:8px; justify-content:flex-start;">
            <button type="button" id="enableZarinaNotifications" style="border:0; border-radius:8px; padding:8px 12px; background:#d9b56d; color:#2f241d; font-weight:700; cursor:pointer;">تفعيل الإشعارات</button>
            <button type="button" id="dismissZarinaNotifications" style="border:1px solid rgba(255,255,255,.45); border-radius:8px; padding:8px 12px; background:transparent; color:#fff; cursor:pointer;">لاحقا</button>
        </div>
    `;
    document.body.appendChild(prompt);

    prompt.querySelector('#enableZarinaNotifications')?.addEventListener('click', async () => {
        const permission = await Notification.requestPermission();
        prompt.remove();
        if (permission === 'granted') {
            showAdminToast(`تم تفعيل الإشعارات يا ${adminName}`, 'راح يوصلك تنبيه عند وصول أي طلب جديد على زارينا.');
            new Notification(`🚨 مرحبا ${adminName}`, {
                body: 'تم تفعيل إشعارات زارينا بنجاح. أي طلب جديد راح يوصلك هون مباشرة.',
                icon: 'zarina-logo-mark.png',
                badge: 'zarina-logo-mark.png',
                tag: 'zarina-admin-notifications-enabled'
            });
            registerAdminPushDevice(db, user, adminName).catch((error) => {
                console.warn('Admin FCM registration failed:', error);
                showAdminToast('تعذر ربط إشعارات الهاتف', 'الإشعارات داخل الموقع ستبقى تعمل، لكن إشعارات الجهاز تحتاج إعداد FCM.');
            });
        }
    });
    prompt.querySelector('#dismissZarinaNotifications')?.addEventListener('click', () => prompt.remove());
}

function notifyNewOrder(orderId, order, adminName) {
    const customer = order?.customerName || 'عميل جديد';
    const city = order?.customerCity || 'غير محدد';
    const total = formatOrderTotal(order);
    const title = `🚨 مرحبا ${adminName}`;
    const body = `اجاكِ طلب جديد على زارينا من ${customer} - ${city} - ${total}`;

    showAdminToast(title, body);

    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    const notification = new Notification(title, {
        body,
        icon: 'zarina-logo-mark.png',
        badge: 'zarina-logo-mark.png',
        tag: `zarina-order-${orderId}`,
        requireInteraction: true
    });

    notification.onclick = () => {
        window.focus();
        window.location.href = `admin-orders.html#order-${orderId}`;
        notification.close();
    };
}

export function initAdminOrderNotifications(db, user) {
    if (window[ADMIN_ORDER_NOTIFICATIONS_FLAG]) return;
    window[ADMIN_ORDER_NOTIFICATIONS_FLAG] = true;

    const adminName = getAdminName(user);
    showPermissionPrompt(db, user, adminName);

    let initialSnapshotLoaded = false;
    const ordersQuery = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
    onSnapshot(ordersQuery, (snapshot) => {
        if (!initialSnapshotLoaded) {
            snapshot.docs.forEach((docSnap) => rememberNotifiedOrderId(docSnap.id));
            initialSnapshotLoaded = true;
            return;
        }

        const notifiedIds = readNotifiedOrderIds();
        snapshot.docChanges().forEach((change) => {
            if (change.type !== 'added' || notifiedIds.has(change.doc.id)) return;
            rememberNotifiedOrderId(change.doc.id);
            notifyNewOrder(change.doc.id, change.doc.data(), adminName);
        });
    }, (error) => {
        console.warn('Admin order notifications failed:', error);
    });
}
