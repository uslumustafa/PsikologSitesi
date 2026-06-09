// Blog yazılarının TEK doğruluk kaynağı.
// Hem backend (routes/blog.js — in-memory & Mongo seed) hem de statik sayfa
// üreticisi (scripts/build-blog.js) bu dosyayı okur. Böylece içerik tek yerde durur.
// Not: backend/ klasörü .assetsignore ile Cloudflare'de servis edilmez (gizli kalır).
//
// `slug` alanı, her yazının indekslenebilir statik URL'ini belirler: /blog/<slug>/

module.exports = [
  {
    id: 1,
    slug: 'bilissel-davranisci-terapi-bdt-nedir',
    title: 'Bilişsel Davranışçı Terapi (BDT) Nedir?',
    category: 'terapi',
    summary: 'Düşünce, duygu ve davranışlarımız arasındaki bağı çözen, bilimsel olarak en çok kanıtlanmış terapi yöntemlerinden biri.',
    content: `<p>Bilişsel Davranışçı Terapi (BDT), düşüncelerimizin, duygularımızın ve davranışlarımızın birbiriyle yakından bağlantılı olduğu fikrine dayanan, bilimsel olarak etkinliği en çok kanıtlanmış terapi yaklaşımlarından biridir. Temel mantığı basittir: bir olayı nasıl yorumladığımız, o olay karşısında nasıl hissettiğimizi ve nasıl davrandığımızı belirler.</p>
<h3>BDT Nasıl Çalışır?</h3>
<p>Çoğu zaman bizi zorlayan, olayın kendisi değil, ona yüklediğimiz anlamdır. BDT, bu otomatik ve çoğunlukla fark etmediğimiz olumsuz düşünceleri tanımayı, sorgulamayı ve daha gerçekçi olanlarla değiştirmeyi öğretir.</p>
<h4>Üzerine Çalıştığımız Alanlar:</h4>
<ul>
<li><strong>Otomatik Düşünceler:</strong> Zihninizden hızla geçen ve ruh halinizi etkileyen düşünceleri fark etmek.</li>
<li><strong>Bilişsel Çarpıtmalar:</strong> "Ya hep ya hiç" düşüncesi, felaketleştirme gibi düşünce hatalarını tespit etmek.</li>
<li><strong>Davranışsal Deneyler:</strong> Korkulan durumlarla kontrollü biçimde yüzleşerek yeni öğrenmeler edinmek.</li>
</ul>
<h3>BDT Hangi Durumlarda Etkilidir?</h3>
<p>Kaygı bozuklukları, depresyon, panik atak, takıntılar (OKB), fobiler ve stres yönetimi başta olmak üzere geniş bir alanda etkilidir. Genellikle kısa ve orta vadeli, hedefe yönelik bir süreçtir; size günlük hayatta kullanabileceğiniz somut beceriler kazandırmayı amaçlar.</p>
<p>Unutmayın: amaç olumsuz düşünceleri bastırmak değil, onlarla daha sağlıklı bir ilişki kurmaktır.</p>`,
    image: 'cognitive-behavioral-therapy.jpg',
    createdAt: new Date('2024-02-01'),
    updatedAt: new Date('2024-02-01'),
    published: true
  },
  {
    id: 2,
    slug: 'kaygiyla-basa-cikmanin-5-pratik-yolu',
    title: 'Kaygıyla Başa Çıkmanın 5 Pratik Yolu',
    category: 'kaygi',
    summary: 'Günlük hayatta anksiyete ile başa çıkmanıza yardımcı olacak basit, etkili ve uygulaması kolay teknikler.',
    content: `<p>Kaygı, yaşamın doğal bir parçasıdır; ancak yoğunlaştığında günlük hayatı zorlaştırabilir. İşte kaygıyı yönetmenize yardımcı olacak 5 pratik yöntem:</p>
<ol>
<li><strong>Derin Nefes Alın:</strong> Burnunuzdan 4 saniye nefes alın, 4 saniye tutun, 6 saniyede verin. Bu, vücudunuzun sakinleşme sistemini devreye sokar.</li>
<li><strong>Fiziksel Aktivite:</strong> Düzenli egzersiz, stres hormonlarını azaltır ve ruh halini iyileştiren endorfin salgılatır. Günlük kısa yürüyüşler bile fark yaratır.</li>
<li><strong>Zihinsel Farkındalık (Mindfulness):</strong> Günde 10 dakikalık bir farkındalık çalışması, zihni şimdiki ana getirerek kaygıyı azaltır.</li>
<li><strong>Düşüncelerinizi Sorgulayın:</strong> "Bu düşünce gerçekçi mi? Kanıtı ne?" diye sorun. Çoğu kaygılı düşünce abartılıdır.</li>
<li><strong>Destek Alın:</strong> Zorlandığınızda bir uzmandan destek almak güçsüzlük değil, kendinize değer verdiğinizin göstergesidir.</li>
</ol>
<p>Kaygıyla başa çıkmak bir süreçtir. Kendinize sabır gösterin ve ihtiyaç duyduğunuzda destek istemekten çekinmeyin.</p>`,
    image: 'anxiety-coping-techniques.jpg',
    createdAt: new Date('2024-01-20'),
    updatedAt: new Date('2024-01-20'),
    published: true
  },
  {
    id: 3,
    slug: 'sema-terapi-nedir',
    title: 'Şema Terapi Nedir?',
    category: 'terapi',
    summary: 'Hayatınızda tekrar eden olumsuz kalıpların kökenlerini anlamak ve onları kalıcı olarak değiştirmek.',
    content: `<p>Şema Terapi, erken yaşam deneyimlerinden kaynaklanan ve yaşam boyu tekrar eden olumsuz düşünce ile davranış kalıplarını ("şemalar") değiştirmeyi hedefleyen bütünleştirici bir terapi yaklaşımıdır.</p>
<h3>Şema Nedir?</h3>
<p>Şemalar, çocuklukta temel duygusal ihtiyaçlarımız tam karşılanmadığında oluşan derin inanç kalıplarıdır. Örneğin "terk edilme", "kusurluluk" veya "yetersizlik" şemaları yetişkinlikte ilişkilerimizi ve seçimlerimizi sessizce yönlendirebilir.</p>
<h4>Süreçte Kullanılan Teknikler:</h4>
<ul>
<li><strong>Şema Aktivasyon Çalışmaları:</strong> Şemaları tetikleyen durumları ve tepkileri fark etmek.</li>
<li><strong>Görselleştirme:</strong> Çocukluk anılarına dönerek şemaların kökenini anlamak.</li>
<li><strong>Davranışsal Deneyler:</strong> Yeni ve sağlıklı davranış kalıplarını denemek.</li>
</ul>
<p>Şema terapi, kişinin kendini daha derin anlamasına ve daha tatmin edici ilişkiler kurmasına yardımcı olan güçlü bir yöntemdir.</p>`,
    image: 'schema-therapy.jpg',
    createdAt: new Date('2024-01-10'),
    updatedAt: new Date('2024-01-10'),
    published: true
  },
  {
    id: 4,
    slug: 'saglikli-sinirlar-koymak-neden-onemlidir',
    title: 'Sağlıklı Sınırlar Koymak Neden Önemlidir?',
    category: 'genel',
    summary: 'Kendinize ve ilişkilerinize duyduğunuz saygının en somut göstergesi: sınırlar neden gereklidir ve nasıl konulur?',
    content: `<p>Kişisel sınırları, evinizin etrafındaki bir çit gibi düşünebilirsiniz. Bu çit, neyin size ait olduğunu (duygularınız, zamanınız, enerjiniz) belirler ve kimi içeri alacağınıza siz karar verirsiniz.</p>
<h3>Sınırlar Neden Önemlidir?</h3>
<p>Sınır koymak bencillik değildir; aksine hem kendinize hem de ilişkilerinize duyduğunuz saygının göstergesidir.</p>
<ul>
<li><strong>Öz-değeri korur:</strong> "İhtiyaçlarım ve zamanım değerlidir" demenin en net yoludur.</li>
<li><strong>Tükenmişliği önler:</strong> Enerjinizi nerede harcayacağınızı kontrol etmenizi sağlar.</li>
<li><strong>Güveni artırır:</strong> Tutarlı sınırlar, ilişkilerde netlik ve güven oluşturur.</li>
</ul>
<h3>Nasıl Sınır Konulur?</h3>
<p>Net ve saygılı bir dille, suçlamadan ihtiyacınızı ifade edin. "Ben" dili kullanın: "Bu konuda rahatsız oluyorum, lütfen..." gibi. Sınır koymak başta zor gelse de, zamanla hem sizi hem ilişkilerinizi güçlendirir.</p>`,
    image: 'psikolog-onur-uslu-office.jpg',
    createdAt: new Date('2024-01-05'),
    updatedAt: new Date('2024-01-05'),
    published: true
  }
];
