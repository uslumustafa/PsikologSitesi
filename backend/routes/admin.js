const express = require('express');
const { body, validationResult, query } = require('express-validator');
const User = require('../models/User');
const Appointment = require('../models/Appointment');
const { requireAdmin } = require('../middleware/auth');
const { sendEmail } = require('../utils/emailService');
const reminderJob = require('../jobs/reminderJob');
const router = express.Router();

// All admin routes require admin authentication
router.use(requireAdmin);

/**
 * @swagger
 * /api/admin/dashboard:
 *   get:
 *     summary: Get admin dashboard statistics
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard statistics retrieved successfully
 *       403:
 *         description: Admin access required
 */
router.get('/dashboard', async (req, res) => {
  try {
    // Check if MongoDB is connected
    const mongoose = require('mongoose');
    if (mongoose.connection.readyState !== 1) {
      console.log('MongoDB not connected, using mock dashboard data');
      return res.json({
        success: true,
        data: {
          users: {
            total: 150,
            active: 120,
            newThisMonth: 15
          },
          appointments: {
            total: 450,
            today: 5,
            thisWeek: 25,
            thisMonth: 80,
            statusBreakdown: [
              { _id: 'completed', count: 300 },
              { _id: 'scheduled', count: 50 },
              { _id: 'cancelled', count: 20 }
            ]
          },
          revenue: { totalRevenue: 150000, averagePrice: 500, count: 300 },
          reminders: { sent: 400, failed: 10, pending: 40 },
          recentAppointments: [
            {
              _id: 'mock1',
              user: { name: 'Ahmet Yılmaz', email: 'ahmet@example.com', phone: '05551112233' },
              date: new Date(),
              time: '14:00',
              type: 'individual',
              status: 'scheduled',
              price: 500
            },
            {
              _id: 'mock2',
              user: { name: 'Ayşe Demir', email: 'ayse@example.com', phone: '05554445566' },
              date: new Date(),
              time: '15:00',
              type: 'couple',
              status: 'completed',
              price: 750
            }
          ]
        }
      });
    }

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());

    // User statistics
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ isActive: true });
    const newUsersThisMonth = await User.countDocuments({
      createdAt: { $gte: startOfMonth }
    });

    // Appointment statistics
    const totalAppointments = await Appointment.countDocuments();
    const todayAppointments = await Appointment.countDocuments({
      date: {
        $gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
        $lt: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
      }
    });
    const thisWeekAppointments = await Appointment.countDocuments({
      date: { $gte: startOfWeek }
    });
    const thisMonthAppointments = await Appointment.countDocuments({
      date: { $gte: startOfMonth }
    });

    // Appointment status breakdown
    const appointmentStatuses = await Appointment.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    // Revenue statistics
    const revenueStats = await Appointment.aggregate([
      {
        $match: {
          paymentStatus: 'paid',
          date: { $gte: startOfMonth }
        }
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$price' },
          averagePrice: { $avg: '$price' },
          count: { $sum: 1 }
        }
      }
    ]);

    // Reminder statistics
    const reminderStats = await reminderJob.getReminderStats();

    // Recent appointments
    const recentAppointments = await Appointment.find()
      .populate('user', 'name email phone')
      .sort({ createdAt: -1 })
      .limit(5);

    res.json({
      success: true,
      data: {
        users: {
          total: totalUsers,
          active: activeUsers,
          newThisMonth: newUsersThisMonth
        },
        appointments: {
          total: totalAppointments,
          today: todayAppointments,
          thisWeek: thisWeekAppointments,
          thisMonth: thisMonthAppointments,
          statusBreakdown: appointmentStatuses
        },
        revenue: revenueStats[0] || { totalRevenue: 0, averagePrice: 0, count: 0 },
        reminders: reminderStats,
        recentAppointments
      }
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get dashboard statistics'
    });
  }
});

/**
 * @swagger
 * /api/admin/users:
 *   get:
 *     summary: Get all users (Admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *         description: Users per page
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [user, admin]
 *         description: Filter by role
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *         description: Filter by active status
 *     responses:
 *       200:
 *         description: Users retrieved successfully
 *       403:
 *         description: Admin access required
 */
router.get('/users', [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('role').optional().isIn(['user', 'admin']),
  query('isActive').optional().isBoolean()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    // Check if MongoDB is connected
    const mongoose = require('mongoose');
    if (mongoose.connection.readyState !== 1) {
      console.log('MongoDB not connected, using mock users data');
      return res.json({
        success: true,
        data: {
          users: [
            { _id: 'mock-user-1', name: 'Ahmet Yılmaz', email: 'ahmet@example.com', role: 'user', isActive: true },
            { _id: 'mock-user-2', name: 'Ayşe Demir', email: 'ayse@example.com', role: 'user', isActive: true },
            { _id: 'mock-user-3', name: 'Mehmet Kaya', email: 'mehmet@example.com', role: 'user', isActive: true },
            { _id: 'mock-admin-1', name: 'Admin User', email: 'admin@psikologonuruslu.com', role: 'admin', isActive: true }
          ].filter(u => !req.query.role || u.role === req.query.role),
          pagination: {
            page: 1,
            limit: 10,
            total: 4,
            pages: 1
          }
        }
      });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Build filter
    const filter = {};
    if (req.query.role) filter.role = req.query.role;
    if (req.query.isActive !== undefined) filter.isActive = req.query.isActive === 'true';

    // Get users
    const users = await User.find(filter)
      .select('-password -emailVerificationToken -passwordResetToken -passwordResetExpires')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await User.countDocuments(filter);

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve users'
    });
  }
});

/**
 * @swagger
 * /api/admin/users/{id}:
 *   get:
 *     summary: Get user by ID (Admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     responses:
 *       200:
 *         description: User retrieved successfully
 *       404:
 *         description: User not found
 *       403:
 *         description: Admin access required
 */
router.get('/users/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password -emailVerificationToken -passwordResetToken -passwordResetExpires');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get user's appointments
    const appointments = await Appointment.find({ user: user._id })
      .sort({ date: -1, time: -1 })
      .limit(10);

    res.json({
      success: true,
      data: {
        user,
        recentAppointments: appointments
      }
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve user'
    });
  }
});

/**
 * @swagger
 * /api/admin/users/{id}/toggle-status:
 *   patch:
 *     summary: Toggle user active status (Admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     responses:
 *       200:
 *         description: User status updated successfully
 *       404:
 *         description: User not found
 *       403:
 *         description: Admin access required
 */
router.patch('/users/:id/toggle-status', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Prevent admin from deactivating themselves
    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Cannot deactivate your own account'
      });
    }

    user.isActive = !user.isActive;
    await user.save();

    res.json({
      success: true,
      message: `User ${user.isActive ? 'activated' : 'deactivated'} successfully`,
      data: {
        user: user.fullProfile
      }
    });
  } catch (error) {
    console.error('Toggle user status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update user status'
    });
  }
});

/**
 * @swagger
 * /api/admin/users/{id}/change-role:
 *   patch:
 *     summary: Change user role (Admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - role
 *             properties:
 *               role:
 *                 type: string
 *                 enum: [user, admin]
 *                 example: "admin"
 *     responses:
 *       200:
 *         description: User role updated successfully
 *       400:
 *         description: Validation error
 *       404:
 *         description: User not found
 *       403:
 *         description: Admin access required
 */
router.patch('/users/:id/change-role', [
  body('role')
    .isIn(['user', 'admin'])
    .withMessage('Role must be either user or admin')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Prevent admin from changing their own role
    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Cannot change your own role'
      });
    }

    const oldRole = user.role;
    user.role = req.body.role;
    await user.save();

    res.json({
      success: true,
      message: `User role changed from ${oldRole} to ${user.role}`,
      data: {
        user: user.fullProfile
      }
    });
  } catch (error) {
    console.error('Change user role error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update user role'
    });
  }
});

/**
 * @swagger
 * /api/admin/appointments:
 *   get:
 *     summary: Get all appointments (Admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *         description: Appointments per page
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [scheduled, confirmed, completed, cancelled, no-show]
 *         description: Filter by status
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter by date
 *     responses:
 *       200:
 *         description: Appointments retrieved successfully
 *       403:
 *         description: Admin access required
 */
router.get('/appointments', [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('status').optional().isIn(['scheduled', 'confirmed', 'completed', 'cancelled', 'no-show']),
  query('date').optional().isISO8601().withMessage('Date must be in ISO format')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Build filter
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.date) {
      const date = new Date(req.query.date);
      const nextDay = new Date(date);
      nextDay.setDate(nextDay.getDate() + 1);
      filter.date = { $gte: date, $lt: nextDay };
    }

    // Get appointments
    const appointments = await Appointment.find(filter)
      .populate('user', 'name email phone')
      .sort({ date: 1, time: 1 })
      .skip(skip)
      .limit(limit);

    const total = await Appointment.countDocuments(filter);

    res.json({
      success: true,
      data: {
        appointments,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get appointments error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve appointments'
    });
  }
});

/**
 * @swagger
 * /api/admin/appointments:
 *   post:
 *     summary: Create a new appointment (Admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - user
 *               - date
 *               - time
 *               - type
 *               - price
 *             properties:
 *               user:
 *                 type: string
 *                 description: User ID
 *               date:
 *                 type: string
 *                 format: date
 *               time:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [individual, couple, family, online, in-person]
 *               price:
 *                 type: number
 *               status:
 *                 type: string
 *                 enum: [scheduled, confirmed, completed, cancelled, no-show]
 *               notes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Appointment created successfully
 *       400:
 *         description: Validation error
 *       403:
 *         description: Admin access required
 */
router.post('/appointments', [
  body('user').notEmpty().withMessage('User ID is required'),
  body('date').isISO8601().withMessage('Valid date is required'),
  body('time').notEmpty().withMessage('Time is required'),
  body('type').isIn(['individual', 'couple', 'family', 'online', 'in-person']).withMessage('Valid type is required'),
  body('price').isNumeric().withMessage('Price must be a number')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    // Check if MongoDB is connected
    const mongoose = require('mongoose');
    if (mongoose.connection.readyState !== 1) {
      console.log('MongoDB not connected, using mock appointment creation');
      return res.status(201).json({
        success: true,
        message: 'Appointment created successfully (Mock Mode)',
        data: {
          _id: 'mock-appointment-' + Date.now(),
          ...req.body,
          user: { _id: req.body.user, name: 'Mock User', email: 'mock@example.com' }
        }
      });
    }

    const appointment = new Appointment({
      user: req.body.user,
      date: req.body.date,
      time: req.body.time,
      type: req.body.type,
      price: req.body.price,
      status: req.body.status || 'scheduled',
      notes: req.body.notes
    });

    await appointment.save();

    // Populate user details for response
    await appointment.populate('user', 'name email phone');

    res.status(201).json({
      success: true,
      message: 'Appointment created successfully',
      data: appointment
    });
  } catch (error) {
    console.error('Create appointment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create appointment'
    });
  }
});

/**
 * @swagger
 * /api/admin/reminders/send:
 *   post:
 *     summary: Send manual reminder (Admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - appointmentId
 *             properties:
 *               appointmentId:
 *                 type: string
 *                 example: "60f7b3b3b3b3b3b3b3b3b3b3"
 *     responses:
 *       200:
 *         description: Reminder sent successfully
 *       400:
 *         description: Validation error
 *       403:
 *         description: Admin access required
 */
router.post('/reminders/send', [
  body('appointmentId')
    .notEmpty()
    .withMessage('Appointment ID is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const result = await reminderJob.sendManualReminder(req.body.appointmentId);

    if (result.success) {
      res.json({
        success: true,
        message: result.message
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message
      });
    }
  } catch (error) {
    console.error('Send manual reminder error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send reminder'
    });
  }
});

/**
 * @swagger
 * /api/admin/reminders/stats:
 *   get:
 *     summary: Get reminder statistics (Admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Reminder statistics retrieved successfully
 *       403:
 *         description: Admin access required
 */
router.get('/reminders/stats', async (req, res) => {
  try {
    const stats = await reminderJob.getReminderStats();

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Get reminder stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get reminder statistics'
    });
  }
});

/**
 * @swagger
 * /api/admin/email/broadcast:
 *   post:
 *     summary: Send broadcast email to all users (Admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - subject
 *               - message
 *             properties:
 *               subject:
 *                 type: string
 *                 example: "Important Announcement"
 *               message:
 *                 type: string
 *                 example: "This is an important message for all users"
 *               targetRole:
 *                 type: string
 *                 enum: [all, user, admin]
 *                 default: "all"
 *     responses:
 *       200:
 *         description: Broadcast email sent successfully
 *       400:
 *         description: Validation error
 *       403:
 *         description: Admin access required
 */
router.post('/email/broadcast', [
  body('subject')
    .notEmpty()
    .withMessage('Subject is required')
    .isLength({ max: 200 })
    .withMessage('Subject cannot exceed 200 characters'),
  body('message')
    .notEmpty()
    .withMessage('Message is required')
    .isLength({ max: 5000 })
    .withMessage('Message cannot exceed 5000 characters'),
  body('targetRole')
    .optional()
    .isIn(['all', 'user', 'admin'])
    .withMessage('Target role must be all, user, or admin')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { subject, message, targetRole = 'all' } = req.body;

    // Build user filter
    const filter = { isActive: true, emailVerified: true };
    if (targetRole !== 'all') {
      filter.role = targetRole;
    }

    // Get target users
    const users = await User.find(filter).select('name email');

    if (users.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No users found matching the criteria'
      });
    }

    // Send emails
    const emailPromises = users.map(user =>
      sendEmail({
        to: user.email,
        subject: `[Psikolog Onur Uslu] ${subject}`,
        template: 'broadcast',
        data: {
          name: user.name,
          message,
          subject
        }
      }).catch(error => ({
        success: false,
        email: user.email,
        error: error.message
      }))
    );

    const results = await Promise.all(emailPromises);
    const successful = results.filter(r => r.success !== false).length;
    const failed = results.length - successful;

    res.json({
      success: true,
      message: `Broadcast email sent to ${successful} users${failed > 0 ? `, ${failed} failed` : ''}`,
      data: {
        totalUsers: users.length,
        successful,
        failed,
        results: failed > 0 ? results.filter(r => r.success === false) : undefined
      }
    });
  } catch (error) {
    console.error('Broadcast email error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send broadcast email'
    });
  }
});

/**
 * @swagger
 * /api/admin/appointments/{id}/status:
 *   patch:
 *     summary: Update appointment status (Admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Appointment ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [pending, approved, rejected, completed, cancelled]
 *                 example: "approved"
 *     responses:
 *       200:
 *         description: Appointment status updated successfully
 *       400:
 *         description: Validation error
 *       404:
 *         description: Appointment not found
 *       403:
 *         description: Admin access required
 */
router.patch('/appointments/:id/status', [
  body('status')
    .isIn(['pending', 'approved', 'rejected', 'completed', 'cancelled'])
    .withMessage('Status must be pending, approved, rejected, completed, or cancelled')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const appointment = await Appointment.findById(req.params.id).populate('user', 'name email phone');

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found'
      });
    }

    const oldStatus = appointment.status;
    appointment.status = req.body.status;
    appointment.updatedBy = req.user._id;
    await appointment.save();

    // Send notification email to user
    if (appointment.user && appointment.user.email) {
      try {
        await sendEmail({
          to: appointment.user.email,
          subject: `Randevu Durumu Güncellendi - ${appointment.date}`,
          template: 'appointment-status-update',
          data: {
            name: appointment.user.name,
            date: appointment.date,
            time: appointment.time,
            oldStatus: oldStatus,
            newStatus: appointment.status,
            service: appointment.service
          }
        });
      } catch (emailError) {
        console.error('Failed to send status update email:', emailError);
      }
    }

    res.json({
      success: true,
      message: `Appointment status updated from ${oldStatus} to ${appointment.status}`,
      data: {
        appointment
      }
    });
  } catch (error) {
    console.error('Update appointment status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update appointment status'
    });
  }
});

/**
 * @swagger
 * /api/admin/customers:
 *   get:
 *     summary: Get all customers (Admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *         description: Customers per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by name or email
 *     responses:
 *       200:
 *         description: Customers retrieved successfully
 *       403:
 *         description: Admin access required
 */
router.get('/customers', [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('search').optional().isLength({ min: 1, max: 100 }).withMessage('Search term must be between 1 and 100 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Build filter
    const filter = { role: 'user' };
    if (req.query.search) {
      filter.$or = [
        { name: { $regex: req.query.search, $options: 'i' } },
        { email: { $regex: req.query.search, $options: 'i' } }
      ];
    }

    // Get customers
    const customers = await User.find(filter)
      .select('-password -emailVerificationToken -passwordResetToken -passwordResetExpires')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await User.countDocuments(filter);

    res.json({
      success: true,
      data: {
        customers,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get customers error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve customers'
    });
  }
});

/**
 * @swagger
 * /api/admin/customers/{id}:
 *   get:
 *     summary: Get customer details (Admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Customer ID
 *     responses:
 *       200:
 *         description: Customer details retrieved successfully
 *       404:
 *         description: Customer not found
 *       403:
 *         description: Admin access required
 */
router.get('/customers/:id', async (req, res) => {
  try {
    const customer = await User.findById(req.params.id)
      .select('-password -emailVerificationToken -passwordResetToken -passwordResetExpires');

    if (!customer || customer.role !== 'user') {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    // Get customer's appointments
    const appointments = await Appointment.find({ user: customer._id })
      .sort({ date: -1, time: -1 });

    // Get appointment statistics
    const appointmentStats = await Appointment.aggregate([
      { $match: { user: customer._id } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        customer,
        appointments,
        appointmentStats
      }
    });
  } catch (error) {
    console.error('Get customer error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve customer'
    });
  }
});

module.exports = router;
