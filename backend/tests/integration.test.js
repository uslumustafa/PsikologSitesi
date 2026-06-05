const request = require('supertest');
const app = require('../server');
const mongoose = require('mongoose');
const User = require('../models/User');
const Appointment = require('../models/Appointment');
const Blog = require('../models/Blog');
const SiteSettings = require('../models/SiteSettings');
const Contact = require('../models/Contact');
const { generateToken } = require('../middleware/auth');

describe('System Integration Endpoints', () => {
  let adminToken;
  let adminUser;
  let regularToken;
  let regularUser;

  beforeEach(async () => {
    // Clean collections
    await User.deleteMany({});
    await Appointment.deleteMany({});
    await Blog.deleteMany({});
    await SiteSettings.deleteMany({});
    await Contact.deleteMany({});

    // Create Admin User
    adminUser = await User.create({
      name: 'Admin User',
      email: 'admin@test.com',
      password: 'password123',
      phone: '05531234567',
      role: 'admin',
      isActive: true,
      emailVerified: true
    });
    adminToken = generateToken({ id: adminUser._id, role: 'admin' });

    // Create Regular User
    regularUser = await User.create({
      name: 'Regular User',
      email: 'user@test.com',
      password: 'password123',
      phone: '05541234567',
      role: 'user',
      isActive: true,
      emailVerified: true
    });
    regularToken = generateToken({ id: regularUser._id, role: 'user' });
  });

  describe('Appointments Integration & Validation Bypasses', () => {
    it('should create an appointment with future date', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 2); // 2 days in the future
      
      const appointmentData = {
        date: futureDate.toISOString().split('T')[0],
        time: '14:00',
        type: 'individual',
        price: 500,
        notes: 'Integration test appointment'
      };

      const res = await request(app)
        .post('/api/appointments')
        .set('Authorization', `Bearer ${regularToken}`)
        .send(appointmentData)
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.appointment.notes).toBe(appointmentData.notes);
    });

    it('should fail to create an appointment with past date', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 2); // 2 days in the past
      
      const appointmentData = {
        date: pastDate.toISOString().split('T')[0],
        time: '14:00',
        type: 'individual',
        price: 500,
        notes: 'Past appointment test'
      };

      const res = await request(app)
        .post('/api/appointments')
        .set('Authorization', `Bearer ${regularToken}`)
        .send(appointmentData)
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it('should allow admin to update/reschedule past appointment', async () => {
      // 1. Manually insert a past appointment using MongoDB collection to bypass Mongoose pre-save validation
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 5);
      
      const appointment = new Appointment({
        user: regularUser._id,
        date: pastDate,
        time: '11:00',
        type: 'individual',
        price: 400,
        notes: 'Original past appointment'
      });
      
      await mongoose.connection.collection('appointments').insertOne(appointment.toObject());

      // 2. Admin tries to update the notes and details of this past appointment
      const updateData = {
        notes: 'Updated by Admin',
        price: 450
      };

      const res = await request(app)
        .put(`/api/appointments/${appointment._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.appointment.notes).toBe('Updated by Admin');
      expect(res.body.data.appointment.price).toBe(450);
    });

    it('should block regular user from updating appointment less than 12h away, but allow admin', async () => {
      // Setup appointment 2 hours from now dynamically
      const targetTime = new Date(Date.now() + 2 * 60 * 60 * 1000);
      const hoursStr = String(targetTime.getHours()).padStart(2, '0');
      const minutesStr = String(targetTime.getMinutes()).padStart(2, '0');

      const appointment = new Appointment({
        user: regularUser._id,
        date: targetTime,
        time: `${hoursStr}:${minutesStr}`,
        type: 'individual',
        price: 500,
        status: 'scheduled'
      });
      
      await mongoose.connection.collection('appointments').insertOne(appointment.toObject());

      // Try update as regular user (should fail with 403 because it is less than 12h)
      await request(app)
        .put(`/api/appointments/${appointment._id}`)
        .set('Authorization', `Bearer ${regularToken}`)
        .send({ notes: 'Updated notes user' })
        .expect(403);

      // Try update as admin (should succeed because admin bypasses this check)
      const res = await request(app)
        .put(`/api/appointments/${appointment._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ notes: 'Updated notes admin' })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.appointment.notes).toBe('Updated notes admin');
    });

    it('should create appointment without price (price is optional, defaults to 0)', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 3);

      const appointmentData = {
        date: futureDate.toISOString().split('T')[0],
        time: '15:00',
        type: 'couple',
        notes: 'No price appointment'
        // price intentionally omitted
      };

      const res = await request(app)
        .post('/api/appointments')
        .set('Authorization', `Bearer ${regularToken}`)
        .send(appointmentData)
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.appointment.type).toBe('couple');
    });

    it('should allow admin to update appointment status via PATCH', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 5);

      const appointment = new Appointment({
        user: regularUser._id,
        date: futureDate,
        time: '10:00',
        type: 'individual',
        price: 600,
        status: 'scheduled'
      });
      await appointment.save();

      const res = await request(app)
        .patch(`/api/admin/appointments/${appointment._id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'confirmed' })
        .expect(200);

      expect(res.body.success).toBe(true);
    });
  });

  describe('Blog Integration & Categories Route Precedence', () => {
    it('should retrieve categories list successfully without 404 from dynamic id route', async () => {
      const res = await request(app)
        .get('/api/blog/categories/list')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.data[0]).toHaveProperty('value');
      expect(res.body.data[0]).toHaveProperty('label');
    });

    it('should create, read, update, and delete a blog post as admin', async () => {
      const blogData = {
        title: 'BDT Nedir?',
        category: 'terapi',
        summary: 'Bilişsel davranışı anlamak.',
        content: 'Uzun ve detaylı içerik.',
        published: true
      };

      // 1. Create Blog
      const createRes = await request(app)
        .post('/api/blog')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(blogData)
        .expect(201);

      expect(createRes.body.success).toBe(true);
      const blogId = createRes.body.data.id;
      expect(blogId).toBeDefined();

      // 2. Read all blogs
      const getListRes = await request(app)
        .get('/api/blog')
        .expect(200);

      expect(getListRes.body.success).toBe(true);
      expect(getListRes.body.data.blogs.length).toBeGreaterThan(0);

      // 3. Read single blog
      const getSingleRes = await request(app)
        .get(`/api/blog/${blogId}`)
        .expect(200);

      expect(getSingleRes.body.success).toBe(true);
      expect(getSingleRes.body.data.title).toBe(blogData.title);

      // 4. Update Blog
      const updateData = {
        title: 'BDT Nedir? (Güncellendi)',
        summary: 'Güncellenmiş BDT özeti.'
      };

      const updateRes = await request(app)
        .put(`/api/blog/${blogId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(200);

      expect(updateRes.body.success).toBe(true);
      expect(updateRes.body.data.title).toBe(updateData.title);

      // 5. Delete Blog
      const deleteRes = await request(app)
        .delete(`/api/blog/${blogId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(deleteRes.body.success).toBe(true);

      // Verify deletion
      await request(app)
        .get(`/api/blog/${blogId}`)
        .expect(404);
    });
  });

  describe('Site Settings Integration', () => {
    it('should retrieve default site settings and allow admin to update them', async () => {
      // 1. Get Settings (should seed if empty)
      const getRes = await request(app)
        .get('/api/site-settings')
        .expect(200);

      expect(getRes.body.success).toBe(true);
      expect(getRes.body.data.general.siteTitle).toContain('Psikolog Onur Uslu');

      // 2. Update settings (fields: general, statistics)
      const updatePayload = {
        general: JSON.stringify({
          siteTitle: 'Yeni Site Başlığı',
          phone: '+90 555 555 55 55'
        }),
        statistics: JSON.stringify({
          experienceYears: 5,
          totalClients: 1000,
          successRate: 98
        })
      };

      const updateRes = await request(app)
        .put('/api/site-settings')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updatePayload)
        .expect(200);

      expect(updateRes.body.success).toBe(true);
      expect(updateRes.body.data.general.siteTitle).toBe('Yeni Site Başlığı');
      expect(updateRes.body.data.statistics.experienceYears).toBe(5);

      // 3. Reset settings
      const resetRes = await request(app)
        .post('/api/site-settings/reset')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(resetRes.body.success).toBe(true);
      expect(resetRes.body.data.general.siteTitle).toContain('Psikolog Onur Uslu');
    });
  });

  describe('Contact Messages Integration', () => {
    it('should submit a contact message and allow admin to fetch list', async () => {
      const messageData = {
        name: 'Veli Can',
        email: 'veli@test.com',
        subject: 'Randevu Talebi',
        message: 'Bireysel terapi almak istiyorum.'
      };

      // 1. Submit message
      const postRes = await request(app)
        .post('/api/contact')
        .send(messageData)
        .expect(201);

      expect(postRes.body.success).toBe(true);
      expect(postRes.body.data.name).toBe(messageData.name);

      // 2. Get list as admin
      const getRes = await request(app)
        .get('/api/contact')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(getRes.body.success).toBe(true);
      expect(getRes.body.data.messages.length).toBeGreaterThan(0);
      expect(getRes.body.data.messages[0].email).toBe(messageData.email);

      // 3. Get list as regular user should be blocked (403)
      await request(app)
        .get('/api/contact')
        .set('Authorization', `Bearer ${regularToken}`)
        .expect(403);
    });
  });
});
