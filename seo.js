const SEO_SITE_URL = 'https://zarinastore-cc94b.web.app';
const SEO_BRAND = 'ZARINA';
const SEO_IMAGE = `${SEO_SITE_URL}/zarina-logo-mark.png`;

const pageSeo = {
  'index.html': {
    title: 'ZARINA | Natural Raw Ingredients, Oils, Butters & Herbs in Jordan',
    description: 'Shop Zarina natural raw ingredients, botanical oils, body butters, herbs, and apothecary essentials in Jordan with clear sizes and prices.',
    keywords: 'Zarina, natural oils Jordan, raw shea butter, avocado butter, herbs Jordan, natural skincare, apothecary Jordan',
    type: 'WebSite'
  },
  'Apothecary.html': {
    title: 'ZARINA Apothecary | Natural Oils, Butters, Herbs & Skin Care',
    description: 'Explore Zarina apothecary products: natural oils, raw butters, herbs, botanical ingredients, and skin-care essentials with available sizes.',
    keywords: 'natural oils, raw butters, shea butter, avocado butter, herbal remedies, skincare ingredients',
    type: 'CollectionPage'
  },
  'Collections.html': {
    title: 'ZARINA Collections | Shop Natural Product Groups by Size',
    description: 'Browse Zarina collections by product group and discover natural oils, butters, herbs, and raw ingredients organized for quick shopping.',
    keywords: 'Zarina collections, natural product collections, oils collection, butters collection, herbs collection',
    type: 'CollectionPage'
  },
  'CountactUS.html': {
    title: 'Contact ZARINA | Orders, Delivery & Product Questions',
    description: 'Contact Zarina for product questions, local delivery details, order help, and clear store policies for natural ingredients.',
    keywords: 'contact Zarina, Zarina delivery, Zarina Jordan, natural products help',
    type: 'ContactPage'
  },
  'About.html': {
    title: 'About ZARINA | Natural Apothecary & Raw Ingredients',
    description: 'Learn about Zarina, a natural apothecary focused on raw ingredients, botanical oils, herbs, and simple care rituals.',
    keywords: 'about Zarina, natural apothecary, raw ingredients, botanical oils',
    type: 'AboutPage'
  },
  'OURstory.html': {
    title: 'ZARINA Story | Natural Care Inspired by Raw Ingredients',
    description: 'Read Zarina story and the care behind our natural raw ingredients, oils, herbs, butters, and apothecary products.',
    keywords: 'Zarina story, natural care, herbal apothecary, raw ingredients',
    type: 'AboutPage'
  }
};

function currentPageName() {
  const name = window.location.pathname.split('/').pop();
  return name || 'index.html';
}

function canonicalUrl(pageName) {
  return `${SEO_SITE_URL}/${pageName === 'index.html' ? '' : pageName}`;
}

function setMeta(selector, attributes) {
  let tag = document.head.querySelector(selector);
  if (!tag) {
    tag = document.createElement('meta');
    document.head.appendChild(tag);
  }
  Object.entries(attributes).forEach(([key, value]) => tag.setAttribute(key, value));
}

function setLink(rel, href) {
  let tag = document.head.querySelector(`link[rel="${rel}"]`);
  if (!tag) {
    tag = document.createElement('link');
    tag.rel = rel;
    document.head.appendChild(tag);
  }
  tag.href = href;
}

function addJsonLd(id, data) {
  let tag = document.getElementById(id);
  if (!tag) {
    tag = document.createElement('script');
    tag.type = 'application/ld+json';
    tag.id = id;
    document.head.appendChild(tag);
  }
  tag.textContent = JSON.stringify(data);
}

const pageName = currentPageName();
const seo = pageSeo[pageName];
const baseKeywords = seo?.keywords || '';

if (seo) {
  const url = canonicalUrl(pageName);
  document.title = seo.title;
  setMeta('meta[name="description"]', { name: 'description', content: seo.description });
  setMeta('meta[name="keywords"]', { name: 'keywords', content: seo.keywords });
  setMeta('meta[name="robots"]', { name: 'robots', content: 'index, follow, max-image-preview:large' });
  setMeta('meta[name="theme-color"]', { name: 'theme-color', content: '#2F5D3A' });
  setMeta('meta[property="og:title"]', { property: 'og:title', content: seo.title });
  setMeta('meta[property="og:description"]', { property: 'og:description', content: seo.description });
  setMeta('meta[property="og:type"]', { property: 'og:type', content: 'website' });
  setMeta('meta[property="og:url"]', { property: 'og:url', content: url });
  setMeta('meta[property="og:image"]', { property: 'og:image', content: SEO_IMAGE });
  setMeta('meta[property="og:site_name"]', { property: 'og:site_name', content: SEO_BRAND });
  setMeta('meta[name="twitter:card"]', { name: 'twitter:card', content: 'summary_large_image' });
  setMeta('meta[name="twitter:title"]', { name: 'twitter:title', content: seo.title });
  setMeta('meta[name="twitter:description"]', { name: 'twitter:description', content: seo.description });
  setMeta('meta[name="twitter:image"]', { name: 'twitter:image', content: SEO_IMAGE });
  setLink('canonical', url);

  addJsonLd('zarina-organization-schema', {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SEO_BRAND,
    url: SEO_SITE_URL,
    logo: SEO_IMAGE,
    sameAs: []
  });

  addJsonLd('zarina-website-schema', {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SEO_BRAND,
    url: SEO_SITE_URL,
    potentialAction: {
      '@type': 'SearchAction',
      target: `${SEO_SITE_URL}/Apothecary.html?q={search_term_string}`,
      'query-input': 'required name=search_term_string'
    }
  });

  addJsonLd('zarina-page-schema', {
    '@context': 'https://schema.org',
    '@type': seo.type,
    name: seo.title,
    description: seo.description,
    url
  });
}

window.zarinaUpdateSeoProductKeywords = function(products = []) {
  if (!seo || !Array.isArray(products) || !products.length) return;

  const productKeywords = new Set();
  products.forEach(product => {
    if (!product || product.isVisible === false) return;
    [
      product.name,
      product.nameEn,
      product.nameAr,
      product.category,
      product.categoryEn,
      product.categoryAr,
      product.collection,
      product.collectionName,
      product.collectionNameEn,
      product.collectionNameAr
    ].forEach(value => {
      const text = (value || '').toString().trim();
      if (text) productKeywords.add(text);
    });

    if (Array.isArray(product.tags)) {
      product.tags.forEach(tag => {
        const text = (tag || '').toString().trim();
        if (text) productKeywords.add(text);
      });
    }
  });

  const mergedKeywords = [
    ...baseKeywords.split(',').map(item => item.trim()).filter(Boolean),
    ...Array.from(productKeywords).slice(0, 80)
  ];

  setMeta('meta[name="keywords"]', {
    name: 'keywords',
    content: Array.from(new Set(mergedKeywords)).join(', ')
  });
};
