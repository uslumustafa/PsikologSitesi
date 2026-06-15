#!/usr/bin/env node
/**
 * Statik blog sayfası üreticisi (SEO).
 *
 * Blog yazıları JS modalı olarak gösterildiğinde Google tarafından tek tek
 * indekslenemez. Bu script, tek doğruluk kaynağı backend/blog-posts.js'ten her
 * yazı için indekslenebilir bir statik sayfa (/blog/<slug>/index.html), bir blog
 * merkezi (/blog/index.html) ve güncel bir sitemap.xml üretir.
 *
 * Bağımlılık yok. Çalıştır:  node scripts/build-blog.js
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DOMAIN = 'https://www.gebzepsikologonuruslu.com';
const BLOG_DIR = path.join(ROOT, 'blog');

// Blogların gerçek doğruluk kaynağı production'da MongoDB'dir (admin panelinden
// eklenen yazılar dahil). Bu yüzden statik sayfaları CANLI API'den üretiriz; API
// erişilemezse repo'daki seed (backend/blog-posts.js) ile çalışmaya devam ederiz.
const API_URL = process.env.BLOG_API_URL || 'https://psikolog-onuruslu-api.onrender.com';

// Türkçe karakterleri sadeleştirip URL-dostu slug üretir.
// Sunucu (routes/blog.js) ve istemci (script.js) ile AYNI algoritma olmalı.
function slugify(str) {
  const map = { 'ç': 'c', 'ğ': 'g', 'ı': 'i', 'ö': 'o', 'ş': 's', 'ü': 'u', 'İ': 'i' };
  return String(str || '')
    .replace(/[çğıöşüİ]/g, c => map[c] || c)
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

async function fetchLivePosts() {
  const res = await fetch(`${API_URL}/api/blog?published=true&limit=100`, {
    signal: AbortSignal.timeout(60000) // Render free cold-start payı
  });
  if (!res.ok) throw new Error(`API ${res.status}`);
  const json = await res.json();
  const list = (json.data && (json.data.blogs || json.data)) || [];
  if (!Array.isArray(list) || !list.length) throw new Error('API boş liste döndü');
  return list;
}

async function loadPosts() {
  try {
    const live = await fetchLivePosts();
    console.log(`🌐 Canlı API'den ${live.length} yayınlanmış yazı alındı (${API_URL}).`);
    return { posts: live, fromLive: true };
  } catch (err) {
    console.warn(`⚠️  Canlı API okunamadı (${err.message}); repo seed verisine düşülüyor.`);
    const seed = require(path.join(ROOT, 'backend', 'blog-posts.js')).filter(p => p.published !== false);
    return { posts: seed, fromLive: false };
  }
}

// Slug'ları deterministik türet (depoda slug olmayan eski Mongo yazıları için) ve
// çakışmaları tekilleştir.
function withSlugs(rawPosts) {
  const seen = new Set();
  return rawPosts.map(p => {
    let slug = p.slug || slugify(p.title);
    let unique = slug, n = 2;
    while (seen.has(unique)) unique = `${slug}-${n++}`;
    seen.add(unique);
    return { ...p, slug: unique };
  });
}

// Sitemap'e girecek statik (elle yazılmış) sayfalar.
const STATIC_PAGES = [
  { loc: '/', changefreq: 'weekly', priority: '1.0' },
  { loc: '/blog/', changefreq: 'weekly', priority: '0.8' },
  // Hizmet sayfaları (scripts/build-services.js üretir, elle commit'lenir)
  { loc: '/yetiskin-danismanligi/', changefreq: 'monthly', priority: '0.9' },
  { loc: '/cift-terapisi/', changefreq: 'monthly', priority: '0.9' },
  { loc: '/cocuk-ergen-danismanligi/', changefreq: 'monthly', priority: '0.9' },
  { loc: '/online-terapi/', changefreq: 'monthly', priority: '0.9' },
  { loc: '/aile-danismanligi/', changefreq: 'monthly', priority: '0.9' },
  { loc: '/kvkk', changefreq: 'yearly', priority: '0.3' },
  { loc: '/gizlilik-politikasi', changefreq: 'yearly', priority: '0.3' },
  { loc: '/cerez-politikasi', changefreq: 'yearly', priority: '0.3' },
  { loc: '/kullanim-kosullari', changefreq: 'yearly', priority: '0.3' },
  { loc: '/hasta-haklari', changefreq: 'yearly', priority: '0.3' },
  { loc: '/mesafeli-satis-sozlesmesi', changefreq: 'yearly', priority: '0.3' },
  { loc: '/iptal-iade-kosullari', changefreq: 'yearly', priority: '0.3' }
];

const CATEGORY_LABELS = {
  terapi: 'Terapi', kaygi: 'Kaygı', depresyon: 'Depresyon',
  'cift-terapisi': 'Çift Terapisi', genel: 'Genel'
};

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

function isoDate(d) {
  const date = d instanceof Date ? d : new Date(d);
  return date.toISOString().split('T')[0];
}

function trDate(d) {
  const date = d instanceof Date ? d : new Date(d);
  return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
}

function imageUrl(image) {
  if (!image) return `${DOMAIN}/images/cognitive-behavioral-therapy.jpg`;
  if (/^https?:\/\//.test(image)) return image;
  return `${DOMAIN}/images/${image}`;
}

// Ortak <head> + sayfa kabuğu. Inline kritik CSS = hızlı LCP, render-blocking CDN yok.
const SHARED_CSS = `
:root{--primary:#2563eb;--ink:#1f2937;--muted:#6b7280;--bg:#f8fafc;--line:#e5e7eb}
*{box-sizing:border-box}
body{margin:0;font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif;color:var(--ink);background:#fff;line-height:1.75}
a{color:var(--primary);text-decoration:none}a:hover{text-decoration:underline}
.wrap{max-width:760px;margin:0 auto;padding:0 20px}
header.site{border-bottom:1px solid var(--line)}
header.site .wrap{display:flex;align-items:center;justify-content:space-between;height:64px}
header.site .brand{font-weight:700;font-size:18px;color:var(--ink)}
header.site nav a{margin-left:20px;color:var(--muted);font-weight:500}
.breadcrumb{font-size:13px;color:var(--muted);padding:18px 0}
.breadcrumb a{color:var(--muted)}
article h1{font-size:32px;line-height:1.25;margin:8px 0 12px}
.meta{color:var(--muted);font-size:14px;margin-bottom:24px}
.badge{display:inline-block;background:#eff6ff;color:var(--primary);font-size:12px;font-weight:600;padding:3px 10px;border-radius:999px;margin-right:8px}
article .cover{width:100%;height:auto;border-radius:12px;margin:8px 0 28px}
article h3{font-size:22px;margin:32px 0 10px}article h4{font-size:18px;margin:24px 0 8px}
article p{margin:0 0 18px}article ul,article ol{margin:0 0 18px;padding-left:22px}article li{margin:6px 0}
.cta{background:var(--bg);border:1px solid var(--line);border-radius:14px;padding:24px;margin:40px 0;text-align:center}
.cta h2{margin:0 0 8px;font-size:20px}.cta p{color:var(--muted);margin:0 0 16px}
.btn{display:inline-block;background:var(--primary);color:#fff;font-weight:600;padding:12px 26px;border-radius:10px}
.btn:hover{text-decoration:none;opacity:.92}
.related{border-top:1px solid var(--line);margin-top:48px;padding-top:28px}
.related h2{font-size:18px;margin:0 0 16px}
.cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:16px}
.card{border:1px solid var(--line);border-radius:12px;overflow:hidden;background:#fff}
.card img{width:100%;height:130px;object-fit:cover;display:block}
.card .body{padding:14px}.card .body h3{font-size:15px;margin:0 0 6px}.card .body p{font-size:13px;color:var(--muted);margin:0}
footer.site{border-top:1px solid var(--line);margin-top:56px;padding:28px 0;color:var(--muted);font-size:14px;text-align:center}
.hub-head{padding:36px 0 8px}.hub-head h1{font-size:34px;margin:0 0 8px}.hub-head p{color:var(--muted);margin:0;font-size:17px}
.hub-list{padding:24px 0 8px}
`;

function pageShell({ title, description, canonical, head = '', body }) {
  return `<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<meta name="robots" content="index, follow">
<link rel="canonical" href="${esc(canonical)}">
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
<script async src="https://www.googletagmanager.com/gtag/js?id=G-19VE4N9DD5"></script>
<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','G-19VE4N9DD5');</script>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap">
${head}
<style>${SHARED_CSS}</style>
</head>
<body>
<header class="site"><div class="wrap">
  <a class="brand" href="/">Psikolog Onur Uslu</a>
  <nav><a href="/">Ana Sayfa</a><a href="/blog/">Blog</a><a href="/#iletisim">İletişim</a></nav>
</div></header>
${body}
<footer class="site"><div class="wrap">
  <p>Psikolog Onur Uslu &middot; Gebze, Kocaeli &middot; <a href="tel:+905530263774">+90 553 026 37 74</a></p>
  <p>&copy; ${new Date().getFullYear()} Tüm hakları saklıdır. &middot; <a href="/kvkk">KVKK</a> &middot; <a href="/gizlilik-politikasi">Gizlilik</a></p>
</div></footer>
</body>
</html>`;
}

function renderPost(post) {
  const url = `${DOMAIN}/blog/${post.slug}/`;
  const img = imageUrl(post.image);
  const cat = CATEGORY_LABELS[post.category] || post.category;
  const related = posts.filter(p => p.slug !== post.slug).slice(0, 3);

  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.summary,
    image: [img],
    datePublished: isoDate(post.createdAt),
    dateModified: isoDate(post.updatedAt || post.createdAt),
    author: { '@type': 'Person', name: 'Onur Uslu', url: DOMAIN + '/' },
    publisher: {
      '@type': 'Organization',
      name: 'Psikolog Onur Uslu',
      logo: { '@type': 'ImageObject', url: `${DOMAIN}/images/psikolog-onur-uslu-professional.jpg` }
    },
    mainEntityOfPage: { '@type': 'WebPage', '@id': url }
  };

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Ana Sayfa', item: DOMAIN + '/' },
      { '@type': 'ListItem', position: 2, name: 'Blog', item: DOMAIN + '/blog/' },
      { '@type': 'ListItem', position: 3, name: post.title, item: url }
    ]
  };

  const head = `
<meta property="og:type" content="article">
<meta property="og:title" content="${esc(post.title)}">
<meta property="og:description" content="${esc(post.summary)}">
<meta property="og:image" content="${esc(img)}">
<meta property="og:url" content="${esc(url)}">
<meta property="og:locale" content="tr_TR">
<meta property="article:published_time" content="${isoDate(post.createdAt)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(post.title)}">
<meta name="twitter:description" content="${esc(post.summary)}">
<meta name="twitter:image" content="${esc(img)}">
<script type="application/ld+json">${JSON.stringify(articleSchema)}</script>
<script type="application/ld+json">${JSON.stringify(breadcrumbSchema)}</script>`;

  const relatedHtml = related.length ? `
<section class="related">
  <h2>Diğer Yazılar</h2>
  <div class="cards">
    ${related.map(r => `<a class="card" href="/blog/${esc(r.slug)}/">
      <img src="${esc('/images/' + r.image)}" alt="${esc(r.title)}" loading="lazy" onerror="this.style.display='none'">
      <div class="body"><h3>${esc(r.title)}</h3><p>${esc(r.summary)}</p></div>
    </a>`).join('\n    ')}
  </div>
</section>` : '';

  const body = `
<div class="wrap">
  <nav class="breadcrumb"><a href="/">Ana Sayfa</a> &rsaquo; <a href="/blog/">Blog</a> &rsaquo; ${esc(post.title)}</nav>
  <article>
    <span class="badge">${esc(cat)}</span>
    <h1>${esc(post.title)}</h1>
    <div class="meta">Yayın: ${esc(trDate(post.createdAt))} &middot; Psikolog Onur Uslu</div>
    <img class="cover" src="${esc('/images/' + post.image)}" alt="${esc(post.title)}" onerror="this.style.display='none'">
    ${post.content}
    <div class="cta">
      <h2>Profesyonel destek almak ister misiniz?</h2>
      <p>Online veya Gebze'de yüz yüze seans için randevu oluşturabilirsiniz.</p>
      <a class="btn" href="/#iletisim">Randevu Al</a>
    </div>
  </article>
  ${relatedHtml}
</div>`;

  return pageShell({
    title: `${post.title} | Psikolog Onur Uslu`,
    description: post.summary,
    canonical: url,
    head,
    body
  });
}

function renderHub() {
  const url = `${DOMAIN}/blog/`;
  const itemList = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Blog | Psikolog Onur Uslu',
    description: 'Psikoloji, terapi, kaygı ve ruh sağlığı üzerine yazılar.',
    url,
    hasPart: posts.map(p => ({
      '@type': 'Article',
      headline: p.title,
      url: `${DOMAIN}/blog/${p.slug}/`,
      datePublished: isoDate(p.createdAt)
    }))
  };

  const head = `
<meta property="og:type" content="website">
<meta property="og:title" content="Blog | Psikolog Onur Uslu">
<meta property="og:description" content="Psikoloji, terapi, kaygı ve ruh sağlığı üzerine yazılar.">
<meta property="og:url" content="${esc(url)}">
<meta property="og:image" content="${DOMAIN}/images/psikolog-onur-uslu-professional.jpg">
<meta property="og:site_name" content="Psikolog Onur Uslu">
<meta property="og:locale" content="tr_TR">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="Blog | Psikolog Onur Uslu">
<meta name="twitter:description" content="Psikoloji, terapi, kaygı ve ruh sağlığı üzerine yazılar.">
<meta name="twitter:image" content="${DOMAIN}/images/psikolog-onur-uslu-professional.jpg">
<script type="application/ld+json">${JSON.stringify(itemList)}</script>`;

  const body = `
<div class="wrap hub-head">
  <nav class="breadcrumb"><a href="/">Ana Sayfa</a> &rsaquo; Blog</nav>
  <h1>Blog</h1>
  <p>Psikoloji, terapi ve ruh sağlığı üzerine yazılar.</p>
</div>
<div class="wrap hub-list">
  <div class="cards">
    ${posts.map(p => `<a class="card" href="/blog/${esc(p.slug)}/">
      <img src="${esc('/images/' + p.image)}" alt="${esc(p.title)}" loading="lazy" onerror="this.style.display='none'">
      <div class="body"><h3>${esc(p.title)}</h3><p>${esc(p.summary)}</p></div>
    </a>`).join('\n    ')}
  </div>
</div>`;

  return pageShell({
    title: 'Blog | Psikolog Onur Uslu',
    description: 'Psikoloji, terapi, kaygı ve ruh sağlığı üzerine yazılar.',
    canonical: url,
    head,
    body
  });
}

function buildSitemap() {
  const today = isoDate(new Date());
  const urls = [];

  STATIC_PAGES.forEach(p => {
    urls.push(`  <url>\n    <loc>${DOMAIN}${p.loc}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>${p.changefreq}</changefreq>\n    <priority>${p.priority}</priority>\n  </url>`);
  });

  posts.forEach(p => {
    urls.push(`  <url>\n    <loc>${DOMAIN}/blog/${p.slug}/</loc>\n    <lastmod>${isoDate(p.updatedAt || p.createdAt)}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.7</priority>\n  </url>`);
  });

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`;
}

// ---- Yazma ----
// `posts` modül kapsamında; render fonksiyonları bunu kullanır (related/hub/sitemap).
let posts = [];

(async function main() {
  const { posts: raw, fromLive } = await loadPosts();

  // Güvenlik: API geçici erişilemez VE zaten üretilmiş sayfalar varsa, mevcut
  // (canlı veriden üretilmiş) sayfaları seed ile EZME — olduğu gibi koru ve çık.
  const hasExisting = fs.existsSync(path.join(BLOG_DIR, 'index.html'));
  if (!fromLive && hasExisting) {
    console.warn('⏭️  Canlı veri yok ve mevcut sayfalar duruyor; üretim atlandı (sayfalar korunuyor).');
    return;
  }

  posts = withSlugs(raw);

  // Canlı veriden üretiyorsak, silinen/yayından kaldırılan yazıların artık
  // sayfası kalmasın diye blog dizinini sıfırdan yaz.
  if (fromLive && fs.existsSync(BLOG_DIR)) {
    fs.rmSync(BLOG_DIR, { recursive: true, force: true });
  }

  let written = 0;
  fs.mkdirSync(BLOG_DIR, { recursive: true });

  posts.forEach(post => {
    const dir = path.join(BLOG_DIR, post.slug);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'index.html'), renderPost(post), 'utf8');
    written++;
    console.log(`  ✓ /blog/${post.slug}/`);
  });

  fs.writeFileSync(path.join(BLOG_DIR, 'index.html'), renderHub(), 'utf8');
  console.log('  ✓ /blog/ (merkez)');

  fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), buildSitemap(), 'utf8');
  console.log('  ✓ sitemap.xml');

  console.log(`\n✅ ${written} blog sayfası + merkez + sitemap üretildi.`);
})().catch(err => {
  console.error('Blog üretimi başarısız:', err);
  process.exit(1);
});
