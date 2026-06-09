const request = require('supertest');
const app = require('../server');
const User = require('../models/User');
const Contact = require('../models/Contact');
const { generateToken } = require('../middleware/auth');

/**
 * Güvenlik odaklı test paketi.
 * Kapsam: statik dosya sızıntısı, yetkilendirme zorunluluğu, rol kontrolü,
 * güvenlik başlıkları (helmet), NoSQL injection, girdi doğrulama, XSS temizliği,
 * hata sızıntısı ve 404 davranışı.
 */
describe('Security Suite', () => {
  let adminToken;
  let userToken;

  beforeEach(async () => {
    await User.deleteMany({});
    await Contact.deleteMany({});

    const admin = await User.create({
      name: 'Sec Admin', email: 'secadmin@test.com', password: 'password123',
      phone: '05531112233', role: 'admin', isActive: true, emailVerified: true
    });
    adminToken = generateToken({ id: admin._id, role: 'admin' });

    const user = await User.create({
      name: 'Sec User', email: 'secuser@test.com', password: 'password123',
      phone: '05534445566', role: 'user', isActive: true, emailVerified: true
    });
    userToken = generateToken({ id: user._id, role: 'user' });
  });

  // ---------------------------------------------------------------------------
  // 1) Statik dosya sızıntısı: backend kaynak kodu / veri / sırlar erişilemez olmalı
  // ---------------------------------------------------------------------------
  describe('Static file exposure', () => {
    const forbidden = [
      '/backend/server.js',
      '/backend/.env',
      '/backend/.env.backup',
      '/backend/package.json',
      '/backend/data/contacts.json',
      '/backend/routes/auth.js',
      '/backend/middleware/auth.js'
    ];

    forbidden.forEach((p) => {
      it(`should NOT serve ${p}`, async () => {
        const res = await request(app).get(p);
        expect(res.status).not.toBe(200);
      });
    });

    it('should still serve a legitimate public asset (index.html)', async () => {
      const res = await request(app).get('/index.html');
      expect([200, 304]).toContain(res.status);
    });
  });

  // ---------------------------------------------------------------------------
  // 2) Yetkilendirme: korumalı uçlar token olmadan reddetmeli
  // ---------------------------------------------------------------------------
  describe('Authentication required', () => {
    it('GET /api/admin/dashboard without token -> 401', async () => {
      const res = await request(app).get('/api/admin/dashboard');
      expect(res.status).toBe(401);
    });

    it('GET /api/users/profile without token -> 401', async () => {
      const res = await request(app).get('/api/users/profile');
      expect(res.status).toBe(401);
    });

    it('GET /api/contact (list) without token -> 401', async () => {
      const res = await request(app).get('/api/contact');
      expect(res.status).toBe(401);
    });

    it('rejects a malformed/garbage token -> 401', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer not-a-real-token');
      expect(res.status).toBe(401);
    });

    it('rejects a token signed with the wrong secret -> 401', async () => {
      const jwt = require('jsonwebtoken');
      const forged = jwt.sign({ id: 'x', role: 'admin' }, 'attacker-secret');
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${forged}`);
      expect(res.status).toBe(401);
    });
  });

  // ---------------------------------------------------------------------------
  // 3) Rol kontrolü: normal kullanıcı admin uçlarına erişememeli
  // ---------------------------------------------------------------------------
  describe('Role-based access control', () => {
    it('regular user cannot reach admin dashboard -> 403', async () => {
      const res = await request(app)
        .get('/api/admin/dashboard')
        .set('Authorization', `Bearer ${userToken}`);
      expect(res.status).toBe(403);
    });

    it('regular user cannot list contact messages -> 403', async () => {
      const res = await request(app)
        .get('/api/contact')
        .set('Authorization', `Bearer ${userToken}`);
      expect(res.status).toBe(403);
    });

    it('admin CAN reach admin dashboard -> 200', async () => {
      const res = await request(app)
        .get('/api/admin/dashboard')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
    });
  });

  // ---------------------------------------------------------------------------
  // 4) Güvenlik başlıkları (helmet)
  // ---------------------------------------------------------------------------
  describe('Security headers', () => {
    it('sets hardening headers on API responses', async () => {
      const res = await request(app).get('/api/health');
      expect(res.headers['x-content-type-options']).toBe('nosniff');
      expect(res.headers['content-security-policy']).toBeDefined();
      expect(res.headers).toHaveProperty('x-dns-prefetch-control');
      // helmet hides the Express fingerprint
      expect(res.headers['x-powered-by']).toBeUndefined();
    });
  });

  // ---------------------------------------------------------------------------
  // 5) NoSQL injection: email alanına obje enjekte etme denemesi
  // ---------------------------------------------------------------------------
  describe('NoSQL injection resistance', () => {
    it('login with an operator-object email is rejected, never authenticates', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: { $ne: null }, password: { $ne: null } });
      // İster doğrulama hatası (400) ister kimlik hatası (401) olsun, 200 OLMAMALI
      expect(res.status).not.toBe(200);
      expect(res.body.success).not.toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // 6) Girdi doğrulama
  // ---------------------------------------------------------------------------
  describe('Input validation', () => {
    it('rejects registration with a too-short password -> 400', async () => {
      const res = await request(app).post('/api/auth/register').send({
        name: 'Weak Pass', email: 'weak@test.com', password: '123', phone: '05551112233'
      });
      expect(res.status).toBe(400);
    });

    it('rejects registration with an invalid phone -> 400', async () => {
      const res = await request(app).post('/api/auth/register').send({
        name: 'Bad Phone', email: 'badphone@test.com', password: 'password123', phone: '12345'
      });
      expect(res.status).toBe(400);
    });

    it('rejects a contact submission missing required fields -> 400', async () => {
      const res = await request(app).post('/api/contact').send({ name: 'Only Name' });
      expect(res.status).toBe(400);
    });
  });

  // ---------------------------------------------------------------------------
  // 7) XSS temizliği: kötü amaçlı içerik tag açacak şekilde saklanmamalı
  // ---------------------------------------------------------------------------
  describe('XSS sanitisation on contact input', () => {
    it('neutralises a <script> payload (no raw "<script" stored)', async () => {
      const res = await request(app).post('/api/contact').send({
        name: '<script>alert(1)</script>',
        email: 'xss@test.com',
        subject: '<img src=x onerror=alert(1)>',
        message: 'hello'
      });
      expect(res.status).toBe(201);
      const stored = JSON.stringify(res.body.data || {});
      // xss-clean "<" karakterini kaçırır; ham bir tag açılışı kalmamalı
      expect(stored).not.toContain('<script');
      expect(stored).not.toContain('<img');
    });
  });

  // ---------------------------------------------------------------------------
  // 8) Hata sızıntısı: production'da stack trace dönmemeli
  // ---------------------------------------------------------------------------
  describe('Error disclosure', () => {
    it('unknown API route returns structured 404, not a stack trace', async () => {
      const res = await request(app).get('/api/this-route-does-not-exist');
      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty('success', false);
      expect(JSON.stringify(res.body)).not.toMatch(/at .*\(.*:\d+:\d+\)/); // no stack frames
    });
  });
});
