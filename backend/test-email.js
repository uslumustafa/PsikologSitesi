const { sendEmail } = require('./utils/emailService');
require('dotenv').config();

async function testEmail() {
  try {
    console.log('📧 Email servisi test ediliyor...');
    console.log('SMTP Host:', process.env.SMTP_HOST);
    console.log('SMTP User:', process.env.SMTP_USER);
    
    const result = await sendEmail({
      to: 'test@example.com', // Test email adresi
      subject: 'Test Email - Psikolog Onur Uslu',
      template: 'emailVerification',
      data: {
        name: 'Test User',
        verificationLink: 'http://localhost:3000/verify-email?token=test-token'
      }
    });
    
    console.log('✅ Email başarıyla gönderildi!');
    console.log('Message ID:', result.messageId);
    
  } catch (error) {
    console.error('❌ Email gönderimi başarısız:', error.message);
    
    if (error.code === 'EAUTH') {
      console.log('\n🔐 Gmail kimlik doğrulama hatası!');
      console.log('Çözüm:');
      console.log('1. Gmail hesabınızda 2FA\'yı etkinleştirin');
      console.log('2. App Password oluşturun');
      console.log('3. .env dosyasında SMTP_PASS değerini güncelleyin');
    }
  }
}

testEmail();
