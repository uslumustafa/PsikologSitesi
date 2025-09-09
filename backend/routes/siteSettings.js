const express = require('express');
const router = express.Router();
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, '../images/')
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

// In-memory storage for demo (in production, use database)
let siteSettings = {
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
  },
  updatedAt: new Date()
};

// Get all site settings
router.get('/', async (req, res) => {
  try {
    res.json({
      success: true,
      data: siteSettings
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

    // Update general settings
    if (parsedGeneral) {
      siteSettings.general = {
        ...siteSettings.general,
        ...parsedGeneral
      };
    }

    // Update about settings
    if (parsedAbout) {
      siteSettings.about = {
        ...siteSettings.about,
        ...parsedAbout
      };
    }

    // Update statistics
    if (parsedStatistics) {
      siteSettings.statistics = {
        ...siteSettings.statistics,
        ...parsedStatistics
      };
    }

    // Update services
    if (parsedServices) {
      siteSettings.services = parsedServices;
    }

    // Update social media
    if (parsedSocialMedia) {
      siteSettings.socialMedia = {
        ...siteSettings.socialMedia,
        ...parsedSocialMedia
      };
    }

    // Handle image uploads
    if (req.files) {
      if (req.files.mainPhoto) {
        // Remove old image if exists
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
        // Remove old image if exists
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
    
    if (!siteSettings[section]) {
      return res.status(404).json({
        success: false,
        message: 'Ayar bölümü bulunamadı'
      });
    }

    res.json({
      success: true,
      data: siteSettings[section]
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

    if (!siteSettings[section]) {
      return res.status(404).json({
        success: false,
        message: 'Ayar bölümü bulunamadı'
      });
    }

    siteSettings[section] = {
      ...siteSettings[section],
      ...updateData
    };
    siteSettings.updatedAt = new Date();

    res.json({
      success: true,
      message: `${section} bölümü başarıyla güncellendi`,
      data: siteSettings[section]
    });
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
    siteSettings = {
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
      },
      updatedAt: new Date()
    };

    res.json({
      success: true,
      message: 'Site ayarları varsayılan değerlere sıfırlandı',
      data: siteSettings
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Site ayarları sıfırlanırken hata oluştu',
      error: error.message
    });
  }
});

module.exports = router;
