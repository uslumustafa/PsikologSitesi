# Psikolog Onur Uslu - Backend API

Bu klasör, randevu yönetim sistemi ve yönetim paneli için hazırlanan Node.js/Express API servislerini içerir.

## Özellikler

- **JWT Yetkilendirme**: Güvenli üye girişi ve admin yetkilendirmesi
- **Randevu Yönetimi**: Randevu ekleme, onaylama, güncelleme ve silme
- **Mesaj Sistemi**: İletişim formu mesajlarının kaydedilmesi ve listelenmesi
- **Blog CMS**: Makale yönetimi için gerekli endpointler
- **Hatırlatıcı Servisi**: E-posta onay ve hatırlatma şablonları
- **Güvenlik**: Helmet, CORS, Hız Sınırlaması (Rate Limiting) ve XSS filtreleri

## Çalıştırma

1. Gerekli kütüphaneleri yükleyin:
   ```bash
   npm install
   ```
2. `.env` dosyasını oluşturup veritabanı ile SMTP ayarlarını yapın.
3. Testleri çalıştırmak için:
   ```bash
   npm test
   ```
4. Sunucuyu başlatmak için:
   ```bash
   npm start
   ```
