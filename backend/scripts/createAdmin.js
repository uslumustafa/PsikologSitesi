const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

async function createAdmin() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB Connected');

    const adminEmail = (process.env.ADMIN_EMAIL || 'admin@psikologonuruslu.com').toLowerCase();
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: adminEmail });
    if (existingAdmin) {
      console.log('Admin user already exists:', adminEmail);
      return;
    }

    // Create admin user
    const adminUser = new User({
      name: 'Admin',
      email: adminEmail,
      password: adminPassword, // This will be hashed automatically
      phone: '05551234567',
      role: 'admin',
      isActive: true,
      emailVerified: true,
      profile: {
        bio: 'Sistem Yöneticisi',
        specialization: 'Yönetim',
        experience: 5
      }
    });

    await adminUser.save();
    console.log('Admin user created successfully');
    console.log('Email:', adminEmail);
    console.log('Password: (ADMIN_PASSWORD .env değerinden alındı)');

  } catch (error) {
    console.error('Error creating admin user:', error);
  } finally {
    await mongoose.disconnect();
    console.log('MongoDB Disconnected');
  }
}

createAdmin();
