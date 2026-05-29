// ========== admin.js ==========

import { app } from './firebase-config.js';
import { getFirestore, collection, addDoc, getDocs, doc, deleteDoc, updateDoc, setDoc, onSnapshot, enableIndexedDbPersistence, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-auth.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-storage.js";
import { initAdminOrderNotifications } from './admin-notifications.js';

const db = getFirestore(app);
enableIndexedDbPersistence(db).catch(() => {});
const auth = getAuth(app);
const storage = getStorage(app);
const ADMIN_EMAILS = ['googgermal@gmail.com', 'katia-abu-arqoub@admin.zarina'];
const productsCol = collection(db, "products");
const collectionsCol = collection(db, "collections");
const ordersCol = collection(db, "orders");
const statsDocRef = doc(db, 'site_data', 'stats');
const announcementDocRef = doc(db, 'site_data', 'announcement');
const PRODUCT_IMAGE_FALLBACK = 'https://placehold.co/320x320?text=ZARINA';
const MAX_PRODUCT_IMAGE_SIZE = 5 * 1024 * 1024;

function makeSafeFileName(value) {
    return (value || 'product-image')
        .toString()
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9\u0600-\u06FF._-]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 70) || 'product-image';
}

function validateProductImageFile(file) {
    if (!file) return;
    if (!file.type || !file.type.startsWith('image/')) {
        throw new Error('اختر ملف صورة فقط.');
    }
    if (file.size > MAX_PRODUCT_IMAGE_SIZE) {
        throw new Error('حجم الصورة كبير. الحد الأقصى 5MB.');
    }
}

async function uploadProductImage(file, productKey = 'product') {
    validateProductImageFile(file);
    const extension = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
    const cleanName = makeSafeFileName(file.name).replace(/\.[^.]+$/, '');
    const imageRef = ref(storage, `product-images/${makeSafeFileName(productKey)}-${Date.now()}-${cleanName}.${extension}`);
    const snapshot = await uploadBytes(imageRef, file, {
        contentType: file.type,
        customMetadata: { area: 'admin-products' }
    });
    return getDownloadURL(snapshot.ref);
}

// 🔥 كود الحماية
onAuthStateChanged(auth, (user) => {
    if (!user || !ADMIN_EMAILS.includes(user.email?.toLowerCase())) {
        if (user) signOut(auth);
        window.location.href = 'login.html';
        return;
    }
    initAdminOrderNotifications(db, user);
});

document.addEventListener('DOMContentLoaded', () => {
    
    // --- زر تسجيل الخروج ---
    const btnLogout = document.getElementById('btnLogout');
    if (btnLogout) {
        btnLogout.addEventListener('click', () => {
            signOut(auth).then(() => {
                window.location.href = 'login.html';
            }).catch((error) => console.error("خطأ:", error));
        });
    }

    // --- 1. نظام جلب الزوار لايف ---
    onSnapshot(statsDocRef, (docSnap) => {
        if (docSnap.exists()) {
            const currentVisits = docSnap.data().visits || 0;
            const visitorCounter = document.getElementById('adminLiveVisitors');
            if (visitorCounter) visitorCounter.innerText = currentVisits;
        }
    });

    // --- 2. جلب الإحصائيات ---
    async function loadStats() {
        try {
            const ordersSnap = await getDocs(collection(db, "orders"));
            let totalEarnings = 0;
            let totalOrders = 0;
            
            ordersSnap.forEach((orderDoc) => {
                const orderData = orderDoc.data();
                if (orderData.totalAmount) totalEarnings += parseFloat(orderData.totalAmount);
                totalOrders++;
            });

            document.getElementById('adminTotalEarnings').innerText = `${totalEarnings.toFixed(2)} JD`;
            document.getElementById('adminTotalOrders').innerText = totalOrders;
        } catch (e) {
            console.log("خطأ في جلب الإحصائيات.");
        }
    }
    loadStats();

    let latestOrdersForDashboard = [];

    function formatDashboardMoney(value) {
        const amount = Number(value) || 0;
        return `${amount.toFixed(2)} JD`;
    }

    function getDashboardOrderDate(order) {
        const createdAt = order.createdAt;
        if (!createdAt) return new Date();
        if (typeof createdAt.toDate === 'function') return createdAt.toDate();
        if (createdAt.seconds) return new Date(createdAt.seconds * 1000);
        const parsed = new Date(createdAt);
        return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
    }

    function isDashboardCountedOrder(order) {
        return !['Cancelled', 'Canceled', 'Rejected'].includes(order.status || '');
    }

    function dashboardStartOfDay(date) {
        const copy = new Date(date);
        copy.setHours(0, 0, 0, 0);
        return copy;
    }

    function dashboardAddDays(date, days) {
        const copy = new Date(date);
        copy.setDate(copy.getDate() + days);
        return copy;
    }

    function dashboardMonthKey(date) {
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    }

    function dashboardDayKey(date) {
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    }

    function dashboardShortDate(date) {
        return date.toLocaleDateString('ar-JO', { month: 'short', day: 'numeric' });
    }

    function dashboardShortMonth(date) {
        return date.toLocaleDateString('ar-JO', { month: 'short', year: '2-digit' });
    }

    function dashboardUpdateText(id, text) {
        const el = document.getElementById(id);
        if (el) el.textContent = text;
    }

    function getDashboardBuckets(range) {
        const today = dashboardStartOfDay(new Date());
        if (range === '12m') {
            const buckets = [];
            for (let i = 11; i >= 0; i--) {
                const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
                buckets.push({ key: dashboardMonthKey(date), label: dashboardShortMonth(date), sales: 0, orders: 0 });
            }
            return buckets;
        }

        const days = range === '30d' ? 30 : 7;
        const buckets = [];
        for (let i = days - 1; i >= 0; i--) {
            const date = dashboardAddDays(today, -i);
            buckets.push({ key: dashboardDayKey(date), label: dashboardShortDate(date), sales: 0, orders: 0 });
        }
        return buckets;
    }

    function renderDashboardChart(orders) {
        const chart = document.getElementById('salesChartBars');
        const tooltip = document.getElementById('salesChartTooltip');
        const range = document.getElementById('salesChartRange')?.value || '7d';
        if (!chart) return;

        const buckets = getDashboardBuckets(range);
        const bucketMap = new Map(buckets.map(bucket => [bucket.key, bucket]));

        orders.forEach(order => {
            if (!isDashboardCountedOrder(order)) return;
            const date = getDashboardOrderDate(order);
            const key = range === '12m' ? dashboardMonthKey(date) : dashboardDayKey(date);
            const bucket = bucketMap.get(key);
            if (!bucket) return;
            bucket.sales += Number(order.totalAmount) || 0;
            bucket.orders += 1;
        });

        const maxSales = Math.max(...buckets.map(bucket => bucket.sales), 0);
        chart.innerHTML = buckets.map(bucket => {
            const height = maxSales > 0 && bucket.sales > 0
                ? 7 + (Math.log(bucket.sales + 1) / Math.log(maxSales + 1)) * 93
                : 2;
            return `
                <div class="sales-bar-wrap">
                    <button class="sales-bar" type="button" style="height:${height}%"
                        data-label="${bucket.label}"
                        data-sales="${formatDashboardMoney(bucket.sales)}"
                        data-orders="${bucket.orders}"></button>
                    <span class="sales-bar-label">${bucket.label}</span>
                </div>
            `;
        }).join('');

        if (!tooltip) return;
        chart.querySelectorAll('.sales-bar').forEach(bar => {
            const showTooltip = (event) => {
                tooltip.innerHTML = `<strong>${bar.dataset.sales}</strong><span>${bar.dataset.label}</span><br><span>${bar.dataset.orders} طلب</span>`;
                tooltip.style.display = 'block';
                tooltip.style.left = `${event.clientX}px`;
                tooltip.style.top = `${event.clientY}px`;
            };
            bar.addEventListener('mousemove', showTooltip);
            bar.addEventListener('focus', () => {
                const rect = chart.getBoundingClientRect();
                showTooltip({ clientX: rect.left + rect.width / 2, clientY: rect.top + 70 });
            });
            bar.addEventListener('mouseleave', () => { tooltip.style.display = 'none'; });
            bar.addEventListener('blur', () => { tooltip.style.display = 'none'; });
        });
    }

    function renderDashboardTopProducts(orders) {
        const list = document.getElementById('topProductsList');
        if (!list) return;

        const products = new Map();
        orders.forEach(order => {
            if (!isDashboardCountedOrder(order) || !Array.isArray(order.items)) return;
            order.items.forEach(item => {
                const name = item.nameAr || item.nameEn || item.name || 'منتج بدون اسم';
                const qty = Number(item.quantity) || 1;
                const price = Number(item.price) || 0;
                const current = products.get(name) || { name, qty: 0, sales: 0 };
                current.qty += qty;
                current.sales += price * qty;
                products.set(name, current);
            });
        });

        const top = Array.from(products.values())
            .sort((a, b) => b.qty - a.qty || b.sales - a.sales)
            .slice(0, 5);

        if (!top.length) {
            list.innerHTML = '<div style="color:#766F63; font-weight:800; padding:1rem;">لا يوجد منتجات مباعة بعد.</div>';
            return;
        }

        list.innerHTML = top.map((item, index) => `
            <div class="top-product-row">
                <span class="top-rank">${index + 1}</span>
                <div>
                    <strong>${escapeHtml(item.name)}</strong>
                    <small>${item.qty} قطعة / خيار</small>
                </div>
                <span>${formatDashboardMoney(item.sales)}</span>
            </div>
        `).join('');
    }

    function renderDashboardAnalytics(orders) {
        latestOrdersForDashboard = orders;
        const countedOrders = orders.filter(isDashboardCountedOrder);
        const now = new Date();
        const weekStart = dashboardAddDays(dashboardStartOfDay(now), -6);
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const yearStart = new Date(now.getFullYear(), 0, 1);

        const totals = countedOrders.reduce((acc, order) => {
            const date = getDashboardOrderDate(order);
            const amount = Number(order.totalAmount) || 0;
            acc.allSales += amount;
            acc.allOrders += 1;
            if (date >= weekStart) { acc.weekSales += amount; acc.weekOrders += 1; }
            if (date >= monthStart) { acc.monthSales += amount; acc.monthOrders += 1; }
            if (date >= yearStart) { acc.yearSales += amount; acc.yearOrders += 1; }
            return acc;
        }, { allSales: 0, allOrders: 0, weekSales: 0, weekOrders: 0, monthSales: 0, monthOrders: 0, yearSales: 0, yearOrders: 0 });

        dashboardUpdateText('adminTotalEarnings', formatDashboardMoney(totals.allSales));
        dashboardUpdateText('adminTotalOrders', totals.allOrders);
        dashboardUpdateText('salesThisWeek', formatDashboardMoney(totals.weekSales));
        dashboardUpdateText('ordersThisWeek', `${totals.weekOrders} طلب`);
        dashboardUpdateText('salesThisMonth', formatDashboardMoney(totals.monthSales));
        dashboardUpdateText('ordersThisMonth', `${totals.monthOrders} طلب`);
        dashboardUpdateText('salesThisYear', formatDashboardMoney(totals.yearSales));
        dashboardUpdateText('ordersThisYear', `${totals.yearOrders} طلب`);
        dashboardUpdateText('avgOrderValue', formatDashboardMoney(totals.allOrders ? totals.allSales / totals.allOrders : 0));
        dashboardUpdateText('validOrdersCount', `${totals.allOrders} طلب محسوب`);
        dashboardUpdateText('dashboardUpdatedAt', `آخر تحديث: ${now.toLocaleString('ar-JO')}`);

        renderDashboardChart(countedOrders);
        renderDashboardTopProducts(countedOrders);
    }

    onSnapshot(ordersCol, (ordersSnap) => {
        const orders = [];
        ordersSnap.forEach((orderDoc) => {
            orders.push({ id: orderDoc.id, ...orderDoc.data() });
        });
        renderDashboardAnalytics(orders);
    }, (error) => {
        console.log("Dashboard orders error", error);
        dashboardUpdateText('dashboardUpdatedAt', 'تعذر تحميل بيانات المبيعات حالياً.');
    });

    document.getElementById('salesChartRange')?.addEventListener('change', () => {
        renderDashboardChart(latestOrdersForDashboard.filter(isDashboardCountedOrder));
    });

    const announcementForm = document.getElementById('announcementForm');
    const announcementTextAr = document.getElementById('announcementTextAr');
    const announcementTextEn = document.getElementById('announcementTextEn');
    const announcementActive = document.getElementById('announcementActive');

    onSnapshot(announcementDocRef, (docSnap) => {
        const data = docSnap.exists() ? docSnap.data() : {};
        if (announcementTextAr) announcementTextAr.value = data.textAr || '';
        if (announcementTextEn) announcementTextEn.value = data.textEn || '';
        if (announcementActive) announcementActive.value = data.isActive === false ? 'false' : 'true';
    });

    announcementForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = announcementForm.querySelector('button[type="submit"]');
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الحفظ...';
        }

        try {
            await setDoc(announcementDocRef, {
                textAr: announcementTextAr?.value.trim() || '',
                textEn: announcementTextEn?.value.trim() || '',
                isActive: announcementActive?.value === 'true',
                updatedAt: new Date().toISOString()
            }, { merge: true });
            alert('تم حفظ شريط الإعلان بنجاح!');
        } catch (error) {
            console.error('Announcement save error:', error);
            alert('حدث خطأ أثناء حفظ شريط الإعلان.');
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<i class="fas fa-save"></i> حفظ الشريط';
            }
        }
    });


    // ==========================================
    // 🔥 بناء النافذة المنبثقة الاحترافية (Modal)
    // ==========================================
    let currentEditingProdId = null;

    function setupCustomModal() {
        // زرع تصميم الـ CSS الخاص بالنافذة
        const style = document.createElement('style');
        style.innerHTML = `
            .zarina-modal-overlay {
                position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                background: rgba(31, 30, 26, 0.6); backdrop-filter: blur(4px);
                z-index: 9999; display: none; justify-content: center; align-items: center;
                opacity: 0; transition: opacity 0.3s ease;
            }
            .zarina-modal-overlay.active { opacity: 1; }
            .zarina-modal {
                background: #FFFEF9; padding: 2rem; border-radius: 24px;
                width: min(94vw, 920px); max-width: 920px; box-shadow: 0 20px 40px rgba(0,0,0,0.15);
                max-height: 90vh; overflow-y: auto;
                transform: translateY(20px); transition: transform 0.3s ease;
                border: 1px solid #EADBC6; border-top: 5px solid var(--gold, #C6A43F);
                direction: rtl; font-family: 'Tajawal', sans-serif;
            }
            .zarina-modal-overlay.active .zarina-modal { transform: translateY(0); }
            #collectionEditModal .zarina-modal { max-width: 520px; }
            .zarina-modal h3 { color: var(--forest-green, #2F5D3A); margin-top: 0; margin-bottom: 1.5rem; font-size: 1.4rem;}
            #editPriceForm {
                display: grid;
                grid-template-columns: repeat(2, minmax(0, 1fr));
                gap: 1rem 1.25rem;
            }
            #editPriceForm .form-group,
            #editPriceForm .modal-variants,
            #editPriceForm .modal-actions {
                margin: 0;
            }
            #editPriceForm .modal-variants,
            #editPriceForm .modal-actions {
                grid-column: 1 / -1;
            }
            #editPriceForm textarea {
                min-height: 150px;
                resize: vertical;
            }
            .modal-actions { display: flex; gap: 10px; margin-top: 1.5rem; }
            .btn-cancel {
                flex: 1; padding: 12px; background: #F0EBE1; border: 1px solid #D9CBB5;
                border-radius: 12px; cursor: pointer; font-weight: bold; color: #4A463E; transition: 0.3s;
            }
            .btn-cancel:hover { background: #EADBC6; }
            #btnSaveEditPrice, #btnSaveProductCollection { flex: 2; margin-top: 0; }
            .collection-picker-list {
                background: #FCF8F0; border: 1px solid #EADBC6; border-radius: 12px;
                display: grid; gap: 8px; margin-top: 8px; max-height: 220px; overflow-y: auto; padding: 6px;
            }
            .collection-choice {
                background: white; border: 1px solid #D9CBB5; border-radius: 10px; color: #4A463E;
                cursor: pointer; font-family: inherit; font-weight: 700; padding: 10px 12px; text-align: right;
                width: 100%;
            }
            .collection-choice:hover,
            .collection-choice.active {
                background: var(--gold, #C6A43F); border-color: var(--gold, #C6A43F); color: white;
            }
            .modal-hint { color: #666; display: block; font-size: 0.85rem; line-height: 1.5; margin-top: 8px; }
            .modal-image-group { grid-column: 1 / -1; }
            .modal-image-preview { align-items:center; background:linear-gradient(135deg,#FCF8F0,#fffdf8); border:1px solid #EADBC6; border-radius:18px; display:grid; grid-template-columns:112px 1fr; gap:16px; margin-top:10px; padding:14px; }
            .modal-image-preview img { width:112px; height:112px; border-radius:16px; object-fit:cover; border:1px solid #EADBC6; background:#fff; box-shadow:0 10px 24px rgba(70,52,22,.12); }
            .modal-image-copy { display:grid; gap:8px; }
            .modal-image-copy strong { color:#2F5D3A; font-size:1rem; }
            .modal-image-copy span { color:#6A6256; font-size:.88rem; font-weight:700; line-height:1.45; }
            .image-upload-card input[type="file"] { background:#fff; border-style:dashed; cursor:pointer; }
            .upload-progress { color:#9E7E1B; display:block; font-size:.84rem; font-weight:800; min-height:1.2em; }
            .modal-variants { background:#FCF8F0; border:1px solid #EADBC6; border-radius:14px; padding:1rem; margin-top:1rem; overflow-x:auto; }
            .modal-variants .variant-row { grid-template-columns: minmax(150px, 1.15fr) minmax(110px, 0.75fr) minmax(110px, 0.75fr) minmax(130px, 0.9fr) auto; }
            .modal-variants .form-control { padding: 10px 12px; }
            @media (max-width: 720px) {
                .zarina-modal { width: min(96vw, 620px); padding: 1.2rem; }
                #editPriceForm { grid-template-columns: 1fr; }
                .modal-image-preview { grid-template-columns: 1fr; }
                .modal-image-preview img { width:100%; height:180px; }
                .modal-variants .variant-row { grid-template-columns: 1fr; }
                .modal-actions { flex-direction: column; }
            }
        `;
        document.head.appendChild(style);

        // زرع هيكل الـ HTML الخاص بالنافذة
        const modalHTML = `
            <div id="priceEditModal" class="zarina-modal-overlay">
                <div class="zarina-modal">
                    <h3><i class="fas fa-tags"></i> تعديل بيانات المنتج</h3>
                    <form id="editPriceForm">
                        <div class="form-group modal-image-group">
                            <label>صورة المنتج</label>
                            <div class="modal-image-preview image-upload-card">
                                <img id="modalImagePreview" src="https://placehold.co/320x320?text=ZARINA" alt="Product image preview">
                                <div class="modal-image-copy">
                                    <strong>ارفع صورة جديدة من جهازك</strong>
                                    <span>اتركها فارغة إذا بدك تخلي الصورة الحالية. الحد الأقصى 5MB.</span>
                                    <input type="file" id="modalImageFile" class="form-control" accept="image/*">
                                    <input type="hidden" id="modalImageUrl">
                                    <small id="modalImageUploadStatus" class="upload-progress"></small>
                                </div>
                            </div>
                        </div>
                        <div class="form-group">
                            <label>السعر الأساسي / الحالي (JD) *</label>
                            <input type="number" step="0.01" id="modalCurrentPrice" class="form-control" required>
                        </div>
                        <div class="form-group">
                            <label>السعر قبل الخصم (JD) - اختياري</label>
                            <input type="number" step="0.01" id="modalOldPrice" class="form-control" placeholder="اتركه فارغاً إذا لم يكن هناك خصم">
                        </div>
                        <div class="form-group">
                            <label>وصف تفصيلي عربي</label>
                            <textarea id="modalLongDescAr" class="form-control" rows="3"></textarea>
                        </div>
                        <div class="form-group">
                            <label>Detailed description English</label>
                            <textarea id="modalLongDescEn" class="form-control" rows="3"></textarea>
                        </div>
                        <div class="form-group">
                            <label>نوع الكمية</label>
                            <select id="modalUnitType" class="form-control">
                                <option value="g">جرام / g</option>
                                <option value="kg">كيلو / kg</option>
                                <option value="ml">مل / ml</option>
                                <option value="l">لتر / l</option>
                                <option value="piece">قطعة / piece</option>
                            </select>
                        </div>
                        <div class="modal-variants">
                            <label style="display:block; margin-bottom:8px;">خيارات الكمية والسعر</label>
                            <div id="modalVariantsList"></div>
                            <button type="button" id="modalAddVariantBtn" class="btn-small"><i class="fas fa-plus"></i> إضافة خيار</button>
                        </div>
                        <div class="modal-actions">
                            <button type="button" class="btn-cancel" id="btnCancelModal">إلغاء</button>
                            <button type="submit" class="btn-submit" id="btnSaveEditPrice">حفظ التعديلات</button>
                        </div>
                    </form>
                </div>
            </div>
            <div id="collectionEditModal" class="zarina-modal-overlay">
                <div class="zarina-modal">
                    <h3><i class="fas fa-layer-group"></i> نقل المنتج لمجموعة</h3>
                    <form id="editCollectionForm">
                        <div class="form-group">
                            <label>اختار من المجموعات الموجودة</label>
                            <div id="collectionPickerList" class="collection-picker-list"></div>
                        </div>
                        <div class="form-group">
                            <label>أو اكتب اسم مجموعة جديدة</label>
                            <input type="text" id="modalCollectionName" class="form-control" list="collectionsDatalist" placeholder="مثال: مجموعة الزيوت">
                            <small class="modal-hint">اتركها فارغة واضغط حفظ لإزالة المنتج من أي مجموعة.</small>
                        </div>
                        <div class="modal-actions">
                            <button type="button" class="btn-cancel" id="btnCancelCollectionModal">إلغاء</button>
                            <button type="submit" class="btn-submit" id="btnSaveProductCollection">حفظ المجموعة</button>
                        </div>
                    </form>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        const modalCollectionInputForSelect = document.getElementById('modalCollectionName');
        if (modalCollectionInputForSelect && !document.getElementById('modalCollectionSelect')) {
            modalCollectionInputForSelect.insertAdjacentHTML('beforebegin', `
                <select id="modalCollectionSelect" class="form-control">
                    <option value="">اختر مجموعة موجودة</option>
                </select>
            `);
        }

        // برمجة وظائف النافذة (فتح، إغلاق، حفظ)
        const modalOverlay = document.getElementById('priceEditModal');
        const form = document.getElementById('editPriceForm');
        const collectionModalOverlay = document.getElementById('collectionEditModal');
        const collectionForm = document.getElementById('editCollectionForm');
        
        // إغلاق النافذة
        const closeModal = () => {
            modalOverlay.classList.remove('active');
            setTimeout(() => { modalOverlay.style.display = 'none'; currentEditingProdId = null; }, 300);
        };

        document.getElementById('btnCancelModal').onclick = closeModal;
        modalOverlay.onclick = (e) => { if (e.target === modalOverlay) closeModal(); }; // الإغلاق عند النقر خارجها

        // تنفيذ الحفظ
        const closeCollectionModal = () => {
            collectionModalOverlay.classList.remove('active');
            setTimeout(() => { collectionModalOverlay.style.display = 'none'; currentEditingProdId = null; }, 300);
        };

        document.getElementById('btnCancelCollectionModal').onclick = closeCollectionModal;
        collectionModalOverlay.onclick = (e) => { if (e.target === collectionModalOverlay) closeCollectionModal(); };

        form.onsubmit = async (e) => {
            e.preventDefault();
            if (!currentEditingProdId) return;

            const btnSave = document.getElementById('btnSaveEditPrice');
            btnSave.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الحفظ...';
            btnSave.disabled = true;

            const newPrice = document.getElementById('modalCurrentPrice').value;
            const oldPriceStr = document.getElementById('modalOldPrice').value;
            const newOldPrice = oldPriceStr.trim() !== "" ? parseFloat(oldPriceStr) : null;
            let imageUrl = document.getElementById('modalImageUrl').value.trim();
            const imageFile = document.getElementById('modalImageFile')?.files?.[0];
            const variants = collectVariants('modalVariantsList');

            try {
                if (imageFile) {
                    const uploadStatus = document.getElementById('modalImageUploadStatus');
                    if (uploadStatus) uploadStatus.textContent = 'جاري رفع الصورة...';
                    imageUrl = await uploadProductImage(imageFile, currentEditingProdId);
                    if (uploadStatus) uploadStatus.textContent = 'تم رفع الصورة بنجاح.';
                }

                const docRef = doc(db, "products", currentEditingProdId);
                await updateDoc(docRef, {
                    price: parseFloat(newPrice),
                    oldPrice: newOldPrice,
                    longDescAr: document.getElementById('modalLongDescAr').value.trim(),
                    longDescEn: document.getElementById('modalLongDescEn').value.trim(),
                    unitType: document.getElementById('modalUnitType').value,
                    imageUrl: imageUrl,
                    variants: variants,
                    updatedAt: serverTimestamp()
                });
                closeModal();
                loadProductsToTable(); // تحديث الجدول مباشرة
            } catch (error) {
                console.error("خطأ:", error);
                alert("حدث خطأ أثناء تحديث السعر!");
            } finally {
                btnSave.innerHTML = 'حفظ التعديلات';
                btnSave.disabled = false;
            }
        };

        collectionForm.onsubmit = async (e) => {
            e.preventDefault();
            if (!currentEditingProdId) return;

            const btnSave = document.getElementById('btnSaveProductCollection');
            const collectionName = document.getElementById('modalCollectionName').value.trim();

            btnSave.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الحفظ...';
            btnSave.disabled = true;

            try {
                if (collectionName) {
                    await ensureCollectionExists(collectionName);
                }

                await updateDoc(doc(db, "products", currentEditingProdId), {
                    collectionName: collectionName,
                    collectionSlug: collectionName ? slugifyCollectionName(collectionName) : '',
                    updatedAt: serverTimestamp()
                });

                closeCollectionModal();
                loadProductsToTable();
            } catch (error) {
                console.error("خطأ:", error);
                alert("حدث خطأ أثناء نقل المنتج للمجموعة!");
            } finally {
                btnSave.innerHTML = 'حفظ المجموعة';
                btnSave.disabled = false;
            }
        };
    }
    
    // تشغيل دالة بناء النافذة عند تحميل الصفحة
    setupCustomModal();

let allProducts = [];
let allCollections = [];
const ADMIN_PRODUCTS_CACHE_KEY = 'zarinaAdminProductsCacheV2';
const ADMIN_COLLECTIONS_CACHE_KEY = 'zarinaAdminCollectionsCacheV2';
const ADMIN_CACHE_MAX_AGE = 1000 * 60 * 60 * 6;

function readAdminCache(key) {
    try {
        const raw = localStorage.getItem(key);
        if (!raw) return null;
        const payload = JSON.parse(raw);
        if (!payload || !Array.isArray(payload.items)) return null;
        if (Date.now() - (payload.savedAt || 0) > ADMIN_CACHE_MAX_AGE) return null;
        return payload.items;
    } catch (error) {
        return null;
    }
}

function writeAdminCache(key, items) {
    try {
        localStorage.setItem(key, JSON.stringify({ savedAt: Date.now(), items }));
    } catch (error) {}
}

    const productSearchInput = document.getElementById('productSearchInput');
    const productCollectionFilter = document.getElementById('productCollectionFilter');
    const productVisibilityFilter = document.getElementById('productVisibilityFilter');
    const clearProductFiltersBtn = document.getElementById('clearProductFiltersBtn');
    const productsFilterCount = document.getElementById('productsFilterCount');
    const collectionsDatalist = document.getElementById('collectionsDatalist');
    const prodCollectionInput = document.getElementById('prodCollection');
    const prodCollectionSelect = document.getElementById('prodCollectionSelect');

    renderVariants('productVariantsList');
    document.getElementById('addVariantBtn')?.addEventListener('click', () => {
        document.getElementById('productVariantsList')?.insertAdjacentHTML('beforeend', variantRowHtml());
        const container = document.getElementById('productVariantsList');
        container?.lastElementChild?.querySelector('.remove-variant-btn')?.addEventListener('click', (e) => e.currentTarget.closest('.variant-row')?.remove());
    });
    document.getElementById('modalAddVariantBtn')?.addEventListener('click', () => {
        document.getElementById('modalVariantsList')?.insertAdjacentHTML('beforeend', variantRowHtml());
        const container = document.getElementById('modalVariantsList');
        container?.lastElementChild?.querySelector('.remove-variant-btn')?.addEventListener('click', (e) => e.currentTarget.closest('.variant-row')?.remove());
    });

    function escapeHtml(str) {
        if (str === null || str === undefined) return '';
        return String(str).replace(/[&<>"']/g, (char) => {
            if (char === '&') return '&amp;';
            if (char === '<') return '&lt;';
            if (char === '>') return '&gt;';
            if (char === '"') return '&quot;';
            return '&#039;';
        });
    }

    function getCollectionName(prod) {
        return (prod.collectionName || prod.collectionNameAr || prod.collection || '').trim();
    }

    function getCollectionFilterKey(value) {
        return normalizeName(value);
    }

    function normalizeName(value) {
        return (value || '').toString().trim().replace(/\s+/g, ' ').toLowerCase();
    }

    function slugifyCollectionName(value) {
        return normalizeName(value)
            .replace(/[^\u0600-\u06FFa-z0-9]+/gi, '-')
            .replace(/^-+|-+$/g, '') || `collection-${Date.now()}`;
    }

    function variantRowHtml(variant = {}) {
        const status = variant.status || 'in_stock';
        return `
            <div class="variant-row">
                <input type="text" class="form-control variant-label" placeholder="250g / 1kg / 100ml" value="${escapeHtml(variant.label || '')}">
                <input type="number" step="0.01" class="form-control variant-price" placeholder="السعر الحالي" value="${variant.price ?? ''}">
                <input type="number" step="0.01" class="form-control variant-old-price" placeholder="قبل الخصم" value="${variant.oldPrice ?? ''}">
                <select class="form-control variant-status">
                    <option value="in_stock" ${status === 'in_stock' ? 'selected' : ''}>متوفر</option>
                    <option value="low_stock" ${status === 'low_stock' ? 'selected' : ''}>كمية قليلة</option>
                    <option value="out_of_stock" ${status === 'out_of_stock' ? 'selected' : ''}>No stock</option>
                </select>
                <button type="button" class="btn-small remove-variant-btn">حذف</button>
            </div>
        `;
    }

    function renderVariants(containerId, variants = []) {
        const container = document.getElementById(containerId);
        if (!container) return;
        const rows = variants.length ? variants : [{ label: '', price: '', status: 'in_stock' }];
        container.innerHTML = rows.map(variantRowHtml).join('');
        container.querySelectorAll('.remove-variant-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                btn.closest('.variant-row')?.remove();
                if (!container.querySelector('.variant-row')) {
                    container.insertAdjacentHTML('beforeend', variantRowHtml());
                }
            });
        });
    }

    function collectVariants(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return [];
        return [...container.querySelectorAll('.variant-row')]
            .map((row, index) => {
                const label = row.querySelector('.variant-label')?.value.trim() || '';
                const price = parseFloat(row.querySelector('.variant-price')?.value || '');
                const oldPriceValue = row.querySelector('.variant-old-price')?.value || '';
                const oldPrice = oldPriceValue.trim() !== '' ? parseFloat(oldPriceValue) : null;
                const status = row.querySelector('.variant-status')?.value || 'in_stock';
                if (!label || Number.isNaN(price)) return null;
                return {
                    id: slugifyCollectionName(`${label}-${index}`),
                    label,
                    price,
                    oldPrice: Number.isNaN(oldPrice) ? null : oldPrice,
                    status
                };
            })
            .filter(Boolean);
    }

    async function ensureCollectionExists(nameAr, nameEn = '') {
        const cleanNameAr = (nameAr || '').trim();
        const cleanNameEn = (nameEn || '').trim();
        if (!cleanNameAr) return;

        const normalized = normalizeName(cleanNameAr);
        const exists = allCollections.some(item => normalizeName(item.nameAr) === normalized || normalizeName(item.nameEn) === normalized);
        if (exists) return;

        await addDoc(collectionsCol, {
            nameAr: cleanNameAr,
            nameEn: cleanNameEn,
            slug: slugifyCollectionName(cleanNameEn || cleanNameAr),
            createdAt: new Date().toISOString(),
            isVisible: true
        });

        await loadCollectionsToTable();
    }

    function populateCollectionFilter() {
        if (!productCollectionFilter) return;

        const currentValue = productCollectionFilter.value || 'all';
        const collections = new Map();

        allCollections.forEach((item) => {
            const label = (item.nameAr || item.nameEn || '').trim();
            const key = getCollectionFilterKey(label);
            if (key && !collections.has(key)) collections.set(key, label);
        });

        allProducts.forEach(({ data }) => {
            const label = getCollectionName(data);
            const key = getCollectionFilterKey(label);
            if (key && !collections.has(key)) collections.set(key, label);
        });

        let options = '<option value="all">كل المجموعات</option>';
        [...collections.entries()]
            .sort((a, b) => a[1].localeCompare(b[1], 'ar'))
            .forEach(([key, label]) => {
                const selected = key === currentValue ? 'selected' : '';
                options += `<option value="${escapeHtml(key)}" ${selected}>${escapeHtml(label)}</option>`;
            });

        productCollectionFilter.innerHTML = options;

        if (currentValue !== 'all' && !collections.has(currentValue)) {
            productCollectionFilter.value = 'all';
        }
    }

    function populateProductCollectionSelect() {
        const modalCollectionSelect = document.getElementById('modalCollectionSelect');
        if (!prodCollectionSelect && !modalCollectionSelect) return;

        const currentValue = prodCollectionInput?.value.trim() || '';
        const options = ['<option value="">اختر مجموعة موجودة</option>'];
        allCollections
            .map(item => (item.nameAr || item.nameEn || '').trim())
            .filter(Boolean)
            .sort((a, b) => a.localeCompare(b, 'ar'))
            .forEach((label) => {
                const selected = normalizeName(label) === normalizeName(currentValue) ? 'selected' : '';
                options.push(`<option value="${escapeHtml(label)}" ${selected}>${escapeHtml(label)}</option>`);
            });

        const optionsHtml = options.join('');
        if (prodCollectionSelect) prodCollectionSelect.innerHTML = optionsHtml;
        if (modalCollectionSelect) modalCollectionSelect.innerHTML = optionsHtml;
    }

    function getFilteredProducts() {
        const searchTerm = (productSearchInput?.value || '').trim().toLowerCase();
        const collectionValue = productCollectionFilter?.value || 'all';
        const visibilityValue = productVisibilityFilter?.value || 'all';

        return allProducts.filter(({ data }) => {
            const isVisible = data.isVisible !== false;
            const collectionKey = getCollectionFilterKey(getCollectionName(data));
            const searchableText = [
                data.nameAr,
                data.nameEn,
                data.categoryAr,
                data.categoryEn,
                getCollectionName(data),
                data.descAr,
                data.descEn,
                ...(Array.isArray(data.tags) ? data.tags : [])
            ].filter(Boolean).join(' ').toLowerCase();

            const matchesSearch = !searchTerm || searchableText.includes(searchTerm);
            const matchesCollection = collectionValue === 'all' || collectionKey === collectionValue;
            const matchesVisibility =
                visibilityValue === 'all' ||
                (visibilityValue === 'visible' && isVisible) ||
                (visibilityValue === 'hidden' && !isVisible);

            return matchesSearch && matchesCollection && matchesVisibility;
        });
    }

    function renderProductsTable() {
        const tbody = document.getElementById('adminProductsTable');
        if (!tbody) return;

        const filteredProducts = getFilteredProducts();

        if (productsFilterCount) {
            productsFilterCount.innerText = `${filteredProducts.length} / ${allProducts.length} منتج`;
        }

        if (filteredProducts.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">لا يوجد منتجات مطابقة للفلاتر الحالية.</td></tr>';
            return;
        }

        let html = '';

        filteredProducts.forEach(({ id, data: prod }) => {
            const isVisible = prod.isVisible !== false;
            const isChecked = isVisible ? 'checked' : '';

            let priceHtml = `${escapeHtml(prod.price)} JD`;
            if (prod.oldPrice && parseFloat(prod.oldPrice) > parseFloat(prod.price)) {
                priceHtml += `<br><del style="color: #A09E98; font-size: 0.85rem;">${escapeHtml(prod.oldPrice)} JD</del>`;
            }

            html += `
            <tr>
                <td><img src="${escapeHtml(prod.imageUrl || 'https://placehold.co/60')}" class="prod-img-mini" alt=""></td>
                <td>
                    <strong>${escapeHtml(prod.nameAr || 'بدون اسم')}</strong><br>
                    <small style="color:#666;">${escapeHtml(prod.nameEn || '')}</small>
                </td>
                <td>
                    <strong>${escapeHtml(prod.categoryAr || 'بدون قسم')}</strong><br>
                    <small style="color:#666;">${escapeHtml(prod.categoryEn || '')}</small>
                    ${getCollectionName(prod) ? `<br><small style="color:#2F5D3A;">مجموعة: ${escapeHtml(getCollectionName(prod))}</small>` : ''}
                </td>
                <td style="color: var(--gold); font-weight: bold;">${priceHtml}</td>
                <td>
                    <label class="switch">
                        <input type="checkbox" class="toggle-visibility" data-id="${escapeHtml(id)}" ${isChecked}>
                        <span class="slider"></span>
                    </label>
                </td>
                <td>
                    <button class="btn-icon btn-edit" data-id="${escapeHtml(id)}" data-price="${escapeHtml(prod.price)}" data-old-price="${escapeHtml(prod.oldPrice)}" title="تعديل السعر">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-icon btn-move-collection" data-id="${escapeHtml(id)}" data-collection="${escapeHtml(getCollectionName(prod))}" title="نقل لمجموعة">
                        <i class="fas fa-layer-group"></i>
                    </button>
                    <button class="btn-icon btn-delete" data-id="${escapeHtml(id)}" title="حذف المنتج">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </td>
            </tr>`;
        });

        tbody.innerHTML = html;

        document.querySelectorAll('.btn-edit').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const clicked = e.currentTarget;
                window.openEditModal(
                    clicked.getAttribute('data-id'),
                    clicked.getAttribute('data-price'),
                    clicked.getAttribute('data-old-price')
                );
            });
        });

        document.querySelectorAll('.btn-move-collection').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const clicked = e.currentTarget;
                window.openCollectionModal(
                    clicked.getAttribute('data-id'),
                    clicked.getAttribute('data-collection')
                );
            });
        });

        document.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const prodId = e.currentTarget.getAttribute('data-id');
                if(confirm("متأكد إنك بدك تحذف هاد المنتج نهائياً؟")) {
                    await deleteDoc(doc(db, "products", prodId));
                    loadProductsToTable(); 
                }
            });
        });

        document.querySelectorAll('.toggle-visibility').forEach(checkbox => {
            checkbox.addEventListener('change', async (e) => {
                const prodId = e.currentTarget.getAttribute('data-id');
                const newVisibility = e.currentTarget.checked;
                await updateDoc(doc(db, "products", prodId), { isVisible: newVisibility });

                const product = allProducts.find(item => item.id === prodId);
                if (product) product.data.isVisible = newVisibility;
                renderProductsTable();
            });
        });
    }

    if (productSearchInput) productSearchInput.addEventListener('input', renderProductsTable);
    [productCollectionFilter, productVisibilityFilter].forEach(control => {
        if (control) control.addEventListener('change', renderProductsTable);
    });
    prodCollectionSelect?.addEventListener('change', () => {
        if (prodCollectionInput) {
            prodCollectionInput.value = prodCollectionSelect.value;
        }
    });
    prodCollectionInput?.addEventListener('input', () => {
        if (!prodCollectionSelect) return;
        const typedValue = normalizeName(prodCollectionInput.value);
        const matchingOption = [...prodCollectionSelect.options].find(option => normalizeName(option.value) === typedValue);
        prodCollectionSelect.value = matchingOption ? matchingOption.value : '';
    });

    if (clearProductFiltersBtn) {
        clearProductFiltersBtn.addEventListener('click', () => {
            if (productSearchInput) productSearchInput.value = '';
            if (productCollectionFilter) productCollectionFilter.value = 'all';
            if (productVisibilityFilter) productVisibilityFilter.value = 'all';
            renderProductsTable();
        });
    }

    // دالة فتح النافذة وإرسال البيانات لها
    window.openEditModal = (id, currentPrice, oldPrice) => {
        currentEditingProdId = id;
        document.getElementById('modalCurrentPrice').value = currentPrice;
        document.getElementById('modalOldPrice').value = (oldPrice && oldPrice !== 'null') ? oldPrice : '';
        const product = allProducts.find(item => item.id === id)?.data || {};
        const imageInput = document.getElementById('modalImageUrl');
        const imageFileInput = document.getElementById('modalImageFile');
        const imagePreview = document.getElementById('modalImagePreview');
        const uploadStatus = document.getElementById('modalImageUploadStatus');
        imageInput.value = product.imageUrl || '';
        imagePreview.src = product.imageUrl || PRODUCT_IMAGE_FALLBACK;
        if (imageFileInput) imageFileInput.value = '';
        if (uploadStatus) uploadStatus.textContent = '';
        if (imageFileInput) {
            imageFileInput.onchange = () => {
                const file = imageFileInput.files?.[0];
                if (!file) {
                    imagePreview.src = imageInput.value || PRODUCT_IMAGE_FALLBACK;
                    return;
                }
                try {
                    validateProductImageFile(file);
                    imagePreview.src = URL.createObjectURL(file);
                    if (uploadStatus) uploadStatus.textContent = 'الصورة جاهزة للرفع عند الحفظ.';
                } catch (error) {
                    alert(error.message);
                    imageFileInput.value = '';
                    imagePreview.src = imageInput.value || PRODUCT_IMAGE_FALLBACK;
                    if (uploadStatus) uploadStatus.textContent = '';
                }
            };
        };
        document.getElementById('modalLongDescAr').value = product.longDescAr || '';
        document.getElementById('modalLongDescEn').value = product.longDescEn || '';
        document.getElementById('modalUnitType').value = product.unitType || 'g';
        renderVariants('modalVariantsList', Array.isArray(product.variants) ? product.variants : []);
        
        const modal = document.getElementById('priceEditModal');
        modal.style.display = 'flex';
        setTimeout(() => modal.classList.add('active'), 10);
    };

    window.openCollectionModal = (id, currentCollection = '') => {
        currentEditingProdId = id;

        const input = document.getElementById('modalCollectionName');
        const modalSelect = document.getElementById('modalCollectionSelect');
        const picker = document.getElementById('collectionPickerList');
        input.value = currentCollection && currentCollection !== 'null' ? currentCollection : '';
        populateProductCollectionSelect();
        if (modalSelect) {
            const matchingOption = [...modalSelect.options].find(option => normalizeName(option.value) === normalizeName(input.value));
            modalSelect.value = matchingOption ? matchingOption.value : '';
            modalSelect.onchange = () => {
                input.value = modalSelect.value;
            };
        }

        if (picker) {
            if (allCollections.length === 0) {
                picker.innerHTML = '<div style="color:#666; padding:10px;">لا يوجد مجموعات بعد. اكتب اسم مجموعة جديدة بالأسفل.</div>';
            } else {
                picker.innerHTML = allCollections.map(item => {
                    const label = item.nameAr || item.nameEn || '';
                    const isActive = normalizeName(label) === normalizeName(input.value) ? 'active' : '';
                    return `<button type="button" class="collection-choice ${isActive}" data-name="${escapeHtml(label)}">${escapeHtml(label)}</button>`;
                }).join('');

                picker.querySelectorAll('.collection-choice').forEach(btn => {
                    btn.addEventListener('click', () => {
                        input.value = btn.getAttribute('data-name');
                        if (modalSelect) modalSelect.value = input.value;
                        picker.querySelectorAll('.collection-choice').forEach(choice => choice.classList.remove('active'));
                        btn.classList.add('active');
                    });
                });
            }
        }

        const modal = document.getElementById('collectionEditModal');
        modal.style.display = 'flex';
        setTimeout(() => modal.classList.add('active'), 10);
    };


    // --- 3. جلب المنتجات للجدول ---
    async function loadProductsToTable() {
        const tbody = document.getElementById('adminProductsTable');
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;"><i class="fas fa-spinner fa-spin"></i> جاري تحميل المنتجات...</td></tr>';

        try {
            const cachedProducts = readAdminCache(ADMIN_PRODUCTS_CACHE_KEY);
            if (cachedProducts) {
                allProducts = cachedProducts;
                populateCollectionFilter();
                renderProductsTable();
            }

            const querySnapshot = await getDocs(productsCol);
            allProducts = [];

            querySnapshot.forEach((docSnap) => {
                allProducts.push({ id: docSnap.id, data: docSnap.data() });
            });

            allProducts.sort((a, b) => {
                const aName = a.data.nameAr || a.data.nameEn || '';
                const bName = b.data.nameAr || b.data.nameEn || '';
                return aName.localeCompare(bName, 'ar');
            });

            writeAdminCache(ADMIN_PRODUCTS_CACHE_KEY, allProducts);
            populateCollectionFilter();
            renderProductsTable();
        } catch (error) {
            console.error("خطأ:", error);
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:red;">حدث خطأ في جلب البيانات!</td></tr>';
        }
    }
    
    loadProductsToTable(); 

    async function loadCollectionsToTable() {
        const tbody = document.getElementById('adminCollectionsTable');

        try {
            const querySnapshot = await getDocs(collectionsCol);
            allCollections = [];

            querySnapshot.forEach((docSnap) => {
                allCollections.push({ id: docSnap.id, ...docSnap.data() });
            });

            allCollections.sort((a, b) => (a.nameAr || a.nameEn || '').localeCompare(b.nameAr || b.nameEn || '', 'ar'));

            if (collectionsDatalist) {
                collectionsDatalist.innerHTML = allCollections.map(item => {
                    const value = item.nameAr || item.nameEn || '';
                    return `<option value="${escapeHtml(value)}"></option>`;
                }).join('');
            }
            populateProductCollectionSelect();

            populateCollectionFilter();
            renderProductsTable();

            if (!tbody) return;

            if (allCollections.length === 0) {
                tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;">لا يوجد مجموعات حالياً.</td></tr>';
                return;
            }

            tbody.innerHTML = allCollections.map(item => `
                <tr>
                    <td><strong>${escapeHtml(item.nameAr || 'بدون اسم')}</strong></td>
                    <td>${escapeHtml(item.nameEn || '-')}</td>
                    <td>
                        <button class="btn-icon btn-delete-collection" data-id="${escapeHtml(item.id)}" title="حذف المجموعة">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </td>
                </tr>
            `).join('');

            document.querySelectorAll('.btn-delete-collection').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    const collectionId = e.currentTarget.getAttribute('data-id');
                    if (confirm("متأكد إنك بدك تحذف هاي المجموعة؟ المنتجات نفسها لن تنحذف.")) {
                        await deleteDoc(doc(db, "collections", collectionId));
                        loadCollectionsToTable();
                    }
                });
            });
        } catch (error) {
            console.error("خطأ في جلب المجموعات:", error);
            if (tbody) tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; color:red;">حدث خطأ في جلب المجموعات.</td></tr>';
        }
    }

    const addCollectionForm = document.getElementById('addCollectionForm');
    if (addCollectionForm) {
        addCollectionForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const nameAr = document.getElementById('collectionNameAr').value.trim();
            const nameEn = document.getElementById('collectionNameEn').value.trim();

            if (!nameAr) return;

            try {
                await ensureCollectionExists(nameAr, nameEn);
                addCollectionForm.reset();
                alert("تمت إضافة المجموعة بنجاح!");
            } catch (error) {
                console.error("خطأ في إضافة المجموعة:", error);
                alert("حدث خطأ أثناء إضافة المجموعة.");
            }
        });
    }

    loadCollectionsToTable();

    // --- 4. إضافة منتج جديد ---
    const addForm = document.getElementById('addProductForm');
    const prodImgFileInput = document.getElementById('prodImgFile');
    if (prodImgFileInput) {
        prodImgFileInput.addEventListener('change', () => {
            const file = prodImgFileInput.files?.[0];
            const previewWrap = document.getElementById('prodImgPreviewWrap');
            const previewImg = document.getElementById('prodImgPreview');
            if (!file) {
                if (previewWrap) previewWrap.classList.remove('active');
                return;
            }
            try {
                validateProductImageFile(file);
                if (previewImg) previewImg.src = URL.createObjectURL(file);
                if (previewWrap) previewWrap.classList.add('active');
            } catch (error) {
                alert(error.message);
                prodImgFileInput.value = '';
                if (previewWrap) previewWrap.classList.remove('active');
            }
        });
    }

    addForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const tagsInput = document.getElementById('prodTags').value;
        const tagsArray = tagsInput.split(' ').filter(tag => tag.trim() !== '');

        const oldPriceInput = document.getElementById('prodOldPrice').value;
        const oldPriceValue = oldPriceInput.trim() !== "" ? parseFloat(oldPriceInput) : null;
        const collectionName = (prodCollectionInput?.value || '').trim();
        const variants = collectVariants('productVariantsList');
        const imageFile = document.getElementById('prodImgFile')?.files?.[0];
        let imageUrl = document.getElementById('prodImg').value.trim();

        const newProduct = {
            nameAr: document.getElementById('prodNameAr').value,
            nameEn: document.getElementById('prodNameEn').value,
            categoryAr: document.getElementById('prodCatAr').value,
            categoryEn: document.getElementById('prodCatEn').value,
            collectionName: collectionName,
            collectionSlug: collectionName ? slugifyCollectionName(collectionName) : '',
            descAr: document.getElementById('prodDescAr').value,
            descEn: document.getElementById('prodDescEn').value,
            longDescAr: document.getElementById('prodLongDescAr').value.trim(),
            longDescEn: document.getElementById('prodLongDescEn').value.trim(),
            unitType: document.getElementById('prodUnitType').value,
            variants: variants,
            price: parseFloat(document.getElementById('prodPrice').value),
            oldPrice: oldPriceValue,
            imageUrl: '',
            tags: tagsArray,
            isVisible: true,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        };

        try {
            const submitBtn = addForm.querySelector('.btn-submit');
            submitBtn.innerText = "جاري الإضافة...";
            submitBtn.disabled = true;

            if (collectionName) {
                await ensureCollectionExists(collectionName);
            }

            if (imageFile) {
                imageUrl = await uploadProductImage(imageFile, newProduct.nameEn || newProduct.nameAr || 'new-product');
            }

            if (!imageUrl) {
                throw new Error('اختر صورة للمنتج أو أضف رابط صورة احتياطي.');
            }

            newProduct.imageUrl = imageUrl;
            await addDoc(productsCol, newProduct);
            
            alert("تم إضافة المنتج للمتجر بنجاح! 🎉");
            addForm.reset(); 
            document.getElementById('prodImgPreviewWrap')?.classList.remove('active');
            renderVariants('productVariantsList');
            loadProductsToTable(); 

            submitBtn.innerText = "حفظ وإضافة للمتجر";
            submitBtn.disabled = false;
        } catch (error) {
            console.error("خطأ:", error);
            alert(error.message || "حدث خطأ أثناء إضافة المنتج!");
            const submitBtn = addForm.querySelector('.btn-submit');
            if (submitBtn) {
                submitBtn.innerText = "حفظ وإضافة للمتجر";
                submitBtn.disabled = false;
            }
        }
    });

    // --- أزرار التصفير ---
    const btnResetVisitors = document.getElementById('btnResetVisitors');
    if (btnResetVisitors) {
        btnResetVisitors.addEventListener('click', async () => {
            if (confirm("متأكد إنك بدك تصفر عداد الزوار؟")) {
                await updateDoc(statsDocRef, { visits: 0 });
                alert("تم تصفير عداد الزوار بنجاح!");
            }
        });
    }

    const btnResetOrders = document.getElementById('btnResetOrders');
    if (btnResetOrders) {
        btnResetOrders.addEventListener('click', async () => {
            if (confirm("تحذير: هاد الإجراء رح يحذف كل الطلبات السابقة نهائياً عشان يصفر الأرباح والطلبات. متأكد؟")) {
                try {
                    const ordersSnap = await getDocs(collection(db, "orders"));
                    const deleteJobs = [];
                    ordersSnap.forEach((orderDoc) => {
                        deleteJobs.push(deleteDoc(doc(db, "orders", orderDoc.id)));
                    });
                    await Promise.all(deleteJobs);
                    alert("تم تصفير الطلبات والأرباح بنجاح!");
                    loadStats(); 
                } catch (error) {
                    console.error("خطأ:", error);
                }
            }
        });
    }
    // ==========================================
    // 🔥 نظام إدارة الكوبونات
    // ==========================================
    const couponsCol = collection(db, "coupons");

    // 1. إضافة كوبون جديد
    const addCouponForm = document.getElementById('addCouponForm');
    if (addCouponForm) {
        addCouponForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const submitBtn = addCouponForm.querySelector('button[type="submit"]');
            submitBtn.innerText = "جاري الإضافة...";
            submitBtn.disabled = true;

            const newCoupon = {
                code: document.getElementById('couponCode').value.trim().toUpperCase(),
                type: document.getElementById('couponType').value,
                value: parseFloat(document.getElementById('couponValue').value),
                expiryDate: document.getElementById('couponExpiry').value,
                usageLimit: parseInt(document.getElementById('couponLimit').value),
                usedCount: 0, // يبدأ من صفر استخدام
                isActive: true
            };

            try {
                await addDoc(couponsCol, newCoupon);
                alert("تم إضافة الكوبون بنجاح! 🎉");
                addCouponForm.reset();
                loadCouponsToTable(); // تحديث الجدول
            } catch (error) {
                console.error("خطأ في إضافة الكوبون:", error);
                alert("حدث خطأ أثناء إضافة الكوبون!");
            } finally {
                submitBtn.innerText = "إضافة الكوبون";
                submitBtn.disabled = false;
            }
        });
    }

    // 2. جلب الكوبونات وعرضها في الجدول
    async function loadCouponsToTable() {
        const tbody = document.getElementById('adminCouponsTable');
        if (!tbody) return;
        
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;"><i class="fas fa-spinner fa-spin"></i> جاري تحميل الكوبونات...</td></tr>';
        
        try {
            const querySnapshot = await getDocs(couponsCol);
            let html = '';
            
            querySnapshot.forEach((docSnap) => {
                const coupon = docSnap.data();
                const isChecked = coupon.isActive ? 'checked' : '';
                
                // تنسيق العرض حسب نوع الكوبون
                const displayValue = coupon.type === 'percentage' ? `${coupon.value}%` : `${coupon.value} JD`;
                
                // التحقق إذا الكوبون منتهي الصلاحية
                const today = new Date().toISOString().split('T')[0];
                const isExpired = coupon.expiryDate < today;
                const statusStyle = isExpired ? 'color: red; font-size: 0.85rem;' : 'color: green; font-size: 0.85rem;';
                const statusText = isExpired ? 'منتهي' : 'فعّال';

                html += `
                <tr style="border-bottom: 1px solid #EADBC6;">
                    <td style="padding: 12px;"><strong>${coupon.code}</strong></td>
                    <td style="padding: 12px; color: var(--gold); font-weight: bold;">${displayValue}</td>
                    <td style="padding: 12px;">${coupon.usedCount} / ${coupon.usageLimit}</td>
                    <td style="padding: 12px; direction: ltr; text-align: right;">${coupon.expiryDate}</td>
                    <td style="padding: 12px;">
                        <span style="${statusStyle}">${statusText}</span><br>
                        <label class="switch" style="transform: scale(0.8);">
                            <input type="checkbox" class="toggle-coupon-status" data-id="${docSnap.id}" ${isChecked}>
                            <span class="slider"></span>
                        </label>
                    </td>
                    <td style="padding: 12px;">
                        <button class="btn-icon btn-delete-coupon" data-id="${docSnap.id}" title="حذف الكوبون" style="color: red; background: none; border: none; cursor: pointer; font-size: 1.1rem;">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </td>
                </tr>`;
            });
            
            tbody.innerHTML = html === '' ? '<tr><td colspan="6" style="text-align:center;">لا يوجد كوبونات حالياً.</td></tr>' : html;

            // تفعيل أزرار الحذف
            document.querySelectorAll('.btn-delete-coupon').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    const couponId = e.currentTarget.getAttribute('data-id');
                    if(confirm("متأكد إنك بدك تحذف هاد الكوبون نهائياً؟")) {
                        await deleteDoc(doc(db, "coupons", couponId));
                        loadCouponsToTable(); 
                    }
                });
            });

            // تفعيل أزرار التفعيل/التعطيل
            document.querySelectorAll('.toggle-coupon-status').forEach(checkbox => {
                checkbox.addEventListener('change', async (e) => {
                    const couponId = e.currentTarget.getAttribute('data-id');
                    const newStatus = e.currentTarget.checked;
                    await updateDoc(doc(db, "coupons", couponId), { isActive: newStatus });
                });
            });

        } catch (error) {
            console.error("خطأ:", error);
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:red;">حدث خطأ في جلب الكوبونات!</td></tr>';
        }
    }
    
    // تشغيل دالة جلب الكوبونات عند فتح الصفحة
    loadCouponsToTable();
});
