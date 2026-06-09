// ===== Global API Configuration =====
// Frontend (Cloudflare Pages) ile Backend (Render) ayrı yerlerde çalışıyor.
// BACKEND_URL: Render'da oluşturacağın servisin adresi.
// Render servisini "psikolog-onuruslu-api" adıyla oluştur; o zaman bu adres doğru olur.
// Farklı bir ad verirsen, aşağıdaki BACKEND_URL'i kendi Render adresinle değiştir.
const BACKEND_URL = 'https://psikolog-onuruslu-api.onrender.com';

window.API_URL =
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? (window.location.port !== '5002' ? 'http://localhost:5002/api' : '/api')
    : BACKEND_URL + '/api';
