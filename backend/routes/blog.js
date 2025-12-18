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
let blogs = [
  {
    id: 1,
    title: 'Kaygıyla Başa Çıkmanın 5 Pratik Yolu',
    category: 'kaygi',
    summary: 'Günlük hayatta anksiyete ile başa çıkmanıza yardımcı olacak basit ve etkili teknikler...',
    content: '<p>Kaygı, günlük yaşamın bir parçası olabilir, ancak onunla başa çıkmak için etkili yöntemler geliştirmek önemlidir.</p>',
    image: 'anxiety-coping-techniques.jpg',
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15'),
    published: true
  },
  {
    id: 2,
    title: 'Bilişsel Davranışçı Terapi (BDT)',
    category: 'terapi',
    summary: 'Zihinsel esenliğe giden bilimsel yolculuk hakkında detaylı bilgiler...',
    content: '<p>Bilişsel Davranışçı Terapi, düşünce, duygu ve davranış arasındaki bağlantıları inceleyen etkili bir terapi yöntemidir.</p>',
    image: 'cognitive-behavioral-therapy.jpg',
    createdAt: new Date('2024-01-10'),
    updatedAt: new Date('2024-01-10'),
    published: true
  },
  {
    id: 3,
    title: 'Şema Terapi Nedir?',
    category: 'terapi',
    summary: 'Hayatınızda tekrar eden olumsuz kalıpların kökenlerini anlamak...',
    content: '<p>Şema Terapi, erken yaşam deneyimlerinden kaynaklanan kalıcı düşünce ve davranış kalıplarını değiştirmeyi hedefleyen bir terapi yaklaşımıdır.</p>',
    image: 'schema-therapy.jpg',
    createdAt: new Date('2024-01-05'),
    updatedAt: new Date('2024-01-05'),
    published: true
  },
  {
    id: 4,
    title: 'Depresyon Belirtileri ve Tedavisi',
    category: 'depresyon',
    summary: 'Depresyonun yaygın belirtileri ve modern tedavi yöntemleri hakkında bilmeniz gerekenler...',
    content: '<p>Depresyon, sadece üzgün hissetmekten çok daha fazlasıdır. Uyku bozuklukları, iştah değişiklikleri ve enerji kaybı gibi fiziksel belirtilerle de kendini gösterebilir. BDT, depresyon tedavisinde en etkili yöntemlerden biridir.</p>',
    image: 'depression-symptoms.jpg',
    createdAt: new Date('2024-01-20'),
    updatedAt: new Date('2024-01-20'),
    published: true
  },
  {
    id: 5,
    title: 'Çift Terapisinde İletişim Teknikleri',
    category: 'cift-terapisi',
    summary: 'İlişkinizde daha sağlıklı iletişim kurmak için kullanabileceğiniz pratik yöntemler...',
    content: '<p>İlişkilerde en büyük sorun genellikle iletişim eksikliğidir. "Ben" dili kullanmak, aktif dinleme ve empati kurma gibi teknikler, çatışmaları çözmede büyük rol oynar.</p>',
    image: 'couples-therapy.jpg',
    createdAt: new Date('2024-01-25'),
    updatedAt: new Date('2024-01-25'),
    published: true
  },
  {
    id: 6,
    title: 'Online Terapi Etkili mi?',
    category: 'genel',
    summary: 'Dijital çağda terapiye erişim: Online terapinin avantajları ve bilimsel etkinliği...',
    content: '<p>Yapılan araştırmalar, online terapinin yüz yüze terapi kadar etkili olduğunu göstermektedir. Özellikle yoğun çalışanlar veya ulaşım sorunu yaşayanlar için mükemmel bir alternatiftir.</p>',
    image: 'online-therapy.jpg',
    createdAt: new Date('2024-01-28'),
    updatedAt: new Date('2024-01-28'),
    published: true
  }
];

// Get all blogs
router.get('/', async (req, res) => {
  try {
    const { category, published, limit = 10, page = 1 } = req.query;

    let filteredBlogs = [...blogs];

    if (category) {
      filteredBlogs = filteredBlogs.filter(blog => blog.category === category);
    }

    if (published !== undefined) {
      filteredBlogs = filteredBlogs.filter(blog => blog.published === (published === 'true'));
    }

    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginatedBlogs = filteredBlogs.slice(startIndex, endIndex);

    res.json({
      success: true,
      data: {
        blogs: paginatedBlogs,
        total: filteredBlogs.length,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(filteredBlogs.length / limit)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Blog yazıları getirilirken hata oluştu',
      error: error.message
    });
  }
});

// Get single blog
router.get('/:id', async (req, res) => {
  try {
    const blogId = parseInt(req.params.id);
    const blog = blogs.find(b => b.id === blogId);

    if (!blog) {
      return res.status(404).json({
        success: false,
        message: 'Blog yazısı bulunamadı'
      });
    }

    res.json({
      success: true,
      data: blog
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Blog yazısı getirilirken hata oluştu',
      error: error.message
    });
  }
});

// Create new blog (Admin only)
router.post('/', authenticateToken, requireAdmin, upload.single('image'), async (req, res) => {
  try {
    const { title, category, summary, content, published = true } = req.body;

    if (!title || !category || !summary || !content) {
      return res.status(400).json({
        success: false,
        message: 'Tüm gerekli alanları doldurun'
      });
    }

    const newBlog = {
      id: blogs.length > 0 ? Math.max(...blogs.map(b => b.id)) + 1 : 1,
      title,
      category,
      summary,
      content,
      image: req.file ? req.file.filename : 'default-blog.jpg',
      createdAt: new Date(),
      updatedAt: new Date(),
      published: published === 'true'
    };

    blogs.push(newBlog);

    res.status(201).json({
      success: true,
      message: 'Blog yazısı başarıyla oluşturuldu',
      data: newBlog
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Blog yazısı oluşturulurken hata oluştu',
      error: error.message
    });
  }
});

// Update blog (Admin only)
router.put('/:id', authenticateToken, requireAdmin, upload.single('image'), async (req, res) => {
  try {
    const blogId = parseInt(req.params.id);
    const blogIndex = blogs.findIndex(b => b.id === blogId);

    if (blogIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Blog yazısı bulunamadı'
      });
    }

    const { title, category, summary, content, published } = req.body;

    // Update blog
    blogs[blogIndex] = {
      ...blogs[blogIndex],
      title: title || blogs[blogIndex].title,
      category: category || blogs[blogIndex].category,
      summary: summary || blogs[blogIndex].summary,
      content: content || blogs[blogIndex].content,
      image: req.file ? req.file.filename : blogs[blogIndex].image,
      published: published !== undefined ? published === 'true' : blogs[blogIndex].published,
      updatedAt: new Date()
    };

    res.json({
      success: true,
      message: 'Blog yazısı başarıyla güncellendi',
      data: blogs[blogIndex]
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Blog yazısı güncellenirken hata oluştu',
      error: error.message
    });
  }
});

// Delete blog (Admin only)
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const blogId = parseInt(req.params.id);
    const blogIndex = blogs.findIndex(b => b.id === blogId);

    if (blogIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Blog yazısı bulunamadı'
      });
    }

    // Remove image file if exists
    const blog = blogs[blogIndex];
    if (blog.image && blog.image !== 'default-blog.jpg') {
      try {
        await fs.unlink(path.join(__dirname, '../images', blog.image));
      } catch (err) {
        console.log('Image file not found:', err.message);
      }
    }

    blogs.splice(blogIndex, 1);

    res.json({
      success: true,
      message: 'Blog yazısı başarıyla silindi'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Blog yazısı silinirken hata oluştu',
      error: error.message
    });
  }
});

// Get blog categories
router.get('/categories/list', async (req, res) => {
  try {
    const categories = [
      { value: 'terapi', label: 'Terapi' },
      { value: 'kaygi', label: 'Kaygı' },
      { value: 'depresyon', label: 'Depresyon' },
      { value: 'cift-terapisi', label: 'Çift Terapisi' },
      { value: 'genel', label: 'Genel' }
    ];

    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Kategoriler getirilirken hata oluştu',
      error: error.message
    });
  }
});

module.exports = router;
