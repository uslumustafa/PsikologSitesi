const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

async function createAdmin() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB Connected');

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: 'admin@psikologonuruslu.com' });
    if (existingAdmin) {
      console.log('Admin user already exists');
      return;
    }

    // Create admin user
    const adminUser = new User({
      name: 'Admin',
      email: 'admin@psikologonuruslu.com',
      password: 'admin123', // This will be hashed automatically
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
    console.log('Email: admin@psikologonuruslu.com');
    console.log('Password: admin123');

  } catch (error) {
    console.error('Error creating admin user:', error);
  } finally {
    await mongoose.disconnect();
    console.log('MongoDB Disconnected');
  }
}

createAdmin();
