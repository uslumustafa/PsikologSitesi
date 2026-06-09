const express = require('express');
const router = express.Router();
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const mongoose = require('mongoose');
const Blog = require('../models/Blog');

// Blog içeriği admin (yetkili) tarafından, zengin metin editöründen gelir ve HTML içerir.
// Global xss-clean middleware'i bu HTML'i kaçırıyor (< -> &lt;), bu da yazının düz metin
// gibi görünmesine yol açıyor. İçerik güvenilir (sadece admin) olduğundan kaçışı geri çözüyoruz.
function decodeHtmlEntities(str) {
  if (typeof str !== 'string') return str;
  return str
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&#x2F;/g, '/')
    .replace(/&#47;/g, '/')
    .replace(/&amp;/g, '&');
}

// Türkçe karakterleri sadeleştirip URL-dostu bir slug üretir (statik sayfa adresi için).
function slugify(str) {
  const map = { 'ç': 'c', 'ğ': 'g', 'ı': 'i', 'ö': 'o', 'ş': 's', 'ü': 'u', 'İ': 'i' };
  return String(str || '')
    .replace(/[çğıöşüİ]/g, c => map[c] || c)
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

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

// Blog yazıları tek doğruluk kaynağından gelir (backend/blog-posts.js).
// Aynı veriyi statik sayfa üreticisi de okur; in-memory kopya üzerinde çalışırken
// kaynak diziyi mutasyona uğratmamak için kopyalıyoruz.
let blogs = require('../blog-posts').map(b => ({ ...b }));

// Get all blogs
router.get('/', async (req, res) => {
  try {
    const { category, published, limit = 10, page = 1 } = req.query;
    const isMongoConnected = mongoose.connection.readyState === 1;

    let total = 0;
    let resultBlogs = [];

    if (isMongoConnected) {
      // Seed database with mock blogs if it is empty
      const count = await Blog.countDocuments();
      if (count === 0) {
        const blogsToSeed = blogs.map(({ id, ...blogData }) => ({
          ...blogData,
          _id: new mongoose.Types.ObjectId()
        }));
        await Blog.insertMany(blogsToSeed);
      }

      const query = {};
      if (category) {
        query.category = category;
      }
      if (published !== undefined) {
        query.published = published === 'true';
      }

      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);
      const skip = (pageNum - 1) * limitNum;

      resultBlogs = await Blog.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum);

      total = await Blog.countDocuments(query);
    } else {
      let filteredBlogs = [...blogs];

      if (category) {
        filteredBlogs = filteredBlogs.filter(blog => blog.category === category);
      }

      if (published !== undefined) {
        filteredBlogs = filteredBlogs.filter(blog => blog.published === (published === 'true'));
      }

      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + parseInt(limit);
      resultBlogs = filteredBlogs.slice(startIndex, endIndex);
      total = filteredBlogs.length;
    }

    res.json({
      success: true,
      data: {
        blogs: resultBlogs,
        total: total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit)
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

// Get single blog
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const isMongoConnected = mongoose.connection.readyState === 1;
    let blog;

    if (isMongoConnected) {
      if (mongoose.Types.ObjectId.isValid(id)) {
        blog = await Blog.findById(id);
      }
      
      if (!blog) {
        const blogId = parseInt(id);
        if (!isNaN(blogId) && String(blogId) === id) {
          blog = blogs.find(b => b.id === blogId);
        }
      }
    } else {
      const blogId = parseInt(id);
      if (!isNaN(blogId) && String(blogId) === id) {
        blog = blogs.find(b => b.id === blogId);
      }
    }

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
    const { title, category, summary, published = true } = req.body;
    const content = decodeHtmlEntities(req.body.content);

    if (!title || !category || !summary || !content) {
      return res.status(400).json({
        success: false,
        message: 'Tüm gerekli alanları doldurun'
      });
    }

    const isMongoConnected = mongoose.connection.readyState === 1;
    const blogImage = req.file ? req.file.filename : (req.body.image || 'cognitive-behavioral-therapy.jpg');
    const isPublished = published === 'true' || published === true;
    const slug = slugify(req.body.slug || title);

    let newBlog;

    if (isMongoConnected) {
      newBlog = await Blog.create({
        title,
        category,
        summary,
        content,
        image: blogImage,
        slug,
        published: isPublished
      });
    } else {
      newBlog = {
        id: blogs.length > 0 ? Math.max(...blogs.map(b => b.id)) + 1 : 1,
        title,
        category,
        summary,
        content,
        image: blogImage,
        slug,
        createdAt: new Date(),
        updatedAt: new Date(),
        published: isPublished
      };
      blogs.push(newBlog);
    }

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
    const { id } = req.params;
    const { title, category, summary, published } = req.body;
    const content = decodeHtmlEntities(req.body.content);
    const isMongoConnected = mongoose.connection.readyState === 1;

    let updatedBlog;

    if (isMongoConnected) {
      if (mongoose.Types.ObjectId.isValid(id)) {
        const updateData = {};
        if (title !== undefined) updateData.title = title;
        if (category !== undefined) updateData.category = category;
        if (summary !== undefined) updateData.summary = summary;
        if (content !== undefined) updateData.content = content;
        if (req.file) updateData.image = req.file.filename;
        if (published !== undefined) updateData.published = published === 'true' || published === true;

        updatedBlog = await Blog.findByIdAndUpdate(id, updateData, { new: true, runValidators: true });
      }

      if (!updatedBlog) {
        const blogId = parseInt(id);
        if (!isNaN(blogId) && String(blogId) === id) {
          const blogIndex = blogs.findIndex(b => b.id === blogId);
          if (blogIndex !== -1) {
            blogs[blogIndex] = {
              ...blogs[blogIndex],
              title: title || blogs[blogIndex].title,
              category: category || blogs[blogIndex].category,
              summary: summary || blogs[blogIndex].summary,
              content: content || blogs[blogIndex].content,
              image: req.file ? req.file.filename : blogs[blogIndex].image,
              published: published !== undefined ? (published === 'true' || published === true) : blogs[blogIndex].published,
              updatedAt: new Date()
            };
            updatedBlog = blogs[blogIndex];
          }
        }
      }
    } else {
      const blogId = parseInt(id);
      if (!isNaN(blogId) && String(blogId) === id) {
        const blogIndex = blogs.findIndex(b => b.id === blogId);
        if (blogIndex !== -1) {
          blogs[blogIndex] = {
            ...blogs[blogIndex],
            title: title || blogs[blogIndex].title,
            category: category || blogs[blogIndex].category,
            summary: summary || blogs[blogIndex].summary,
            content: content || blogs[blogIndex].content,
            image: req.file ? req.file.filename : blogs[blogIndex].image,
            published: published !== undefined ? (published === 'true' || published === true) : blogs[blogIndex].published,
            updatedAt: new Date()
          };
          updatedBlog = blogs[blogIndex];
        }
      }
    }

    if (!updatedBlog) {
      return res.status(404).json({
        success: false,
        message: 'Blog yazısı bulunamadı'
      });
    }

    res.json({
      success: true,
      message: 'Blog yazısı başarıyla güncellendi',
      data: updatedBlog
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
    const { id } = req.params;
    const isMongoConnected = mongoose.connection.readyState === 1;
    let deleted = false;
    let imageFilename = null;

    if (isMongoConnected) {
      if (mongoose.Types.ObjectId.isValid(id)) {
        const blogToDelete = await Blog.findById(id);
        if (blogToDelete) {
          imageFilename = blogToDelete.image;
          await Blog.findByIdAndDelete(id);
          deleted = true;
        }
      }

      if (!deleted) {
        const blogId = parseInt(id);
        if (!isNaN(blogId) && String(blogId) === id) {
          const blogIndex = blogs.findIndex(b => b.id === blogId);
          if (blogIndex !== -1) {
            imageFilename = blogs[blogIndex].image;
            blogs.splice(blogIndex, 1);
            deleted = true;
          }
        }
      }
    } else {
      const blogId = parseInt(id);
      if (!isNaN(blogId) && String(blogId) === id) {
        const blogIndex = blogs.findIndex(b => b.id === blogId);
        if (blogIndex !== -1) {
          imageFilename = blogs[blogIndex].image;
          blogs.splice(blogIndex, 1);
          deleted = true;
        }
      }
    }

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Blog yazısı bulunamadı'
      });
    }

    // Remove image file if exists
    if (imageFilename && imageFilename !== 'default-blog.jpg') {
      try {
        await fs.unlink(path.join(__dirname, '../images', imageFilename));
      } catch (err) {
        console.log('Image file not found:', err.message);
      }
    }

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

module.exports = router;
