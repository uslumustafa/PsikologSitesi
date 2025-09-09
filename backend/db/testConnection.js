const mongoose = require('mongoose');
require('dotenv').config();

async function testConnection() {
    try {
        console.log('🔍 MongoDB Bağlantı Testi Başlatılıyor...\n');
        
        const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/psikolog_db';
        console.log(`📡 Connection String: ${mongoUri.replace(/\/\/.*@/, '//***:***@')}`);
        
        // Bağlantı ayarları
        const options = {
            maxPoolSize: 10,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
            bufferCommands: false
        };
        
        console.log('⏳ Bağlantı kuruluyor...');
        const startTime = Date.now();
        
        await mongoose.connect(mongoUri, options);
        
        const connectionTime = Date.now() - startTime;
        console.log(`✅ MongoDB bağlantısı başarılı!`);
        console.log(`⏱️  Bağlantı süresi: ${connectionTime}ms`);
        console.log(`🌐 Host: ${mongoose.connection.host}`);
        console.log(`🗄️  Database: ${mongoose.connection.name}`);
        
        // Database bilgileri
        const admin = mongoose.connection.db.admin();
        const serverStatus = await admin.serverStatus();
        console.log(`📊 MongoDB Version: ${serverStatus.version}`);
        console.log(`⏰ Uptime: ${Math.floor(serverStatus.uptime / 60)} dakika`);
        
        // Collections listesi
        const collections = await mongoose.connection.db.listCollections().toArray();
        console.log(`\n📁 Mevcut Collections:`);
        collections.forEach(collection => {
            console.log(`   📄 ${collection.name}`);
        });
        
        // Ping testi
        const pingStart = Date.now();
        await mongoose.connection.db.admin().ping();
        const pingTime = Date.now() - pingStart;
        console.log(`\n⚡ Ping Testi:`);
        console.log(`   Ping süresi: ${pingTime}ms`);
        
        if (pingTime < 100) {
            console.log(`   🚀 Mükemmel hız!`);
        } else if (pingTime < 500) {
            console.log(`   ✅ İyi hız`);
        } else {
            console.log(`   ⚠️  Yavaş bağlantı`);
        }
        
        console.log(`\n🎯 ÖNERİLER:`);
        console.log(`   ✅ MongoDB bağlantısı çalışıyor`);
        console.log(`   ✅ Backend API'yi başlatabilirsiniz`);
        console.log(`   ✅ Admin paneli gerçek verilerle çalışacak`);
        console.log(`   ✅ Tüm sistem MongoDB ile entegre çalışacak`);
        
    } catch (error) {
        console.error('❌ MongoDB Bağlantı Hatası:', error.message);
        
        if (error.message.includes('ECONNREFUSED')) {
            console.log('\n💡 ÇÖZÜM ÖNERİLERİ:');
            console.log('   1. MongoDB cluster\'ınızın çalıştığından emin olun');
            console.log('   2. Connection string\'in doğru olduğunu kontrol edin');
            console.log('   3. Network Access IP whitelist\'i kontrol edin');
            console.log('   4. Kullanıcı adı ve şifrenin doğru olduğunu kontrol edin');
        } else if (error.message.includes('ENOTFOUND')) {
            console.log('\n💡 ÇÖZÜM ÖNERİLERİ:');
            console.log('   1. Connection string\'deki host adını kontrol edin');
            console.log('   2. DNS çözümlemesi yapılamıyor');
            console.log('   3. İnternet bağlantınızı kontrol edin');
        } else if (error.message.includes('authentication failed')) {
            console.log('\n💡 ÇÖZÜM ÖNERİLERİ:');
            console.log('   1. Kullanıcı adı ve şifreyi kontrol edin');
            console.log('   2. Kullanıcının database yetkisi olduğundan emin olun');
            console.log('   3. MongoDB Atlas\'ta kullanıcı ayarlarını kontrol edin');
        }
        
        process.exit(1);
    } finally {
        await mongoose.connection.close();
        console.log('\n🔌 Bağlantı kapatıldı');
    }
}

// Script çalıştırıldığında test et
if (require.main === module) {
    testConnection();
}

module.exports = testConnection;
