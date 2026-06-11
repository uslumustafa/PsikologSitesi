#!/usr/bin/env node
/**
 * Hizmet başına SEO iniş sayfaları üretir: /<slug>/index.html
 * "gebze çift terapisi", "gebze çocuk psikoloğu" gibi aramalar tek kartlı ana
 * sayfadan daha iyi sıralanan özel sayfalar ister. Sayfalar statiktir, elle
 * commit'lenir; sitemap'e build-blog.js'teki STATIC_PAGES listesinden girer.
 *
 * Kullanım: node scripts/build-services.js
 */
const fs = require('fs');
const path = require('path');

const DOMAIN = 'https://www.gebzepsikologonuruslu.com';
const PHONE_DISPLAY = '+90 553 026 37 74';
const PHONE_TEL = '+905530263774';
const ROOT = path.join(__dirname, '..');

const esc = (s) => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

const SERVICES = [
  {
    slug: 'yetiskin-danismanligi',
    name: 'Yetişkin Danışmanlığı',
    title: "Gebze Yetişkin Psikoloğu | Bireysel Terapi — Psikolog Onur Uslu",
    description: "Gebze'de yetişkinlere bireysel psikolojik danışmanlık: kaygı, depresyon, stres, özgüven. Bilişsel Davranışçı Terapi (BDT) temelli, online ve yüz yüze seans.",
    h1: "Gebze'de Yetişkin Danışmanlığı",
    intro: [
      "Yaşamın getirdiği zorluklar bazen tek başına taşınamayacak kadar ağırlaşır. Yetişkin danışmanlığında kaygı, depresyon, stres, özgüven sorunları ve yaşam geçişleri gibi konularda bire bir, çözüm odaklı bir süreç yürütüyoruz.",
      "Çalışmalarımda ağırlıklı olarak Bilişsel Davranışçı Terapi (BDT) yaklaşımını kullanıyorum: düşünce, duygu ve davranış arasındaki bağlantıları birlikte fark eder, size zorluk yaşatan örüntüleri somut tekniklerle değiştirmeye odaklanırız. Seanslar Gebze'deki ofisimde yüz yüze ya da görüntülü görüşmeyle online yapılabilir."
    ],
    forWhom: [
      "Sürekli endişe, kaygı ya da panik hissi yaşıyorsanız",
      "İsteksizlik, mutsuzluk veya tükenmişlik hali uzun süredir devam ediyorsa",
      "Stres, uyku sorunları veya öfke kontrolünde zorlanıyorsanız",
      "Özgüven ve karar verme süreçlerinde desteğe ihtiyaç duyuyorsanız",
      "İş, ilişki ya da yaşam değişimleriyle başa çıkmakta zorlanıyorsanız"
    ],
    faq: [
      { q: "Terapi süreci ne kadar sürer?", a: "Sürecin uzunluğu kişiye ve çalışılan konuya göre değişir. İlk değerlendirme görüşmesinde ihtiyacınızı birlikte netleştirir, hedefleri ve görüşme sıklığını birlikte planlarız." },
      { q: "BDT (Bilişsel Davranışçı Terapi) nedir?", a: "BDT, düşünce, duygu ve davranış arasındaki ilişkiye odaklanan, bilimsel etkinliği en çok araştırılmış terapi yaklaşımlarından biridir. Kaygı ve depresyon başta olmak üzere birçok alanda yapılandırılmış ve hedef odaklı bir yöntem sunar." },
      { q: "İlk görüşme ücretli mi?", a: "İlk adım olarak ücretsiz bir ön görüşme yapıyoruz. Bu görüşmede ihtiyacınızı dinliyor ve sürecin size uygun olup olmadığını birlikte değerlendiriyoruz." }
    ]
  },
  {
    slug: 'cift-terapisi',
    name: 'Çift Danışmanlığı',
    title: "Gebze Çift Terapisi | İlişki ve Evlilik Danışmanlığı — Psikolog Onur Uslu",
    description: "Gebze'de çift terapisi: iletişim sorunları, çatışmalar, güven ve bağlanma. Sağlıklı ve sürdürülebilir bir ilişki için çözüm odaklı danışmanlık. Online seçeneğiyle.",
    h1: "Gebze'de Çift Terapisi ve İlişki Danışmanlığı",
    intro: [
      "Her ilişkide zorlu dönemler olur; önemli olan bu dönemlerde birbirini duyabilmektir. Çift terapisinde iletişim sorunları, tekrarlayan çatışmalar, güven sarsılmaları ve duygusal uzaklaşma gibi konuları güvenli bir ortamda birlikte ele alıyoruz.",
      "Amaç taraf tutmak değil, çiftin ortak dilini yeniden kurmasına eşlik etmektir. Görüşmelerde her iki tarafın da kendini ifade edebildiği yapılandırılmış bir çerçeve kullanıyor, ilişkiyi zorlayan döngüleri fark edip yerine işleyen yeni beceriler koymaya odaklanıyoruz."
    ],
    forWhom: [
      "İletişiminiz sık sık tartışmaya dönüşüyor ve çözümsüz kalıyorsa",
      "Aldatma, güven sarsılması ya da kıskançlık konularını konuşamıyorsanız",
      "Duygusal uzaklaşma, ilgisizlik veya yalnızlık hissi yaşıyorsanız",
      "Evlilik öncesi uyum ve beklentileri netleştirmek istiyorsanız",
      "Ayrılık / boşanma sürecini sağlıklı yönetmek istiyorsanız"
    ],
    faq: [
      { q: "Çift terapisine birlikte mi gelmeliyiz?", a: "İdeal olan görüşmelere çift olarak katılmaktır; süreç ortak yürür. Bununla birlikte ilk adımı tek başına atmak isteyenlerle de değerlendirme görüşmesi yapılabilir." },
      { q: "Partnerim terapiye sıcak bakmıyor, ne yapabilirim?", a: "Bu oldukça sık karşılaşılan bir durumdur. Ücretsiz ön görüşme, çekinceleri olan partner için düşük eşikli bir başlangıç olabilir; süreç ve beklentiler netleşince kaygılar çoğunlukla azalır." },
      { q: "Online çift terapisi mümkün mü?", a: "Evet. Görüntülü görüşmeyle her iki partnerin de katıldığı online seanslar yapılabilir; farklı şehirlerde yaşayan çiftler için de uygundur." }
    ]
  },
  {
    slug: 'cocuk-ergen-danismanligi',
    name: 'Çocuk ve Ergen Danışmanlığı',
    title: "Gebze Çocuk ve Ergen Psikoloğu | Danışmanlık — Psikolog Onur Uslu",
    description: "Gebze'de çocuk ve ergen danışmanlığı: duygusal, sosyal ve akademik zorluklar, sınav kaygısı, davranış sorunları. Aileyi de sürece dahil eden güvenli yaklaşım.",
    h1: "Gebze'de Çocuk ve Ergen Danışmanlığı",
    intro: [
      "Çocuklar ve ergenler, büyüme yolculuğunda duygusal, sosyal ve akademik pek çok zorlukla karşılaşır. Bu dönemlerde doğru destek, sorunların kalıcılaşmadan çözülmesini sağlar.",
      "Görüşmelerde çocuğun ya da gencin yaşına uygun, güvenli ve yargısız bir ortam kuruyorum. Aile, sürecin doğal bir parçasıdır: değerlendirme ve ilerleme paylaşımlarıyla ebeveynleri de sürece dahil ederek evde de sürdürülebilir bir destek düzeni oluşturuyoruz."
    ],
    forWhom: [
      "Okul uyumu, ders motivasyonu veya sınav kaygısı sorunlarında",
      "Arkadaşlık ilişkileri ve sosyal çekingenlik konularında",
      "Öfke patlamaları, inatlaşma ya da davranış değişikliklerinde",
      "Kaygı, korkular veya uyku sorunlarında",
      "Aile içi değişimlerin (taşınma, kardeş doğumu, boşanma) etkilerinde"
    ],
    faq: [
      { q: "İlk görüşmeye çocuğumu da getirmeli miyim?", a: "Genellikle ilk değerlendirme görüşmesi ebeveynlerle yapılır; çocuğun öyküsünü ve ihtiyacını netleştirdikten sonra çocukla tanışma planlanır. Ergenlerde ise gence göre esnek bir başlangıç tercih edilebilir." },
      { q: "Görüşmelerde anlatılanlar bize aktarılır mı?", a: "Çocuğun ve gencin güveni sürecin temelidir; görüşme içeriği gizlilik çerçevesinde korunur. Ebeveynlere süreç, genel ilerleme ve evde yapılabilecekler düzenli olarak aktarılır." },
      { q: "Ergenim gelmek istemiyor, ne yapabilirim?", a: "Zorlamak çoğu zaman ters teper. Ücretsiz ön görüşmede ebeveyn olarak siz başlayabilir, gencin sürece nasıl davet edileceğini birlikte planlayabiliriz." }
    ]
  },
  {
    slug: 'online-terapi',
    name: 'Çevrimiçi (Online) Danışmanlık',
    title: "Online Terapi | Görüntülü Psikolojik Danışmanlık — Psikolog Onur Uslu",
    description: "Nerede olursanız olun görüntülü görüşmeyle online terapi: kaygı, depresyon, ilişki sorunları. Gebze merkezli Psikolog Onur Uslu ile esnek saatli online seans.",
    h1: "Online Terapi — Bulunduğunuz Yerden Psikolojik Destek",
    intro: [
      "Yoğun bir tempo, farklı bir şehirde yaşamak ya da ofise ulaşım zorluğu, psikolojik destek almanın önünde engel olmamalı. Online terapi, görüntülü görüşme yoluyla seanslara konforlu ortamınızdan katılmanızı sağlar.",
      "Online seanslar, yüz yüze görüşmelerle aynı çerçevede ilerler: aynı gizlilik ilkeleri, aynı yapılandırılmış süreç. Tek ihtiyacınız stabil bir internet bağlantısı ve görüşme boyunca yalnız kalabileceğiniz sessiz bir alan."
    ],
    forWhom: [
      "Gebze ve Kocaeli dışında yaşıyor ama düzenli destek istiyorsanız",
      "Yoğun iş temposu nedeniyle ofise gelmekte zorlanıyorsanız",
      "Yurt dışında yaşayan ve Türkçe terapi arayanlardansanız",
      "Ev ortamından ayrılmanın zor olduğu bir dönemdeyseniz",
      "Seans saatlerinde esneklik arıyorsanız"
    ],
    faq: [
      { q: "Online terapi yüz yüze terapi kadar etkili mi?", a: "Araştırmalar, online terapinin birçok alanda yüz yüze terapiyle benzer düzeyde etkili olduğunu göstermektedir. Önemli olan düzenli katılım ve görüşme için uygun, sessiz bir ortamdır." },
      { q: "Görüşmeler hangi uygulama üzerinden yapılıyor?", a: "Randevu oluşturulurken size uygun ve güvenli bir görüntülü görüşme bağlantısı iletilir; ek bir program kurmanız çoğu zaman gerekmez." },
      { q: "Bağlantı sorunu yaşarsak ne olur?", a: "Kısa kesintilerde görüşmeye kaldığı yerden devam edilir; görüşme yapılamayacak düzeyde bir sorun olursa seans birlikte yeniden planlanır." }
    ]
  },
  {
    slug: 'aile-danismanligi',
    name: 'Aile Danışmanlığı',
    title: "Gebze Aile Danışmanlığı | Aile Terapisi — Psikolog Onur Uslu",
    description: "Gebze'de aile danışmanlığı: aile içi iletişim, ebeveyn-çocuk ilişkileri, geçiş dönemleri. Daha huzurlu bir aile dinamiği için çözüm odaklı destek.",
    h1: "Gebze'de Aile Danışmanlığı",
    intro: [
      "Aile, en güçlü destek kaynağımız olduğu kadar zaman zaman en yorucu çatışmaların da yaşandığı yerdir. Aile danışmanlığında amaç, aile üyeleri arasındaki iletişimi ve bağları güçlendirmek, evde daha huzurlu bir ortak yaşam kurmaktır.",
      "Görüşmelerde aile içindeki döngüleri birlikte fark eder, her üyenin kendini ifade edebildiği bir zemin oluştururuz. Soruna değil, ailenin kaynaklarına ve çözüme odaklanan bir yaklaşım izliyorum."
    ],
    forWhom: [
      "Aile içi iletişim sık sık kırgınlık ve tartışmayla sonuçlanıyorsa",
      "Ebeveyn-çocuk ilişkisinde zorlanma yaşanıyorsa",
      "Taşınma, kayıp, boşanma gibi geçiş dönemlerinden geçiyorsanız",
      "Geniş aile ilişkileri ve sınırlar konusunda zorlanıyorsanız",
      "Evde tekrarlayan ve çözülemeyen gerginlikler varsa"
    ],
    faq: [
      { q: "Aile danışmanlığına kimler katılmalı?", a: "Konuya göre değişir: bazı süreçler tüm aileyle, bazıları yalnızca ebeveynlerle yürütülür. İlk değerlendirmede kimlerin katılımının yararlı olacağını birlikte planlarız." },
      { q: "Aile danışmanlığı ile çift terapisi arasındaki fark nedir?", a: "Çift terapisi partnerler arasındaki ilişkiye odaklanır; aile danışmanlığı ise ebeveyn-çocuk ilişkileri ve ailenin bütününü ilgilendiren dinamiklerle çalışır. İhtiyaca göre iki çalışma birbirini tamamlayabilir." },
      { q: "Seanslar ne sıklıkla yapılır?", a: "Genellikle düzenli aralıklarla planlanır; sıklık, ailenin ihtiyacına ve sürecin aşamasına göre ilk görüşmede birlikte belirlenir." }
    ]
  }
];

// Blog kabuğuyla aynı iskelet; renkler site markasına (teal) çekildi.
const CSS = `
:root{--primary:#0d9488;--primary-dark:#0f766e;--ink:#1f2937;--muted:#6b7280;--bg:#f0fdfa;--line:#e5e7eb}
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
article h1{font-size:32px;line-height:1.25;margin:8px 0 16px}
article h2{font-size:24px;margin:36px 0 12px}
article p{margin:0 0 18px}article ul{margin:0 0 18px;padding-left:22px}article li{margin:8px 0}
.badge{display:inline-block;background:var(--bg);color:var(--primary-dark);font-size:12px;font-weight:600;padding:3px 10px;border-radius:999px}
.cta{background:var(--bg);border:1px solid #ccfbf1;border-radius:14px;padding:24px;margin:40px 0;text-align:center}
.cta h2{margin:0 0 8px;font-size:20px}.cta p{color:var(--muted);margin:0 0 16px}
.btn{display:inline-block;background:var(--primary);color:#fff;font-weight:600;padding:12px 26px;border-radius:10px;margin:4px}
.btn:hover{text-decoration:none;opacity:.92}
.btn.ghost{background:#fff;color:var(--primary-dark);border:1px solid var(--primary)}
details{border:1px solid var(--line);border-radius:12px;padding:16px 18px;margin:10px 0;background:#fff}
details summary{cursor:pointer;font-weight:600;list-style:none;display:flex;justify-content:space-between;align-items:center}
details summary::after{content:"+";color:var(--primary);font-size:20px;font-weight:700}
details[open] summary::after{content:"−"}
details p{margin:12px 0 0;color:var(--muted)}
.related{border-top:1px solid var(--line);margin-top:48px;padding-top:28px}
.related h2{font-size:18px;margin:0 0 16px}
.related ul{padding-left:22px}.related li{margin:8px 0}
footer.site{border-top:1px solid var(--line);margin-top:56px;padding:28px 0;color:var(--muted);font-size:14px;text-align:center}
`;

function schemas(svc) {
  const url = `${DOMAIN}/${svc.slug}/`;
  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Ana Sayfa', item: `${DOMAIN}/` },
      { '@type': 'ListItem', position: 2, name: svc.name, item: url }
    ]
  };
  const service = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: svc.name,
    serviceType: svc.name,
    description: svc.description,
    url,
    areaServed: [
      { '@type': 'City', name: 'Gebze' },
      { '@type': 'City', name: 'Darıca' },
      { '@type': 'City', name: 'Çayırova' }
    ],
    provider: {
      '@type': 'MedicalBusiness',
      name: 'Psikolog Onur Uslu',
      url: `${DOMAIN}/`,
      telephone: PHONE_TEL,
      address: { '@type': 'PostalAddress', addressLocality: 'Gebze', addressRegion: 'Kocaeli', addressCountry: 'TR' }
    }
  };
  const faq = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: svc.faq.map(f => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a }
    }))
  };
  return [breadcrumb, service, faq]
    .map(s => `<script type="application/ld+json">${JSON.stringify(s)}</script>`)
    .join('\n');
}

function renderService(svc) {
  const url = `${DOMAIN}/${svc.slug}/`;
  const others = SERVICES.filter(s => s.slug !== svc.slug);
  const body = `
<main class="wrap">
  <nav class="breadcrumb"><a href="/">Ana Sayfa</a> › ${esc(svc.name)}</nav>
  <article>
    <span class="badge">Gebze &middot; Online &amp; Yüz Yüze</span>
    <h1>${esc(svc.h1)}</h1>
    ${svc.intro.map(p => `<p>${esc(p)}</p>`).join('\n    ')}

    <h2>Hangi durumlarda destek alabilirsiniz?</h2>
    <ul>
      ${svc.forWhom.map(li => `<li>${esc(li)}</li>`).join('\n      ')}
    </ul>

    <h2>Süreç nasıl işler?</h2>
    <p>İlk adım ücretsiz bir ön görüşmedir: ihtiyacınızı dinler, sürecin size uygun olup olmadığını birlikte değerlendiririz. Devamında değerlendirme görüşmesiyle hedefleri netleştirir, görüşme sıklığını birlikte planlarız. Seanslar Gebze'deki ofisimde yüz yüze ya da görüntülü görüşmeyle online yapılabilir; tüm görüşmeler meslek etiği ve KVKK çerçevesinde gizlilikle yürütülür.</p>

    <div class="cta">
      <h2>Randevu ve Ücretsiz Ön Görüşme</h2>
      <p>İlk adımı atmak için hazırsanız, size yardımcı olmaktan memnuniyet duyarım.</p>
      <a class="btn" href="tel:${PHONE_TEL}">📞 ${PHONE_DISPLAY}</a>
      <a class="btn ghost" href="https://wa.me/${PHONE_TEL.replace('+', '')}">WhatsApp ile yazın</a>
      <a class="btn ghost" href="/#iletisim">İletişim formu</a>
    </div>

    <h2>Sıkça Sorulan Sorular</h2>
    ${svc.faq.map(f => `<details>\n      <summary>${esc(f.q)}</summary>\n      <p>${esc(f.a)}</p>\n    </details>`).join('\n    ')}
  </article>

  <section class="related">
    <h2>Diğer Hizmetler</h2>
    <ul>
      ${others.map(o => `<li><a href="/${o.slug}/">${esc(o.name)}</a></li>`).join('\n      ')}
      <li><a href="/blog/">Blog: psikoloji üzerine yazılar</a></li>
    </ul>
  </section>
</main>`;

  return `<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(svc.title)}</title>
<meta name="description" content="${esc(svc.description)}">
<meta name="robots" content="index, follow">
<link rel="canonical" href="${url}">
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
<meta property="og:title" content="${esc(svc.title)}">
<meta property="og:description" content="${esc(svc.description)}">
<meta property="og:url" content="${url}">
<meta property="og:type" content="website">
<meta property="og:image" content="${DOMAIN}/images/psikolog-onur-uslu-professional.jpg">
<script async src="https://www.googletagmanager.com/gtag/js?id=G-19VE4N9DD5"></script>
<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','G-19VE4N9DD5');</script>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap">
${schemas(svc)}
<style>${CSS}</style>
</head>
<body>
<header class="site"><div class="wrap">
  <a class="brand" href="/">Psikolog Onur Uslu</a>
  <nav><a href="/">Ana Sayfa</a><a href="/blog/">Blog</a><a href="/#iletisim">İletişim</a></nav>
</div></header>
${body}
<footer class="site"><div class="wrap">
  <p>Psikolog Onur Uslu &middot; Gebze, Kocaeli &middot; <a href="tel:${PHONE_TEL}">${PHONE_DISPLAY}</a></p>
  <p>&copy; ${new Date().getFullYear()} Tüm hakları saklıdır. &middot; <a href="/kvkk.html">KVKK</a> &middot; <a href="/gizlilik-politikasi.html">Gizlilik</a></p>
</div></footer>
</body>
</html>
`;
}

for (const svc of SERVICES) {
  const dir = path.join(ROOT, svc.slug);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), renderService(svc));
  console.log(`  ✓ /${svc.slug}/`);
}
console.log(`\n✅ ${SERVICES.length} hizmet sayfası üretildi.`);
