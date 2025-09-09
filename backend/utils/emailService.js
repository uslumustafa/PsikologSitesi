const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs').promises;

// Create transporter
const createTransporter = () => {
  return nodemailer.createTransporter({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: process.env.SMTP_PORT || 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER || 'psikologonuruslu@gmail.com',
      pass: process.env.SMTP_PASS || 'your-app-password'
    },
    tls: {
      rejectUnauthorized: false
    }
  });
};

// Email templates
const emailTemplates = {
  emailVerification: {
    subject: 'Email Doğrulama - Psikolog Onur Uslu',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Email Doğrulama</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #3B82F6; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .button { display: inline-block; padding: 12px 24px; background: #3B82F6; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { padding: 20px; text-align: center; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Psikolog Onur Uslu</h1>
            <p>Email Doğrulama</p>
          </div>
          <div class="content">
            <h2>Merhaba {{name}},</h2>
            <p>Hesabınızı oluşturduğunuz için teşekkür ederiz. Email adresinizi doğrulamak için aşağıdaki butona tıklayın:</p>
            <a href="{{verificationLink}}" class="button">Email Adresimi Doğrula</a>
            <p>Eğer buton çalışmıyorsa, aşağıdaki linki kopyalayıp tarayıcınıza yapıştırabilirsiniz:</p>
            <p>{{verificationLink}}</p>
            <p>Bu link 24 saat geçerlidir.</p>
          </div>
          <div class="footer">
            <p>Bu email otomatik olarak gönderilmiştir. Lütfen yanıtlamayın.</p>
            <p>Psikolog Onur Uslu | Gebze, Kocaeli | +90 553 026 37 74</p>
          </div>
        </div>
      </body>
      </html>
    `
  },
  
  passwordReset: {
    subject: 'Şifre Sıfırlama - Psikolog Onur Uslu',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Şifre Sıfırlama</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #EF4444; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .button { display: inline-block; padding: 12px 24px; background: #EF4444; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { padding: 20px; text-align: center; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Psikolog Onur Uslu</h1>
            <p>Şifre Sıfırlama</p>
          </div>
          <div class="content">
            <h2>Merhaba {{name}},</h2>
            <p>Şifrenizi sıfırlamak için bir talep aldık. Yeni şifre oluşturmak için aşağıdaki butona tıklayın:</p>
            <a href="{{resetLink}}" class="button">Şifremi Sıfırla</a>
            <p>Eğer buton çalışmıyorsa, aşağıdaki linki kopyalayıp tarayıcınıza yapıştırabilirsiniz:</p>
            <p>{{resetLink}}</p>
            <p>Bu link 1 saat geçerlidir.</p>
            <p><strong>Önemli:</strong> Eğer bu talebi siz yapmadıysanız, bu emaili görmezden gelebilirsiniz.</p>
          </div>
          <div class="footer">
            <p>Bu email otomatik olarak gönderilmiştir. Lütfen yanıtlamayın.</p>
            <p>Psikolog Onur Uslu | Gebze, Kocaeli | +90 553 026 37 74</p>
          </div>
        </div>
      </body>
      </html>
    `
  },
  
  appointmentConfirmation: {
    subject: 'Randevu Onayı - Psikolog Onur Uslu',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Randevu Onayı</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #10B981; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .appointment-details { background: white; padding: 20px; border-radius: 5px; margin: 20px 0; }
          .footer { padding: 20px; text-align: center; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Psikolog Onur Uslu</h1>
            <p>Randevu Onayı</p>
          </div>
          <div class="content">
            <h2>Merhaba {{name}},</h2>
            <p>Randevunuz başarıyla oluşturuldu ve onaylandı. Randevu detayları:</p>
            <div class="appointment-details">
              <h3>Randevu Bilgileri</h3>
              <p><strong>Tarih:</strong> {{date}}</p>
              <p><strong>Saat:</strong> {{time}}</p>
              <p><strong>Tür:</strong> {{type}}</p>
              <p><strong>Süre:</strong> {{duration}} dakika</p>
              <p><strong>Fiyat:</strong> {{price}} TL</p>
            </div>
            <p>Randevunuzdan 24 saat önce hatırlatma emaili alacaksınız.</p>
            <p>Herhangi bir sorunuz varsa bizimle iletişime geçebilirsiniz.</p>
          </div>
          <div class="footer">
            <p>Bu email otomatik olarak gönderilmiştir.</p>
            <p>Psikolog Onur Uslu | Gebze, Kocaeli | +90 553 026 37 74</p>
          </div>
        </div>
      </body>
      </html>
    `
  },
  
  appointmentReminder: {
    subject: 'Randevu Hatırlatması - Psikolog Onur Uslu',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Randevu Hatırlatması</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #F59E0B; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .appointment-details { background: white; padding: 20px; border-radius: 5px; margin: 20px 0; }
          .footer { padding: 20px; text-align: center; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Psikolog Onur Uslu</h1>
            <p>Randevu Hatırlatması</p>
          </div>
          <div class="content">
            <h2>Merhaba {{name}},</h2>
            <p>Bu email, yaklaşan randevunuz için bir hatırlatmadır.</p>
            <div class="appointment-details">
              <h3>Randevu Bilgileri</h3>
              <p><strong>Tarih:</strong> {{date}}</p>
              <p><strong>Saat:</strong> {{time}}</p>
              <p><strong>Tür:</strong> {{type}}</p>
              <p><strong>Süre:</strong> {{duration}} dakika</p>
            </div>
            <p>Randevunuzu iptal etmek veya değiştirmek isterseniz, lütfen en az 24 saat önceden bizimle iletişime geçin.</p>
            <p>Görüşmek üzere!</p>
          </div>
          <div class="footer">
            <p>Bu email otomatik olarak gönderilmiştir.</p>
            <p>Psikolog Onur Uslu | Gebze, Kocaeli | +90 553 026 37 74</p>
          </div>
        </div>
      </body>
      </html>
    `
  },
  
  appointmentCancellation: {
    subject: 'Randevu İptali - Psikolog Onur Uslu',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Randevu İptali</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #EF4444; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .appointment-details { background: white; padding: 20px; border-radius: 5px; margin: 20px 0; }
          .footer { padding: 20px; text-align: center; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Psikolog Onur Uslu</h1>
            <p>Randevu İptali</p>
          </div>
          <div class="content">
            <h2>Merhaba {{name}},</h2>
            <p>Randevunuz başarıyla iptal edilmiştir.</p>
            <div class="appointment-details">
              <h3>İptal Edilen Randevu</h3>
              <p><strong>Tarih:</strong> {{date}}</p>
              <p><strong>Saat:</strong> {{time}}</p>
              <p><strong>Tür:</strong> {{type}}</p>
              <p><strong>İptal Nedeni:</strong> {{reason}}</p>
            </div>
            <p>Yeni bir randevu almak isterseniz, bizimle iletişime geçebilirsiniz.</p>
            <p>İlginiz için teşekkür ederiz.</p>
          </div>
          <div class="footer">
            <p>Bu email otomatik olarak gönderilmiştir.</p>
            <p>Psikolog Onur Uslu | Gebze, Kocaeli | +90 553 026 37 74</p>
          </div>
        </div>
      </body>
      </html>
    `
  }
};

// Replace template variables
const replaceTemplateVariables = (template, data) => {
  let html = template;
  Object.keys(data).forEach(key => {
    const regex = new RegExp(`{{${key}}}`, 'g');
    html = html.replace(regex, data[key]);
  });
  return html;
};

// Send email function
const sendEmail = async ({ to, subject, template, data = {}, attachments = [] }) => {
  try {
    const transporter = createTransporter();
    
    // Get template
    const emailTemplate = emailTemplates[template];
    if (!emailTemplate) {
      throw new Error(`Email template '${template}' not found`);
    }

    // Replace template variables
    const html = replaceTemplateVariables(emailTemplate.html, data);
    const finalSubject = replaceTemplateVariables(emailTemplate.subject, data);

    // Email options
    const mailOptions = {
      from: {
        name: 'Psikolog Onur Uslu',
        address: process.env.SMTP_USER || 'psikologonuruslu@gmail.com'
      },
      to,
      subject: finalSubject,
      html,
      attachments
    };

    // Send email
    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', info.messageId);
    return info;
  } catch (error) {
    console.error('Email sending failed:', error);
    throw error;
  }
};

// Send bulk emails
const sendBulkEmails = async (emails) => {
  const results = [];
  
  for (const email of emails) {
    try {
      const result = await sendEmail(email);
      results.push({ success: true, email: email.to, messageId: result.messageId });
    } catch (error) {
      results.push({ success: false, email: email.to, error: error.message });
    }
  }
  
  return results;
};

// Test email configuration
const testEmailConfiguration = async () => {
  try {
    const transporter = createTransporter();
    await transporter.verify();
    console.log('Email configuration is valid');
    return true;
  } catch (error) {
    console.error('Email configuration test failed:', error);
    return false;
  }
};

module.exports = {
  sendEmail,
  sendBulkEmails,
  testEmailConfiguration,
  emailTemplates
};
