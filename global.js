// ========== GLOBAL.JS ==========

(function() {
  document.addEventListener('DOMContentLoaded', function() {
    
    // ---------- 0. LANGUAGE TOGGLE LOGIC ----------
    const langToggle = document.getElementById('langToggle');
    let currentLang = localStorage.getItem('zarinaLang') || 'ar'; // خلينا العربي الأساسي
    document.documentElement.lang = currentLang;

    if (langToggle) {
      langToggle.addEventListener('click', () => {
        currentLang = currentLang === 'en' ? 'ar' : 'en';
        localStorage.setItem('zarinaLang', currentLang);
        document.documentElement.lang = currentLang;
      });
    }

    // ---------- 1. MOBILE HAMBURGER MENU ----------
    const hamburger = document.querySelector('.hamburger');
    const navLinks = document.querySelector('.nav-links');
    if (hamburger && navLinks) {
      hamburger.addEventListener('click', function(e) {
        e.stopPropagation();
        navLinks.classList.toggle('open');
      });
      navLinks.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
          navLinks.classList.remove('open');
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

    function openCart() {
      if (cartSidebarElem) cartSidebarElem.classList.add('open');
      if (cartOverlay) cartOverlay.classList.add('active');
      document.body.style.overflow = 'hidden';
      renderCartSidebar();
    }

    function closeCart() {
      if (cartSidebarElem) cartSidebarElem.classList.remove('open');
      if (cartOverlay) cartOverlay.classList.remove('active');
      document.body.style.overflow = '';
    }

    if (cartIcon) cartIcon.addEventListener('click', openCart);
    if (closeCartBtn) closeCartBtn.addEventListener('click', closeCart);
    if (cartOverlay) cartOverlay.addEventListener('click', closeCart);

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
  });
})();

// ==========================================
// ========== FIREBASE INTEGRATION ==========
// ==========================================

import { app } from './firebase-config.js';
import { getFirestore, collection, getDocs, doc, updateDoc, increment, onSnapshot } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js";

const db = getFirestore(app);
window.zarinaProductsById = window.zarinaProductsById || {};

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
        status: 'in_stock'
    }];
}

function ensureProductModal() {
    let modal = document.getElementById('productDetailModal');
    if (modal) return modal;

    modal = document.createElement('div');
    modal.id = 'productDetailModal';
    modal.className = 'product-modal-overlay';
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
          .product-modal-overlay { position: fixed; inset: 0; background: rgba(31,30,26,.62); backdrop-filter: blur(4px); z-index: 9998; display: none; align-items: center; justify-content: center; padding: 18px; }
          .product-modal-overlay.show { display: flex; }
          .product-modal { background: #FFFEF9; border: 1px solid #EADBC6; border-top: 5px solid var(--gold,#C6A43F); border-radius: 22px; width: min(920px, 96vw); max-height: 92dvh; overflow: auto; position: relative; box-shadow: 0 24px 60px rgba(0,0,0,.25); }
          .product-modal-close { position: absolute; top: 12px; inset-inline-end: 12px; width: 40px; height: 40px; border-radius: 50%; border: 1px solid #EADBC6; background: white; cursor: pointer; z-index: 2; }
          .product-modal-grid { display: grid; grid-template-columns: minmax(260px, .9fr) minmax(0, 1fr); gap: 1.4rem; padding: 1.4rem; }
          .product-modal-img { width: 100%; aspect-ratio: 1; object-fit: cover; border-radius: 18px; border: 1px solid #EADBC6; }
          .product-modal-title { color: var(--forest-green,#2F5D3A); font-size: clamp(1.8rem, 5vw, 2.6rem); margin: 0 0 .5rem; }
          .product-modal-desc { color: #5C594F; line-height: 1.7; margin-bottom: 1rem; }
          .variant-options { display: grid; gap: 10px; margin: 1rem 0; }
          .variant-option { display: flex; justify-content: space-between; align-items: center; gap: 10px; border: 1px solid #DCCFBC; background: white; border-radius: 14px; padding: 12px; cursor: pointer; font-family: inherit; text-align: inherit; }
          .variant-option.active { border-color: var(--gold,#C6A43F); box-shadow: 0 0 0 2px rgba(198,164,63,.18); }
          .variant-option[disabled] { opacity: .48; cursor: not-allowed; }
          .detail-qty { display: flex; align-items: center; gap: 10px; margin: 1rem 0; }
          .detail-qty button { width: 38px; height: 38px; border-radius: 50%; border: 1px solid #DCCFBC; background: white; cursor: pointer; font-weight: 900; }
          .detail-add { width: 100%; min-height: 48px; border: 0; border-radius: 999px; background: var(--gold,#C6A43F); color: white; font-weight: 900; cursor: pointer; }
          .detail-add:disabled { background: #bbb; cursor: not-allowed; }
          @media (max-width: 720px) { .product-modal-grid { grid-template-columns: 1fr; padding: 1rem; } .product-modal-img { max-height: 320px; } }
        `;
        document.head.appendChild(style);
    }

    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.classList.remove('show');
    });
    modal.querySelector('#productModalClose').addEventListener('click', () => modal.classList.remove('show'));
    return modal;
}

function openProductDetail(productId) {
    const product = window.zarinaProductsById?.[productId];
    if (!product) return;

    const variants = getProductVariants(product);
    let selectedIndex = variants.findIndex(v => v.status !== 'out_of_stock');
    if (selectedIndex < 0) selectedIndex = 0;
    let qty = 1;

    const modal = ensureProductModal();
    const body = modal.querySelector('#productModalBody');
    const nameEn = product.nameEn || product.name || 'Unnamed';
    const nameAr = product.nameAr || product.name || 'بدون اسم';
    const descEn = product.longDescEn || product.descEn || product.description || '';
    const descAr = product.longDescAr || product.descAr || product.description || '';

    function render() {
        const selected = variants[selectedIndex];
        const unavailable = selected.status === 'out_of_stock';
        body.innerHTML = `
          <div class="product-modal-grid">
            <img class="product-modal-img" src="${escapeAttribute(product.imageUrl || 'https://placehold.co/700x700?text=ZARINA')}" alt="">
            <div>
              <h2 class="product-modal-title"><span class="en-text">${escapeAttribute(nameEn)}</span><span class="ar-text">${escapeAttribute(nameAr)}</span></h2>
              <p class="product-modal-desc"><span class="en-text">${escapeAttribute(descEn)}</span><span class="ar-text">${escapeAttribute(descAr)}</span></p>
              <div class="variant-options">
                ${variants.map((variant, index) => `
                  <button type="button" class="variant-option ${index === selectedIndex ? 'active' : ''}" data-index="${index}" ${variant.status === 'out_of_stock' ? 'disabled' : ''}>
                    <strong>${escapeAttribute(variant.label)}</strong>
                    <span>${parseFloat(variant.price).toFixed(2)} JD ${variant.status === 'out_of_stock' ? '· No stock' : ''}</span>
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
        });
    }

    render();
    modal.classList.add('show');
}

window.openProductDetail = openProductDetail;

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

async function loadProducts() {
    try {
        const productsCollection = collection(db, "products");
        const querySnapshot = await getDocs(productsCollection);
        
        const productsContainer = document.getElementById('products-container'); 
        if(!productsContainer) return;
        
        let htmlString = '';
        let index = 0; 
        
        querySnapshot.forEach((docSnap) => {
            const product = docSnap.data();
            
            if (product.isVisible === false) return; 
            window.zarinaProductsById[docSnap.id] = { id: docSnap.id, ...product };
            
            const nameEn = product.nameEn || product.name || 'Unnamed';
            const nameAr = product.nameAr || product.name || 'بدون اسم';
            const descEn = product.descEn || product.description || '';
            const descAr = product.descAr || product.description || '';
            const catEn = product.categoryEn || product.category || 'RAW INGREDIENTS';
            const catAr = product.categoryAr || product.category || 'مكونات خام';
            
            const tagsArray = product.tags || []; 
            const tagsString = tagsArray.join(' ').toLowerCase(); 
            const hasSale = product.oldPrice && parseFloat(product.oldPrice) > parseFloat(product.price);
            const variants = getProductVariants(product);
            const displayPrice = Math.min(...variants.map(v => parseFloat(v.price || product.price || 0)));
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
            
            if (hasSale) {
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
                <div class="product-card" data-product-id="${docSnap.id}" data-index="${index}" data-price="${escapeAttribute(displayPrice)}" data-name="${escapeAttribute(nameEn)}" data-tags="${escapeAttribute(filterTags)}" data-search="${escapeAttribute(searchableText)}" style="animation-delay: ${index * 0.05}s; position: relative;">
                    ${saleBadgeHtml}
                    <img class="product-img" src="${product.imageUrl}" alt="product img" loading="lazy">
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

    } catch (error) {
        console.error("خطأ في جلب المنتجات:", error);
    }
}

// تشغيل الدوال عند تحميل الصفحة
recordVisit();
listenToVisitorCount();
loadProducts();
