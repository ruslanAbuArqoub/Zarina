// ========== GLOBAL.JS ==========
// This script must be included on every page (after the DOM is ready).
// It handles mobile menu, global cart (localStorage), slide‑out cart UI, badge count.

(function() {
  // Wait for DOM content to be fully loaded
  document.addEventListener('DOMContentLoaded', function() {
    // ---------- 1. MOBILE HAMBURGER MENU ----------
    const hamburger = document.querySelector('.hamburger');
    const navLinks = document.querySelector('.nav-links');
    if (hamburger && navLinks) {
      hamburger.addEventListener('click', function(e) {
        e.stopPropagation();
        navLinks.classList.toggle('open');
      });
      // Close menu when a link is clicked (optional)
      navLinks.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
          navLinks.classList.remove('open');
        });
      });
    }

    // ---------- 2. GLOBAL CART STATE & localStorage ----------
    let cart = [];
    const STORAGE_KEY = 'zarinaCart';

    // Helper: save cart to localStorage
    function saveCart() {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
    }

    // Load cart from localStorage
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
      renderCartSidebar();    // update the cart UI if sidebar exists
    }

    // Update the cart badge (number of items) in the header
    function updateCartBadge() {
      const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
      const badge = document.getElementById('cartCountBadge');
      if (badge) badge.innerText = totalItems;
    }

    // Render the cart sidebar items (if the sidebar exists on this page)
    function renderCartSidebar() {
      const container = document.getElementById('cartItemsContainer');
      if (!container) return;   // no cart sidebar on this page

      if (cart.length === 0) {
        container.innerHTML = `<div class="empty-cart-msg"><i class="fas fa-seedling"></i> Your cart is empty, dear one.</div>`;
        const totalSpan = document.getElementById('cartTotalPrice');
        if (totalSpan) totalSpan.innerText = '$0.00';
        return;
      }

      let itemsHtml = '';
      let total = 0;
      cart.forEach(item => {
        const itemTotal = item.price * item.quantity;
        total += itemTotal;
        // fallback image if product not found in catalog (we use a placeholder)
        const imgSrc = item.img || 'https://placehold.co/60x60?text=oil';
        itemsHtml += `
          <div class="cart-item" data-id="${item.id}">
            <img src="${imgSrc}" class="cart-item-img" alt="${item.name}">
            <div class="cart-item-details">
              <div class="cart-item-name">${escapeHtml(item.name)}</div>
              <div class="cart-item-price">$${item.price}</div>
              <div class="cart-qty">
                <button class="qty-btn" data-id="${item.id}" data-delta="-1">-</button>
                <span>${item.quantity}</span>
                <button class="qty-btn" data-id="${item.id}" data-delta="1">+</button>
                <button class="remove-item" data-id="${item.id}">remove</button>
              </div>
            </div>
          </div>
        `;
      });
      container.innerHTML = itemsHtml;
      const totalSpan = document.getElementById('cartTotalPrice');
      if (totalSpan) totalSpan.innerText = `$${total.toFixed(2)}`;

      // attach event listeners for quantity buttons and remove buttons
      document.querySelectorAll('.qty-btn').forEach(btn => {
        btn.removeEventListener('click', handleQtyClick);
        btn.addEventListener('click', handleQtyClick);
      });
      document.querySelectorAll('.remove-item').forEach(btn => {
        btn.removeEventListener('click', handleRemoveClick);
        btn.addEventListener('click', handleRemoveClick);
      });
    }

    // Helper to sanitize text (prevent XSS)
    function escapeHtml(str) {
      return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
      });
    }

    // Quantity button handler
    function handleQtyClick(e) {
      const btn = e.currentTarget;
      const productId = parseInt(btn.dataset.id);
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
        showToast(delta > 0 ? 'Quantity increased' : 'Item removed');
      }
    }

    function removeFromCart(productId) {
      cart = cart.filter(i => i.id !== productId);
      saveCart();
      updateCartBadge();
      renderCartSidebar();
      showToast('Item removed');
    }

    function handleRemoveClick(e) {
      const btn = e.currentTarget;
      const productId = parseInt(btn.dataset.id);
      removeFromCart(productId);
    }

    // Add to cart function (called from product pages)
    window.addToCart = function(product) {
      // product must have id, name, price, optionally img
      const existing = cart.find(i => i.id === product.id);
      if (existing) {
        existing.quantity += 1;
      } else {
        cart.push({
          id: product.id,
          name: product.name,
          price: product.price,
          quantity: 1,
          img: product.img || 'https://placehold.co/60x60?text=herb'
        });
      }
      saveCart();
      updateCartBadge();
      renderCartSidebar();
      showToast(`➕ ${product.name} added`);
    };

    // Show temporary toast message
    function showToast(msg) {
      let toast = document.getElementById('toastMsg');
      if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toastMsg';
        toast.className = 'toast-msg';
        document.body.appendChild(toast);
      }
      toast.textContent = msg;
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
      // refresh cart content every time we open
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

    // Optional: proceed to checkout button inside cart
    const proceedBtn = document.getElementById('proceedCheckoutBtn');
    if (proceedBtn) {
      proceedBtn.addEventListener('click', () => {
        if (cart.length === 0) {
          showToast('Your cart is empty – add some treasures first');
          return;
        }
        window.location.href = 'checkout.html';
      });
    }

    // ---------- 4. INITIALIZE ----------
    loadCart();
  });
})();