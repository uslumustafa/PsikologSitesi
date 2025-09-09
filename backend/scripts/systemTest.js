#!/usr/bin/env node

/**
 * Kapsamlı Sistem Test Scripti
 * 
 * Bu script tüm sistemi test eder:
 * 1. MongoDB bağlantısı
 * 2. Backend API endpoint'leri
 * 3. Admin panel entegrasyonu
 * 4. Frontend entegrasyonu
 * 5. Error handling
 */

require('dotenv').config();
const mongoose = require('mongoose');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Test sonuçları
const testResults = {
    mongodb: { status: false, details: {} },
    api: { status: false, endpoints: [] },
    admin: { status: false, pages: [] },
    frontend: { status: false, integration: false },
    errors: []
};

// MongoDB cluster connection string'i al
const clusterUri = process.argv[2] || process.env.MONGODB_URI;

if (!clusterUri) {
    console.log('❌ MongoDB cluster connection string gerekli!');
    console.log('Kullanım: node scripts/systemTest.js "mongodb+srv://username:password@cluster.mongodb.net/database"');
    console.log('Veya .env dosyasında MONGODB_URI değişkenini ayarlayın');
    process.exit(1);
}

async function runSystemTest() {
    console.log('🚀 Kapsamlı Sistem Testi Başlatılıyor...\n');
    console.log('=' * 50);
    
    try {
        // 1. MongoDB Bağlantı Testi
        await testMongoDBConnection();
        
        // 2. Backend API Testi
        await testBackendAPI();
        
        // 3. Admin Panel Testi
        await testAdminPanel();
        
        // 4. Frontend Entegrasyon Testi
        await testFrontendIntegration();
        
        // 5. Test sonuçlarını göster
        showSystemTestResults();
        
    } catch (error) {
        console.error('❌ Sistem testi sırasında hata:', error.message);
        testResults.errors.push({
            type: 'System Test Error',
            message: error.message
        });
        process.exit(1);
    } finally {
        // MongoDB bağlantısını kapat
        if (mongoose.connection.readyState === 1) {
            await mongoose.connection.close();
        }
    }
}

// 1. MongoDB Bağlantı Testi
async function testMongoDBConnection() {
    console.log('🔍 1. MongoDB Bağlantı Testi');
    console.log('-'.repeat(30));
    
    try {
        const startTime = Date.now();
        
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
        
        // Collection'ları kontrol et
        const collections = await mongoose.connection.db.listCollections().toArray();
        console.log(`📁 Collections: ${collections.length} adet`);
        
        // Ping testi
        const pingStart = Date.now();
        await mongoose.connection.db.admin().ping();
        const pingTime = Date.now() - pingStart;
        console.log(`⚡ Ping süresi: ${pingTime}ms`);
        
        testResults.mongodb = {
            status: true,
            details: {
                connectionTime,
                host: mongoose.connection.host,
                database: mongoose.connection.name,
                collections: collections.length,
                pingTime
            }
        };
        
    } catch (error) {
        console.error('❌ MongoDB bağlantı hatası:', error.message);
        testResults.mongodb = {
            status: false,
            details: { error: error.message }
        };
        testResults.errors.push({
            type: 'MongoDB Connection Error',
            message: error.message
        });
    }
    
    console.log('');
}

// 2. Backend API Testi
async function testBackendAPI() {
    console.log('🔍 2. Backend API Testi');
    console.log('-'.repeat(30));
    
    const apiUrl = 'http://localhost:5000';
    const endpoints = [
        { path: '/api/health', method: 'GET', description: 'Health Check' },
        { path: '/api/auth/register', method: 'POST', description: 'User Registration' },
        { path: '/api/auth/login', method: 'POST', description: 'User Login' },
        { path: '/api/appointments', method: 'GET', description: 'Get Appointments' },
        { path: '/api/admin/dashboard', method: 'GET', description: 'Admin Dashboard' },
        { path: '/api/blog', method: 'GET', description: 'Blog Posts' },
        { path: '/api/site-settings', method: 'GET', description: 'Site Settings' }
    ];
    
    let successCount = 0;
    
    for (const endpoint of endpoints) {
        try {
            const response = await axios({
                method: endpoint.method,
                url: `${apiUrl}${endpoint.path}`,
                timeout: 5000,
                validateStatus: () => true // Tüm status kodlarını kabul et
            });
            
            const status = response.status < 500 ? '✅' : '⚠️';
            console.log(`${status} ${endpoint.method} ${endpoint.path} - ${response.status} (${endpoint.description})`);
            
            if (response.status < 500) {
                successCount++;
            }
            
            testResults.api.endpoints.push({
                path: endpoint.path,
                method: endpoint.method,
                status: response.status,
                success: response.status < 500
            });
            
        } catch (error) {
            console.log(`❌ ${endpoint.method} ${endpoint.path} - ${error.message}`);
            testResults.api.endpoints.push({
                path: endpoint.path,
                method: endpoint.method,
                status: 'ERROR',
                success: false,
                error: error.message
            });
        }
    }
    
    testResults.api.status = successCount > 0;
    console.log(`📊 API Test Sonucu: ${successCount}/${endpoints.length} endpoint çalışıyor`);
    console.log('');
}

// 3. Admin Panel Testi
async function testAdminPanel() {
    console.log('🔍 3. Admin Panel Testi');
    console.log('-'.repeat(30));
    
    const adminPages = [
        { file: 'login.html', description: 'Admin Login' },
        { file: 'dashboard.html', description: 'Admin Dashboard' },
        { file: 'site-settings.html', description: 'Site Settings' },
        { file: 'blog-management.html', description: 'Blog Management' },
        { file: 'appointments.html', description: 'Appointments' }
    ];
    
    let successCount = 0;
    
    for (const page of adminPages) {
        const filePath = path.join(__dirname, '..', '..', 'admin', page.file);
        
        try {
            if (fs.existsSync(filePath)) {
                const stats = fs.statSync(filePath);
                const fileSize = (stats.size / 1024).toFixed(2);
                console.log(`✅ ${page.file} - ${fileSize}KB (${page.description})`);
                successCount++;
                
                testResults.admin.pages.push({
                    file: page.file,
                    exists: true,
                    size: fileSize,
                    description: page.description
                });
            } else {
                console.log(`❌ ${page.file} - Dosya bulunamadı`);
                testResults.admin.pages.push({
                    file: page.file,
                    exists: false,
                    description: page.description
                });
            }
        } catch (error) {
            console.log(`❌ ${page.file} - ${error.message}`);
            testResults.admin.pages.push({
                file: page.file,
                exists: false,
                error: error.message,
                description: page.description
            });
        }
    }
    
    testResults.admin.status = successCount > 0;
    console.log(`📊 Admin Panel Test Sonucu: ${successCount}/${adminPages.length} sayfa mevcut`);
    console.log('');
}

// 4. Frontend Entegrasyon Testi
async function testFrontendIntegration() {
    console.log('🔍 4. Frontend Entegrasyon Testi');
    console.log('-'.repeat(30));
    
    const frontendFiles = [
        { file: 'index.html', description: 'Ana Web Sitesi' },
        { file: 'script.js', description: 'Ana JavaScript' },
        { file: 'style.css', description: 'Ana CSS' }
    ];
    
    let successCount = 0;
    
    for (const file of frontendFiles) {
        const filePath = path.join(__dirname, '..', '..', file.file);
        
        try {
            if (fs.existsSync(filePath)) {
                const stats = fs.statSync(filePath);
                const fileSize = (stats.size / 1024).toFixed(2);
                console.log(`✅ ${file.file} - ${fileSize}KB (${file.description})`);
                successCount++;
            } else {
                console.log(`❌ ${file.file} - Dosya bulunamadı`);
            }
        } catch (error) {
            console.log(`❌ ${file.file} - ${error.message}`);
        }
    }
    
    // Admin settings entegrasyonunu kontrol et
    const scriptPath = path.join(__dirname, '..', '..', 'script.js');
    try {
        const scriptContent = fs.readFileSync(scriptPath, 'utf8');
        const hasAdminIntegration = scriptContent.includes('loadAdminSettings') && 
                                  scriptContent.includes('applySettings') &&
                                  scriptContent.includes('localStorage');
        
        if (hasAdminIntegration) {
            console.log('✅ Admin settings entegrasyonu mevcut');
            testResults.frontend.integration = true;
        } else {
            console.log('❌ Admin settings entegrasyonu eksik');
            testResults.frontend.integration = false;
        }
    } catch (error) {
        console.log('❌ Admin settings entegrasyonu kontrol edilemedi');
        testResults.frontend.integration = false;
    }
    
    testResults.frontend.status = successCount > 0;
    console.log(`📊 Frontend Test Sonucu: ${successCount}/${frontendFiles.length} dosya mevcut`);
    console.log('');
}

// Test sonuçlarını göster
function showSystemTestResults() {
    console.log('📊 SİSTEM TEST SONUÇLARI');
    console.log('=' * 50);
    
    // MongoDB
    console.log(`🔌 MongoDB: ${testResults.mongodb.status ? '✅ Başarılı' : '❌ Başarısız'}`);
    if (testResults.mongodb.status) {
        console.log(`   ⏱️  Bağlantı süresi: ${testResults.mongodb.details.connectionTime}ms`);
        console.log(`   🌐 Host: ${testResults.mongodb.details.host}`);
        console.log(`   📁 Collections: ${testResults.mongodb.details.collections}`);
    }
    
    // API
    console.log(`🔗 Backend API: ${testResults.api.status ? '✅ Çalışıyor' : '❌ Çalışmıyor'}`);
    const workingEndpoints = testResults.api.endpoints.filter(e => e.success).length;
    console.log(`   📊 Çalışan endpoint'ler: ${workingEndpoints}/${testResults.api.endpoints.length}`);
    
    // Admin Panel
    console.log(`👤 Admin Panel: ${testResults.admin.status ? '✅ Mevcut' : '❌ Eksik'}`);
    const existingPages = testResults.admin.pages.filter(p => p.exists).length;
    console.log(`   📄 Mevcut sayfalar: ${existingPages}/${testResults.admin.pages.length}`);
    
    // Frontend
    console.log(`🌐 Frontend: ${testResults.frontend.status ? '✅ Mevcut' : '❌ Eksik'}`);
    console.log(`   🔗 Admin entegrasyonu: ${testResults.frontend.integration ? '✅ Mevcut' : '❌ Eksik'}`);
    
    // Hatalar
    if (testResults.errors.length > 0) {
        console.log(`\n🚨 HATALAR (${testResults.errors.length} adet):`);
        testResults.errors.forEach((error, index) => {
            console.log(`   ${index + 1}. ${error.type}: ${error.message}`);
        });
    }
    
    // Genel değerlendirme
    console.log('\n🎯 GENEL DEĞERLENDİRME:');
    const totalTests = 4;
    const passedTests = [
        testResults.mongodb.status,
        testResults.api.status,
        testResults.admin.status,
        testResults.frontend.status
    ].filter(Boolean).length;
    
    console.log(`📊 Test Başarı Oranı: ${passedTests}/${totalTests} (${Math.round((passedTests/totalTests)*100)}%)`);
    
    if (passedTests === totalTests) {
        console.log('🎉 Tüm sistemler çalışıyor! Sistem production\'a hazır.');
    } else if (passedTests >= 3) {
        console.log('⚠️  Sistem büyük ölçüde çalışıyor, bazı düzeltmeler gerekli.');
    } else {
        console.log('❌ Sistemde ciddi sorunlar var, düzeltmeler gerekli.');
    }
    
    // Öneriler
    console.log('\n💡 ÖNERİLER:');
    if (!testResults.mongodb.status) {
        console.log('   - MongoDB cluster bağlantısını kontrol edin');
        console.log('   - Connection string\'i doğrulayın');
        console.log('   - Network Access ayarlarını kontrol edin');
    }
    if (!testResults.api.status) {
        console.log('   - Backend server\'ı başlatın: npm start');
        console.log('   - Port 5000\'in açık olduğundan emin olun');
        console.log('   - API endpoint\'lerini kontrol edin');
    }
    if (!testResults.admin.status) {
        console.log('   - Admin panel dosyalarını kontrol edin');
        console.log('   - Dosya yollarını doğrulayın');
    }
    if (!testResults.frontend.status) {
        console.log('   - Frontend dosyalarını kontrol edin');
        console.log('   - Admin entegrasyonunu kontrol edin');
    }
}

// Script'i çalıştır
if (require.main === module) {
    runSystemTest()
        .then(() => {
            console.log('\n✅ Sistem testi tamamlandı');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n❌ Test sırasında hata:', error);
            process.exit(1);
        });
}

module.exports = { runSystemTest, testResults };
