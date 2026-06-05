# Psikolog Onur Uslu Web Sitesi

Klinik Psikolog Onur Uslu için hazırlanmış web sitesi ve yönetim paneli uygulaması. Bu proje sayesinde danışanlar hizmetleri inceleyebilir, blog yazılarını okuyabilir ve randevu oluşturabilir. Yönetici ise admin paneli üzerinden randevuları, gelen mesajları, blog yazılarını ve site içeriklerini yönetebilir.

## Özellikler

- **Danışan Tarafı:**
  - Modern ve mobil uyumlu responsive tasarım
  - Randevu oluşturma formu
  - Blog ve makaleler bölümü
  - İletişim formu ve WhatsApp entegrasyonu

- **Yönetim Paneli (Admin):**
  - Güvenli JWT tabanlı giriş
  - Randevu yönetimi (onaylama, reddetme, takvim görünümü)
  - Blog CMS (makale ekleme, silme, düzenleme)
  - Gelen mesaj kutusu ve site ayarları yönetimi

## Kurulum ve Çalıştırma

### Gereksinimler
- Node.js (v16 veya üzeri)
- MongoDB

### Kurulum Adımları

1. Repoyu bilgisayarınıza indirin.
2. `backend` klasörüne girip bağımlılıkları yükleyin:
   ```bash
   cd backend
   npm install
   ```
3. `backend` klasöründeki `env.example` dosyasını `.env` olarak kopyalayıp veritabanı bağlantı bilgilerini düzenleyin.
4. Sunucuyu başlatın:
   ```bash
   npm start
   ```

Sunucu varsayılan olarak `http://localhost:5002` adresinde çalışacaktır. Tarayıcıdan bu adrese giderek siteyi görüntüleyebilirsiniz. Admin paneline `http://localhost:5002/admin/login.html` adresinden erişebilirsiniz.
