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
        if (totalSpan) totalSpan.innerText = '$0.00';
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
              <div class="cart-item-price">$${item.price}</div>
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
      if (totalSpan) totalSpan.innerText = `$${total.toFixed(2)}`;

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
        existing.quantity += 1;
      } else {
        cart.push({
          id: product.id,
          nameEn: product.nameEn,
          nameAr: product.nameAr,
          price: product.price,
          quantity: 1,
          img: product.img || 'https://placehold.co/60x60?text=herb'
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
            
            // 🔥 هاد هو السطر السحري: إذا المنتج مخفي، تجاوزه وكمل للبعده
            if (product.isVisible === false) return; 
            
            // قراءة القيم باللغتين مع وجود قيمة احتياطية لو لسه مش معدلين بالفايربيس
            const nameEn = product.nameEn || product.name || 'Unnamed';
            const nameAr = product.nameAr || product.name || 'بدون اسم';
            const descEn = product.descEn || product.description || '';
            const descAr = product.descAr || product.description || '';
            const catEn = product.categoryEn || product.category || 'RAW INGREDIENTS';
            const catAr = product.categoryAr || product.category || 'مكونات خام';
            
            // تجهيز التاجات من الفايربيس (skin, hair, relaxation)
            const tagsArray = product.tags || []; 
            const tagsString = tagsArray.join(' ').toLowerCase(); // عشان نربطها بـ data-tags للفلتر
            
            // بناء كود الـ HTML للتاجات الصغيرة (الفقاعات)
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

            // ضفنا الـ data-tags جوا الديف الرئيسي للكرت
            htmlString += `
                <div class="product-card" data-tags="${tagsString}" style="animation-delay: ${index * 0.05}s">
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
                        
                        <div class="price">$${product.price}</div>
                        
                        <button class="add-to-cart firecart-btn" data-id="${docSnap.id}" data-name-en="${nameEn}" data-name-ar="${nameAr}" data-price="${product.price}" data-img="${product.imageUrl}">
                            <i class="fas fa-shopping-bag"></i> 
                            <span class="en-text">Add to cart</span>
                            <span class="ar-text">ضيف للسلة</span>
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
                // نمرر الاسمين لدالة السلة عشان تتذكرهم وتترجمهم
                window.addToCart({
                    id: btn.getAttribute('data-id'),
                    nameEn: btn.getAttribute('data-name-en'),
                    nameAr: btn.getAttribute('data-name-ar'),
                    price: parseFloat(btn.getAttribute('data-price')),
                    img: btn.getAttribute('data-img')
                });
            });
        });

    } catch (error) {
        console.error("خطأ في جلب المنتجات:", error);
    }
}

// تشغيل الدوال عند تحميل الصفحة
recordVisit();
listenToVisitorCount();
loadProducts();