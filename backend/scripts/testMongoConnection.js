#!/usr/bin/env node

/**
 * MongoDB Bağlantı Test Scripti
 * 
 * Bu script MongoDB cluster bağlantısını test eder ve:
 * - Connection string doğruluğunu kontrol eder
 * - Network access ve IP whitelist kontrolü yapar
 * - Database ve collection'ları oluşturur
 * - Bağlantı hızını test eder
 * - Error handling'i kontrol eder
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Appointment = require('../models/Appointment');

// Test sonuçları
const testResults = {
    connection: false,
    collections: [],
    performance: {},
    errors: []
};

// MongoDB bağlantı testi
async function testMongoConnection() {
    console.log('🔍 MongoDB Bağlantı Testi Başlatılıyor...\n');
    
    try {
        // 1. Connection string kontrolü
        const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/psikolog_db';
        console.log('📋 Connection String:', mongoUri.replace(/\/\/.*@/, '//***:***@')); // Güvenlik için maskele
        
        // 2. Bağlantı zamanı ölçümü
        const startTime = Date.now();
        
        // 3. MongoDB'ye bağlan
        await mongoose.connect(mongoUri, {
            maxPoolSize: 10,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
            bufferCommands: false
        });
        
        const connectionTime = Date.now() - startTime;
        testResults.connection = true;
        testResults.performance.connectionTime = connectionTime;
        
        console.log('✅ MongoDB bağlantısı başarılı!');
        console.log(`⏱️  Bağlantı süresi: ${connectionTime}ms`);
        console.log(`🌐 Host: ${mongoose.connection.host}`);
        console.log(`🗄️  Database: ${mongoose.connection.name}`);
        
        // 4. Collection'ları listele
        await listCollections();
        
        // 5. Test verisi ekle ve sil
        await testDataOperations();
        
        // 6. Bağlantı hızını test et
        await testConnectionSpeed();
        
        // 7. Index'leri kontrol et
        await checkIndexes();
        
        // 8. Test sonuçlarını göster
        showTestResults();
        
    } catch (error) {
        console.error('❌ MongoDB Bağlantı Hatası:', error.message);
        testResults.errors.push({
            type: 'Connection Error',
            message: error.message,
            code: error.code
        });
        
        // Hata türüne göre öneriler
        if (error.message.includes('ENOTFOUND')) {
            console.log('\n💡 Öneriler:');
            console.log('- MongoDB cluster URL\'ini kontrol edin');
            console.log('- Internet bağlantınızı kontrol edin');
            console.log('- DNS çözümlemesini kontrol edin');
        } else if (error.message.includes('Authentication failed')) {
            console.log('\n💡 Öneriler:');
            console.log('- Kullanıcı adı ve şifreyi kontrol edin');
            console.log('- Database kullanıcısının doğru yetkilere sahip olduğundan emin olun');
        } else if (error.message.includes('not authorized')) {
            console.log('\n💡 Öneriler:');
            console.log('- IP adresinizin whitelist\'te olduğundan emin olun');
            console.log('- Network Access ayarlarını kontrol edin');
            console.log('- 0.0.0.0/0 (tüm IP\'ler) veya kendi IP\'nizi ekleyin');
        } else if (error.message.includes('timeout')) {
            console.log('\n💡 Öneriler:');
            console.log('- Bağlantı timeout süresini artırın');
            console.log('- Network gecikmesini kontrol edin');
            console.log('- MongoDB cluster\'ın aktif olduğundan emin olun');
        }
        
        process.exit(1);
    } finally {
        // Bağlantıyı kapat
        if (mongoose.connection.readyState === 1) {
            await mongoose.connection.close();
            console.log('\n🔌 MongoDB bağlantısı kapatıldı');
        }
    }
}

// Collection'ları listele
async function listCollections() {
    console.log('\n📁 Mevcut Collections:');
    try {
        const collections = await mongoose.connection.db.listCollections().toArray();
        
        if (collections.length === 0) {
            console.log('   📝 Henüz collection oluşturulmamış');
        } else {
            collections.forEach(collection => {
                console.log(`   📄 ${collection.name}`);
                testResults.collections.push(collection.name);
            });
        }
    } catch (error) {
        console.error('❌ Collection listesi alınamadı:', error.message);
        testResults.errors.push({
            type: 'Collection List Error',
            message: error.message
        });
    }
}

// Test verisi ekle ve sil
async function testDataOperations() {
    console.log('\n🧪 Test Verisi İşlemleri:');
    
    try {
        // Test kullanıcısı oluştur
        const testUser = new User({
            name: 'Test User',
            email: 'test@example.com',
            password: 'testpassword123',
            role: 'user'
        });
        
        const startTime = Date.now();
        await testUser.save();
        const saveTime = Date.now() - startTime;
        
        console.log(`   ✅ Test kullanıcısı oluşturuldu (${saveTime}ms)`);
        
        // Test randevusu oluştur
        const testAppointment = new Appointment({
            patientName: 'Test Patient',
            patientEmail: 'patient@example.com',
            patientPhone: '+905551234567',
            appointmentDate: new Date(),
            appointmentTime: '14:00',
            service: 'Bireysel Terapi',
            status: 'pending',
            notes: 'Test randevusu'
        });
        
        const appointmentStartTime = Date.now();
        await testAppointment.save();
        const appointmentSaveTime = Date.now() - appointmentStartTime;
        
        console.log(`   ✅ Test randevusu oluşturuldu (${appointmentSaveTime}ms)`);
        
        // Test verilerini sil
        await User.deleteOne({ email: 'test@example.com' });
        await Appointment.deleteOne({ patientEmail: 'patient@example.com' });
        
        console.log('   🗑️  Test verileri temizlendi');
        
        testResults.performance.userSaveTime = saveTime;
        testResults.performance.appointmentSaveTime = appointmentSaveTime;
        
    } catch (error) {
        console.error('❌ Test verisi işlemleri hatası:', error.message);
        testResults.errors.push({
            type: 'Data Operations Error',
            message: error.message
        });
    }
}

// Bağlantı hızını test et
async function testConnectionSpeed() {
    console.log('\n⚡ Bağlantı Hızı Testi:');
    
    try {
        const iterations = 10;
        const times = [];
        
        for (let i = 0; i < iterations; i++) {
            const startTime = Date.now();
            await mongoose.connection.db.admin().ping();
            const endTime = Date.now();
            times.push(endTime - startTime);
        }
        
        const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
        const minTime = Math.min(...times);
        const maxTime = Math.max(...times);
        
        console.log(`   📊 Ortalama ping süresi: ${avgTime.toFixed(2)}ms`);
        console.log(`   🏃 En hızlı: ${minTime}ms`);
        console.log(`   🐌 En yavaş: ${maxTime}ms`);
        
        testResults.performance.avgPingTime = avgTime;
        testResults.performance.minPingTime = minTime;
        testResults.performance.maxPingTime = maxTime;
        
        // Hız değerlendirmesi
        if (avgTime < 100) {
            console.log('   🚀 Mükemmel hız!');
        } else if (avgTime < 500) {
            console.log('   ✅ İyi hız');
        } else if (avgTime < 1000) {
            console.log('   ⚠️  Orta hız');
        } else {
            console.log('   🐌 Yavaş bağlantı');
        }
        
    } catch (error) {
        console.error('❌ Bağlantı hızı testi hatası:', error.message);
        testResults.errors.push({
            type: 'Speed Test Error',
            message: error.message
        });
    }
}

// Index'leri kontrol et
async function checkIndexes() {
    console.log('\n🔍 Index Kontrolü:');
    
    try {
        // User collection index'leri
        const userIndexes = await User.collection.getIndexes();
        console.log('   👤 User Collection Index\'leri:');
        Object.keys(userIndexes).forEach(indexName => {
            console.log(`      - ${indexName}`);
        });
        
        // Appointment collection index'leri
        const appointmentIndexes = await Appointment.collection.getIndexes();
        console.log('   📅 Appointment Collection Index\'leri:');
        Object.keys(appointmentIndexes).forEach(indexName => {
            console.log(`      - ${indexName}`);
        });
        
    } catch (error) {
        console.error('❌ Index kontrolü hatası:', error.message);
        testResults.errors.push({
            type: 'Index Check Error',
            message: error.message
        });
    }
}

// Test sonuçlarını göster
function showTestResults() {
    console.log('\n📊 TEST SONUÇLARI');
    console.log('==================');
    
    console.log(`🔌 Bağlantı: ${testResults.connection ? '✅ Başarılı' : '❌ Başarısız'}`);
    console.log(`📁 Collections: ${testResults.collections.length} adet`);
    console.log(`⏱️  Bağlantı süresi: ${testResults.performance.connectionTime || 'N/A'}ms`);
    console.log(`⚡ Ortalama ping: ${testResults.performance.avgPingTime ? testResults.performance.avgPingTime.toFixed(2) + 'ms' : 'N/A'}`);
    console.log(`❌ Hata sayısı: ${testResults.errors.length}`);
    
    if (testResults.errors.length > 0) {
        console.log('\n🚨 HATALAR:');
        testResults.errors.forEach((error, index) => {
            console.log(`   ${index + 1}. ${error.type}: ${error.message}`);
        });
    }
    
    console.log('\n🎯 ÖNERİLER:');
    if (testResults.connection) {
        console.log('   ✅ MongoDB bağlantısı çalışıyor');
        console.log('   ✅ Backend API\'yi başlatabilirsiniz');
        console.log('   ✅ Admin paneli gerçek verilerle çalışacak');
    } else {
        console.log('   ❌ MongoDB bağlantısı kurulamadı');
        console.log('   ❌ Backend API çalışmayacak');
        console.log('   ⚠️  Admin paneli sadece mock data ile çalışacak');
    }
}

// Script'i çalıştır
if (require.main === module) {
    testMongoConnection()
        .then(() => {
            console.log('\n✅ MongoDB test tamamlandı');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n❌ Test sırasında hata:', error);
            process.exit(1);
        });
}

module.exports = { testMongoConnection, testResults };
