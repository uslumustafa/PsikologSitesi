const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const Appointment = require('../models/Appointment');
const { authenticateToken, requireOwnershipOrAdmin } = require('../middleware/auth');
const { sendEmail } = require('../utils/emailService');
const router = express.Router();

// All user routes require authentication
router.use(authenticateToken);

/**
 * @swagger
 * /api/users/profile:
 *   get:
 *     summary: Get current user profile
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profile retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/profile', async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        user: req.user.fullProfile
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get user profile'
    });
  }
});

/**
 * @swagger
 * /api/users/profile:
 *   put:
 *     summary: Update user profile
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Ahmet Yılmaz"
 *               phone:
 *                 type: string
 *                 example: "05551234567"
 *               profile:
 *                 type: object
 *                 properties:
 *                   dateOfBirth:
 *                     type: string
 *                     format: date
 *                   gender:
 *                     type: string
 *                     enum: [male, female, other, prefer_not_to_say]
 *                   address:
 *                     type: object
 *                     properties:
 *                       street:
 *                         type: string
 *                       city:
 *                         type: string
 *                       postalCode:
 *                         type: string
 *                   emergencyContact:
 *                     type: object
 *                     properties:
 *                       name:
 *                         type: string
 *                       phone:
 *                         type: string
 *                       relationship:
 *                         type: string
 *                   medicalInfo:
 *                     type: object
 *                     properties:
 *                       hasInsurance:
 *                         type: boolean
 *                       insuranceProvider:
 *                         type: string
 *                       previousTherapy:
 *                         type: boolean
 *                       currentMedications:
 *                         type: array
 *                         items:
 *                           type: string
 *                       allergies:
 *                         type: array
 *                         items:
 *                           type: string
 *                       medicalConditions:
 *                         type: array
 *                         items:
 *                           type: string
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.put('/profile', [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  body('phone')
    .optional()
    .matches(/^(\+90|0)?[5][0-9]{9}$/)
    .withMessage('Please provide a valid Turkish phone number'),
  body('profile.dateOfBirth')
    .optional()
    .isISO8601()
    .withMessage('Date of birth must be in ISO format'),
  body('profile.gender')
    .optional()
    .isIn(['male', 'female', 'other', 'prefer_not_to_say'])
    .withMessage('Invalid gender value'),
  body('profile.medicalInfo.hasInsurance')
    .optional()
    .isBoolean()
    .withMessage('Has insurance must be boolean'),
  body('profile.medicalInfo.previousTherapy')
    .optional()
    .isBoolean()
    .withMessage('Previous therapy must be boolean')
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

    const { name, phone, profile } = req.body;
    const updateData = {};

    if (name) updateData.name = name;
    if (phone) updateData.phone = phone;
    if (profile) updateData.profile = { ...req.user.profile, ...profile };

    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password -emailVerificationToken -passwordResetToken -passwordResetExpires');

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user: updatedUser.fullProfile
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile'
    });
  }
});

/**
 * @swagger
 * /api/users/change-password:
 *   post:
 *     summary: Change user password
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currentPassword
 *               - newPassword
 *             properties:
 *               currentPassword:
 *                 type: string
 *                 example: "oldpassword123"
 *               newPassword:
 *                 type: string
 *                 minLength: 6
 *                 example: "newpassword123"
 *     responses:
 *       200:
 *         description: Password changed successfully
 *       400:
 *         description: Validation error or invalid current password
 *       401:
 *         description: Unauthorized
 */
router.post('/change-password', [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters')
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

    const { currentPassword, newPassword } = req.body;

    // Get user with password
    const user = await User.findById(req.user._id).select('+password');

    // Check current password
    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to change password'
    });
  }
});

/**
 * @swagger
 * /api/users/appointments:
 *   get:
 *     summary: Get user's appointments
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [scheduled, confirmed, completed, cancelled, no-show]
 *         description: Filter by appointment status
 *       - in: query
 *         name: upcoming
 *         schema:
 *           type: boolean
 *         description: Show only upcoming appointments
 *     responses:
 *       200:
 *         description: Appointments retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/appointments', async (req, res) => {
  try {
    const filter = { user: req.user._id };

    // Apply status filter
    if (req.query.status) {
      filter.status = req.query.status;
    }

    // Apply upcoming filter
    if (req.query.upcoming === 'true') {
      filter.date = { $gte: new Date() };
      filter.status = { $in: ['scheduled', 'confirmed'] };
    }

    const appointments = await Appointment.find(filter)
      .sort({ date: 1, time: 1 });

    res.json({
      success: true,
      data: {
        appointments
      }
    });
  } catch (error) {
    console.error('Get user appointments error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve appointments'
    });
  }
});

/**
 * @swagger
 * /api/users/appointments/upcoming:
 *   get:
 *     summary: Get user's upcoming appointments
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Upcoming appointments retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/appointments/upcoming', async (req, res) => {
  try {
    const now = new Date();
    const appointments = await Appointment.find({
      user: req.user._id,
      date: { $gte: now },
      status: { $in: ['scheduled', 'confirmed'] }
    }).sort({ date: 1, time: 1 });

    res.json({
      success: true,
      data: {
        appointments
      }
    });
  } catch (error) {
    console.error('Get upcoming appointments error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve upcoming appointments'
    });
  }
});

/**
 * @swagger
 * /api/users/appointments/history:
 *   get:
 *     summary: Get user's appointment history
 *     tags: [Users]
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
 *           maximum: 50
 *         description: Appointments per page
 *     responses:
 *       200:
 *         description: Appointment history retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/appointments/history', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const appointments = await Appointment.find({
      user: req.user._id,
      status: { $in: ['completed', 'cancelled', 'no-show'] }
    })
      .sort({ date: -1, time: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Appointment.countDocuments({
      user: req.user._id,
      status: { $in: ['completed', 'cancelled', 'no-show'] }
    });

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
    console.error('Get appointment history error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve appointment history'
    });
  }
});

/**
 * @swagger
 * /api/users/statistics:
 *   get:
 *     summary: Get user statistics
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User statistics retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/statistics', async (req, res) => {
  try {
    const userId = req.user._id;

    // Total appointments
    const totalAppointments = await Appointment.countDocuments({ user: userId });

    // Completed appointments
    const completedAppointments = await Appointment.countDocuments({
      user: userId,
      status: 'completed'
    });

    // Upcoming appointments
    const upcomingAppointments = await Appointment.countDocuments({
      user: userId,
      date: { $gte: new Date() },
      status: { $in: ['scheduled', 'confirmed'] }
    });

    // Cancelled appointments
    const cancelledAppointments = await Appointment.countDocuments({
      user: userId,
      status: 'cancelled'
    });

    // Total amount spent
    const revenueStats = await Appointment.aggregate([
      {
        $match: {
          user: userId,
          paymentStatus: 'paid'
        }
      },
      {
        $group: {
          _id: null,
          totalSpent: { $sum: '$price' },
          averagePrice: { $avg: '$price' }
        }
      }
    ]);

    // Appointment types breakdown
    const typeBreakdown = await Appointment.aggregate([
      {
        $match: { user: userId }
      },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 }
        }
      }
    ]);

    // Monthly statistics for the last 6 months
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const monthlyStats = await Appointment.aggregate([
      {
        $match: {
          user: userId,
          date: { $gte: sixMonthsAgo }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$date' },
            month: { $month: '$date' }
          },
          count: { $sum: 1 },
          totalSpent: { $sum: '$price' }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1 }
      }
    ]);

    res.json({
      success: true,
      data: {
        totalAppointments,
        completedAppointments,
        upcomingAppointments,
        cancelledAppointments,
        totalSpent: revenueStats[0]?.totalSpent || 0,
        averagePrice: revenueStats[0]?.averagePrice || 0,
        typeBreakdown,
        monthlyStats
      }
    });
  } catch (error) {
    console.error('Get user statistics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve user statistics'
    });
  }
});

/**
 * @swagger
 * /api/users/delete-account:
 *   delete:
 *     summary: Delete user account
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - password
 *             properties:
 *               password:
 *                 type: string
 *                 example: "password123"
 *     responses:
 *       200:
 *         description: Account deleted successfully
 *       400:
 *         description: Invalid password
 *       401:
 *         description: Unauthorized
 */
router.delete('/delete-account', [
  body('password')
    .notEmpty()
    .withMessage('Password is required')
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

    const { password } = req.body;

    // Get user with password
    const user = await User.findById(req.user._id).select('+password');

    // Check password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid password'
      });
    }

    // Check for upcoming appointments
    const upcomingAppointments = await Appointment.countDocuments({
      user: req.user._id,
      date: { $gte: new Date() },
      status: { $in: ['scheduled', 'confirmed'] }
    });

    if (upcomingAppointments > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete account with upcoming appointments. Please cancel them first.'
      });
    }

    // Deactivate account instead of deleting (for data integrity)
    user.isActive = false;
    user.email = `deleted_${Date.now()}_${user.email}`;
    await user.save();

    res.json({
      success: true,
      message: 'Account deleted successfully'
    });
  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete account'
    });
  }
});

module.exports = router;
