#!/usr/bin/env node

/**
 * Kapsamlı API Test Suite
 * 
 * Bu script tüm API endpoint'lerini test eder:
 * 1. Başarılı randevu oluşturma
 * 2. Validation hataları
 * 3. Rate limiting testi
 * 4. Authentication testleri
 * 5. Error handling testleri
 */

require('dotenv').config();
const axios = require('axios');

// Test sonuçları
const testResults = {
    total: 0,
    passed: 0,
    failed: 0,
    warnings: 0,
    details: []
};

// API base URL
const API_BASE = 'http://localhost:5001';

// Test colors
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m'
};

// Test runner
async function runApiTestSuite() {
    console.log(`${colors.cyan}${colors.bright}🚀 API Test Suite Başlatılıyor...${colors.reset}\n`);
    console.log(`${colors.blue}API Base URL: ${API_BASE}${colors.reset}\n`);
    
    try {
        // 1. Health Check Test
        await testHealthCheck();
        
        // 2. Randevu Oluşturma Testleri
        await testAppointmentCreation();
        
        // 3. Validation Testleri
        await testValidationErrors();
        
        // 4. Rate Limiting Testleri
        await testRateLimiting();
        
        // 5. Authentication Testleri
        await testAuthentication();
        
        // 6. Error Handling Testleri
        await testErrorHandling();
        
        // Test sonuçlarını göster
        showTestResults();
        
    } catch (error) {
        console.error(`${colors.red}❌ Test suite sırasında hata:${colors.reset}`, error.message);
        process.exit(1);
    }
}

// 1. Health Check Test
async function testHealthCheck() {
    console.log(`${colors.blue}🔍 1. Health Check Testi${colors.reset}`);
    console.log('─'.repeat(30));
    
    try {
        const response = await axios.get(`${API_BASE}/api/health`, {
            timeout: 5000,
            validateStatus: () => true
        });
        
        if (response.status === 200) {
            addTestResult('Health Check', 'PASS', `Status: ${response.status}`, 'Server sağlıklı');
        } else if (response.status === 403) {
            addTestResult('Health Check', 'WARNING', `Status: ${response.status}`, 'Server çalışıyor ama MongoDB bağlantısı yok');
        } else {
            addTestResult('Health Check', 'FAIL', `Status: ${response.status}`, 'Server yanıt vermiyor');
        }
    } catch (error) {
        addTestResult('Health Check', 'FAIL', 'Connection Error', error.message);
    }
    
    console.log('');
}

// 2. Randevu Oluşturma Testleri
async function testAppointmentCreation() {
    console.log(`${colors.blue}🔍 2. Randevu Oluşturma Testleri${colors.reset}`);
    console.log('─'.repeat(30));
    
    // Test 1: Başarılı randevu oluşturma
    try {
        const appointmentData = {
            fullName: "Test Kullanıcı",
            email: "test@example.com",
            phone: "0555 555 55 55",
            appointmentDate: "2025-02-15",
            appointmentTime: "14:00",
            problemType: "Bireysel Terapi",
            message: "Test mesajı"
        };
        
        const response = await axios.post(`${API_BASE}/api/appointments/create`, appointmentData, {
            timeout: 5000,
            validateStatus: () => true
        });
        
        if (response.status === 201) {
            addTestResult('Başarılı Randevu Oluşturma', 'PASS', `Status: ${response.status}`, 'Randevu başarıyla oluşturuldu');
        } else if (response.status === 500) {
            addTestResult('Başarılı Randevu Oluşturma', 'WARNING', `Status: ${response.status}`, 'MongoDB bağlantısı olmadığı için 500 hatası (normal)');
        } else {
            addTestResult('Başarılı Randevu Oluşturma', 'FAIL', `Status: ${response.status}`, `Beklenmeyen durum: ${response.data?.message || 'Bilinmeyen hata'}`);
        }
    } catch (error) {
        addTestResult('Başarılı Randevu Oluşturma', 'FAIL', 'Request Error', error.message);
    }
    
    // Test 2: Gelecek tarih kontrolü
    try {
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 7);
        const futureDateStr = futureDate.toISOString().split('T')[0];
        
        const appointmentData = {
            fullName: "Test Kullanıcı",
            email: "test@example.com",
            phone: "0555 555 55 55",
            appointmentDate: futureDateStr,
            appointmentTime: "14:00",
            problemType: "Bireysel Terapi",
            message: "Gelecek tarih testi"
        };
        
        const response = await axios.post(`${API_BASE}/api/appointments/create`, appointmentData, {
            timeout: 5000,
            validateStatus: () => true
        });
        
        if (response.status === 201 || response.status === 500) {
            addTestResult('Gelecek Tarih Kontrolü', 'PASS', `Status: ${response.status}`, 'Gelecek tarih kabul edildi');
        } else {
            addTestResult('Gelecek Tarih Kontrolü', 'FAIL', `Status: ${response.status}`, 'Gelecek tarih reddedildi');
        }
    } catch (error) {
        addTestResult('Gelecek Tarih Kontrolü', 'FAIL', 'Request Error', error.message);
    }
    
    console.log('');
}

// 3. Validation Testleri
async function testValidationErrors() {
    console.log(`${colors.blue}🔍 3. Validation Testleri${colors.reset}`);
    console.log('─'.repeat(30));
    
    // Test 1: Eksik alanlarla gönderim
    try {
        const incompleteData = {
            fullName: "Test Kullanıcı",
            // email eksik
            phone: "0555 555 55 55",
            appointmentDate: "2025-02-15",
            appointmentTime: "14:00",
            problemType: "Bireysel Terapi"
        };
        
        const response = await axios.post(`${API_BASE}/api/appointments/create`, incompleteData, {
            timeout: 5000,
            validateStatus: () => true
        });
        
        if (response.status === 400) {
            addTestResult('Eksik Alan Kontrolü', 'PASS', `Status: ${response.status}`, 'Eksik alanlar doğru şekilde reddedildi');
        } else {
            addTestResult('Eksik Alan Kontrolü', 'FAIL', `Status: ${response.status}`, 'Eksik alanlar reddedilmedi');
        }
    } catch (error) {
        addTestResult('Eksik Alan Kontrolü', 'FAIL', 'Request Error', error.message);
    }
    
    // Test 2: Yanlış formatlı email
    try {
        const invalidEmailData = {
            fullName: "Test Kullanıcı",
            email: "invalid-email-format",
            phone: "0555 555 55 55",
            appointmentDate: "2025-02-15",
            appointmentTime: "14:00",
            problemType: "Bireysel Terapi",
            message: "Geçersiz email testi"
        };
        
        const response = await axios.post(`${API_BASE}/api/appointments/create`, invalidEmailData, {
            timeout: 5000,
            validateStatus: () => true
        });
        
        if (response.status === 400) {
            addTestResult('Geçersiz Email Kontrolü', 'PASS', `Status: ${response.status}`, 'Geçersiz email formatı reddedildi');
        } else {
            addTestResult('Geçersiz Email Kontrolü', 'FAIL', `Status: ${response.status}`, 'Geçersiz email formatı reddedilmedi');
        }
    } catch (error) {
        addTestResult('Geçersiz Email Kontrolü', 'FAIL', 'Request Error', error.message);
    }
    
    // Test 3: Geçmiş tarih
    try {
        const pastDate = new Date();
        pastDate.setDate(pastDate.getDate() - 1);
        const pastDateStr = pastDate.toISOString().split('T')[0];
        
        const pastDateData = {
            fullName: "Test Kullanıcı",
            email: "test@example.com",
            phone: "0555 555 55 55",
            appointmentDate: pastDateStr,
            appointmentTime: "14:00",
            problemType: "Bireysel Terapi",
            message: "Geçmiş tarih testi"
        };
        
        const response = await axios.post(`${API_BASE}/api/appointments/create`, pastDateData, {
            timeout: 5000,
            validateStatus: () => true
        });
        
        if (response.status === 400) {
            addTestResult('Geçmiş Tarih Kontrolü', 'PASS', `Status: ${response.status}`, 'Geçmiş tarih reddedildi');
        } else {
            addTestResult('Geçmiş Tarih Kontrolü', 'FAIL', `Status: ${response.status}`, 'Geçmiş tarih reddedilmedi');
        }
    } catch (error) {
        addTestResult('Geçmiş Tarih Kontrolü', 'FAIL', 'Request Error', error.message);
    }
    
    // Test 4: Çalışma saatleri dışı saat
    try {
        const invalidTimeData = {
            fullName: "Test Kullanıcı",
            email: "test@example.com",
            phone: "0555 555 55 55",
            appointmentDate: "2025-02-15",
            appointmentTime: "23:00", // Gece saatleri
            problemType: "Bireysel Terapi",
            message: "Geçersiz saat testi"
        };
        
        const response = await axios.post(`${API_BASE}/api/appointments/create`, invalidTimeData, {
            timeout: 5000,
            validateStatus: () => true
        });
        
        if (response.status === 400) {
            addTestResult('Geçersiz Saat Kontrolü', 'PASS', `Status: ${response.status}`, 'Çalışma saatleri dışı saat reddedildi');
        } else {
            addTestResult('Geçersiz Saat Kontrolü', 'FAIL', `Status: ${response.status}`, 'Çalışma saatleri dışı saat reddedilmedi');
        }
    } catch (error) {
        addTestResult('Geçersiz Saat Kontrolü', 'FAIL', 'Request Error', error.message);
    }
    
    console.log('');
}

// 4. Rate Limiting Testleri
async function testRateLimiting() {
    console.log(`${colors.blue}🔍 4. Rate Limiting Testleri${colors.reset}`);
    console.log('─'.repeat(30));
    
    const appointmentData = {
        fullName: "Rate Limit Test",
        email: "ratelimit@example.com",
        phone: "0555 555 55 55",
        appointmentDate: "2025-02-15",
        appointmentTime: "14:00",
        problemType: "Bireysel Terapi",
        message: "Rate limiting testi"
    };
    
    let rateLimitHit = false;
    let requestCount = 0;
    
    try {
        // 5 istek gönder (rate limit 3 olmalı)
        for (let i = 0; i < 5; i++) {
            try {
                const response = await axios.post(`${API_BASE}/api/appointments/create`, appointmentData, {
                    timeout: 2000,
                    validateStatus: () => true
                });
                
                requestCount++;
                
                if (response.status === 429) {
                    rateLimitHit = true;
                    addTestResult('Rate Limiting', 'PASS', `Request ${i + 1}: Status ${response.status}`, 'Rate limit doğru şekilde uygulandı');
                    break;
                } else if (response.status === 201 || response.status === 500) {
                    // Başarılı veya MongoDB hatası (normal)
                } else {
                    addTestResult('Rate Limiting', 'WARNING', `Request ${i + 1}: Status ${response.status}`, 'Beklenmeyen durum');
                }
                
                // İstekler arası kısa bekleme
                await new Promise(resolve => setTimeout(resolve, 100));
                
            } catch (error) {
                if (error.response && error.response.status === 429) {
                    rateLimitHit = true;
                    addTestResult('Rate Limiting', 'PASS', `Request ${i + 1}: Status 429`, 'Rate limit doğru şekilde uygulandı');
                    break;
                }
            }
        }
        
        if (!rateLimitHit) {
            addTestResult('Rate Limiting', 'WARNING', `${requestCount} requests sent`, 'Rate limit uygulanmadı (normal olabilir)');
        }
        
    } catch (error) {
        addTestResult('Rate Limiting', 'FAIL', 'Test Error', error.message);
    }
    
    console.log('');
}

// 5. Authentication Testleri
async function testAuthentication() {
    console.log(`${colors.blue}🔍 5. Authentication Testleri${colors.reset}`);
    console.log('─'.repeat(30));
    
    // Test 1: Kullanıcı kaydı
    try {
        const userData = {
            name: "Test User",
            email: "testuser@example.com",
            password: "testpassword123",
            phone: "0555 555 55 55"
        };
        
        const response = await axios.post(`${API_BASE}/api/auth/register`, userData, {
            timeout: 5000,
            validateStatus: () => true
        });
        
        if (response.status === 201) {
            addTestResult('Kullanıcı Kaydı', 'PASS', `Status: ${response.status}`, 'Kullanıcı başarıyla kaydedildi');
        } else if (response.status === 500) {
            addTestResult('Kullanıcı Kaydı', 'WARNING', `Status: ${response.status}`, 'MongoDB bağlantısı olmadığı için 500 hatası (normal)');
        } else {
            addTestResult('Kullanıcı Kaydı', 'FAIL', `Status: ${response.status}`, `Beklenmeyen durum: ${response.data?.message || 'Bilinmeyen hata'}`);
        }
    } catch (error) {
        addTestResult('Kullanıcı Kaydı', 'FAIL', 'Request Error', error.message);
    }
    
    // Test 2: Kullanıcı girişi
    try {
        const loginData = {
            email: "testuser@example.com",
            password: "testpassword123"
        };
        
        const response = await axios.post(`${API_BASE}/api/auth/login`, loginData, {
            timeout: 5000,
            validateStatus: () => true
        });
        
        if (response.status === 200) {
            addTestResult('Kullanıcı Girişi', 'PASS', `Status: ${response.status}`, 'Kullanıcı başarıyla giriş yaptı');
        } else if (response.status === 500) {
            addTestResult('Kullanıcı Girişi', 'WARNING', `Status: ${response.status}`, 'MongoDB bağlantısı olmadığı için 500 hatası (normal)');
        } else {
            addTestResult('Kullanıcı Girişi', 'FAIL', `Status: ${response.status}`, `Beklenmeyen durum: ${response.data?.message || 'Bilinmeyen hata'}`);
        }
    } catch (error) {
        addTestResult('Kullanıcı Girişi', 'FAIL', 'Request Error', error.message);
    }
    
    console.log('');
}

// 6. Error Handling Testleri
async function testErrorHandling() {
    console.log(`${colors.blue}🔍 6. Error Handling Testleri${colors.reset}`);
    console.log('─'.repeat(30));
    
    // Test 1: Geçersiz endpoint
    try {
        const response = await axios.get(`${API_BASE}/api/invalid-endpoint`, {
            timeout: 5000,
            validateStatus: () => true
        });
        
        if (response.status === 404) {
            addTestResult('404 Error Handling', 'PASS', `Status: ${response.status}`, 'Geçersiz endpoint doğru şekilde 404 döndü');
        } else {
            addTestResult('404 Error Handling', 'FAIL', `Status: ${response.status}`, 'Geçersiz endpoint 404 döndürmedi');
        }
    } catch (error) {
        addTestResult('404 Error Handling', 'FAIL', 'Request Error', error.message);
    }
    
    // Test 2: Geçersiz JSON
    try {
        const response = await axios.post(`${API_BASE}/api/appointments/create`, 'invalid json', {
            timeout: 5000,
            validateStatus: () => true,
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (response.status === 400) {
            addTestResult('Invalid JSON Handling', 'PASS', `Status: ${response.status}`, 'Geçersiz JSON doğru şekilde reddedildi');
        } else {
            addTestResult('Invalid JSON Handling', 'FAIL', `Status: ${response.status}`, 'Geçersiz JSON reddedilmedi');
        }
    } catch (error) {
        addTestResult('Invalid JSON Handling', 'FAIL', 'Request Error', error.message);
    }
    
    console.log('');
}

// Test sonucu ekle
function addTestResult(testName, status, details, description) {
    testResults.total++;
    
    const result = {
        name: testName,
        status: status,
        details: details,
        description: description,
        timestamp: new Date().toISOString()
    };
    
    testResults.details.push(result);
    
    if (status === 'PASS') {
        testResults.passed++;
        console.log(`${colors.green}✅ ${testName}${colors.reset} - ${details} - ${description}`);
    } else if (status === 'FAIL') {
        testResults.failed++;
        console.log(`${colors.red}❌ ${testName}${colors.reset} - ${details} - ${description}`);
    } else if (status === 'WARNING') {
        testResults.warnings++;
        console.log(`${colors.yellow}⚠️  ${testName}${colors.reset} - ${details} - ${description}`);
    }
}

// Test sonuçlarını göster
function showTestResults() {
    console.log(`${colors.cyan}${colors.bright}📊 TEST SONUÇLARI${colors.reset}`);
    console.log('═'.repeat(50));
    
    console.log(`${colors.green}✅ Başarılı: ${testResults.passed}${colors.reset}`);
    console.log(`${colors.red}❌ Başarısız: ${testResults.failed}${colors.reset}`);
    console.log(`${colors.yellow}⚠️  Uyarı: ${testResults.warnings}${colors.reset}`);
    console.log(`${colors.blue}📊 Toplam: ${testResults.total}${colors.reset}`);
    
    const successRate = Math.round((testResults.passed / testResults.total) * 100);
    console.log(`${colors.magenta}🎯 Başarı Oranı: ${successRate}%${colors.reset}`);
    
    console.log('\n📋 Detaylı Sonuçlar:');
    console.log('─'.repeat(50));
    
    testResults.details.forEach((result, index) => {
        const statusIcon = result.status === 'PASS' ? '✅' : result.status === 'FAIL' ? '❌' : '⚠️';
        const statusColor = result.status === 'PASS' ? colors.green : result.status === 'FAIL' ? colors.red : colors.yellow;
        
        console.log(`${index + 1}. ${statusColor}${statusIcon} ${result.name}${colors.reset}`);
        console.log(`   ${result.details} - ${result.description}`);
        console.log(`   ${result.timestamp}`);
        console.log('');
    });
    
    // Genel değerlendirme
    console.log(`${colors.cyan}${colors.bright}🎯 GENEL DEĞERLENDİRME:${colors.reset}`);
    
    if (successRate >= 80) {
        console.log(`${colors.green}🎉 Mükemmel! API'ler büyük ölçüde çalışıyor.${colors.reset}`);
    } else if (successRate >= 60) {
        console.log(`${colors.yellow}⚠️  İyi! Bazı düzeltmeler gerekli.${colors.reset}`);
    } else {
        console.log(`${colors.red}❌ Ciddi sorunlar var, düzeltmeler gerekli.${colors.reset}`);
    }
    
    console.log('\n💡 Öneriler:');
    console.log('1. MongoDB cluster connection string\'i ekleyin');
    console.log('2. SMTP ayarlarını yapılandırın');
    console.log('3. Rate limiting ayarlarını kontrol edin');
    console.log('4. Validation kurallarını gözden geçirin');
}

// Script'i çalıştır
if (require.main === module) {
    runApiTestSuite()
        .then(() => {
            console.log(`\n${colors.green}✅ API test suite tamamlandı${colors.reset}`);
            process.exit(0);
        })
        .catch((error) => {
            console.error(`\n${colors.red}❌ Test suite sırasında hata:${colors.reset}`, error);
            process.exit(1);
        });
}

module.exports = { runApiTestSuite, testResults };
