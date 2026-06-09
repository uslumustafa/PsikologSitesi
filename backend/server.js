const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const morgan = require('morgan');
const mongoSanitize = require('express-mongo-sanitize');
const hpp = require('hpp');
const xss = require('xss-clean');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');
require('dotenv').config();

// Import routes
const authRoutes = require('./routes/auth');
const appointmentRoutes = require('./routes/appointments');
const userRoutes = require('./routes/users');
const adminRoutes = require('./routes/admin');
const blogRoutes = require('./routes/blog');
const siteSettingsRoutes = require('./routes/siteSettings');
const contactRoutes = require('./routes/contact');
const reviewRoutes = require('./routes/reviews');

// Import middleware
const errorHandler = require('./middleware/errorHandler');
const { authenticateToken } = require('./middleware/auth');

// Import cron jobs
const reminderJob = require('./jobs/reminderJob');

const app = express();

// Render/Cloudflare gibi ters proxy arkasında çalışırken gerçek ziyaretçi IP'sini
// (X-Forwarded-For) doğru oku — yoksa rate-limit herkesi tek IP sanıp toplu kilitler.
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com", "https://fonts.googleapis.com", "https://unpkg.com"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com", "https://unpkg.com", "https://www.googletagmanager.com", "https://cdn.tailwindcss.com"],
      fontSrc: ["'self'", "https://cdnjs.cloudflare.com", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "http://localhost:5002", "http://127.0.0.1:5002", "https:"],
      frameSrc: ["'self'", "https://www.googletagmanager.com"]
    },
  },
}));

// CORS configuration
// Frontend (Cloudflare Pages) ve backend (Render) ayrı origin'lerde olduğu için
// bilinen origin'lere + *.pages.dev (Cloudflare) önizleme adreslerine izin veriyoruz.
const staticAllowedOrigins = [
  process.env.FRONTEND_URL,
  'https://gebzepsikologonuruslu.com',
  'https://www.gebzepsikologonuruslu.com',
  'http://localhost:8080',
  'http://localhost:3000',
  'http://127.0.0.1:5500'
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    // origin yoksa (curl, sunucu-sunucu, mobil) izin ver
    if (!origin) return callback(null, true);
    let hostname = '';
    try { hostname = new URL(origin).hostname; } catch (e) { /* ignore */ }
    const isAllowed =
      staticAllowedOrigins.includes(origin) ||
      /\.pages\.dev$/.test(hostname) ||      // Cloudflare Pages adresleri
      /\.workers\.dev$/.test(hostname) ||    // Cloudflare Workers (static assets) adresleri
      /\.netlify\.app$/.test(hostname) ||    // Netlify (yedek seçenek)
      /\.onrender\.com$/.test(hostname);     // backend kendi adresinden istek atarsa
    return callback(null, isAllowed);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Rate limiting (disabled in test mode)
if (process.env.NODE_ENV !== 'test') {
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 300, // her IP için 15 dakikada 300 istek
    message: {
      error: 'Too many requests from this IP, please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false,
    // Sağlık kontrolünü limitten muaf tut (Render sık sık /api/health'e bakar)
    skip: (req) => req.originalUrl === '/api/health' || req.originalUrl === '/health'
  });

  app.use('/api/', limiter);

  // Stricter rate limiting for auth endpoints
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // limit each IP to 5 requests per windowMs
    message: {
      error: 'Too many authentication attempts, please try again later.'
    }
  });

  app.use('/api/auth/', authLimiter);
}

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Data sanitization against NoSQL query injection
app.use(mongoSanitize());

// Data sanitization against XSS
app.use(xss());

// Prevent parameter pollution
app.use(hpp());

// Compression middleware
app.use(compression());

// Logging middleware
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Swagger configuration
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Psikolog Onur Uslu API',
      version: '1.0.0',
      description: 'Backend API for psychologist appointment management system',
      contact: {
        name: 'Psikolog Onur Uslu',
        email: 'psikologonuruslu@gmail.com',
        url: 'https://psikologonuruslu.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: process.env.API_URL || 'http://localhost:5000',
        description: 'Development server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      }
    }
  },
  apis: ['./routes/*.js', './models/*.js']
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Root endpoint relocated to /api to allow static frontend serving on /
app.get('/api', (req, res) => {
  res.status(200).json({
    message: 'Psikolog Onur Uslu API',
    version: '1.0.0',
    status: 'OK',
    endpoints: {
      health: '/health',
      apiHealth: '/api/health',
      docs: '/api-docs',
      auth: '/api/auth',
      appointments: '/api/appointments',
      users: '/api/users',
      admin: '/api/admin'
    }
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', authenticateToken, adminRoutes);
app.use('/api/blog', blogRoutes);
app.use('/api/site-settings', siteSettingsRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/reviews', reviewRoutes);

// API documentation endpoint
app.get('/api-docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// Serve static frontend files from parent directory
const path = require('path');
app.use(express.static(path.join(__dirname, '../')));

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Global error handler
app.use(errorHandler);

// MongoDB connection
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/psikolog_db', {
      serverSelectionTimeoutMS: 15000
    });

    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('Database connection error:', error);
    throw error; // Don't exit, just throw the error
  }
};

// Start server
const PORT = process.env.PORT || 5002;

const startServer = async () => {
  try {
    // Try to connect to MongoDB, but don't fail if it's not available
    try {
      await connectDB();
    } catch (error) {
      console.log('⚠️  MongoDB bağlantısı kurulamadı, server mock data ile çalışacak');
      console.log('💡 MongoDB cluster connection string ekleyerek gerçek veri kullanabilirsiniz');
    }

    const server = app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`API Documentation: http://localhost:${PORT}/api-docs`);
    });

    // Start reminder job
    reminderJob.start();

    // Graceful shutdown
    process.on('SIGTERM', () => {
      console.log('SIGTERM received. Shutting down gracefully...');
      server.close(() => {
        console.log('Process terminated');
        mongoose.connection.close();
        process.exit(0);
      });
    });

    process.on('SIGINT', () => {
      console.log('SIGINT received. Shutting down gracefully...');
      server.close(() => {
        console.log('Process terminated');
        mongoose.connection.close();
        process.exit(0);
      });
    });

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Start server only when not running tests
if (process.env.NODE_ENV !== 'test') {
  startServer();
}

module.exports = app;
