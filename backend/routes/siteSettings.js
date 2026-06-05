const express = require('express');
const router = express.Router();
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const mongoose = require('mongoose');
const SiteSettings = require('../models/SiteSettings');

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../../images');
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: function (req, file, cb) {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Sadece resim dosyaları yüklenebilir!'));
    }
  }
});

// Default values for database seeding / fallback
const defaultSettings = {
  general: {
    siteTitle: "Psikolog Onur Uslu | Gebze'de BDT Uzmanı | Online & Yüz Yüze Terapi",
    siteDescription: "Gebze'de 2 yıllık deneyimli Psikolog Onur Uslu. 756 danışana hizmet verdi. Bilişsel Davranışçı Terapi, kaygı, depresyon, çift terapisi. Online ve yüz yüze seanslar. Randevu: +90 553 026 37 74",
    phone: "+90 553 026 37 74",
    email: "psikologonuruslu@gmail.com",
    address: "Gebze, Kocaeli"
  },
  about: {
    title: "Psikolog Onur Uslu",
    description: "Selçuk Üniversitesi Psikoloji lisans bölümünden onur derecesi ile mezun oldum. 2 yıllık deneyimim boyunca 756 danışanıma hizmet verdim. Psikoloji alanındaki bilgi birikimimi Prof. Dr. Mehmet Hakan Türkçapar ve ekibinden aldığım Bilişsel Davranışçı Terapi eğitimi ile pekiştirdim. Aynı zamanda bilinçli farkındalık temelli terapi ve oyun terapisi eğitimleri almış biri olarak bu alanlarda yetkinliğim bulunmaktadır."
  },
  images: {
    mainPhoto: "psikolog-onur-uslu-professional.jpg",
    officePhoto: "psikolog-onur-uslu-office.jpg"
  },
  statistics: {
    experienceYears: 2,
    totalClients: 756,
    successRate: 95
  },
  services: [
    "Bilişsel Davranışçı Terapi (BDT)",
    "Kaygı ve Anksiyete Terapisi",
    "Depresyon Terapisi",
    "Çift ve İlişki Terapisi"
  ],
  socialMedia: {
    instagram: "",
    linkedin: "",
    twitter: "",
    youtube: ""
  }
};

// In-memory storage fallback
let siteSettings = {
  ...defaultSettings,
  updatedAt: new Date()
};

// Helper function to fetch active settings from MongoDB or in-memory fallback
async function getActiveSettings() {
  const isMongoConnected = mongoose.connection.readyState === 1;
  if (isMongoConnected) {
    try {
      let settings = await SiteSettings.findOne();
      if (!settings) {
        settings = await SiteSettings.create(defaultSettings);
      }
      return settings;
    } catch (err) {
      console.error('Error fetching site settings from DB:', err.message);
      return siteSettings;
    }
  }
  return siteSettings;
}

// Get all site settings
router.get('/', async (req, res) => {
  try {
    const settings = await getActiveSettings();
    res.json({
      success: true,
      data: settings
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Site ayarları getirilirken hata oluştu',
      error: error.message
    });
  }
});

// Update site settings (Admin only)
router.put('/', authenticateToken, requireAdmin, upload.fields([
  { name: 'mainPhoto', maxCount: 1 },
  { name: 'officePhoto', maxCount: 1 }
]), async (req, res) => {
  try {
    const {
      general,
      about,
      statistics,
      services,
      socialMedia
    } = req.body;

    // Parse JSON strings if they come as strings
    const parsedGeneral = typeof general === 'string' ? JSON.parse(general) : general;
    const parsedAbout = typeof about === 'string' ? JSON.parse(about) : about;
    const parsedStatistics = typeof statistics === 'string' ? JSON.parse(statistics) : statistics;
    const parsedServices = typeof services === 'string' ? JSON.parse(services) : services;
    const parsedSocialMedia = typeof socialMedia === 'string' ? JSON.parse(socialMedia) : socialMedia;

    const isMongoConnected = mongoose.connection.readyState === 1;

    if (isMongoConnected) {
      let settings = await SiteSettings.findOne();
      if (!settings) {
        settings = new SiteSettings(defaultSettings);
      }

      // Update general settings
      if (parsedGeneral) {
        settings.general = {
          ...settings.general,
          ...parsedGeneral
        };
      }

      // Update about settings
      if (parsedAbout) {
        settings.about = {
          ...settings.about,
          ...parsedAbout
        };
      }

      // Update statistics
      if (parsedStatistics) {
        settings.statistics = {
          ...settings.statistics,
          ...parsedStatistics
        };
      }

      // Update services
      if (parsedServices) {
        settings.services = parsedServices;
      }

      // Update social media
      if (parsedSocialMedia) {
        settings.socialMedia = {
          ...settings.socialMedia,
          ...parsedSocialMedia
        };
      }

      // Handle image uploads
      if (req.files) {
        if (req.files.mainPhoto) {
          // Remove old image if exists
          if (settings.images.mainPhoto && settings.images.mainPhoto !== 'psikolog-onur-uslu-professional.jpg') {
            try {
              await fs.unlink(path.join(__dirname, '../images', settings.images.mainPhoto));
            } catch (err) {
              console.log('Old main photo not found:', err.message);
            }
          }
          settings.images.mainPhoto = req.files.mainPhoto[0].filename;
        }

        if (req.files.officePhoto) {
          // Remove old image if exists
          if (settings.images.officePhoto && settings.images.officePhoto !== 'psikolog-onur-uslu-office.jpg') {
            try {
              await fs.unlink(path.join(__dirname, '../images', settings.images.officePhoto));
            } catch (err) {
              console.log('Old office photo not found:', err.message);
            }
          }
          settings.images.officePhoto = req.files.officePhoto[0].filename;
        }
      }

      await settings.save();

      res.json({
        success: true,
        message: 'Site ayarları başarıyla güncellendi',
        data: settings
      });
    } else {
      // Update general settings in-memory
      if (parsedGeneral) {
        siteSettings.general = {
          ...siteSettings.general,
          ...parsedGeneral
        };
      }

      // Update about settings in-memory
      if (parsedAbout) {
        siteSettings.about = {
          ...siteSettings.about,
          ...parsedAbout
        };
      }

      // Update statistics in-memory
      if (parsedStatistics) {
        siteSettings.statistics = {
          ...siteSettings.statistics,
          ...parsedStatistics
        };
      }

      // Update services in-memory
      if (parsedServices) {
        siteSettings.services = parsedServices;
      }

      // Update social media in-memory
      if (parsedSocialMedia) {
        siteSettings.socialMedia = {
          ...siteSettings.socialMedia,
          ...parsedSocialMedia
        };
      }

      // Handle image uploads
      if (req.files) {
        if (req.files.mainPhoto) {
          if (siteSettings.images.mainPhoto && siteSettings.images.mainPhoto !== 'psikolog-onur-uslu-professional.jpg') {
            try {
              await fs.unlink(path.join(__dirname, '../images', siteSettings.images.mainPhoto));
            } catch (err) {
              console.log('Old main photo not found:', err.message);
            }
          }
          siteSettings.images.mainPhoto = req.files.mainPhoto[0].filename;
        }

        if (req.files.officePhoto) {
          if (siteSettings.images.officePhoto && siteSettings.images.officePhoto !== 'psikolog-onur-uslu-office.jpg') {
            try {
              await fs.unlink(path.join(__dirname, '../images', siteSettings.images.officePhoto));
            } catch (err) {
              console.log('Old office photo not found:', err.message);
            }
          }
          siteSettings.images.officePhoto = req.files.officePhoto[0].filename;
        }
      }

      siteSettings.updatedAt = new Date();

      res.json({
        success: true,
        message: 'Site ayarları başarıyla güncellendi',
        data: siteSettings
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Site ayarları güncellenirken hata oluştu',
      error: error.message
    });
  }
});

// Get specific setting section
router.get('/:section', async (req, res) => {
  try {
    const { section } = req.params;
    const settings = await getActiveSettings();
    const settingsObj = typeof settings.toObject === 'function' ? settings.toObject() : settings;

    if (!settingsObj[section]) {
      return res.status(404).json({
        success: false,
        message: 'Ayar bölümü bulunamadı'
      });
    }

    res.json({
      success: true,
      data: settingsObj[section]
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Ayar bölümü getirilirken hata oluştu',
      error: error.message
    });
  }
});

// Update specific setting section (Admin only)
router.put('/:section', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { section } = req.params;
    const updateData = req.body;
    const isMongoConnected = mongoose.connection.readyState === 1;

    if (isMongoConnected) {
      let settings = await SiteSettings.findOne();
      if (!settings) {
        settings = new SiteSettings(defaultSettings);
      }

      const settingsObj = settings.toObject();
      if (!settingsObj[section]) {
        return res.status(404).json({
          success: false,
          message: 'Ayar bölümü bulunamadı'
        });
      }

      if (Array.isArray(settings[section])) {
        settings[section] = updateData;
      } else {
        settings[section] = {
          ...settingsObj[section],
          ...updateData
        };
      }

      await settings.save();

      res.json({
        success: true,
        message: `${section} bölümü başarıyla güncellendi`,
        data: settings[section]
      });
    } else {
      if (!siteSettings[section]) {
        return res.status(404).json({
          success: false,
          message: 'Ayar bölümü bulunamadı'
        });
      }

      if (Array.isArray(siteSettings[section])) {
        siteSettings[section] = updateData;
      } else {
        siteSettings[section] = {
          ...siteSettings[section],
          ...updateData
        };
      }
      siteSettings.updatedAt = new Date();

      res.json({
        success: true,
        message: `${section} bölümü başarıyla güncellendi`,
        data: siteSettings[section]
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Ayar bölümü güncellenirken hata oluştu',
      error: error.message
    });
  }
});

// Reset settings to default (Admin only)
router.post('/reset', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const isMongoConnected = mongoose.connection.readyState === 1;

    if (isMongoConnected) {
      await SiteSettings.deleteMany({});
      const settings = await SiteSettings.create(defaultSettings);
      res.json({
        success: true,
        message: 'Site ayarları varsayılan değerlere sıfırlandı',
        data: settings
      });
    } else {
      siteSettings = {
        ...defaultSettings,
        updatedAt: new Date()
      };

      res.json({
        success: true,
        message: 'Site ayarları varsayılan değerlere sıfırlandı',
        data: siteSettings
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Site ayarları sıfırlanırken hata oluştu',
      error: error.message
    });
  }
});

module.exports = router;
