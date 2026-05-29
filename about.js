import { app } from './firebase-config.js';
import {
  collection,
  getFirestore,
  onSnapshot
} from 'https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js';

const db = getFirestore(app);
window.zarinaProductsById = window.zarinaProductsById || {};

const TOP_RATED_LIMIT = 4;

let topRatedProducts = [];
let topRatedReviews = [];
let productsLoaded = false;
let reviewsLoaded = false;

function escapeHtml(value) {
  return (value ?? '').toString().replace(/[&<>"']/g, (match) => {
    if (match === '&') return '&amp;';
    if (match === '<') return '&lt;';
    if (match === '>') return '&gt;';
    if (match === '"') return '&quot;';
    return '&#39;';
  });
}

function getProductPrice(product) {
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

function reviewDateValue(review) {
  const createdAt = review.createdAt;
  if (!createdAt) return 0;
  if (typeof createdAt.toDate === 'function') return createdAt.toDate().getTime();
  if (createdAt.seconds) return createdAt.seconds * 1000;
  const parsed = new Date(createdAt).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
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

function reviewMatchesProduct(review, productId, product) {
  if (review.productId === productId) return true;

  const productNames = [
    product.nameEn,
    product.nameAr,
    product.name
  ].map(normalizeProductName).filter(Boolean);

  const reviewNames = [
    review.productNameEn,
    review.productNameAr
  ].map(normalizeProductName).filter(Boolean);

  return reviewNames.some((reviewName) => productNames.includes(reviewName));
}

function getProductReviews(productId, product) {
  return topRatedReviews.filter((review) => reviewMatchesProduct(review, productId, product));
}

function getReviewStats(productId, product) {
  const reviews = getProductReviews(productId, product);
  if (!reviews.length) return { average: 0, count: 0 };

  const total = reviews.reduce((sum, review) => sum + (Number(review.rating) || 0), 0);
  return {
    average: total / reviews.length,
    count: reviews.length
  };
}

function sortRatedProducts(a, b) {
  if (b.rating !== a.rating) return b.rating - a.rating;
  if (b.reviewCount !== a.reviewCount) return b.reviewCount - a.reviewCount;
  return b.latestReviewTime - a.latestReviewTime;
}

function renderTopRatedSkeleton(container) {
  container.innerHTML = Array.from({ length: TOP_RATED_LIMIT }).map(() => `
    <article class="product-card product-card-skeleton" aria-hidden="true">
      <div class="skeleton-media"></div>
      <div class="product-info">
        <span class="skeleton-line skeleton-line-title"></span>
        <span class="skeleton-line skeleton-line-short"></span>
        <span class="skeleton-line"></span>
        <span class="skeleton-line skeleton-line-short"></span>
        <span class="skeleton-line"></span>
        <span class="skeleton-line skeleton-line-price"></span>
        <span class="skeleton-button"></span>
      </div>
    </article>
  `).join('');
}

function createTopRatedProductCard(productId, product, index) {
  const nameEn = product.nameEn || product.name || 'Zarina product';
  const nameAr = product.nameAr || product.name || '&#1605;&#1606;&#1578;&#1580; &#1586;&#1575;&#1585;&#1610;&#1606;&#1575;';
  const descEn = product.descEn || product.longDescEn || product.description || product.descAr || product.longDescAr || '';
  const descAr = product.descAr || product.longDescAr || product.description || product.descEn || product.longDescEn || '';
  const categoryEn = product.categoryEn || product.category || 'ZARINA';
  const categoryAr = product.categoryAr || product.category || '&#1586;&#1575;&#1585;&#1610;&#1606;&#1575;';
  const imageUrl = product.imageUrl || 'https://placehold.co/700x520?text=ZARINA';
  const rating = Number(product.computedRating || product.rating || 0);
  const price = getProductPrice(product);
  const newBadgeHtml = isNewProduct(product) ? `
    <div class="product-new-badge">
      <span class="en-text">NEW</span>
      <span class="ar-text">جديد</span>
    </div>
  ` : '';

  const article = document.createElement('article');
  article.className = 'product-card featured-live-card';
  article.dataset.productId = productId;
  article.style.animationDelay = `${index * 0.04}s`;
  article.style.position = 'relative';
  article.innerHTML = `
    ${newBadgeHtml}
    <img class="product-img" src="${escapeHtml(imageUrl)}" alt="${escapeHtml(nameEn)}" loading="lazy" decoding="async">
    <div class="product-info">
      <div class="product-title">
        <span class="en-text">${escapeHtml(nameEn)}</span>
        <span class="ar-text">${escapeHtml(nameAr)}</span>
      </div>
      <div class="product-category">
        <span class="en-text">${escapeHtml(categoryEn)}</span>
        <span class="ar-text">${escapeHtml(categoryAr)}</span>
      </div>
      <div class="product-tags product-tags-empty" aria-hidden="true"></div>
      <div class="product-rating-badge" data-product-id="${escapeHtml(productId)}">
        <i class="fas fa-star"></i>
        <span>${rating > 0 ? rating.toFixed(1) : '0.0'}${product.reviewCount ? ` (${product.reviewCount})` : ''}</span>
      </div>
      <div class="product-desc">
        <span class="en-text">${escapeHtml(descEn)}</span>
        <span class="ar-text">${escapeHtml(descAr)}</span>
      </div>
      <div class="price">${Number.isFinite(price) ? price.toFixed(2) : '0.00'} JD</div>
      <button class="add-to-cart firecart-btn" type="button" data-id="${escapeHtml(productId)}">
        <i class="fas fa-shopping-bag"></i>
        <span class="en-text">Choose size</span>
        <span class="ar-text">&#1575;&#1582;&#1578;&#1575;&#1585; &#1575;&#1604;&#1603;&#1605;&#1610;&#1577;</span>
      </button>
    </div>
  `;

  return article;
}

function renderTopRatedProducts() {
  const container = document.getElementById('top-rated-container');
  if (!container) return;

  if (!productsLoaded || !reviewsLoaded) {
    renderTopRatedSkeleton(container);
    return;
  }

  container.innerHTML = '';

  const cards = topRatedProducts
    .filter(({ product }) => product.isVisible !== false)
    .map(({ id, product }) => {
      const stats = getReviewStats(id, product);
      const fallbackRating = Number(product.rating || 0);
      const latestReviewTime = getProductReviews(id, product)
        .reduce((latest, review) => Math.max(latest, reviewDateValue(review)), 0);

      return {
        id,
        product: {
          ...product,
          computedRating: stats.count ? stats.average : fallbackRating,
          reviewCount: stats.count
        },
        rating: stats.count ? stats.average : fallbackRating,
        reviewCount: stats.count,
        latestReviewTime
      };
    })
    .filter((item) => item.rating > 0)
    .sort(sortRatedProducts)
    .slice(0, TOP_RATED_LIMIT);

  cards.forEach(({ id, product }, index) => {
    window.zarinaProductsById[id] = { id, ...product };
    container.appendChild(createTopRatedProductCard(id, product, index));
  });

  window.dispatchEvent(new CustomEvent('zarina:topRatedRendered'));

  if (!container.children.length) {
    container.innerHTML = `
      <div class="catalog-no-results show" style="display:block; grid-column:1 / -1;">
        <span class="ar-text">&#1604;&#1575; &#1578;&#1608;&#1580;&#1583; &#1605;&#1606;&#1578;&#1580;&#1575;&#1578; &#1605;&#1602;&#1610;&#1605;&#1577; &#1581;&#1575;&#1604;&#1610;&#1575;.</span>
        <span class="en-text">No rated products yet.</span>
      </div>
    `;
  }
}

function showTopRatedError(error) {
  const container = document.getElementById('top-rated-container');
  if (!container) return;

  console.error('Failed to load top-rated products:', error);
  container.innerHTML = `
    <div class="catalog-no-results show" style="display:block; grid-column:1 / -1;">
      <span class="ar-text">&#1578;&#1593;&#1584;&#1585; &#1578;&#1581;&#1605;&#1610;&#1604; &#1575;&#1604;&#1605;&#1606;&#1578;&#1580;&#1575;&#1578; &#1575;&#1604;&#1575;&#1593;&#1604;&#1609; &#1578;&#1602;&#1610;&#1610;&#1605;&#1575;.</span>
      <span class="en-text">Could not load top-rated products.</span>
    </div>
  `;
}

function loadTopRatedProducts() {
  const container = document.getElementById('top-rated-container');
  if (!container) return;

  renderTopRatedSkeleton(container);

  onSnapshot(collection(db, 'products'), (snapshot) => {
    topRatedProducts = [];
    snapshot.forEach((docSnap) => {
      const product = docSnap.data();
      window.zarinaProductsById[docSnap.id] = { id: docSnap.id, ...product };
      topRatedProducts.push({ id: docSnap.id, product });
    });
    productsLoaded = true;
    renderTopRatedProducts();
  }, showTopRatedError);

  onSnapshot(collection(db, 'reviews'), (snapshot) => {
    topRatedReviews = [];
    snapshot.forEach((docSnap) => {
      const review = { id: docSnap.id, ...docSnap.data() };
      if (!review.productId || review.isVisible === false || !Number(review.rating)) return;
      topRatedReviews.push(review);
    });
    reviewsLoaded = true;
    renderTopRatedProducts();
  }, (error) => {
    console.error('Failed to load top-rated products:', error);
    reviewsLoaded = true;
    renderTopRatedProducts();
  });
}

document.addEventListener('DOMContentLoaded', loadTopRatedProducts);
