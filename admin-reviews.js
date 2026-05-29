import { app } from './firebase-config.js';
import { getFirestore, collection, addDoc, deleteDoc, doc, onSnapshot, serverTimestamp, updateDoc, enableIndexedDbPersistence } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-auth.js";
import { initAdminOrderNotifications } from './admin-notifications.js';

const db = getFirestore(app);
enableIndexedDbPersistence(db).catch(() => {});
const auth = getAuth(app);
const ADMIN_EMAILS = ['googgermal@gmail.com', 'katia-abu-arqoub@admin.zarina'];

const productsCol = collection(db, 'products');
const reviewsCol = collection(db, 'reviews');

let products = [];
let reviews = [];

onAuthStateChanged(auth, (user) => {
    if (!user || !ADMIN_EMAILS.includes(user.email?.toLowerCase())) {
        if (user) signOut(auth);
        window.location.href = 'login.html';
        return;
    }
    initAdminOrderNotifications(db, user);
});

document.getElementById('btnLogout')?.addEventListener('click', () => {
    signOut(auth).then(() => window.location.href = 'login.html');
});

function escapeHtml(value) {
    if (value === null || value === undefined) return '';
    return String(value).replace(/[&<>"']/g, (char) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    })[char]);
}

function getDateValue(item) {
    const createdAt = item.createdAt;
    if (!createdAt) return 0;
    if (typeof createdAt.toDate === 'function') return createdAt.toDate().getTime();
    if (createdAt.seconds) return createdAt.seconds * 1000;
    const parsed = new Date(createdAt).getTime();
    return Number.isNaN(parsed) ? 0 : parsed;
}

function formatDate(item) {
    const value = getDateValue(item);
    if (!value) return 'بدون تاريخ';
    return new Date(value).toLocaleString('ar-JO');
}

function starsHtml(value = 0) {
    const rating = Number(value) || 0;
    let html = '';
    for (let i = 1; i <= 5; i++) {
        html += `<i class="${rating >= i ? 'fas' : 'far'} fa-star"></i>`;
    }
    return html;
}

function productLabel(product) {
    if (!product) return 'منتج غير معروف';
    return product.nameAr || product.nameEn || product.name || 'منتج بدون اسم';
}

function productById(id) {
    return products.find(item => item.id === id);
}

function populateProductsSelect() {
    const select = document.getElementById('reviewProductSelect');
    if (!select) return;

    if (!products.length) {
        select.innerHTML = '<option value="">لا يوجد منتجات حالياً</option>';
        return;
    }

    select.innerHTML = '<option value="">اختار المنتج</option>' + products.map(product => (
        `<option value="${escapeHtml(product.id)}">${escapeHtml(productLabel(product))}</option>`
    )).join('');
}

function updateStats() {
    const visible = reviews.filter(review => review.isVisible !== false);
    const hidden = reviews.filter(review => review.isVisible === false);
    const home = visible.filter(review => review.showOnHome !== false);
    const avg = visible.length
        ? visible.reduce((sum, review) => sum + (Number(review.rating) || 0), 0) / visible.length
        : 0;

    document.getElementById('totalReviewsCount').textContent = reviews.length;
    document.getElementById('visibleReviewsCount').textContent = visible.length;
    document.getElementById('homeReviewsAdminCount').textContent = home.length;
    document.getElementById('hiddenReviewsCount').textContent = hidden.length;
    document.getElementById('reviewsAverageScore').textContent = avg.toFixed(1);
    document.getElementById('reviewsAverageStars').innerHTML = starsHtml(Math.round(avg));
    document.getElementById('reviewsAverageLabel').textContent = visible.length ? `${visible.length} تقييم ظاهر` : 'لا يوجد تقييمات ظاهرة';
}

function getFilteredReviews() {
    const search = (document.getElementById('reviewSearchInput')?.value || '').trim().toLowerCase();
    const visibility = document.getElementById('reviewVisibilityFilter')?.value || 'all';
    const home = document.getElementById('reviewHomeFilter')?.value || 'all';

    return reviews.filter(review => {
        const product = productById(review.productId);
        const haystack = [
            review.customerName,
            review.text,
            review.productNameAr,
            review.productNameEn,
            productLabel(product)
        ].join(' ').toLowerCase();

        if (search && !haystack.includes(search)) return false;
        if (visibility === 'visible' && review.isVisible === false) return false;
        if (visibility === 'hidden' && review.isVisible !== false) return false;
        if (home === 'home' && (review.showOnHome === false || review.isVisible === false)) return false;
        if (home === 'not-home' && review.showOnHome !== false) return false;
        return true;
    });
}

function renderReviews() {
    updateStats();
    const grid = document.getElementById('reviewsGrid');
    if (!grid) return;

    const items = getFilteredReviews();
    if (!items.length) {
        grid.innerHTML = '<div class="empty-state">لا يوجد تقييمات مطابقة للفلاتر الحالية.</div>';
        return;
    }

    grid.innerHTML = items.map(review => {
        const product = productById(review.productId);
        const visible = review.isVisible !== false;
        const onHome = review.showOnHome !== false;
        return `
            <article class="review-card ${visible ? '' : 'hidden'}">
                <header>
                    <div>
                        <h3>${escapeHtml(review.customerName || 'زبون زارينا')}</h3>
                        <div class="review-stars">${starsHtml(review.rating)}</div>
                    </div>
                    <div class="review-flags">
                        <span class="flag ${visible ? 'ok' : 'warn'}">${visible ? 'ظاهر' : 'مخفي'}</span>
                        <span class="flag ${onHome && visible ? 'ok' : ''}">${onHome && visible ? 'الرئيسية' : 'ليس بالرئيسية'}</span>
                    </div>
                </header>
                <p>${escapeHtml(review.text || '')}</p>
                <div class="review-meta">
                    <span><strong>المنتج:</strong> ${escapeHtml(productLabel(product) || review.productNameAr || review.productNameEn)}</span>
                    <span><strong>التاريخ:</strong> ${escapeHtml(formatDate(review))}</span>
                </div>
                <div class="review-actions">
                    <button class="action-btn toggle-visible" data-id="${escapeHtml(review.id)}" data-visible="${visible ? 'true' : 'false'}">${visible ? 'إخفاء' : 'إظهار'}</button>
                    <button class="action-btn toggle-home" data-id="${escapeHtml(review.id)}" data-home="${onHome ? 'true' : 'false'}">${onHome ? 'إزالة من الرئيسية' : 'إظهار بالرئيسية'}</button>
                    <button class="action-btn danger delete-review" data-id="${escapeHtml(review.id)}">حذف</button>
                </div>
            </article>
        `;
    }).join('');

    grid.querySelectorAll('.toggle-visible').forEach(button => {
        button.addEventListener('click', async () => {
            const isVisible = button.dataset.visible === 'true';
            await updateDoc(doc(db, 'reviews', button.dataset.id), { isVisible: !isVisible });
        });
    });

    grid.querySelectorAll('.toggle-home').forEach(button => {
        button.addEventListener('click', async () => {
            const isHome = button.dataset.home === 'true';
            await updateDoc(doc(db, 'reviews', button.dataset.id), { showOnHome: !isHome });
        });
    });

    grid.querySelectorAll('.delete-review').forEach(button => {
        button.addEventListener('click', async () => {
            if (!confirm('متأكد إنك بدك تحذف هذا التقييم نهائياً؟')) return;
            await deleteDoc(doc(db, 'reviews', button.dataset.id));
        });
    });
}

onSnapshot(productsCol, (snapshot) => {
    products = [];
    snapshot.forEach(docSnap => {
        products.push({ id: docSnap.id, ...docSnap.data() });
    });
    products.sort((a, b) => productLabel(a).localeCompare(productLabel(b), 'ar'));
    populateProductsSelect();
    renderReviews();
}, () => {
    populateProductsSelect();
});

onSnapshot(reviewsCol, (snapshot) => {
    reviews = [];
    snapshot.forEach(docSnap => {
        reviews.push({ id: docSnap.id, ...docSnap.data() });
    });
    reviews.sort((a, b) => getDateValue(b) - getDateValue(a));
    renderReviews();
}, (error) => {
    console.error('Reviews load error:', error);
    document.getElementById('reviewsGrid').innerHTML = '<div class="empty-state">حدث خطأ أثناء تحميل التقييمات.</div>';
});

document.getElementById('addReviewForm')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const productId = document.getElementById('reviewProductSelect').value;
    const product = productById(productId);
    const customerName = document.getElementById('reviewCustomerName').value.trim();
    const text = document.getElementById('reviewTextAdmin').value.trim();
    const rating = Number(document.getElementById('reviewRating').value) || 5;
    const isVisible = document.getElementById('reviewVisible').value === 'true';
    const showOnHome = document.getElementById('reviewShowOnHome').value === 'true';

    if (!productId || !customerName || !text) return;

    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الإضافة...';

    try {
        await addDoc(reviewsCol, {
            productId,
            productNameAr: product?.nameAr || '',
            productNameEn: product?.nameEn || '',
            customerName,
            text,
            rating,
            isVisible,
            showOnHome,
            source: 'admin',
            createdAt: serverTimestamp()
        });
        form.reset();
        document.getElementById('reviewRating').value = '5';
        document.getElementById('reviewVisible').value = 'true';
        document.getElementById('reviewShowOnHome').value = 'true';
        alert('تمت إضافة التقييم بنجاح.');
    } catch (error) {
        console.error('Review add error:', error);
        alert('حدث خطأ أثناء إضافة التقييم.');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-plus"></i> إضافة التقييم';
    }
});

['reviewSearchInput', 'reviewVisibilityFilter', 'reviewHomeFilter'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', renderReviews);
    document.getElementById(id)?.addEventListener('change', renderReviews);
});

document.getElementById('clearReviewFilters')?.addEventListener('click', () => {
    document.getElementById('reviewSearchInput').value = '';
    document.getElementById('reviewVisibilityFilter').value = 'all';
    document.getElementById('reviewHomeFilter').value = 'all';
    renderReviews();
});
