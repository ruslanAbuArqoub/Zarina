import { app } from './firebase-config.js';
import {
  collection,
  getFirestore,
  onSnapshot
} from 'https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js';

const db = getFirestore(app);
window.zarinaProductsById = window.zarinaProductsById || {};

let productsCache = [];
let ordersCache = [];
let productsLoaded = false;
let ordersLoaded = false;

function escapeHtml(value) {
  return (value ?? '').toString().replace(/[&<>"']/g, (match) => {
    if (match === '&') return '&amp;';
    if (match === '<') return '&lt;';
    if (match === '>') return '&gt;';
    if (match === '"') return '&quot;';
    return '&#39;';
  });
}

function productPrice(product) {
  const variants = Array.isArray(product.variants)
    ? product.variants.filter((variant) => variant && !Number.isNaN(parseFloat(variant.price)))
    : [];
  if (variants.length) {
    return Math.min(...variants.map((variant) => parseFloat(variant.price || 0)));
  }
  return parseFloat(product.price || 0);
}

function productTimestampValue(product) {
  const value = product?.createdAt || product?.updatedAt;
  if (!value) return 0;
  if (typeof value.toDate === 'function') return value.toDate().getTime();
  if (value.seconds) return value.seconds * 1000;
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
}

function isNewProduct(product) {
  const createdTime = productTimestampValue({ createdAt: product?.createdAt });
  if (!createdTime) return false;
  return Date.now() - createdTime < 1000 * 60 * 60 * 48;
}

function isCountedOrder(order) {
  return !['Cancelled', 'Canceled', 'Rejected'].includes(order.status || '');
}

function baseProductId(value) {
  return (value || '').toString().split('__')[0];
}

function normalizeProductName(value) {
  return (value ?? '')
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[أإآا]/g, 'ا')
    .replace(/[ة]/g, 'ه')
    .replace(/\s+/g, ' ');
}

function productMatchesOrderItem(productId, product, item) {
  if (baseProductId(item.id) === productId || baseProductId(item.productId) === productId) return true;

  const productNames = [
    product.nameEn,
    product.nameAr,
    product.name
  ].map(normalizeProductName).filter(Boolean);

  const itemNames = [
    item.nameEn,
    item.nameAr,
    item.name
  ].map(normalizeProductName).filter(Boolean);

  return itemNames.some((itemName) => productNames.includes(itemName));
}

function productSalesCount(productId, product) {
  return ordersCache.reduce((total, order) => {
    if (!isCountedOrder(order) || !Array.isArray(order.items)) return total;

    return total + order.items.reduce((sum, item) => {
      if (!productMatchesOrderItem(productId, product, item)) return sum;
      return sum + (Number(item.quantity) || 1);
    }, 0);
  }, 0);
}

function skeletonCards(count) {
  return Array.from({ length: count }).map(() => `
    <article class="product-card product-card-skeleton" aria-hidden="true">
      <div class="skeleton-media"></div>
      <div class="product-info">
        <span class="skeleton-line skeleton-line-title"></span>
        <span class="skeleton-line skeleton-line-short"></span>
        <span class="skeleton-line"></span>
        <span class="skeleton-line skeleton-line-price"></span>
        <span class="skeleton-button"></span>
      </div>
    </article>
  `).join('');
}

function renderCard(id, product, index) {
  const nameEn = product.nameEn || product.name || 'Zarina product';
  const nameAr = product.nameAr || product.name || '&#1605;&#1606;&#1578;&#1580; &#1586;&#1575;&#1585;&#1610;&#1606;&#1575;';
  const descEn = product.descEn || product.longDescEn || product.description || product.descAr || product.longDescAr || '';
  const descAr = product.descAr || product.longDescAr || product.description || product.descEn || product.longDescEn || '';
  const price = productPrice(product);
  const rating = Number(product.rating || 0);
  const imageUrl = product.imageUrl || 'https://placehold.co/700x520?text=ZARINA';
  const newBadgeHtml = isNewProduct(product) ? `
    <div class="product-new-badge">
      <span class="en-text">NEW</span>
      <span class="ar-text">جديد</span>
    </div>
  ` : '';

  return `
    <article class="product-card featured-live-card" data-product-id="${escapeHtml(id)}" role="button" tabindex="0" style="animation-delay:${index * 0.04}s; position:relative">
      ${newBadgeHtml}
      <img class="product-img" src="${escapeHtml(imageUrl)}" alt="${escapeHtml(nameEn)}" loading="lazy" decoding="async">
      <div class="product-info">
        <div class="product-title">
          <span class="en-text">${escapeHtml(nameEn)}</span>
          <span class="ar-text">${escapeHtml(nameAr)}</span>
        </div>
        <div class="product-category">
          <span class="en-text">${escapeHtml(product.categoryEn || product.category || 'ZARINA')}</span>
          <span class="ar-text">${escapeHtml(product.categoryAr || product.category || '&#1586;&#1575;&#1585;&#1610;&#1606;&#1575;')}</span>
        </div>
        <div class="product-tags product-tags-empty" aria-hidden="true"></div>
        <div class="product-rating-badge" data-product-id="${escapeHtml(id)}">
          <i class="fas fa-star"></i>
          <span>${rating > 0 ? rating.toFixed(1) : '0.0'}</span>
        </div>
        <div class="product-desc">
          <span class="en-text">${escapeHtml(descEn)}</span>
          <span class="ar-text">${escapeHtml(descAr)}</span>
        </div>
        <div class="price">${Number.isFinite(price) ? price.toFixed(2) : '0.00'} JD</div>
        <button class="add-to-cart firecart-btn" type="button" data-id="${escapeHtml(id)}">
          <i class="fas fa-shopping-bag"></i>
          <span class="en-text">Choose size</span>
          <span class="ar-text">&#1575;&#1582;&#1578;&#1575;&#1585; &#1575;&#1604;&#1603;&#1605;&#1610;&#1577;</span>
        </button>
      </div>
    </article>
  `;
}

function initFeaturedProducts() {
  const containers = Array.from(document.querySelectorAll('[data-featured-products]'));
  if (!containers.length) return;

  function renderContainers() {
    if (!productsLoaded || !ordersLoaded) return;

    containers.forEach((container) => {
    const orderField = container.dataset.orderField || 'rating';
    const maxCards = Math.max(1, Math.min(parseInt(container.dataset.limit || '8', 10), 8));
    const cards = productsCache
      .filter(({ product }) => product.isVisible !== false)
      .map(({ id, product }) => {
        const computedSalesCount = productSalesCount(id, product);
        return {
          id,
          product: {
            ...product,
            computedSalesCount
          },
          sortValue: orderField === 'salesCount'
            ? computedSalesCount || Number(product.salesCount || 0)
            : Number(product[orderField] || 0)
        };
      })
      .sort((a, b) => b.sortValue - a.sortValue);

      const visibleCards = (orderField === 'salesCount' && cards.some((card) => card.sortValue > 0))
        ? cards.filter((card) => card.sortValue > 0)
        : cards;

      container.innerHTML = cards
        .length
        ? visibleCards
        .slice(0, maxCards)
        .map(({ id, product }, index) => renderCard(id, product, index))
        .join('')
        : `
          <div class="catalog-no-results show" style="display:block; grid-column:1 / -1;">
            <span class="en-text">No products to show yet.</span>
            <span class="ar-text">&#1604;&#1575; &#1578;&#1608;&#1580;&#1583; &#1605;&#1606;&#1578;&#1580;&#1575;&#1578; &#1604;&#1604;&#1593;&#1585;&#1590; &#1581;&#1575;&#1604;&#1610;&#1575;.</span>
          </div>
        `;
    });
  }

  containers.forEach((container) => {
    const maxCards = Math.max(1, Math.min(parseInt(container.dataset.limit || '8', 10), 8));
    container.innerHTML = skeletonCards(maxCards);
  });

  function renderError(error) {
    console.error('Could not load featured products:', error);
    containers.forEach((container) => {
      container.innerHTML = `
        <div class="catalog-no-results show" style="display:block; grid-column:1 / -1;">
          <span class="en-text">Could not load products right now.</span>
          <span class="ar-text">&#1578;&#1593;&#1584;&#1585; &#1578;&#1581;&#1605;&#1610;&#1604; &#1575;&#1604;&#1605;&#1606;&#1578;&#1580;&#1575;&#1578; &#1581;&#1575;&#1604;&#1610;&#1575;.</span>
        </div>
      `;
    });
  }

  onSnapshot(collection(db, 'products'), (snapshot) => {
    productsCache = [];
    snapshot.forEach((docSnap) => {
      const product = docSnap.data();
      window.zarinaProductsById[docSnap.id] = { id: docSnap.id, ...product };
      productsCache.push({ id: docSnap.id, product });
    });
    productsLoaded = true;
    renderContainers();
  }, renderError);

  onSnapshot(collection(db, 'orders'), (snapshot) => {
    ordersCache = [];
    snapshot.forEach((docSnap) => {
      ordersCache.push({ id: docSnap.id, ...docSnap.data() });
    });
    ordersLoaded = true;
    renderContainers();
  }, (error) => {
    console.warn('Could not load orders for best-selling products:', error);
    ordersLoaded = true;
    renderContainers();
  });
}

document.addEventListener('DOMContentLoaded', initFeaturedProducts);
