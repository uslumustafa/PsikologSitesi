const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const User = require('../models/User');
const Appointment = require('../models/Appointment');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/psikolog_db');
    console.log('MongoDB connected for seeding');
  } catch (error) {
    console.error('Database connection error:', error);
    process.exit(1);
  }
};

const seedUsers = async () => {
  try {
    // Clear existing users
    await User.deleteMany({});

    // Create admin user
    const adminUser = new User({
      name: 'Onur Uslu',
      email: 'admin@psikologonuruslu.com',
      password: 'admin123',
      phone: '05530263774',
      role: 'admin',
      isActive: true,
      emailVerified: true,
      profile: {
        dateOfBirth: new Date('1985-01-15'),
        gender: 'male',
        address: {
          street: 'Gebze Merkez',
          city: 'Gebze',
          postalCode: '41400',
          country: 'Turkey'
        },
        emergencyContact: {
          name: 'Ayşe Uslu',
          phone: '05551234567',
          relationship: 'Spouse'
        },
        medicalInfo: {
          hasInsurance: true,
          insuranceProvider: 'SGK',
          previousTherapy: false,
          currentMedications: [],
          allergies: [],
          medicalConditions: []
        }
      }
    });

    await adminUser.save();
    console.log('Admin user created:', adminUser.email);

    // Create sample users
    const sampleUsers = [
      {
        name: 'Ahmet Yılmaz',
        email: 'ahmet@example.com',
        password: 'user123',
        phone: '05551234567',
        role: 'user',
        isActive: true,
        emailVerified: true,
        profile: {
          dateOfBirth: new Date('1990-05-20'),
          gender: 'male',
          address: {
            street: 'Atatürk Caddesi No:123',
            city: 'Gebze',
            postalCode: '41400',
            country: 'Turkey'
          },
          emergencyContact: {
            name: 'Fatma Yılmaz',
            phone: '05551234568',
            relationship: 'Mother'
          },
          medicalInfo: {
            hasInsurance: true,
            insuranceProvider: 'SGK',
            previousTherapy: true,
            currentMedications: ['Antidepressant'],
            allergies: ['Pollen'],
            medicalConditions: ['Anxiety']
          }
        }
      },
      {
        name: 'Ayşe Demir',
        email: 'ayse@example.com',
        password: 'user123',
        phone: '05551234569',
        role: 'user',
        isActive: true,
        emailVerified: true,
        profile: {
          dateOfBirth: new Date('1988-12-10'),
          gender: 'female',
          address: {
            street: 'Cumhuriyet Mahallesi No:45',
            city: 'Gebze',
            postalCode: '41400',
            country: 'Turkey'
          },
          emergencyContact: {
            name: 'Mehmet Demir',
            phone: '05551234570',
            relationship: 'Husband'
          },
          medicalInfo: {
            hasInsurance: true,
            insuranceProvider: 'SGK',
            previousTherapy: false,
            currentMedications: [],
            allergies: [],
            medicalConditions: []
          }
        }
      },
      {
        name: 'Mehmet Kaya',
        email: 'mehmet@example.com',
        password: 'user123',
        phone: '05551234571',
        role: 'user',
        isActive: true,
        emailVerified: false,
        profile: {
          dateOfBirth: new Date('1992-08-15'),
          gender: 'male',
          address: {
            street: 'İnönü Bulvarı No:78',
            city: 'Gebze',
            postalCode: '41400',
            country: 'Turkey'
          },
          emergencyContact: {
            name: 'Zeynep Kaya',
            phone: '05551234572',
            relationship: 'Sister'
          },
          medicalInfo: {
            hasInsurance: false,
            insuranceProvider: '',
            previousTherapy: false,
            currentMedications: [],
            allergies: [],
            medicalConditions: []
          }
        }
      }
    ];

    for (const userData of sampleUsers) {
      const user = new User(userData);
      await user.save();
      console.log('Sample user created:', user.email);
    }

    console.log('Users seeded successfully');
  } catch (error) {
    console.error('Error seeding users:', error);
  }
};

const seedAppointments = async () => {
  try {
    // Clear existing appointments
    await Appointment.deleteMany({});

    // Get users for appointments
    const users = await User.find({ role: 'user' });
    const admin = await User.findOne({ role: 'admin' });

    if (users.length === 0) {
      console.log('No users found for appointments');
      return;
    }

    const appointmentTypes = ['individual', 'couple', 'online', 'in-person'];
    const statuses = ['scheduled', 'confirmed', 'completed', 'cancelled'];
    const prices = [400, 500, 600, 700];

    // Create sample appointments
    const appointments = [];

    // Past appointments
    for (let i = 0; i < 10; i++) {
      const user = users[Math.floor(Math.random() * users.length)];
      const date = new Date();
      date.setDate(date.getDate() - Math.floor(Math.random() * 30));
      date.setHours(9 + Math.floor(Math.random() * 8), Math.random() > 0.5 ? 0 : 30, 0, 0);

      const appointment = new Appointment({
        user: user._id,
        date: date,
        time: `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`,
        type: appointmentTypes[Math.floor(Math.random() * appointmentTypes.length)],
        status: statuses[Math.floor(Math.random() * statuses.length)],
        duration: 50,
        notes: `Sample appointment ${i + 1}`,
        price: prices[Math.floor(Math.random() * prices.length)],
        paymentStatus: Math.random() > 0.3 ? 'paid' : 'pending',
        sessionNotes: Math.random() > 0.5 ? `Session notes for appointment ${i + 1}` : undefined,
        followUpRequired: Math.random() > 0.7
      });

      appointments.push(appointment);
    }

    // Future appointments
    for (let i = 0; i < 15; i++) {
      const user = users[Math.floor(Math.random() * users.length)];
      const date = new Date();
      date.setDate(date.getDate() + Math.floor(Math.random() * 30) + 1);
      date.setHours(9 + Math.floor(Math.random() * 8), Math.random() > 0.5 ? 0 : 30, 0, 0);

      const appointment = new Appointment({
        user: user._id,
        date: date,
        time: `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`,
        type: appointmentTypes[Math.floor(Math.random() * appointmentTypes.length)],
        status: Math.random() > 0.3 ? 'scheduled' : 'confirmed',
        duration: 50,
        notes: `Future appointment ${i + 1}`,
        price: prices[Math.floor(Math.random() * prices.length)],
        paymentStatus: Math.random() > 0.5 ? 'paid' : 'pending',
        reminders: [
          {
            type: 'email',
            sent: false,
            scheduledFor: new Date(date.getTime() - 24 * 60 * 60 * 1000)
          },
          {
            type: 'email',
            sent: false,
            scheduledFor: new Date(date.getTime() - 2 * 60 * 60 * 1000)
          }
        ]
      });

      appointments.push(appointment);
    }

    // Save all appointments
    await Appointment.insertMany(appointments);
    console.log(`${appointments.length} appointments seeded successfully`);
  } catch (error) {
    console.error('Error seeding appointments:', error);
  }
};

const seedDatabase = async () => {
  try {
    await connectDB();
    
    console.log('Starting database seeding...');
    
    await seedUsers();
    await seedAppointments();
    
    console.log('Database seeding completed successfully!');
    
    // Display summary
    const userCount = await User.countDocuments();
    const appointmentCount = await Appointment.countDocuments();
    
    console.log('\n=== SEEDING SUMMARY ===');
    console.log(`Users created: ${userCount}`);
    console.log(`Appointments created: ${appointmentCount}`);
    console.log('\n=== LOGIN CREDENTIALS ===');
    console.log('Admin: admin@psikologonuruslu.com / admin123');
    console.log('User: ahmet@example.com / user123');
    console.log('User: ayse@example.com / user123');
    console.log('User: mehmet@example.com / user123');
    
    process.exit(0);
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  }
};

// Run seeding if this file is executed directly
if (require.main === module) {
  seedDatabase();
}

module.exports = { seedDatabase, seedUsers, seedAppointments };
