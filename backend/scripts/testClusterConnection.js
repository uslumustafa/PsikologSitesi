#!/usr/bin/env node

/**
 * MongoDB Cluster Bağlantı Test Scripti
 * 
 * Bu script MongoDB cluster bağlantısını test eder
 * Kullanım: node scripts/testClusterConnection.js "mongodb+srv://..."
 */

require('dotenv').config();
const mongoose = require('mongoose');

// MongoDB cluster connection string'i al
const clusterUri = process.argv[2] || process.env.MONGODB_URI;

if (!clusterUri) {
    console.log('❌ MongoDB cluster connection string gerekli!');
    console.log('Kullanım: node scripts/testClusterConnection.js "mongodb+srv://username:password@cluster.mongodb.net/database"');
    console.log('Veya .env dosyasında MONGODB_URI değişkenini ayarlayın');
    process.exit(1);
}

async function testClusterConnection() {
    console.log('🔍 MongoDB Cluster Bağlantı Testi Başlatılıyor...\n');
    
    try {
        // Connection string'i maskele (güvenlik için)
        const maskedUri = clusterUri.replace(/\/\/.*@/, '//***:***@');
        console.log('📋 Connection String:', maskedUri);
        
        // Bağlantı zamanı ölçümü
        const startTime = Date.now();
        
        // MongoDB cluster'a bağlan
        await mongoose.connect(clusterUri, {
            maxPoolSize: 10,
            serverSelectionTimeoutMS: 10000,
            socketTimeoutMS: 45000,
            bufferCommands: false
        });
        
        const connectionTime = Date.now() - startTime;
        
        console.log('✅ MongoDB cluster bağlantısı başarılı!');
        console.log(`⏱️  Bağlantı süresi: ${connectionTime}ms`);
        console.log(`🌐 Host: ${mongoose.connection.host}`);
        console.log(`🗄️  Database: ${mongoose.connection.name}`);
        console.log(`🔗 Connection State: ${mongoose.connection.readyState}`);
        
        // Database bilgilerini al
        const db = mongoose.connection.db;
        const admin = db.admin();
        
        // Server bilgilerini al
        const serverInfo = await admin.serverStatus();
        console.log(`📊 MongoDB Version: ${serverInfo.version}`);
        console.log(`💾 Uptime: ${Math.floor(serverInfo.uptime / 60)} dakika`);
        
        // Collection'ları listele
        console.log('\n📁 Mevcut Collections:');
        const collections = await db.listCollections().toArray();
        
        if (collections.length === 0) {
            console.log('   📝 Henüz collection oluşturulmamış');
        } else {
            collections.forEach(collection => {
                console.log(`   📄 ${collection.name}`);
            });
        }
        
        // Ping testi
        console.log('\n⚡ Ping Testi:');
        const pingStart = Date.now();
        await admin.ping();
        const pingTime = Date.now() - pingStart;
        console.log(`   📊 Ping süresi: ${pingTime}ms`);
        
        if (pingTime < 100) {
            console.log('   🚀 Mükemmel hız!');
        } else if (pingTime < 500) {
            console.log('   ✅ İyi hız');
        } else if (pingTime < 1000) {
            console.log('   ⚠️  Orta hız');
        } else {
            console.log('   🐌 Yavaş bağlantı');
        }
        
        console.log('\n🎯 ÖNERİLER:');
        console.log('   ✅ MongoDB cluster bağlantısı çalışıyor');
        console.log('   ✅ Backend API\'yi başlatabilirsiniz');
        console.log('   ✅ Admin paneli gerçek verilerle çalışacak');
        console.log('   ✅ Tüm sistem MongoDB ile entegre çalışacak');
        
    } catch (error) {
        console.error('❌ MongoDB Cluster Bağlantı Hatası:', error.message);
        
        // Hata türüne göre öneriler
        if (error.message.includes('ENOTFOUND') || error.message.includes('getaddrinfo ENOTFOUND')) {
            console.log('\n💡 Öneriler:');
            console.log('- MongoDB cluster URL\'ini kontrol edin');
            console.log('- Internet bağlantınızı kontrol edin');
            console.log('- DNS çözümlemesini kontrol edin');
            console.log('- Cluster\'ın aktif olduğundan emin olun');
        } else if (error.message.includes('Authentication failed') || error.message.includes('auth failed')) {
            console.log('\n💡 Öneriler:');
            console.log('- Kullanıcı adı ve şifreyi kontrol edin');
            console.log('- Database kullanıcısının doğru yetkilere sahip olduğundan emin olun');
            console.log('- Kullanıcının database\'e erişim yetkisi olduğundan emin olun');
        } else if (error.message.includes('not authorized') || error.message.includes('unauthorized')) {
            console.log('\n💡 Öneriler:');
            console.log('- IP adresinizin Network Access whitelist\'inde olduğundan emin olun');
            console.log('- 0.0.0.0/0 (tüm IP\'ler) veya kendi IP\'nizi ekleyin');
            console.log('- MongoDB Atlas Network Access ayarlarını kontrol edin');
        } else if (error.message.includes('timeout') || error.message.includes('ETIMEDOUT')) {
            console.log('\n💡 Öneriler:');
            console.log('- Bağlantı timeout süresini artırın');
            console.log('- Network gecikmesini kontrol edin');
            console.log('- MongoDB cluster\'ın aktif olduğundan emin olun');
            console.log('- Firewall ayarlarını kontrol edin');
        } else if (error.message.includes('SSL') || error.message.includes('TLS')) {
            console.log('\n💡 Öneriler:');
            console.log('- SSL/TLS sertifikalarını kontrol edin');
            console.log('- MongoDB driver versiyonunu güncelleyin');
            console.log('- Connection string\'de SSL ayarlarını kontrol edin');
        }
        
        process.exit(1);
    } finally {
        // Bağlantıyı kapat
        if (mongoose.connection.readyState === 1) {
            await mongoose.connection.close();
            console.log('\n🔌 MongoDB cluster bağlantısı kapatıldı');
        }
    }
}

// Script'i çalıştır
if (require.main === module) {
    testClusterConnection()
        .then(() => {
            console.log('\n✅ MongoDB cluster test tamamlandı');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n❌ Test sırasında hata:', error);
            process.exit(1);
        });
}

module.exports = { testClusterConnection };
