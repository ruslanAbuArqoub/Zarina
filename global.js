// ========== GLOBAL.JS ==========

(function() {
  document.addEventListener('DOMContentLoaded', function() {
    
    // ---------- 0. LANGUAGE TOGGLE LOGIC ----------
    const langToggle = document.getElementById('langToggle');
    let currentLang = localStorage.getItem('zarinaLang') || 'ar'; // خلينا العربي الأساسي
    const savedTheme = localStorage.getItem('zarinaTheme') || 'light';

    function applyLanguage(lang) {
      document.documentElement.lang = lang;
      document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    }

    function applyTheme(theme) {
      const nextTheme = theme === 'dark' ? 'dark' : 'light';
      document.documentElement.dataset.theme = nextTheme;
      const toggle = document.getElementById('themeToggleBtn');
      if (toggle) {
        toggle.setAttribute('aria-label', nextTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
        toggle.innerHTML = nextTheme === 'dark' ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
      }
    }

    applyLanguage(currentLang);
    applyTheme(savedTheme);

    if (langToggle) {
      langToggle.addEventListener('click', () => {
        currentLang = currentLang === 'en' ? 'ar' : 'en';
        localStorage.setItem('zarinaLang', currentLang);
        applyLanguage(currentLang);
      });
    }

    // ---------- 1. MOBILE HAMBURGER MENU ----------
    const hamburger = document.querySelector('.hamburger');
    const navLinks = document.querySelector('.nav-links');
    if (hamburger && navLinks) {
      hamburger.setAttribute('aria-expanded', 'false');

      const mobileCartIcon = document.getElementById('cartIconBtn');
      const navbar = hamburger.closest('.navbar');
      const mobileActions = document.createElement('div');
      const themeToggle = document.createElement('button');
      mobileActions.className = 'mobile-header-actions';
      mobileActions.setAttribute('aria-label', 'Quick actions');
      themeToggle.type = 'button';
      themeToggle.id = 'themeToggleBtn';
      themeToggle.className = 'theme-toggle';

      if (navbar) {
        navbar.insertBefore(mobileActions, hamburger);
      }

      function syncMobileHeaderActions() {
        if (themeToggle.parentElement !== mobileActions) mobileActions.appendChild(themeToggle);
        if (langToggle && langToggle.parentElement !== mobileActions) mobileActions.appendChild(langToggle);
        if (mobileCartIcon && mobileCartIcon.parentElement !== mobileActions) mobileActions.appendChild(mobileCartIcon);
      }

      syncMobileHeaderActions();
      applyTheme(localStorage.getItem('zarinaTheme') || 'light');
      themeToggle.addEventListener('click', () => {
        const nextTheme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
        localStorage.setItem('zarinaTheme', nextTheme);
        applyTheme(nextTheme);
      });
      window.addEventListener('resize', syncMobileHeaderActions, { passive: true });

      const currentPage = (window.location.pathname.split('/').pop() || 'index.html').toLowerCase();
      navLinks.querySelectorAll('a').forEach(link => {
        const href = (link.getAttribute('href') || '').split('/').pop().toLowerCase();
        if (href === currentPage) link.classList.add('active');
      });

      hamburger.addEventListener('click', function(e) {
        e.stopPropagation();
        navLinks.classList.toggle('open');
        hamburger.setAttribute('aria-expanded', navLinks.classList.contains('open') ? 'true' : 'false');
      });
      navLinks.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
          navLinks.classList.remove('open');
          hamburger.setAttribute('aria-expanded', 'false');
        });
      });
    }

    // ---------- 2. GLOBAL CART STATE & localStorage ----------
    let cart = [];
    const STORAGE_KEY = 'zarinaCart';

    function saveCart() {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
    }

    function loadCart() {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          cart = JSON.parse(saved);
        } catch(e) { cart = []; }
      } else {
        cart = [];
      }
      updateCartBadge();
      renderCartSidebar();
    }

    function updateCartBadge() {
      const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
      const badge = document.getElementById('cartCountBadge');
      if (badge) badge.innerText = totalItems;
    }

    function renderCartSidebar() {
      const container = document.getElementById('cartItemsContainer');
      if (!container) return; 

      if (cart.length === 0) {
        container.innerHTML = `
          <div class="empty-cart-msg">
            <i class="fas fa-seedling"></i> 
            <span class="en-text">Your cart is empty.</span>
            <span class="ar-text">سلتك فاضية، اختار اللي بيعجبك وضيفه!</span>
          </div>`;
        const totalSpan = document.getElementById('cartTotalPrice');
        if (totalSpan) totalSpan.innerText = '0.00 JD';
        return;
      }

      let itemsHtml = '';
      let total = 0;
      cart.forEach(item => {
        const itemTotal = item.price * item.quantity;
        total += itemTotal;
        const imgSrc = item.img || 'https://placehold.co/60x60?text=oil';
        
        // عرض اسم المنتج بالسلة باللغتين
        const nameEn = item.nameEn || item.name || 'Unnamed';
        const nameAr = item.nameAr || item.name || 'بدون اسم';

        itemsHtml += `
          <div class="cart-item" data-id="${item.id}">
            <img src="${imgSrc}" class="cart-item-img" alt="product">
            <div class="cart-item-details">
              <div class="cart-item-name">
                <span class="en-text">${escapeHtml(nameEn)}</span>
                <span class="ar-text">${escapeHtml(nameAr)}</span>
              </div>
              ${item.variantLabel ? `<div style="font-size:0.8rem;color:#6C6253;">${escapeHtml(item.variantLabel)}</div>` : ''}
              <div class="cart-item-price">${item.price} JD</div>
              <div class="cart-qty">
                <button class="qty-btn" data-id="${item.id}" data-delta="-1">-</button>
                <span>${item.quantity}</span>
                <button class="qty-btn" data-id="${item.id}" data-delta="1">+</button>
                <button class="remove-item" data-id="${item.id}">
                  <span class="en-text">remove</span>
                  <span class="ar-text">إحذف</span>
                </button>
              </div>
            </div>
          </div>
        `;
      });
      container.innerHTML = itemsHtml;
      const totalSpan = document.getElementById('cartTotalPrice');
      if (totalSpan) totalSpan.innerText = `${total.toFixed(2)} JD`;

      document.querySelectorAll('.qty-btn').forEach(btn => {
        btn.addEventListener('click', handleQtyClick);
      });
      document.querySelectorAll('.remove-item').forEach(btn => {
        btn.addEventListener('click', handleRemoveClick);
      });
    }

    function escapeHtml(str) {
      if (!str) return '';
      return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
      });
    }

    function handleQtyClick(e) {
      const btn = e.currentTarget;
      const productId = btn.dataset.id; 
      const delta = parseInt(btn.dataset.delta);
      adjustQuantity(productId, delta);
    }

    function adjustQuantity(productId, delta) {
      const itemIndex = cart.findIndex(i => i.id === productId);
      if (itemIndex !== -1) {
        const newQty = cart[itemIndex].quantity + delta;
        if (newQty <= 0) {
          cart.splice(itemIndex, 1);
        } else {
          cart[itemIndex].quantity = newQty;
        }
        saveCart();
        updateCartBadge();
        renderCartSidebar();
        
        if(delta > 0) {
            showToast('<span class="en-text">Quantity increased</span><span class="ar-text">زدنا الكمية</span>');
        } else {
            showToast('<span class="en-text">Item removed</span><span class="ar-text">انشالت من السلة</span>');
        }
      }
    }

    function removeFromCart(productId) {
      cart = cart.filter(i => i.id !== productId);
      saveCart();
      updateCartBadge();
      renderCartSidebar();
      showToast('<span class="en-text">Item removed</span><span class="ar-text">انشالت من السلة</span>');
    }

    function handleRemoveClick(e) {
      const btn = e.currentTarget;
      const productId = btn.dataset.id;
      removeFromCart(productId);
    }

    // تحديث دالة إضافة للسلة عشان تاخذ اللغتين
    window.addToCart = function(product) {
      const existing = cart.find(i => i.id === product.id);
      if (existing) {
        existing.quantity += product.quantity || 1;
      } else {
        cart.push({
          id: product.id,
          nameEn: product.nameEn,
          nameAr: product.nameAr,
          price: product.price,
          quantity: product.quantity || 1,
          img: product.img || 'https://placehold.co/60x60?text=herb',
          variantLabel: product.variantLabel || ''
        });
      }
      saveCart();
      updateCartBadge();
      renderCartSidebar();
      
      showToast(`
        <span class="en-text">➕ Added to cart</span>
        <span class="ar-text">➕ انضافت للسلة</span>
      `);
    };

    function showToast(msgHtml) {
      let toast = document.getElementById('toastMsg');
      if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toastMsg';
        toast.className = 'toast-msg';
        document.body.appendChild(toast);
      }
      toast.innerHTML = msgHtml; 
      toast.classList.add('show');
      setTimeout(() => toast.classList.remove('show'), 1800);
    }

    // ---------- 3. SLIDE-OUT CART OPEN/CLOSE ----------
    const cartIcon = document.getElementById('cartIconBtn');
    const cartSidebarElem = document.getElementById('cartSidebar');
    const cartOverlay = document.getElementById('cartOverlay');
    const closeCartBtn = document.getElementById('closeCartBtn');

    if (cartIcon) cartIcon.setAttribute('aria-label', 'Open cart');
    if (closeCartBtn) closeCartBtn.setAttribute('aria-label', 'Close cart');
    if (cartSidebarElem) cartSidebarElem.setAttribute('aria-hidden', 'true');

    function openCart() {
      if (cartSidebarElem) cartSidebarElem.classList.add('open');
      if (cartOverlay) cartOverlay.classList.add('active');
      if (cartSidebarElem) cartSidebarElem.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
      renderCartSidebar();
    }

    function closeCart() {
      if (cartSidebarElem) cartSidebarElem.classList.remove('open');
      if (cartOverlay) cartOverlay.classList.remove('active');
      if (cartSidebarElem) cartSidebarElem.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
    }

    if (cartIcon) cartIcon.addEventListener('click', openCart);
    if (closeCartBtn) closeCartBtn.addEventListener('click', closeCart);
    if (cartOverlay) cartOverlay.addEventListener('click', closeCart);

    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;
      closeCart();
      if (navLinks) navLinks.classList.remove('open');
      if (hamburger) hamburger.setAttribute('aria-expanded', 'false');
      document.getElementById('productDetailModal')?.classList.remove('show');
      document.body.style.overflow = '';
    });

    const proceedBtn = document.getElementById('proceedCheckoutBtn');
    if (proceedBtn) {
      proceedBtn.addEventListener('click', () => {
        if (cart.length === 0) {
          showToast('<span class="en-text">Your cart is empty</span><span class="ar-text">السلة فاضية! ضيف منتجات بالاول</span>');
          return;
        }
        window.location.href = 'checkout.html';
      });
    }

    loadCart();

    // ---------- 4. BACK TO TOP ----------
    const backTop = document.createElement('button');
    backTop.type = 'button';
    backTop.className = 'back-to-top';
    backTop.setAttribute('aria-label', 'Back to top');
    backTop.innerHTML = '<i class="fas fa-arrow-up"></i>';
    document.body.appendChild(backTop);

    window.addEventListener('scroll', () => {
      backTop.classList.toggle('show', window.scrollY > 650);
    }, { passive: true });

    backTop.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });
})();

// ==========================================
// ========== FIREBASE INTEGRATION ==========
// ==========================================

function escapeHtml(value) {
    return (value ?? '').toString().replace(/[&<>"']/g, function(match) {
        if (match === '&') return '&amp;';
        if (match === '<') return '&lt;';
        if (match === '>') return '&gt;';
        if (match === '"') return '&quot;';
        if (match === "'") return '&#39;';
        return match;
    });
}

function sanitizePlainText(value, maxLength) {
    return (value ?? '')
        .toString()
        .replace(/[\u0000-\u001F\u007F]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, maxLength);
}

import { app } from './firebase-config.js';
import { getFirestore, collection, getDocs, doc, updateDoc, increment, onSnapshot, enableIndexedDbPersistence, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js";

const db = getFirestore(app);
enableIndexedDbPersistence(db).catch(() => {});
window.zarinaProductsById = window.zarinaProductsById || {};
window.zarinaReviewsByProduct = window.zarinaReviewsByProduct || {};
window.zarinaLatestReviews = window.zarinaLatestReviews || [];
const PRODUCTS_CACHE_KEY = 'zarinaProductsCacheV2';
const PRODUCTS_CACHE_MAX_AGE = 1000 * 60 * 60 * 12;
const announcementDocRef = doc(db, 'site_data', 'announcement');

function readLocalCache(key, maxAge = PRODUCTS_CACHE_MAX_AGE) {
    try {
        const raw = localStorage.getItem(key);
        if (!raw) return null;
        const payload = JSON.parse(raw);
        if (!payload || !Array.isArray(payload.items)) return null;
        if (Date.now() - (payload.savedAt || 0) > maxAge) return null;
        return payload.items;
    } catch (error) {
        return null;
    }
}

function writeLocalCache(key, items) {
    try {
        localStorage.setItem(key, JSON.stringify({ savedAt: Date.now(), items }));
    } catch (error) {
        // Storage can fail in private mode; the live Firestore load still works.
    }
}

// --- نظام عداد الزوار ---
const statsDocRef = doc(db, 'site_data', 'stats');

async function recordVisit() {
    if (!sessionStorage.getItem('hasVisitedZarina')) {
        try {
            await updateDoc(statsDocRef, {
                visits: increment(1)
            });
            sessionStorage.setItem('hasVisitedZarina', 'true');
        } catch (error) {
            console.error("خطأ في تسجيل الزيارة:", error);
        }
    }
}

function listenToVisitorCount() {
    const counterEn = document.getElementById('liveVisitorCount');
    const counterAr = document.getElementById('liveVisitorCountAr');
    
    if (!counterEn && !counterAr) return;

    onSnapshot(statsDocRef, (docSnap) => {
        if (docSnap.exists()) {
            const currentVisits = docSnap.data().visits;
            if (counterEn) counterEn.innerText = currentVisits;
            if (counterAr) counterAr.innerText = currentVisits;
        }
    });
}
// ------------------------

function listenAnnouncementBar() {
    if (!document.querySelector('body > header:not(.admin-header)')) return;

    let bar = document.getElementById('siteAnnouncementBar');
    if (!bar) {
        bar = document.createElement('div');
        bar.id = 'siteAnnouncementBar';
        bar.className = 'site-announcement';
        document.body.prepend(bar);
    }

    onSnapshot(announcementDocRef, (docSnap) => {
        const data = docSnap.exists() ? docSnap.data() : {};
        const textAr = (data.textAr || '').trim();
        const textEn = (data.textEn || '').trim();
        const hasText = textAr || textEn;
        const isActive = data.isActive !== false && hasText;

        document.documentElement.style.setProperty('--announcement-height', isActive ? '42px' : '0px');
        bar.innerHTML = isActive ? `
            <i class="fas fa-bullhorn"></i>
            <span class="en-text">${escapeAttribute(textEn || textAr)}</span>
            <span class="ar-text">${escapeAttribute(textAr || textEn)}</span>
        ` : '';
    }, () => {
        document.documentElement.style.setProperty('--announcement-height', '0px');
    });
}

// ------------------------

function cleanCatalogText(value) {
    return (value || '').toString().toLowerCase().trim();
}

function escapeAttribute(value) {
    return (value || '').toString()
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

function getProductVariants(product) {
    const variants = Array.isArray(product.variants) ? product.variants.filter(v => v && v.label && !Number.isNaN(parseFloat(v.price))) : [];
    if (variants.length > 0) return variants;
    return [{
        id: 'default',
        label: product.unitType ? `1 ${product.unitType}` : 'Default',
        price: parseFloat(product.price || 0),
        oldPrice: product.oldPrice ? parseFloat(product.oldPrice) : null,
        status: 'in_stock'
    }];
}

function reviewDateValue(review) {
    const createdAt = review.createdAt;
    if (!createdAt) return 0;
    if (typeof createdAt.toDate === 'function') return createdAt.toDate().getTime();
    if (createdAt.seconds) return createdAt.seconds * 1000;
    const parsed = new Date(createdAt).getTime();
    return Number.isNaN(parsed) ? 0 : parsed;
}

function getProductReviewStats(productId) {
    const reviews = (window.zarinaReviewsByProduct?.[productId] || []).filter(review => review && typeof review === 'object');
    if (!reviews.length) return { average: 0, count: 0, reviews: [] };
    const total = reviews.reduce((sum, review) => sum + (Number(review.rating) || 0), 0);
    return {
        average: total / reviews.length,
        count: reviews.length,
        reviews
    };
}

function starsHtml(value = 0, compact = false) {
    const rounded = Math.round((Number(value) || 0) * 2) / 2;
    let html = '';
    for (let i = 1; i <= 5; i++) {
        const icon = rounded >= i ? 'fas fa-star' : rounded >= i - 0.5 ? 'fas fa-star-half-alt' : 'far fa-star';
        html += `<i class="${icon}"></i>`;
    }
    if (!compact && value > 0) html += `<strong>${Number(value).toFixed(1)}</strong>`;
    return html;
}

function productAvailability(product) {
    const variants = getProductVariants(product);
    return variants.some(variant => variant.status !== 'out_of_stock')
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock';
}

function renderProductStructuredData() {
    const products = Object.values(window.zarinaProductsById || {}).filter(product => product && product.isVisible !== false);
    if (!products.length) return;
    window.zarinaUpdateSeoProductKeywords?.(products);

    const itemList = products.slice(0, 60).map((product, index) => {
        const variants = getProductVariants(product);
        const price = Math.min(...variants.map(variant => parseFloat(variant.price || product.price || 0))).toFixed(2);
        const stats = getProductReviewStats(product.id);
        const name = product.nameEn || product.nameAr || product.name || 'ZARINA product';
        const description = product.descEn || product.descAr || product.description || `${name} from ZARINA natural apothecary.`;
        const productSchema = {
            '@type': 'Product',
            name,
            description,
            image: product.imageUrl ? [product.imageUrl] : [],
            brand: {
                '@type': 'Brand',
                name: 'ZARINA'
            },
            offers: {
                '@type': 'Offer',
                price,
                priceCurrency: 'JOD',
                availability: productAvailability(product),
                url: `${window.location.origin}${window.location.pathname}#product-${product.id}`
            }
        };

        if (stats.count > 0) {
            productSchema.aggregateRating = {
                '@type': 'AggregateRating',
                ratingValue: Number(stats.average.toFixed(1)),
                reviewCount: stats.count
            };
        }

        return {
            '@type': 'ListItem',
            position: index + 1,
            item: productSchema
        };
    });

    let tag = document.getElementById('zarina-products-schema');
    if (!tag) {
        tag = document.createElement('script');
        tag.type = 'application/ld+json';
        tag.id = 'zarina-products-schema';
        document.head.appendChild(tag);
    }

    tag.textContent = JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        name: 'ZARINA products',
        itemListElement: itemList
    });
}

function renderProductRatingBadges() {
    document.querySelectorAll('.product-rating-badge[data-product-id]').forEach(badge => {
        const stats = getProductReviewStats(badge.dataset.productId);
        badge.innerHTML = stats.count
            ? `${starsHtml(stats.average, true)} <span>${stats.average.toFixed(1)} (${stats.count})</span>`
            : `<i class="far fa-star"></i><span class="en-text">New</span><span class="ar-text">جديد</span>`;
    });
}

function renderHomeReviewSection() {
    const section = document.getElementById('homeReviewsSection');
    const list = document.getElementById('homeReviewsList');
    const avgEl = document.getElementById('homeReviewsAverage');
    const countEl = document.getElementById('homeReviewsCount');
    if (!section || !list) return;

    const reviews = [...(window.zarinaLatestReviews || [])]
        .filter(review => review.rating && review.text && review.showOnHome !== false)
        .sort((a, b) => reviewDateValue(b) - reviewDateValue(a));

    const totalRating = reviews.reduce((sum, review) => sum + Number(review.rating || 0), 0);
    const average = reviews.length ? totalRating / reviews.length : 0;
    if (avgEl) avgEl.innerHTML = reviews.length ? starsHtml(average) : starsHtml(0, true);
    if (countEl) {
        countEl.innerHTML = reviews.length
            ? `<span class="en-text">${reviews.length} customer notes</span><span class="ar-text">${reviews.length} رأي من الزبائن</span>`
            : `<span class="en-text">Be the first voice</span><span class="ar-text">كن أول تقييم</span>`;
    }

    const featured = reviews.slice(0, 6);
    if (!featured.length) {
        list.innerHTML = `
            <article class="home-review-empty">
                <i class="fas fa-star"></i>
                <strong class="en-text">Reviews will appear here after customers share their experience.</strong>
                <strong class="ar-text">التقييمات رح تظهر هون أول ما الزبائن يشاركوا تجربتهم.</strong>
            </article>
        `;
        return;
    }

    list.innerHTML = featured.map(review => {
        const product = window.zarinaProductsById?.[review.productId] || {};
        const productNameEn = product.nameEn || review.productNameEn || 'ZARINA product';
        const productNameAr = product.nameAr || review.productNameAr || 'منتج من زارينا';
        const customerName = review.customerName || 'ZARINA customer';
        return `
            <article class="home-review-card">
                <div class="home-review-top">
                    <div class="review-stars">${starsHtml(review.rating, true)}</div>
                    <span>${escapeHtml(customerName)}</span>
                </div>
                <p>${escapeHtml(review.text)}</p>
                <small>
                    <span class="en-text">${escapeHtml(productNameEn)}</span>
                    <span class="ar-text">${escapeHtml(productNameAr)}</span>
                </small>
            </article>
        `;
    }).join('');
}

window.zarinaReviewsByProduct = window.zarinaReviewsByProduct || {};
window.zarinaLatestReviews = window.zarinaLatestReviews || [];

const reviewsCollection = collection(db, "reviews");
onSnapshot(reviewsCollection, (snapshot) => {
    const grouped = {};
    const latest = [];
    snapshot.forEach(docSnap => {
        const review = { id: docSnap.id, ...docSnap.data() };
        if (!review.productId || review.isVisible === false) return;
        if (!grouped[review.productId]) grouped[review.productId] = [];
        grouped[review.productId].push(review);
        latest.push(review);
    });
    Object.keys(grouped).forEach(productId => {
        grouped[productId].sort((a, b) => reviewDateValue(b) - reviewDateValue(a));
    });
    window.zarinaReviewsByProduct = grouped;
    window.zarinaLatestReviews = latest.sort((a, b) => reviewDateValue(b) - reviewDateValue(a));
    renderProductRatingBadges();
    renderHomeReviewSection();
    renderProductStructuredData();
}, () => {
    renderHomeReviewSection();
});

function ensureProductModal() {
    let modal = document.getElementById('productDetailModal');
    if (modal) return modal;

    modal = document.createElement('div');
    modal.id = 'productDetailModal';
    modal.className = 'product-modal-overlay';
    modal.hidden = true;
    modal.innerHTML = `
      <div class="product-modal">
        <button class="product-modal-close" id="productModalClose"><i class="fas fa-times"></i></button>
        <div id="productModalBody"></div>
      </div>
    `;
    document.body.appendChild(modal);

    if (!document.getElementById('productModalStyles')) {
        const style = document.createElement('style');
        style.id = 'productModalStyles';
        style.textContent = `
          .product-card { cursor: pointer; }
          .product-modal-overlay { position: fixed; inset: 0; background: rgba(31,30,26,.66); backdrop-filter: blur(5px); z-index: 9998; display: none; align-items: flex-start; justify-content: center; overflow-y: auto; padding: 18px; scrollbar-width: none; }
          .product-modal-overlay[hidden] { display: none !important; pointer-events: none !important; visibility: hidden !important; }
          .product-modal-overlay.show { display: flex; }
          .product-modal-overlay::-webkit-scrollbar { display: none; }
          .product-modal { background: #FFFEF9; border: 1px solid #EADBC6; border-top: 5px solid var(--gold,#C6A43F); border-radius: 24px; width: min(1080px, 97vw); max-height: none; overflow: visible; position: relative; box-shadow: 0 28px 70px rgba(0,0,0,.28); margin: 0 auto; }
          .product-modal-close { position: sticky; top: 12px; float: inline-end; margin: 12px 12px -52px 0; width: 42px; height: 42px; border-radius: 50%; border: 1px solid #EADBC6; background: white; cursor: pointer; z-index: 3; box-shadow: 0 8px 20px rgba(31,30,26,.12); }
          .product-modal-grid { display: grid; grid-template-columns: minmax(300px, .88fr) minmax(0, 1.12fr); gap: 1.6rem; padding: 1.55rem; }
          .product-modal-img { width: 100%; aspect-ratio: 1; object-fit: cover; border-radius: 20px; border: 1px solid #EADBC6; box-shadow: 0 16px 34px rgba(31,30,26,.08); }
          .product-modal-title { color: var(--forest-green,#2F5D3A); font-size: clamp(1.8rem, 5vw, 2.6rem); margin: 0 0 .5rem; }
          .product-modal-desc { color: #5C594F; line-height: 1.7; margin-bottom: 1rem; }
          .product-modal-rating { align-items: center; background: linear-gradient(135deg, rgba(198,164,63,.18), #FCF8F0); border: 1px solid rgba(198,164,63,.55); border-radius: 999px; color: #6A6256; display: inline-flex; gap: 8px; margin-bottom: .8rem; padding: 9px 14px; font-weight: 900; box-shadow: 0 8px 18px rgba(198,164,63,.12); }
          .review-stars, .product-modal-rating, .product-rating-badge { color: var(--gold,#C6A43F); }
          .review-stars { display: inline-flex; gap: 3px; align-items: center; }
          .review-stars strong { color: var(--forest-green,#2F5D3A); margin-inline-start: 6px; }
          .variant-options { display: grid; gap: 10px; margin: 1rem 0; }
          .variant-option { display: flex; justify-content: space-between; align-items: center; gap: 10px; border: 1px solid #DCCFBC; background: white; border-radius: 14px; padding: 12px; cursor: pointer; font-family: inherit; text-align: inherit; transition: transform .18s ease, border-color .18s ease, box-shadow .18s ease; }
          .variant-option:hover { transform: translateY(-2px); border-color: rgba(198,164,63,.8); }
          .variant-option.active { border-color: var(--gold,#C6A43F); box-shadow: 0 0 0 2px rgba(198,164,63,.18), 0 10px 20px rgba(198,164,63,.13); }
          .variant-option[disabled] { opacity: .48; cursor: not-allowed; }
          .detail-qty { display: flex; align-items: center; gap: 10px; margin: 1rem 0; }
          .detail-qty button { width: 38px; height: 38px; border-radius: 50%; border: 1px solid #DCCFBC; background: white; cursor: pointer; font-weight: 900; }
          .detail-add { width: 100%; min-height: 50px; border: 0; border-radius: 999px; background: linear-gradient(135deg, var(--gold,#C6A43F), #AA862E); color: white; font-weight: 900; cursor: pointer; box-shadow: 0 12px 24px rgba(198,164,63,.22); }
          .detail-add:disabled { background: #bbb; cursor: not-allowed; }
          .product-reviews-panel { grid-column: 1 / -1; background: linear-gradient(135deg, #1F1E1A 0%, #2F5D3A 54%, #7B6A2D 100%); border: 1px solid rgba(198,164,63,.52); border-radius: 22px; box-shadow: inset 0 1px 0 rgba(255,254,249,.16), 0 18px 34px rgba(31,30,26,.16); overflow:hidden; padding: 1.15rem; position: relative; }
          .product-reviews-panel::before { background: radial-gradient(circle, rgba(255,254,249,.18), transparent 34%); content:''; height:220px; inset-inline-end:-70px; position:absolute; top:-90px; width:220px; }
          .product-reviews-head { display:flex; justify-content:space-between; gap:1rem; align-items:flex-start; margin-bottom: 1rem; position:relative; z-index:1; }
          .product-reviews-head h3 { color: #FFFEF9; margin: 0 0 .25rem; font-family: var(--font-ar,inherit); font-size: 1.22rem; }
          .product-reviews-head p { color: rgba(255,254,249,.78); margin:0; font-size:.94rem; line-height:1.65; max-width: 660px; }
          .product-reviews-head > .review-stars { background: rgba(255,254,249,.12); border:1px solid rgba(255,254,249,.18); border-radius:999px; color:#F2CE61; padding:10px 12px; white-space:nowrap; }
          .product-review-form { background: rgba(255,254,249,.12); border: 1px solid rgba(255,254,249,.2); border-radius: 18px; display:grid; grid-template-columns: minmax(160px,.8fr) minmax(190px,.85fr) auto; gap:10px; margin-bottom: 1rem; padding: .85rem; position:relative; z-index:1; }
          .review-prompt-strip { align-items:center; background: rgba(255,254,249,.1); border:1px solid rgba(255,254,249,.18); border-radius:14px; color: rgba(255,254,249,.86); display:flex; gap:10px; font-weight:800; grid-column: 1 / -1; line-height:1.5; padding:10px 12px; }
          .review-prompt-strip i { color:#F2CE61; }
          .product-review-form input, .product-review-form textarea { background: rgba(255,254,249,.96); border:1px solid rgba(234,219,198,.78); border-radius:13px; font-family:inherit; padding:12px 13px; }
          .product-review-form textarea { grid-column: 1 / 3; min-height: 86px; resize: vertical; }
          .rating-picker { align-items:center; background: rgba(255,254,249,.96); border:1px solid rgba(234,219,198,.78); border-radius:13px; display:flex; gap:2px; justify-content:center; padding: 0 8px; }
          .rating-picker button { background:none; border:0; color:#D2C2A9; cursor:pointer; font-size:1.3rem; padding:5px; transition: color .16s ease, transform .16s ease, filter .16s ease; }
          .rating-picker button.active, .rating-picker button:hover { color: #F2CE61; filter: drop-shadow(0 4px 8px rgba(242,206,97,.3)); transform: translateY(-2px) scale(1.08); }
          .submit-review-btn { align-self:stretch; background:#C6A43F; border:0; border-radius:13px; color:#1F1E1A; cursor:pointer; font-weight:900; padding:0 18px; transition: transform .18s ease, background .18s ease; }
          .submit-review-btn:hover { background:#F2CE61; transform: translateY(-2px); }
          .product-review-list { display:grid; gap:10px; grid-template-columns: repeat(2,minmax(0,1fr)); }
          .product-review-item { background: rgba(255,254,249,.96); border:1px solid rgba(234,219,198,.84); border-radius:16px; padding:13px; position:relative; z-index:1; transition: transform .18s ease, box-shadow .18s ease; }
          .product-review-item:hover { box-shadow: 0 12px 24px rgba(31,30,26,.16); transform: translateY(-3px); }
          .product-review-item p { color:#4A463E; line-height:1.65; margin:.45rem 0; }
          .product-review-item small { color:#7B7367; font-weight:800; }
          .product-rating-badge { align-items:center; display:inline-flex; gap:5px; font-size:.82rem; font-weight:900; margin-bottom:.5rem; }
          .product-rating-badge span { color:#6A6256; }
          @media (max-width: 720px) { .product-modal { width: 96vw; max-height: none; } .product-modal-grid { grid-template-columns: 1fr; padding: 1rem; } .product-modal-img { max-height: 320px; } .product-review-form, .product-review-list { grid-template-columns: 1fr; } .product-review-form textarea { grid-column: 1; } .submit-review-btn { min-height: 46px; } .product-reviews-head { flex-direction: column; } }
        `;
        document.head.appendChild(style);
    }

    function closeProductModal() {
        modal.classList.remove('show');
        modal.hidden = true;
        modal.dataset.productId = '';
        const modalBody = modal.querySelector('#productModalBody');
        if (modalBody) modalBody.innerHTML = '';
        document.body.style.overflow = '';
    }

    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeProductModal();
    });
    modal.querySelector('#productModalClose').addEventListener('click', closeProductModal);
    return modal;
}

function openProductDetail(productId) {
    const modalAlreadyOpen = document.getElementById('productDetailModal');
    if (modalAlreadyOpen?.classList.contains('show') && modalAlreadyOpen.dataset.productId === String(productId)) return;

    const product = window.zarinaProductsById?.[productId];
    if (!product) return;

    const variants = getProductVariants(product);
    let selectedIndex = variants.findIndex(v => v.status !== 'out_of_stock');
    if (selectedIndex < 0) selectedIndex = 0;
    let qty = 1;

    const modal = ensureProductModal();
    modal.hidden = false;
    modal.dataset.productId = String(productId);
    const body = modal.querySelector('#productModalBody');
    const nameEn = product.nameEn || product.name || 'Unnamed';
    const nameAr = product.nameAr || product.name || 'بدون اسم';
    const descEn = product.longDescEn || product.descEn || product.description || '';
    const descAr = product.longDescAr || product.descAr || product.description || '';

    function render() {
        const selected = variants[selectedIndex];
        const unavailable = selected.status === 'out_of_stock';
        const reviewStats = getProductReviewStats(productId);
        const recentReviews = reviewStats.reviews.slice(0, 4);
        body.innerHTML = `
          <div class="product-modal-grid">
            <img class="product-modal-img" src="${escapeAttribute(product.imageUrl || 'https://placehold.co/700x700?text=ZARINA')}" alt="${escapeAttribute(nameEn)} - ${escapeAttribute(nameAr)}" loading="eager" decoding="async">
            <div>
              <h2 class="product-modal-title"><span class="en-text">${escapeAttribute(nameEn)}</span><span class="ar-text">${escapeAttribute(nameAr)}</span></h2>
              <div class="product-modal-rating">
                <span class="review-stars">${starsHtml(reviewStats.average, true)}</span>
                <span>
                  ${reviewStats.count
                    ? `<span class="en-text">${reviewStats.average.toFixed(1)} from ${reviewStats.count} reviews</span><span class="ar-text">${reviewStats.average.toFixed(1)} من ${reviewStats.count} تقييم</span>`
                    : `<span class="en-text">No reviews yet</span><span class="ar-text">لسا ما في تقييمات</span>`}
                </span>
              </div>
              <p class="product-modal-desc"><span class="en-text">${escapeAttribute(descEn)}</span><span class="ar-text">${escapeAttribute(descAr)}</span></p>
              <div class="variant-options">
                ${variants.map((variant, index) => `
                  <button type="button" class="variant-option ${index === selectedIndex ? 'active' : ''}" data-index="${index}" ${variant.status === 'out_of_stock' ? 'disabled' : ''}>
                    <strong>${escapeAttribute(variant.label)}</strong>
                    <span>
                      ${parseFloat(variant.price).toFixed(2)} JD
                      ${variant.oldPrice && parseFloat(variant.oldPrice) > parseFloat(variant.price) ? `<del style="color:#9B9487; margin-inline-start:6px;">${parseFloat(variant.oldPrice).toFixed(2)} JD</del>` : ''}
                      ${variant.status === 'out_of_stock' ? '· No stock' : ''}
                    </span>
                  </button>
                `).join('')}
              </div>
              <div class="detail-qty">
                <button type="button" id="detailQtyMinus">-</button>
                <strong id="detailQtyValue">${qty}</strong>
                <button type="button" id="detailQtyPlus">+</button>
              </div>
              <button class="detail-add" id="detailAddBtn" ${unavailable ? 'disabled' : ''}>
                <span class="en-text">Add selected option</span>
                <span class="ar-text">إضافة الخيار للسلة</span>
              </button>
            </div>
            <div class="product-reviews-panel">
              <div class="product-reviews-head">
                <div>
                  <h3><span class="en-text">Customer ritual notes</span><span class="ar-text">ملاحظات وتجارب الزبائن</span></h3>
                  <p><span class="en-text">Rate the texture, scent, and your honest experience.</span><span class="ar-text">قيّم القوام والرائحة والتجربة بصراحة، عشان تساعد غيرك يختار بثقة.</span></p>
                </div>
                <div class="review-stars">${starsHtml(reviewStats.average)}</div>
              </div>
              <form class="product-review-form" id="productReviewForm">
                <div class="review-prompt-strip">
                  <i class="fas fa-star"></i>
                  <span class="en-text">Your note helps the next customer choose the right size and texture.</span>
                  <span class="ar-text">ملاحظتك بتساعد الزبون اللي بعدك يختار الحجم والقوام المناسب.</span>
                </div>
                <input type="text" id="reviewerName" maxlength="40" placeholder="اسمك / Your name" required>
                <div class="rating-picker" id="ratingPicker" aria-label="Rating">
                  ${[1,2,3,4,5].map(star => `<button type="button" data-rating="${star}" aria-label="${star} stars"><i class="fas fa-star"></i></button>`).join('')}
                </div>
                <button type="submit" class="submit-review-btn"><span class="en-text">Send</span><span class="ar-text">إرسال</span></button>
                <textarea id="reviewText" maxlength="420" placeholder="اكتب تجربتك مع المنتج... / Write your experience..." required></textarea>
              </form>
              <div class="product-review-list">
                ${recentReviews.length ? recentReviews.map(review => `
                  <article class="product-review-item">
                    <div class="review-stars">${starsHtml(review.rating, true)}</div>
                    <p>${escapeHtml(review.text || '')}</p>
                    <small>${escapeHtml(review.customerName || 'ZARINA customer')}</small>
                  </article>
                `).join('') : `
                  <article class="product-review-item">
                    <div class="review-stars">${starsHtml(0, true)}</div>
                    <p><span class="en-text">Be the first to leave a note for this product.</span><span class="ar-text">كن أول شخص يترك تجربة لهالمنتج.</span></p>
                    <small>ZARINA</small>
                  </article>
                `}
              </div>
            </div>
          </div>
        `;
        body.querySelectorAll('.variant-option').forEach(btn => {
            btn.addEventListener('click', () => {
                selectedIndex = parseInt(btn.dataset.index, 10);
                render();
            });
        });
        body.querySelector('#detailQtyMinus').addEventListener('click', () => { qty = Math.max(1, qty - 1); render(); });
        body.querySelector('#detailQtyPlus').addEventListener('click', () => { qty += 1; render(); });
        body.querySelector('#detailAddBtn').addEventListener('click', () => {
            const variant = variants[selectedIndex];
            window.addToCart({
                id: `${productId}__${variant.id || variant.label}`,
                nameEn,
                nameAr,
                price: parseFloat(variant.price),
                quantity: qty,
                img: product.imageUrl,
                variantLabel: variant.label
            });
            modal.classList.remove('show');
            document.body.style.overflow = '';
        });

        let selectedRating = 5;
        const ratingButtons = body.querySelectorAll('#ratingPicker button');
        const paintStars = () => {
            ratingButtons.forEach(btn => btn.classList.toggle('active', Number(btn.dataset.rating) <= selectedRating));
        };
        ratingButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                selectedRating = Number(btn.dataset.rating) || 5;
                paintStars();
            });
        });
        paintStars();

        body.querySelector('#productReviewForm')?.addEventListener('submit', async (event) => {
            event.preventDefault();
            const form = event.currentTarget;
            const submitBtn = form.querySelector('.submit-review-btn');
            const customerName = sanitizePlainText(form.querySelector('#reviewerName')?.value, 40);
            const text = sanitizePlainText(form.querySelector('#reviewText')?.value, 420);
            const safeRating = Math.min(5, Math.max(1, parseInt(selectedRating, 10) || 5));
            if (customerName.length < 2 || text.length < 5) return;

            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            let reviewSaved = false;
            try {
                const optimisticReview = {
                    productId,
                    productNameEn: nameEn,
                    productNameAr: nameAr,
                    customerName,
                    text,
                    rating: safeRating,
                    isVisible: true,
                    showOnHome: true,
                    createdAt: new Date().toISOString()
                };
                await addDoc(reviewsCollection, {
                    ...optimisticReview,
                    createdAt: serverTimestamp()
                });
                window.zarinaReviewsByProduct = window.zarinaReviewsByProduct || {};
                window.zarinaLatestReviews = window.zarinaLatestReviews || [];
                window.zarinaReviewsByProduct[productId] = [optimisticReview, ...(window.zarinaReviewsByProduct[productId] || [])];
                window.zarinaLatestReviews = [optimisticReview, ...(window.zarinaLatestReviews || [])];
                showToast('<span class="en-text">Review added. Thank you.</span><span class="ar-text">وصل تقييمك، شكراً إلك.</span>');
                renderProductRatingBadges();
                renderHomeReviewSection();
                reviewSaved = true;
            } catch (error) {
                console.error('Review save error:', error);
                showToast('<span class="en-text">Could not save review.</span><span class="ar-text">ما قدرنا نحفظ التقييم حالياً.</span>');
            } finally {
                if (reviewSaved) {
                    render();
                } else if (submitBtn?.isConnected) {
                    submitBtn.disabled = false;
                submitBtn.innerHTML = '<span class="en-text">Send</span><span class="ar-text">إرسال</span>';
                }
            }
        });
    }

    try {
        render();
    } catch (error) {
        console.error('Product detail render error:', error, { productId, product });
        modal.classList.remove('show');
        modal.hidden = true;
        document.body.style.overflow = '';
        showToast('<span class="en-text">Could not open product details.</span><span class="ar-text">ما قدرنا نفتح تفاصيل المنتج حالياً.</span>');
        return;
    }
    modal.classList.add('show');
    document.body.style.overflow = 'hidden';
}

window.openProductDetail = openProductDetail;

function bindProductDetailDelegation() {
    if (window.zarinaProductDetailDelegationBound) return;
    window.zarinaProductDetailDelegationBound = true;

    document.addEventListener('click', (event) => {
        const trigger = event.target.closest('.firecart-btn, .collection-add-btn, .product-card');
        if (!trigger) return;
        if (trigger.closest('#productDetailModal') || trigger.closest('.cart-sidebar')) return;

        const productId = trigger.dataset.id || trigger.dataset.productId;
        if (!productId) return;

        event.preventDefault();
        openProductDetail(productId);
    });

    document.addEventListener('keydown', (event) => {
        if (!['Enter', ' '].includes(event.key)) return;
        const card = event.target.closest('.product-card[data-product-id]');
        if (!card || event.target.closest('button, a, input, textarea, select')) return;
        event.preventDefault();
        openProductDetail(card.dataset.productId);
    });

    document.addEventListener('error', (event) => {
        const image = event.target;
        if (!(image instanceof HTMLImageElement)) return;
        if (!image.classList.contains('product-img') && !image.classList.contains('product-modal-img') && !image.classList.contains('collection-tab-img') && !image.classList.contains('stage-image')) return;
        if (image.dataset.fallbackApplied === 'true') return;
        image.dataset.fallbackApplied = 'true';
        image.src = 'https://placehold.co/700x700?text=ZARINA';
    }, true);
}

bindProductDetailDelegation();

function initCatalogSearch() {
    const productsContainer = document.getElementById('products-container');
    const searchInput = document.getElementById('catalogSearchInput');
    const sortSelect = document.getElementById('catalogSortSelect');
    const filterButtons = document.querySelectorAll('.catalog-filter-btn');
    const resultCount = document.getElementById('catalogResultCount');
    const noResults = document.getElementById('catalogNoResults');

    if (!productsContainer || !searchInput) return;

    let activeFilter = 'all';

    function applyCatalogFilters() {
        const query = cleanCatalogText(searchInput.value);
        const sortValue = sortSelect ? sortSelect.value : 'featured';
        const cards = Array.from(productsContainer.querySelectorAll('.product-card'));
        let visibleCount = 0;

        const sortedCards = [...cards].sort((a, b) => {
            if (sortValue === 'price-asc') {
                return parseFloat(a.dataset.price || '0') - parseFloat(b.dataset.price || '0');
            }
            if (sortValue === 'price-desc') {
                return parseFloat(b.dataset.price || '0') - parseFloat(a.dataset.price || '0');
            }
            if (sortValue === 'name-asc') {
                return (a.dataset.name || '').localeCompare(b.dataset.name || '', document.documentElement.lang || 'ar');
            }
            return parseInt(a.dataset.index || '0', 10) - parseInt(b.dataset.index || '0', 10);
        });

        sortedCards.forEach(card => productsContainer.appendChild(card));

        sortedCards.forEach(card => {
            const searchText = cleanCatalogText(card.dataset.search);
            const tags = cleanCatalogText(card.dataset.tags);
            const matchesSearch = !query || searchText.includes(query);
            const matchesFilter = activeFilter === 'all' || tags.includes(activeFilter);
            const isVisible = matchesSearch && matchesFilter;

            card.style.display = isVisible ? '' : 'none';
            if (isVisible) visibleCount++;
        });

        if (resultCount) {
            resultCount.textContent = document.documentElement.lang === 'ar'
                ? `${visibleCount} / ${cards.length} منتج`
                : `${visibleCount} / ${cards.length} products`;
        }

        if (noResults) noResults.classList.toggle('show', visibleCount === 0 && cards.length > 0);
    }

    searchInput.addEventListener('input', applyCatalogFilters);
    if (sortSelect) sortSelect.addEventListener('change', applyCatalogFilters);

    filterButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            filterButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            activeFilter = cleanCatalogText(button.dataset.filter || 'all');
            applyCatalogFilters();
        });
    });

    applyCatalogFilters();
}

function loadProducts() {
    const productsContainer = document.getElementById('products-container'); 
    if(!productsContainer) return;

    productsContainer.innerHTML = `
        <div class="catalog-no-results show" style="display:block; grid-column: 1 / -1;">
            <i class="fas fa-spinner fa-spin"></i>
            <span class="en-text">Loading products...</span>
            <span class="ar-text">جاري تحميل المنتجات...</span>
        </div>
    `;

    const productsCollection = collection(db, "products");

    onSnapshot(productsCollection, (querySnapshot) => {
        
        let htmlString = '';
        let index = 0; 
        
        querySnapshot.forEach((docSnap) => {
            const product = docSnap.data();
            
            if (product.isVisible === false) return; 
            window.zarinaProductsById[docSnap.id] = { id: docSnap.id, ...product };
            
            const nameEn = product.nameEn || product.name || 'Unnamed';
            const nameAr = product.nameAr || product.name || 'بدون اسم';
            const imageAlt = `${nameEn} - ${nameAr} | ZARINA natural product`;
            const descEn = product.descEn || product.description || '';
            const descAr = product.descAr || product.description || '';
            const catEn = product.categoryEn || product.category || 'RAW INGREDIENTS';
            const catAr = product.categoryAr || product.category || 'مكونات خام';
            
            const tagsArray = product.tags || []; 
            const tagsString = tagsArray.join(' ').toLowerCase(); 
            const variants = getProductVariants(product);
            const displayPrice = Math.min(...variants.map(v => parseFloat(v.price || product.price || 0)));
            const saleVariants = variants.filter(v => v.oldPrice && parseFloat(v.oldPrice) > parseFloat(v.price));
            const hasSale = saleVariants.length > 0 || (product.oldPrice && parseFloat(product.oldPrice) > parseFloat(product.price));
            const searchableText = [
                nameEn,
                nameAr,
                descEn,
                descAr,
                catEn,
                catAr,
                tagsArray.join(' ')
            ].join(' ').toLowerCase();
            const filterTags = [
                tagsString,
                cleanCatalogText(catEn),
                cleanCatalogText(catAr),
                hasSale ? 'sale تخفيض' : ''
            ].join(' ');
            
            let tagsHtml = '';
            if (tagsArray.length > 0) {
                tagsHtml = '<div class="product-tags">';
                tagsArray.forEach(tag => {
                    let arTag = tag.toLowerCase() === 'skin' ? 'بشرة' : tag.toLowerCase() === 'hair' ? 'شعر' : tag.toLowerCase() === 'relaxation' ? 'استرخاء' : tag;
                    tagsHtml += `
                        <span class="tag-badge">
                            <span class="en-text">${tag}</span>
                            <span class="ar-text">${arTag}</span>
                        </span>
                    `;
                });
                tagsHtml += '</div>';
            }

            // --- معالجة عرض السعر والخصم ---
            let priceHtml = '';
            let saleBadgeHtml = ''; // شريط الخصم على الصورة
            
            if (saleVariants.length > 0) {
                const lowestSale = saleVariants.reduce((best, item) => parseFloat(item.price) < parseFloat(best.price) ? item : best, saleVariants[0]);
                priceHtml = `
                    <div class="price" style="display: flex; align-items: center; gap: 8px;">
                        <span style="color: var(--forest-green, #2F5D3A); font-weight: bold;">${parseFloat(lowestSale.price).toFixed(2)} JD</span>
                        <del style="color: #A09E98; font-size: 0.9rem;">${parseFloat(lowestSale.oldPrice).toFixed(2)} JD</del>
                    </div>
                `;
                saleBadgeHtml = `
                    <div style="position: absolute; top: 10px; right: 10px; background: #C6A43F; color: white; padding: 4px 10px; font-size: 0.8rem; border-radius: 12px; font-weight: bold; z-index: 2;">
                        <span class="en-text">SALE</span>
                        <span class="ar-text">تخفيض</span>
                    </div>
                `;
            } else if (hasSale) {
                // إذا كان فيه خصم، اعرض السعر القديم مشطوب وجنبه السعر الجديد
                priceHtml = `
                    <div class="price" style="display: flex; align-items: center; gap: 8px;">
                        <span style="color: var(--forest-green, #2F5D3A); font-weight: bold;">${product.price} JD</span>
                        <del style="color: #A09E98; font-size: 0.9rem;">${product.oldPrice} JD</del>
                    </div>
                `;
                // إضافة شريط "Sale" أو "تخفيض" فوق صورة المنتج
                saleBadgeHtml = `
                    <div style="position: absolute; top: 10px; right: 10px; background: #C6A43F; color: white; padding: 4px 10px; font-size: 0.8rem; border-radius: 12px; font-weight: bold; z-index: 2;">
                        <span class="en-text">SALE</span>
                        <span class="ar-text">تخفيض</span>
                    </div>
                `;
            } else {
                // إذا مافي خصم، اعرض السعر العادي
                priceHtml = `<div class="price">${displayPrice.toFixed(2)} JD</div>`;
            }

            htmlString += `
                <div class="product-card" id="product-${escapeAttribute(docSnap.id)}" role="button" tabindex="0" aria-label="${escapeAttribute(`Open ${nameEn} product details`)}" data-product-id="${docSnap.id}" data-index="${index}" data-price="${escapeAttribute(displayPrice)}" data-name="${escapeAttribute(nameEn)}" data-tags="${escapeAttribute(filterTags)}" data-search="${escapeAttribute(searchableText)}" style="animation-delay: ${index * 0.05}s; position: relative;">
                    ${saleBadgeHtml}
                    <img class="product-img" src="${escapeAttribute(product.imageUrl || 'https://placehold.co/600x420?text=ZARINA')}" alt="${escapeAttribute(imageAlt)}" loading="lazy" decoding="async">
                    <div class="product-info">
                        
                        <div class="product-title">
                            <span class="en-text">${nameEn}</span>
                            <span class="ar-text">${nameAr}</span>
                        </div>
                        
                        <div class="product-category" style="color: #C6A43F; font-size: 0.75rem; font-weight: 600; letter-spacing: 1.5px; margin-top: 0.2rem; margin-bottom: 0.8rem;">
                            <span class="en-text">${catEn.toUpperCase()}</span>
                            <span class="ar-text">${catAr}</span>
                        </div>
                        
                        ${tagsHtml}
                        <div class="product-rating-badge" data-product-id="${docSnap.id}">
                            <i class="far fa-star"></i>
                            <span class="en-text">New</span>
                            <span class="ar-text">جديد</span>
                        </div>
                        
                        <div class="product-desc">
                            <span class="en-text">${descEn}</span>
                            <span class="ar-text">${descAr}</span>
                        </div>
                        
                        ${priceHtml}
                        
                        <button class="add-to-cart firecart-btn" data-id="${docSnap.id}" data-name-en="${nameEn}" data-name-ar="${nameAr}" data-price="${product.price}" data-img="${product.imageUrl}">
                            <i class="fas fa-shopping-bag"></i> 
                            <span class="en-text">Choose size</span>
                            <span class="ar-text">اختار الكمية</span>
                        </button>
                    </div>
                </div>
            `;
            index++;
        });

        productsContainer.innerHTML = htmlString;
        renderProductRatingBadges();
        renderHomeReviewSection();
        renderProductStructuredData();

        const addBtns = productsContainer.querySelectorAll('.firecart-btn');
        addBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                openProductDetail(btn.getAttribute('data-id'));
            });
        });

        productsContainer.querySelectorAll('.product-card').forEach(card => {
            card.addEventListener('click', () => openProductDetail(card.dataset.productId));
        });

        initCatalogSearch();

    }, (error) => {
        console.error("خطأ في جلب المنتجات:", error);
        productsContainer.innerHTML = `
            <div class="catalog-no-results show" style="display:block; grid-column: 1 / -1;">
                <span class="en-text">Could not load products. Please try again.</span>
                <span class="ar-text">تعذر تحميل المنتجات، حاول مرة ثانية.</span>
            </div>
        `;
    });
}

// تشغيل الدوال عند تحميل الصفحة
recordVisit();
listenToVisitorCount();
listenAnnouncementBar();
loadProducts();
