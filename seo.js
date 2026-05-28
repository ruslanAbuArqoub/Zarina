const SEO_SITE_URL = 'https://zarinastore-cc94b.web.app';
const SEO_BRAND = 'ZARINA';
const SEO_IMAGE = `${SEO_SITE_URL}/zarina-logo-mark.png`;

const pageSeo = {
  'index.html': {
    title: 'زارينا | منتجات طبيعية ومواد خام عالية الجودة | ZARINA Natural Products',
    description: 'زارينا تقدم منتجات طبيعية ومواد خام أولية عالية الجودة في الأردن: زيوت طبيعية، زبدات خام، أعشاب ومستلزمات عناية. ZARINA offers premium natural products and raw ingredients in Jordan.',
    keywords: 'زارينا, منتجات طبيعية الأردن, مواد خام أولية, مواد خام طبيعية, زيوت طبيعية, زبدات خام, أعشاب طبيعية, عناية طبيعية, زبدة الشيا الخام, زبدة الأفوكادو, Zarina, natural products Jordan, premium raw ingredients, natural oils, raw butters, herbs',
    type: 'WebSite'
  },
  'Apothecary.html': {
    title: 'منتجات زارينا | زيوت وزبدات وأعشاب | ZARINA Apothecary Products',
    description: 'تسوق منتجات زارينا الطبيعية عالية الجودة: زيوت طبيعية، زبدات خام، أعشاب، مواد خام أولية ومستلزمات عناية. Shop ZARINA natural oils, raw butters, herbs and premium ingredients.',
    keywords: 'منتجات زارينا, زيوت طبيعية, زبدات خام, أعشاب طبيعية, مواد خام أولية, عناية بالبشرة طبيعية, منتجات طبيعية عالية الجودة, زيت طبيعي, زبدة الشيا, ZARINA products, raw butters, natural oils, premium raw ingredients, herbs, skincare ingredients',
    type: 'CollectionPage'
  },
  'Collections.html': {
    title: 'مجموعات زارينا | منتجات ومواد خام | ZARINA Collections',
    description: 'تصفح مجموعات زارينا من المنتجات الطبيعية والمواد الخام عالية الجودة، مرتبة حسب الزيوت والزبدات والأعشاب والعناية. Browse ZARINA collections by natural product group.',
    keywords: 'مجموعات زارينا, مجموعات منتجات طبيعية, مجموعة الزيوت, مجموعة الزبدات, مجموعة الأعشاب, مواد خام طبيعية, منتجات طبيعية الأردن, Zarina collections, natural product groups, oils collection, butters collection, herbs collection',
    type: 'CollectionPage'
  },
  'CountactUS.html': {
    title: 'تواصل مع زارينا | طلبات وتوصيل | Contact ZARINA',
    description: 'تواصل مع زارينا للاستفسار عن المنتجات الطبيعية عالية الجودة، المواد الخام الأولية، الطلبات والتوصيل في الأردن. Contact ZARINA for orders, delivery and product questions.',
    keywords: 'تواصل مع زارينا, زارينا الأردن, توصيل زارينا, طلب منتجات طبيعية, استفسار مواد خام, منتجات طبيعية عالية الجودة, contact Zarina, Zarina delivery Jordan, natural product questions, raw ingredients help',
    type: 'ContactPage'
  },
  'About.html': {
    title: 'عن زارينا | منتجات طبيعية ومواد خام | About ZARINA',
    description: 'تعرف على زارينا، متجر طبيعي يقدم منتجات عالية الجودة ومواد خام أولية مثل الزيوت النباتية والأعشاب والزبدات الخام. Learn about ZARINA natural apothecary and premium raw ingredients.',
    keywords: 'عن زارينا, زارينا, منتجات طبيعية عالية الجودة, مواد خام أولية, متجر منتجات طبيعية, زيوت نباتية, أعشاب طبيعية, زبدات خام, about Zarina, natural apothecary, premium raw ingredients, botanical oils',
    type: 'AboutPage'
  },
  'OURstory.html': {
    title: 'قصة زارينا | عناية ومواد خام طبيعية | ZARINA Story',
    description: 'اقرأ قصة زارينا والاهتمام وراء منتجاتنا الطبيعية عالية الجودة: مواد خام أولية، زيوت، أعشاب وزبدات. Read the ZARINA story behind our natural care and premium ingredients.',
    keywords: 'قصة زارينا, عناية طبيعية, مواد خام أولية, منتجات طبيعية عالية الجودة, أعشاب, زيوت طبيعية, زبدات خام, Zarina story, natural care, premium ingredients, herbal apothecary',
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
    description: 'زارينا تقدم منتجات طبيعية ومواد خام أولية عالية الجودة، مثل الزيوت الطبيعية، الزبدات الخام، الأعشاب، ومستلزمات العناية.',
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
