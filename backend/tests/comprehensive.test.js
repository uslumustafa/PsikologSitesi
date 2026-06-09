const request = require('supertest');
const app = require('../server');
const mongoose = require('mongoose');
const User = require('../models/User');
const Appointment = require('../models/Appointment');
const Blog = require('../models/Blog');
const SiteSettings = require('../models/SiteSettings');
const Contact = require('../models/Contact');
const { generateToken, generateRefreshToken, verifyRefreshToken } = require('../middleware/auth');
const { sendEmail, sendBulkEmails, testEmailConfiguration, emailTemplates } = require('../utils/emailService');

// ───────────────────────────────────────────────────────────────────────────────
// HELPERS
// ───────────────────────────────────────────────────────────────────────────────
const createAdminUser = async () => {
  const user = await User.create({
    name: 'Admin User',
    email: 'admin@test.com',
    password: 'password123',
    phone: '05531234567',
    role: 'admin',
    isActive: true,
    emailVerified: true
  });
  const token = generateToken({ id: user._id, role: 'admin' });
  return { user, token };
};

const createRegularUser = async (overrides = {}) => {
  const defaults = {
    name: 'Regular User',
    email: 'user@test.com',
    password: 'password123',
    phone: '05541234567',
    role: 'user',
    isActive: true,
    emailVerified: true
  };
  const user = await User.create({ ...defaults, ...overrides });
  const token = generateToken({ id: user._id, role: 'user' });
  return { user, token };
};

const futureDate = (days = 3) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
};

// ═══════════════════════════════════════════════════════════════════════════════
// 1. HEALTH & ROOT ENDPOINTS
// ═══════════════════════════════════════════════════════════════════════════════
describe('Health & Root Endpoints', () => {
  it('GET /health should return OK', async () => {
    const res = await request(app).get('/health').expect(200);
    expect(res.body.status).toBe('OK');
    expect(res.body).toHaveProperty('timestamp');
    expect(res.body).toHaveProperty('uptime');
    expect(res.body).toHaveProperty('environment');
  });

  it('GET /api/health should return OK', async () => {
    const res = await request(app).get('/api/health').expect(200);
    expect(res.body.status).toBe('OK');
  });

  it('GET /api should return API info', async () => {
    const res = await request(app).get('/api').expect(200);
    expect(res.body.message).toContain('Psikolog Onur Uslu');
    expect(res.body.version).toBe('1.0.0');
    expect(res.body.endpoints).toBeDefined();
  });

  it('GET /api/nonexistent should return 404', async () => {
    const res = await request(app).get('/api/nonexistent-route-xyz').expect(404);
    expect(res.body.success).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 2. AUTHENTICATION ENDPOINTS (FULL COVERAGE)
// ═══════════════════════════════════════════════════════════════════════════════
describe('Authentication – Full Coverage', () => {
  // ---------- REGISTER ----------
  describe('POST /api/auth/register', () => {
    it('should register successfully with valid data', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ name: 'Ali Veli', email: 'ali@test.com', password: 'pass123', phone: '05551234567' })
        .expect(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe('ali@test.com');
      expect(res.body.data.token).toBeDefined();
    });

    it('should reject short name', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ name: 'A', email: 'x@test.com', password: 'pass123', phone: '05551234567' })
        .expect(400);
      expect(res.body.success).toBe(false);
    });

    it('should reject short password', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ name: 'Ali Veli', email: 'x@test.com', password: '123', phone: '05551234567' })
        .expect(400);
      expect(res.body.success).toBe(false);
    });

    it('should reject invalid phone', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ name: 'Ali Veli', email: 'x@test.com', password: 'pass123', phone: '1234' })
        .expect(400);
      expect(res.body.success).toBe(false);
    });

    it('should reject duplicate email', async () => {
      await createRegularUser({ email: 'dup@test.com' });
      const res = await request(app)
        .post('/api/auth/register')
        .send({ name: 'Ali Veli', email: 'dup@test.com', password: 'pass123', phone: '05559876543' })
        .expect(409);
      expect(res.body.message).toContain('already exists');
    });
  });

  // ---------- LOGIN ----------
  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      await createRegularUser({ email: 'login@test.com', password: 'pass123' });
    });

    it('should login with valid credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'login@test.com', password: 'pass123' })
        .expect(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toBeDefined();
      expect(res.body.data.refreshToken).toBeDefined();
    });

    it('should reject wrong password', async () => {
      await request(app)
        .post('/api/auth/login')
        .send({ email: 'login@test.com', password: 'wrongpass' })
        .expect(401);
    });

    it('should reject nonexistent user', async () => {
      await request(app)
        .post('/api/auth/login')
        .send({ email: 'nobody@test.com', password: 'pass123' })
        .expect(401);
    });

    it('should reject deactivated user', async () => {
      await User.findOneAndUpdate({ email: 'login@test.com' }, { isActive: false });
      await request(app)
        .post('/api/auth/login')
        .send({ email: 'login@test.com', password: 'pass123' })
        .expect(403);
    });

    it('should reject empty password', async () => {
      await request(app)
        .post('/api/auth/login')
        .send({ email: 'login@test.com', password: '' })
        .expect(400);
    });
  });

  // ---------- TOKEN REFRESH ----------
  describe('POST /api/auth/refresh', () => {
    it('should refresh token with valid refresh token', async () => {
      const { user } = await createRegularUser({ email: 'refresh@test.com' });
      const refreshToken = generateRefreshToken({ id: user._id });
      const res = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken })
        .expect(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toBeDefined();
    });

    it('should reject invalid refresh token', async () => {
      await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: 'invalid-token' })
        .expect(401);
    });

    it('should reject missing refresh token', async () => {
      await request(app)
        .post('/api/auth/refresh')
        .send({})
        .expect(400);
    });
  });

  // ---------- ME ----------
  describe('GET /api/auth/me', () => {
    it('should return user profile', async () => {
      const { token } = await createRegularUser({ email: 'me@test.com' });
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      expect(res.body.data.user.email).toBe('me@test.com');
    });

    it('should reject without token', async () => {
      await request(app).get('/api/auth/me').expect(401);
    });

    it('should reject expired/invalid token', async () => {
      await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer bad.token.here')
        .expect(401);
    });
  });

  // ---------- LOGOUT ----------
  describe('POST /api/auth/logout', () => {
    it('should logout successfully', async () => {
      const { token } = await createRegularUser({ email: 'logout@test.com' });
      const res = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      expect(res.body.success).toBe(true);
    });
  });

  // ---------- ADMIN LOGIN ----------
  describe('POST /api/auth/admin/login', () => {
    it('should login admin with valid credentials', async () => {
      await createAdminUser();
      // The route searches by email+role='admin', so we need the real admin user
      const adminUser = await User.findOne({ email: 'admin@test.com', role: 'admin' });
      expect(adminUser).not.toBeNull();

      const res = await request(app)
        .post('/api/auth/admin/login')
        .send({ email: 'admin@test.com', password: 'password123' })
        .expect(200);
      expect(res.body.success).toBe(true);
      expect(res.body.token).toBeDefined();
    });

    it('should reject non-admin user', async () => {
      await createRegularUser({ email: 'nonadmin@test.com' });
      await request(app)
        .post('/api/auth/admin/login')
        .send({ email: 'nonadmin@test.com', password: 'password123' })
        .expect(401);
    });

    it('should reject wrong password for admin', async () => {
      await createAdminUser();
      await request(app)
        .post('/api/auth/admin/login')
        .send({ email: 'admin@test.com', password: 'wrongpassword' })
        .expect(401);
    });

    it('should reject missing fields', async () => {
      await request(app)
        .post('/api/auth/admin/login')
        .send({ email: '' })
        .expect(400);
    });
  });

  // ---------- VERIFY EMAIL ----------
  describe('POST /api/auth/verify-email', () => {
    it('should reject missing token', async () => {
      await request(app)
        .post('/api/auth/verify-email')
        .send({})
        .expect(400);
    });

    it('should reject invalid token', async () => {
      await request(app)
        .post('/api/auth/verify-email')
        .send({ token: 'invalid-token' })
        .expect(400);
    });
  });

  // ---------- FORGOT PASSWORD ----------
  describe('POST /api/auth/forgot-password', () => {
    it('should return 404 for nonexistent email', async () => {
      await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'nobody@test.com' })
        .expect(404);
    });

    it('should reject invalid email format', async () => {
      await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'not-an-email' })
        .expect(400);
    });
  });

  // ---------- RESET PASSWORD ----------
  describe('POST /api/auth/reset-password', () => {
    it('should reject invalid reset token', async () => {
      await request(app)
        .post('/api/auth/reset-password')
        .send({ token: 'invalid', password: 'newpass123' })
        .expect(400);
    });

    it('should reject missing token', async () => {
      await request(app)
        .post('/api/auth/reset-password')
        .send({ password: 'newpass123' })
        .expect(400);
    });

    it('should reject short password', async () => {
      await request(app)
        .post('/api/auth/reset-password')
        .send({ token: 'sometoken', password: '12' })
        .expect(400);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 3. APPOINTMENTS ENDPOINTS (FULL COVERAGE)
// ═══════════════════════════════════════════════════════════════════════════════
describe('Appointments – Full Coverage', () => {
  let adminToken, adminUser, userToken, regularUser;

  beforeEach(async () => {
    const admin = await createAdminUser();
    adminToken = admin.token;
    adminUser = admin.user;
    const regular = await createRegularUser({ email: 'apt-user@test.com' });
    userToken = regular.token;
    regularUser = regular.user;
  });

  describe('POST /api/appointments (create)', () => {
    it('should create appointment with valid future data', async () => {
      const res = await request(app)
        .post('/api/appointments')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ date: futureDate(3), time: '14:00', type: 'individual', price: 500 })
        .expect(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.appointment).toBeDefined();
    });

    it('should reject past date', async () => {
      const past = new Date(); past.setDate(past.getDate() - 2);
      await request(app)
        .post('/api/appointments')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ date: past.toISOString().split('T')[0], time: '14:00', type: 'individual', price: 500 })
        .expect(400);
    });

    it('should reject invalid time format', async () => {
      await request(app)
        .post('/api/appointments')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ date: futureDate(), time: '25:99', type: 'individual', price: 500 })
        .expect(400);
    });

    it('should reject invalid type', async () => {
      await request(app)
        .post('/api/appointments')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ date: futureDate(), time: '14:00', type: 'invalid-type', price: 500 })
        .expect(400);
    });

    it('should reject without auth', async () => {
      await request(app)
        .post('/api/appointments')
        .send({ date: futureDate(), time: '14:00', type: 'individual', price: 500 })
        .expect(401);
    });

    it('should detect time slot conflict', async () => {
      const date = futureDate(4);
      await request(app)
        .post('/api/appointments')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ date, time: '15:00', type: 'individual', price: 500 });
      
      // Create another user and try same slot
      const { token: token2 } = await createRegularUser({ email: 'conflict@test.com', phone: '05559999999' });
      const res = await request(app)
        .post('/api/appointments')
        .set('Authorization', `Bearer ${token2}`)
        .send({ date, time: '15:00', type: 'individual', price: 500 })
        .expect(409);
      expect(res.body.message).toContain('already taken');
    });

    it('should work without price (optional)', async () => {
      const res = await request(app)
        .post('/api/appointments')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ date: futureDate(5), time: '11:00', type: 'couple' })
        .expect(201);
      expect(res.body.success).toBe(true);
    });

    it('should accept all valid types', async () => {
      for (const [i, type] of ['individual', 'couple', 'online', 'in-person'].entries()) {
        const res = await request(app)
          .post('/api/appointments')
          .set('Authorization', `Bearer ${userToken}`)
          .send({ date: futureDate(6 + i), time: '10:00', type, price: 500 })
          .expect(201);
        expect(res.body.data.appointment.type).toBe(type);
      }
    });
  });

  describe('GET /api/appointments (list)', () => {
    it('should return user appointments', async () => {
      await request(app)
        .post('/api/appointments')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ date: futureDate(3), time: '14:00', type: 'individual', price: 500 });

      const res = await request(app)
        .get('/api/appointments')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);
      expect(res.body.data.appointments.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data.pagination).toBeDefined();
    });

    it('should filter by status', async () => {
      const res = await request(app)
        .get('/api/appointments?status=scheduled')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);
      expect(res.body.success).toBe(true);
    });

    it('should filter by type', async () => {
      const res = await request(app)
        .get('/api/appointments?type=individual')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);
      expect(res.body.success).toBe(true);
    });

    it('admin should see all appointments', async () => {
      await request(app)
        .post('/api/appointments')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ date: futureDate(3), time: '14:00', type: 'individual', price: 500 });

      const res = await request(app)
        .get('/api/appointments')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect(res.body.data.appointments.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('GET /api/appointments/:id', () => {
    it('should return appointment by ID for owner', async () => {
      const createRes = await request(app)
        .post('/api/appointments')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ date: futureDate(3), time: '14:00', type: 'individual', price: 500 });

      const aptId = createRes.body.data.appointment._id;
      const res = await request(app)
        .get(`/api/appointments/${aptId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);
      expect(res.body.data.appointment._id).toBe(aptId);
    });

    it('should return 404 for nonexistent appointment', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      await request(app)
        .get(`/api/appointments/${fakeId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(404);
    });
  });

  describe('PUT /api/appointments/:id (update)', () => {
    it('should update appointment with valid data', async () => {
      const createRes = await request(app)
        .post('/api/appointments')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ date: futureDate(7), time: '14:00', type: 'individual', price: 500 });

      const aptId = createRes.body.data.appointment._id;
      const res = await request(app)
        .put(`/api/appointments/${aptId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ notes: 'Updated notes', price: 600 })
        .expect(200);
      expect(res.body.data.appointment.notes).toBe('Updated notes');
    });
  });

  describe('POST /api/appointments/:id/cancel', () => {
    it('should cancel appointment with reason', async () => {
      const createRes = await request(app)
        .post('/api/appointments')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ date: futureDate(10), time: '14:00', type: 'individual', price: 500 });

      const aptId = createRes.body.data.appointment._id;
      const res = await request(app)
        .post(`/api/appointments/${aptId}/cancel`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ reason: 'Schedule conflict' })
        .expect(200);
      expect(res.body.data.appointment.status).toBe('cancelled');
    });

    it('should reject cancel without reason', async () => {
      const createRes = await request(app)
        .post('/api/appointments')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ date: futureDate(11), time: '14:00', type: 'individual', price: 500 });

      const aptId = createRes.body.data.appointment._id;
      await request(app)
        .post(`/api/appointments/${aptId}/cancel`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({})
        .expect(400);
    });
  });

  describe('POST /api/appointments/:id/confirm (admin)', () => {
    it('should confirm appointment as admin', async () => {
      const createRes = await request(app)
        .post('/api/appointments')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ date: futureDate(12), time: '14:00', type: 'individual', price: 500 });

      const aptId = createRes.body.data.appointment._id;
      const res = await request(app)
        .post(`/api/appointments/${aptId}/confirm`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect(res.body.data.appointment.status).toBe('confirmed');
    });

    it('should reject confirm by regular user', async () => {
      const createRes = await request(app)
        .post('/api/appointments')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ date: futureDate(13), time: '14:00', type: 'individual', price: 500 });

      const aptId = createRes.body.data.appointment._id;
      await request(app)
        .post(`/api/appointments/${aptId}/confirm`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });
  });

  describe('POST /api/appointments/:id/complete (admin)', () => {
    it('should complete appointment as admin', async () => {
      const createRes = await request(app)
        .post('/api/appointments')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ date: futureDate(14), time: '14:00', type: 'individual', price: 500 });

      const aptId = createRes.body.data.appointment._id;
      const res = await request(app)
        .post(`/api/appointments/${aptId}/complete`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ sessionNotes: 'Great session', followUpRequired: true, followUpDate: futureDate(21) })
        .expect(200);
      expect(res.body.data.appointment.status).toBe('completed');
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 4. BLOG ENDPOINTS (FULL COVERAGE)
// ═══════════════════════════════════════════════════════════════════════════════
describe('Blog – Full Coverage', () => {
  let adminToken;

  beforeEach(async () => {
    const admin = await createAdminUser();
    adminToken = admin.token;
  });

  describe('GET /api/blog', () => {
    it('should return blog list (seeds from in-memory if empty)', async () => {
      const res = await request(app).get('/api/blog').expect(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.blogs).toBeDefined();
      expect(res.body.data.totalPages).toBeDefined();
    });

    it('should filter by category', async () => {
      await Blog.create({ title: 'Test', category: 'terapi', summary: 'Sum', content: 'Content' });
      const res = await request(app).get('/api/blog?category=terapi').expect(200);
      expect(res.body.success).toBe(true);
    });

    it('should paginate', async () => {
      const res = await request(app).get('/api/blog?page=1&limit=2').expect(200);
      expect(res.body.data.page).toBe(1);
      expect(res.body.data.limit).toBe(2);
    });
  });

  describe('GET /api/blog/categories/list', () => {
    it('should return categories', async () => {
      const res = await request(app).get('/api/blog/categories/list').expect(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.data[0]).toHaveProperty('value');
      expect(res.body.data[0]).toHaveProperty('label');
    });
  });

  describe('GET /api/blog/:id', () => {
    it('should return single blog', async () => {
      const blog = await Blog.create({ title: 'SingleTest', category: 'genel', summary: 'S', content: 'C' });
      const res = await request(app).get(`/api/blog/${blog._id}`).expect(200);
      expect(res.body.data.title).toBe('SingleTest');
    });

    it('should return 404 for nonexistent', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      await request(app).get(`/api/blog/${fakeId}`).expect(404);
    });
  });

  describe('POST /api/blog (admin)', () => {
    it('should create blog', async () => {
      const res = await request(app)
        .post('/api/blog')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'NewBlog', category: 'terapi', summary: 'Summary', content: 'Content', published: true })
        .expect(201);
      expect(res.body.data.title).toBe('NewBlog');
    });

    it('should reject missing fields', async () => {
      await request(app)
        .post('/api/blog')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'Missing' })
        .expect(400);
    });

    it('should reject without auth', async () => {
      await request(app)
        .post('/api/blog')
        .send({ title: 'T', category: 'c', summary: 's', content: 'c' })
        .expect(401);
    });
  });

  describe('PUT /api/blog/:id (admin)', () => {
    it('should update blog', async () => {
      const blog = await Blog.create({ title: 'Old', category: 'genel', summary: 'S', content: 'C' });
      const res = await request(app)
        .put(`/api/blog/${blog._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'Updated Title' })
        .expect(200);
      expect(res.body.data.title).toBe('Updated Title');
    });

    it('should return 404 for nonexistent', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      await request(app)
        .put(`/api/blog/${fakeId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'X' })
        .expect(404);
    });
  });

  describe('DELETE /api/blog/:id (admin)', () => {
    it('should delete blog', async () => {
      const blog = await Blog.create({ title: 'ToDelete', category: 'genel', summary: 'S', content: 'C' });
      await request(app)
        .delete(`/api/blog/${blog._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      // verify deleted
      await request(app).get(`/api/blog/${blog._id}`).expect(404);
    });

    it('should return 404 for nonexistent', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      await request(app)
        .delete(`/api/blog/${fakeId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 5. SITE SETTINGS ENDPOINTS (FULL COVERAGE)
// ═══════════════════════════════════════════════════════════════════════════════
describe('Site Settings – Full Coverage', () => {
  let adminToken, userToken;

  beforeEach(async () => {
    const admin = await createAdminUser();
    adminToken = admin.token;
    const regular = await createRegularUser({ email: 'settings-user@test.com' });
    userToken = regular.token;
  });

  it('GET /api/site-settings should return settings (public)', async () => {
    const res = await request(app).get('/api/site-settings').expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.general).toBeDefined();
    expect(res.body.data.about).toBeDefined();
    expect(res.body.data.statistics).toBeDefined();
  });

  it('GET /api/site-settings/:section should return specific section', async () => {
    // Seed settings first
    await request(app).get('/api/site-settings');
    const res = await request(app).get('/api/site-settings/general').expect(200);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.siteTitle).toBeDefined();
  });

  it('GET /api/site-settings/:section should 404 for invalid section', async () => {
    await request(app).get('/api/site-settings');
    await request(app).get('/api/site-settings/nonexistent').expect(404);
  });

  it('PUT /api/site-settings should update settings (admin)', async () => {
    const res = await request(app)
      .put('/api/site-settings')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        general: JSON.stringify({ siteTitle: 'New Title' }),
        statistics: JSON.stringify({ experienceYears: 10, totalClients: 2000, successRate: 99 })
      })
      .expect(200);
    expect(res.body.data.general.siteTitle).toBe('New Title');
    expect(res.body.data.statistics.experienceYears).toBe(10);
  });

  it('PUT /api/site-settings should reject non-admin', async () => {
    await request(app)
      .put('/api/site-settings')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ general: JSON.stringify({ siteTitle: 'Hack' }) })
      .expect(403);
  });

  it('PUT /api/site-settings/:section should update section (admin)', async () => {
    await request(app).get('/api/site-settings'); // seed
    const res = await request(app)
      .put('/api/site-settings/statistics')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ experienceYears: 15 })
      .expect(200);
    expect(res.body.data.experienceYears).toBe(15);
  });

  it('POST /api/site-settings/reset should reset to defaults (admin)', async () => {
    // First update
    await request(app)
      .put('/api/site-settings')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ general: JSON.stringify({ siteTitle: 'Changed' }) });
    
    // Reset
    const res = await request(app)
      .post('/api/site-settings/reset')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(res.body.data.general.siteTitle).toContain('Psikolog Onur Uslu');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 6. CONTACT ENDPOINTS (FULL COVERAGE)
// ═══════════════════════════════════════════════════════════════════════════════
describe('Contact – Full Coverage', () => {
  let adminToken, userToken;

  beforeEach(async () => {
    const admin = await createAdminUser();
    adminToken = admin.token;
    const regular = await createRegularUser({ email: 'contact-user@test.com' });
    userToken = regular.token;
  });

  describe('POST /api/contact', () => {
    it('should submit contact form', async () => {
      const res = await request(app)
        .post('/api/contact')
        .send({ name: 'Test', email: 'test@test.com', subject: 'Test Subject', message: 'Hello' })
        .expect(201);
      expect(res.body.data.name).toBe('Test');
    });

    it('should reject missing name', async () => {
      await request(app)
        .post('/api/contact')
        .send({ email: 'test@test.com', subject: 'S', message: 'M' })
        .expect(400);
    });

    it('should reject invalid email', async () => {
      await request(app)
        .post('/api/contact')
        .send({ name: 'T', email: 'bad', subject: 'S', message: 'M' })
        .expect(400);
    });

    it('should reject missing subject', async () => {
      await request(app)
        .post('/api/contact')
        .send({ name: 'T', email: 'a@b.com', message: 'M' })
        .expect(400);
    });

    it('should reject missing message', async () => {
      await request(app)
        .post('/api/contact')
        .send({ name: 'T', email: 'a@b.com', subject: 'S' })
        .expect(400);
    });
  });

  describe('GET /api/contact (admin)', () => {
    it('should list messages as admin', async () => {
      await Contact.create({ name: 'X', email: 'x@y.com', subject: 'S', message: 'M' });
      const res = await request(app)
        .get('/api/contact')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect(res.body.data.messages.length).toBeGreaterThanOrEqual(1);
    });

    it('should reject regular user', async () => {
      await request(app)
        .get('/api/contact')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });
  });

  describe('PATCH /api/contact/:id/read (admin)', () => {
    it('should mark message as read', async () => {
      const contact = await Contact.create({ name: 'X', email: 'x@y.com', subject: 'S', message: 'M' });
      const res = await request(app)
        .patch(`/api/contact/${contact._id}/read`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect(res.body.data.read).toBe(true);
    });

    it('should 404 for nonexistent message', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      await request(app)
        .patch(`/api/contact/${fakeId}/read`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
  });

  describe('DELETE /api/contact/:id (admin)', () => {
    it('should delete message', async () => {
      const contact = await Contact.create({ name: 'X', email: 'x@y.com', subject: 'S', message: 'M' });
      await request(app)
        .delete(`/api/contact/${contact._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });

    it('should 404 for nonexistent message', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      await request(app)
        .delete(`/api/contact/${fakeId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 7. ADMIN ENDPOINTS (FULL COVERAGE)
// ═══════════════════════════════════════════════════════════════════════════════
describe('Admin – Full Coverage', () => {
  let adminToken, adminUser, userToken, regularUser;

  beforeEach(async () => {
    const admin = await createAdminUser();
    adminToken = admin.token;
    adminUser = admin.user;
    const regular = await createRegularUser({ email: 'admin-test-user@test.com' });
    userToken = regular.token;
    regularUser = regular.user;
  });

  describe('GET /api/admin/dashboard', () => {
    it('should return dashboard stats', async () => {
      const res = await request(app)
        .get('/api/admin/dashboard')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect(res.body.data.users).toBeDefined();
      expect(res.body.data.appointments).toBeDefined();
      expect(res.body.data.revenue).toBeDefined();
    });

    it('should reject non-admin', async () => {
      await request(app)
        .get('/api/admin/dashboard')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });
  });

  describe('GET /api/admin/users', () => {
    it('should list users', async () => {
      const res = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect(res.body.data.users.length).toBeGreaterThanOrEqual(2);
      expect(res.body.data.pagination).toBeDefined();
    });

    it('should filter by role', async () => {
      const res = await request(app)
        .get('/api/admin/users?role=admin')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      res.body.data.users.forEach(u => expect(u.role).toBe('admin'));
    });
  });

  describe('GET /api/admin/users/:id', () => {
    it('should return user detail', async () => {
      const res = await request(app)
        .get(`/api/admin/users/${regularUser._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect(res.body.data.user.email).toBe('admin-test-user@test.com');
    });

    it('should 404 for nonexistent user', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      await request(app)
        .get(`/api/admin/users/${fakeId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
  });

  describe('PATCH /api/admin/users/:id/toggle-status', () => {
    it('should toggle user status', async () => {
      const res = await request(app)
        .patch(`/api/admin/users/${regularUser._id}/toggle-status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect(res.body.success).toBe(true);
    });

    it('should prevent admin from deactivating themselves', async () => {
      await request(app)
        .patch(`/api/admin/users/${adminUser._id}/toggle-status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);
    });
  });

  describe('GET /api/admin/appointments', () => {
    it('should list all appointments', async () => {
      // Create one
      await request(app)
        .post('/api/appointments')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ date: futureDate(3), time: '14:00', type: 'individual', price: 500 });

      const res = await request(app)
        .get('/api/admin/appointments')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect(res.body.data.appointments.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('POST /api/admin/appointments', () => {
    it('should create appointment for user', async () => {
      const res = await request(app)
        .post('/api/admin/appointments')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          user: regularUser._id.toString(),
          date: futureDate(5),
          time: '10:00',
          type: 'individual',
          price: 500
        })
        .expect(201);
      expect(res.body.success).toBe(true);
    });

    it('should reject missing required fields', async () => {
      await request(app)
        .post('/api/admin/appointments')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ user: regularUser._id.toString() })
        .expect(400);
    });
  });

  describe('PATCH /api/admin/appointments/:id/status', () => {
    it('should update appointment status', async () => {
      const apt = await Appointment.create({
        user: regularUser._id,
        date: new Date(Date.now() + 5 * 86400000),
        time: '14:00',
        type: 'individual',
        price: 500,
        status: 'scheduled'
      });

      const res = await request(app)
        .patch(`/api/admin/appointments/${apt._id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'confirmed' })
        .expect(200);
      expect(res.body.success).toBe(true);
    });

    it('should reject invalid status', async () => {
      const apt = await Appointment.create({
        user: regularUser._id,
        date: new Date(Date.now() + 5 * 86400000),
        time: '15:00',
        type: 'individual',
        price: 500
      });

      await request(app)
        .patch(`/api/admin/appointments/${apt._id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'invalid-status' })
        .expect(400);
    });
  });

  describe('GET /api/admin/customers', () => {
    it('should list customers', async () => {
      const res = await request(app)
        .get('/api/admin/customers')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect(res.body.data.customers).toBeDefined();
    });

    it('should search customers', async () => {
      const res = await request(app)
        .get('/api/admin/customers?search=admin-test')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('GET /api/admin/customers/:id', () => {
    it('should return customer detail', async () => {
      const res = await request(app)
        .get(`/api/admin/customers/${regularUser._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect(res.body.data.customer).toBeDefined();
      expect(res.body.data.appointments).toBeDefined();
    });

    it('should 404 for nonexistent customer', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      await request(app)
        .get(`/api/admin/customers/${fakeId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
  });

  describe('GET /api/admin/reminders/stats', () => {
    it('should return reminder stats', async () => {
      const res = await request(app)
        .get('/api/admin/reminders/stats')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect(res.body.data).toBeDefined();
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 8. USER ENDPOINTS (FULL COVERAGE)
// ═══════════════════════════════════════════════════════════════════════════════
describe('User Endpoints – Full Coverage', () => {
  let userToken, regularUser;

  beforeEach(async () => {
    const regular = await createRegularUser({ email: 'user-ep@test.com' });
    userToken = regular.token;
    regularUser = regular.user;
  });

  describe('GET /api/users/profile', () => {
    it('should return user profile', async () => {
      const res = await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);
      expect(res.body.data.user.email).toBe('user-ep@test.com');
    });

    it('should reject without auth', async () => {
      await request(app).get('/api/users/profile').expect(401);
    });
  });

  describe('PUT /api/users/profile', () => {
    it('should update name and phone', async () => {
      const res = await request(app)
        .put('/api/users/profile')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ name: 'Updated Name', phone: '05559876543' })
        .expect(200);
      expect(res.body.data.user.name).toBe('Updated Name');
    });

    it('should reject invalid phone', async () => {
      await request(app)
        .put('/api/users/profile')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ phone: '123' })
        .expect(400);
    });
  });

  describe('POST /api/users/change-password', () => {
    it('should change password with correct current password', async () => {
      const res = await request(app)
        .post('/api/users/change-password')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ currentPassword: 'password123', newPassword: 'newpass123' })
        .expect(200);
      expect(res.body.success).toBe(true);
    });

    it('should reject wrong current password', async () => {
      await request(app)
        .post('/api/users/change-password')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ currentPassword: 'wrongpass', newPassword: 'newpass123' })
        .expect(400);
    });

    it('should reject short new password', async () => {
      await request(app)
        .post('/api/users/change-password')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ currentPassword: 'password123', newPassword: '12' })
        .expect(400);
    });
  });

  describe('GET /api/users/appointments', () => {
    it('should return user appointments', async () => {
      const res = await request(app)
        .get('/api/users/appointments')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);
      expect(res.body.data.appointments).toBeDefined();
    });
  });

  describe('GET /api/users/statistics', () => {
    it('should return user statistics', async () => {
      const res = await request(app)
        .get('/api/users/statistics')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);
      expect(res.body.data).toHaveProperty('totalAppointments');
      expect(res.body.data).toHaveProperty('completedAppointments');
      expect(res.body.data).toHaveProperty('upcomingAppointments');
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 9. EMAIL SERVICE (UNIT TESTS)
// ═══════════════════════════════════════════════════════════════════════════════
describe('Email Service – Unit Tests', () => {
  it('should have all required templates', () => {
    expect(emailTemplates.emailVerification).toBeDefined();
    expect(emailTemplates.passwordReset).toBeDefined();
    expect(emailTemplates.appointmentConfirmation).toBeDefined();
    expect(emailTemplates.appointmentReminder).toBeDefined();
    expect(emailTemplates.appointmentCancellation).toBeDefined();
    expect(emailTemplates.broadcast).toBeDefined();
    expect(emailTemplates['appointment-status-update']).toBeDefined();
  });

  it('should send email with valid template (mock)', async () => {
    const result = await sendEmail({
      to: 'test@test.com',
      subject: 'Test',
      template: 'emailVerification',
      data: { name: 'Test User', verificationLink: 'http://example.com' }
    });
    expect(result.messageId).toBe('mock-email-id');
  });

  it('should throw for invalid template', async () => {
    await expect(sendEmail({
      to: 'test@test.com',
      subject: 'Test',
      template: 'nonexistent-template',
      data: {}
    })).rejects.toThrow("Email template 'nonexistent-template' not found");
  });

  it('should send appointment confirmation email (mock)', async () => {
    const result = await sendEmail({
      to: 'user@test.com',
      subject: 'Randevu Onayı',
      template: 'appointmentConfirmation',
      data: { name: 'Ali', date: '15.06.2026', time: '14:00', type: 'Bireysel', duration: 50, price: 500 }
    });
    expect(result.messageId).toBe('mock-email-id');
  });

  it('should send appointment cancellation email (mock)', async () => {
    const result = await sendEmail({
      to: 'user@test.com',
      subject: 'Randevu İptali',
      template: 'appointmentCancellation',
      data: { name: 'Ali', date: '15.06.2026', time: '14:00', type: 'Bireysel', reason: 'Test' }
    });
    expect(result.messageId).toBe('mock-email-id');
  });

  it('should send appointment reminder email (mock)', async () => {
    const result = await sendEmail({
      to: 'user@test.com',
      subject: 'Hatırlatma',
      template: 'appointmentReminder',
      data: { name: 'Ali', date: '15.06.2026', time: '14:00', type: 'Bireysel', duration: 50 }
    });
    expect(result.messageId).toBe('mock-email-id');
  });

  it('should send password reset email (mock)', async () => {
    const result = await sendEmail({
      to: 'user@test.com',
      subject: 'Şifre Sıfırlama',
      template: 'passwordReset',
      data: { name: 'Ali', resetLink: 'http://example.com/reset' }
    });
    expect(result.messageId).toBe('mock-email-id');
  });

  it('should send broadcast email (mock)', async () => {
    const result = await sendEmail({
      to: 'user@test.com',
      subject: 'Duyuru',
      template: 'broadcast',
      data: { name: 'Ali', message: 'Important update', subject: 'Test' }
    });
    expect(result.messageId).toBe('mock-email-id');
  });

  it('should send appointment status update email (mock)', async () => {
    const result = await sendEmail({
      to: 'user@test.com',
      subject: 'Durum Güncelleme',
      template: 'appointment-status-update',
      data: { name: 'Ali', date: '15.06.2026', time: '14:00', service: 'Bireysel', oldStatus: 'scheduled', newStatus: 'confirmed' }
    });
    expect(result.messageId).toBe('mock-email-id');
  });

  it('should send bulk emails (mock)', async () => {
    const results = await sendBulkEmails([
      { to: 'a@b.com', subject: 'T1', template: 'broadcast', data: { name: 'A', message: 'M1', subject: 'S1' } },
      { to: 'c@d.com', subject: 'T2', template: 'broadcast', data: { name: 'B', message: 'M2', subject: 'S2' } }
    ]);
    expect(results.length).toBe(2);
    expect(results[0].success).toBe(true);
    expect(results[1].success).toBe(true);
  });

  it('should test email configuration (mock)', async () => {
    const result = await testEmailConfiguration();
    expect(result).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 10. MODEL VALIDATIONS
// ═══════════════════════════════════════════════════════════════════════════════
describe('Model Validations', () => {
  describe('User Model', () => {
    it('should hash password on save', async () => {
      const user = await User.create({
        name: 'Hash Test',
        email: 'hash@test.com',
        password: 'plaintext',
        phone: '05551234567'
      });
      const savedUser = await User.findById(user._id).select('+password');
      expect(savedUser.password).not.toBe('plaintext');
    });

    it('should compare password correctly', async () => {
      const user = await User.create({
        name: 'Compare Test',
        email: 'compare@test.com',
        password: 'mypassword',
        phone: '05551234567'
      });
      const savedUser = await User.findById(user._id).select('+password');
      expect(await savedUser.comparePassword('mypassword')).toBe(true);
      expect(await savedUser.comparePassword('wrongpassword')).toBe(false);
    });

    it('should generate auth token', async () => {
      const user = await User.create({
        name: 'Token Test',
        email: 'token@test.com',
        password: 'pass123',
        phone: '05551234567'
      });
      const token = user.generateAuthToken();
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
    });

    it('should generate email verification token', async () => {
      const user = await User.create({
        name: 'Verify Test',
        email: 'verify@test.com',
        password: 'pass123',
        phone: '05551234567'
      });
      const token = user.generateEmailVerificationToken();
      expect(token).toBeDefined();
      expect(user.emailVerificationToken).toBe(token);
    });

    it('should generate password reset token', async () => {
      const user = await User.create({
        name: 'Reset Test',
        email: 'reset@test.com',
        password: 'pass123',
        phone: '05551234567'
      });
      const token = user.generatePasswordResetToken();
      expect(token).toBeDefined();
      expect(user.passwordResetToken).toBe(token);
      expect(user.passwordResetExpires).toBeDefined();
    });

    it('should find by email (static method)', async () => {
      await User.create({
        name: 'Find Test',
        email: 'find@test.com',
        password: 'pass123',
        phone: '05551234567'
      });
      const user = await User.findByEmail('find@test.com');
      expect(user).not.toBeNull();
      expect(user.email).toBe('find@test.com');
    });

    it('should have fullProfile virtual', async () => {
      const user = await User.create({
        name: 'Profile Test',
        email: 'profile@test.com',
        password: 'pass123',
        phone: '05551234567'
      });
      expect(user.fullProfile).toBeDefined();
      expect(user.fullProfile.name).toBe('Profile Test');
      expect(user.fullProfile).not.toHaveProperty('password');
    });

    it('should reject invalid email format', async () => {
      await expect(User.create({
        name: 'Bad Email',
        email: 'not-an-email',
        password: 'pass123',
        phone: '05551234567'
      })).rejects.toThrow();
    });

    it('should reject missing required fields', async () => {
      await expect(User.create({})).rejects.toThrow();
    });
  });

  describe('Appointment Model', () => {
    let userId;
    beforeEach(async () => {
      const user = await User.create({
        name: 'Apt User',
        email: 'apt@test.com',
        password: 'pass123',
        phone: '05551234567'
      });
      userId = user._id;
    });

    it('should create valid appointment', async () => {
      const apt = await Appointment.create({
        user: userId,
        date: new Date(Date.now() + 5 * 86400000),
        time: '14:00',
        type: 'individual',
        price: 500
      });
      expect(apt.status).toBe('scheduled');
      expect(apt.duration).toBe(50);
    });

    it('should have virtuals', async () => {
      const apt = await Appointment.create({
        user: userId,
        date: new Date(Date.now() + 5 * 86400000),
        time: '14:00',
        type: 'individual',
        price: 500
      });
      expect(apt.datetime).toBeDefined();
      expect(apt.formattedDate).toBeDefined();
      expect(apt.statusTurkish).toBe('Planlandı');
      expect(apt.typeTurkish).toBe('Bireysel Terapi');
    });

    it('should have cancel method', async () => {
      const apt = await Appointment.create({
        user: userId,
        date: new Date(Date.now() + 5 * 86400000),
        time: '14:00',
        type: 'individual',
        price: 500
      });
      await apt.cancel('Test reason', userId);
      expect(apt.status).toBe('cancelled');
      expect(apt.cancellationReason).toBe('Test reason');
    });

    it('should have confirm method', async () => {
      const apt = await Appointment.create({
        user: userId,
        date: new Date(Date.now() + 5 * 86400000),
        time: '15:00',
        type: 'online',
        price: 400
      });
      await apt.confirm();
      expect(apt.status).toBe('confirmed');
    });

    it('should have complete method', async () => {
      const apt = await Appointment.create({
        user: userId,
        date: new Date(Date.now() + 5 * 86400000),
        time: '16:00',
        type: 'couple',
        price: 750
      });
      await apt.complete('Notes here');
      expect(apt.status).toBe('completed');
      expect(apt.sessionNotes).toBe('Notes here');
    });

    it('canBeCancelled should return correct value', async () => {
      // far future -> can cancel
      const apt = await Appointment.create({
        user: userId,
        date: new Date(Date.now() + 5 * 86400000),
        time: '14:00',
        type: 'individual',
        price: 500
      });
      expect(apt.canBeCancelled()).toBe(true);
    });

    it('canBeRescheduled should return correct value', async () => {
      const apt = await Appointment.create({
        user: userId,
        date: new Date(Date.now() + 5 * 86400000),
        time: '14:00',
        type: 'individual',
        price: 500
      });
      expect(apt.canBeRescheduled()).toBe(true);
    });

    it('should reject appointment outside business hours', async () => {
      await expect(Appointment.create({
        user: userId,
        date: new Date(Date.now() + 5 * 86400000),
        time: '07:00', // before 9:00
        type: 'individual',
        price: 500
      })).rejects.toThrow();
    });
  });

  describe('Blog Model', () => {
    it('should create valid blog', async () => {
      const blog = await Blog.create({
        title: 'Test Blog',
        category: 'terapi',
        summary: 'Summary',
        content: 'Content'
      });
      expect(blog.published).toBe(true);
      expect(blog.image).toBe('default-blog.jpg');
    });

    it('should reject missing title', async () => {
      await expect(Blog.create({
        category: 'terapi',
        summary: 'S',
        content: 'C'
      })).rejects.toThrow();
    });
  });

  describe('Contact Model', () => {
    it('should create valid contact', async () => {
      const contact = await Contact.create({
        name: 'Test',
        email: 'test@test.com',
        subject: 'Subject',
        message: 'Message'
      });
      expect(contact.read).toBe(false);
    });

    it('should reject missing name', async () => {
      await expect(Contact.create({
        email: 'test@test.com',
        subject: 'S',
        message: 'M'
      })).rejects.toThrow();
    });
  });

  describe('SiteSettings Model', () => {
    it('should create settings with defaults', async () => {
      const settings = await SiteSettings.create({
        general: { siteTitle: 'Test' }
      });
      expect(settings.images.mainPhoto).toBe('psikolog-onur-uslu-professional.jpg');
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 11. MIDDLEWARE UNIT TESTS
// ═══════════════════════════════════════════════════════════════════════════════
describe('Auth Middleware – Unit Tests', () => {
  it('generateToken should return a valid JWT string', () => {
    const token = generateToken({ id: 'test-id', role: 'user' });
    expect(typeof token).toBe('string');
    expect(token.split('.').length).toBe(3); // JWT has 3 parts
  });

  it('generateRefreshToken should return a valid JWT string', () => {
    const token = generateRefreshToken({ id: 'test-id' });
    expect(typeof token).toBe('string');
    expect(token.split('.').length).toBe(3);
  });

  it('verifyRefreshToken should verify a valid refresh token', () => {
    const token = generateRefreshToken({ id: 'test-id' });
    const decoded = verifyRefreshToken(token);
    expect(decoded.id).toBe('test-id');
  });

  it('verifyRefreshToken should throw for invalid token', () => {
    expect(() => verifyRefreshToken('invalid-token')).toThrow();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 12. ERROR HANDLER
// ═══════════════════════════════════════════════════════════════════════════════
describe('Error Handler', () => {
  const errorHandler = require('../middleware/errorHandler');

  it('should handle CastError', () => {
    const err = { name: 'CastError' };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    errorHandler(err, {}, res, () => {});
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('should handle duplicate key error', () => {
    const err = { code: 11000, keyValue: { email: 'test@test.com' } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    errorHandler(err, {}, res, () => {});
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('should handle ValidationError', () => {
    const err = { name: 'ValidationError', errors: { name: { message: 'Name required' } } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    errorHandler(err, {}, res, () => {});
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('should handle JWT errors', () => {
    const err = { name: 'JsonWebTokenError' };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    errorHandler(err, {}, res, () => {});
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('should handle TokenExpiredError', () => {
    const err = { name: 'TokenExpiredError' };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    errorHandler(err, {}, res, () => {});
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('should default to 500 for unknown errors', () => {
    const err = { message: 'Unknown error' };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    errorHandler(err, {}, res, () => {});
    expect(res.status).toHaveBeenCalledWith(500);
  });
});
