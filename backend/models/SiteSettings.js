const mongoose = require('mongoose');

const siteSettingsSchema = new mongoose.Schema({
  general: {
    siteTitle: { type: String, trim: true },
    siteDescription: { type: String, trim: true },
    phone: { type: String, trim: true },
    email: { type: String, trim: true },
    address: { type: String, trim: true }
  },
  about: {
    title: { type: String, trim: true },
    description: { type: String, trim: true }
  },
  images: {
    mainPhoto: { type: String, default: 'psikolog-onur-uslu-professional.jpg' },
    officePhoto: { type: String, default: 'psikolog-onur-uslu-office.jpg' }
  },
  statistics: {
    experienceYears: { type: Number, default: 0 },
    totalClients: { type: Number, default: 0 },
    successRate: { type: Number, default: 0 }
  },
  services: [{ type: String, trim: true }],
  socialMedia: {
    instagram: { type: String, default: '' },
    linkedin: { type: String, default: '' },
    twitter: { type: String, default: '' },
    youtube: { type: String, default: '' }
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('SiteSettings', siteSettingsSchema);
