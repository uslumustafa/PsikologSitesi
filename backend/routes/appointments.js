const express = require('express');
const { body, validationResult, query } = require('express-validator');
const Appointment = require('../models/Appointment');
const User = require('../models/User');
const { authenticateToken, requireAppointmentAccess, requireAdmin } = require('../middleware/auth');
const { sendEmail } = require('../utils/emailService');
const router = express.Router();

/**
 * @swagger
 * /api/appointments:
 *   get:
 *     summary: Get appointments
 *     tags: [Appointments]
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
 *         name: type
 *         schema:
 *           type: string
 *           enum: [individual, couple, online, in-person]
 *         description: Filter by appointment type
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter by appointment date
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *         description: Number of appointments per page
 *     responses:
 *       200:
 *         description: Appointments retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/', authenticateToken, [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('status').optional().isIn(['scheduled', 'confirmed', 'completed', 'cancelled', 'no-show']),
  query('type').optional().isIn(['individual', 'couple', 'online', 'in-person']),
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

    // Build filter object
    const filter = {};
    
    // Non-admin users can only see their own appointments
    if (req.user.role !== 'admin') {
      filter.user = req.user._id;
    }

    // Apply filters
    if (req.query.status) filter.status = req.query.status;
    if (req.query.type) filter.type = req.query.type;
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

    // Get total count
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
 * /api/appointments/{id}:
 *   get:
 *     summary: Get appointment by ID
 *     tags: [Appointments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Appointment ID
 *     responses:
 *       200:
 *         description: Appointment retrieved successfully
 *       404:
 *         description: Appointment not found
 *       403:
 *         description: Access denied
 */
router.get('/:id', authenticateToken, requireAppointmentAccess, async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        appointment: req.appointment
      }
    });
  } catch (error) {
    console.error('Get appointment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve appointment'
    });
  }
});

/**
 * @swagger
 * /api/appointments:
 *   post:
 *     summary: Create new appointment
 *     tags: [Appointments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - date
 *               - time
 *               - type
 *               - price
 *             properties:
 *               date:
 *                 type: string
 *                 format: date
 *                 example: "2024-02-15"
 *               time:
 *                 type: string
 *                 example: "14:00"
 *               type:
 *                 type: string
 *                 enum: [individual, couple, online, in-person]
 *                 example: "individual"
 *               duration:
 *                 type: integer
 *                 default: 50
 *                 example: 50
 *               notes:
 *                 type: string
 *                 example: "First session"
 *               price:
 *                 type: number
 *                 example: 500
 *     responses:
 *       201:
 *         description: Appointment created successfully
 *       400:
 *         description: Validation error
 *       409:
 *         description: Time slot already taken
 */
router.post('/', authenticateToken, [
  body('date')
    .isISO8601()
    .withMessage('Date must be in ISO format')
    .custom((value) => {
      if (new Date(value) <= new Date()) {
        throw new Error('Appointment date must be in the future');
      }
      return true;
    }),
  body('time')
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Time must be in HH:MM format'),
  body('type')
    .isIn(['individual', 'couple', 'online', 'in-person'])
    .withMessage('Invalid appointment type'),
  body('duration')
    .optional()
    .isInt({ min: 30, max: 120 })
    .withMessage('Duration must be between 30 and 120 minutes'),
  body('price')
    .isFloat({ min: 0 })
    .withMessage('Price must be a positive number'),
  body('notes')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Notes cannot exceed 1000 characters')
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

    const { date, time, type, duration = 50, notes, price } = req.body;

    // Check for time slot conflicts
    const existingAppointment = await Appointment.findOne({
      date: new Date(date),
      time,
      status: { $in: ['scheduled', 'confirmed'] }
    });

    if (existingAppointment) {
      return res.status(409).json({
        success: false,
        message: 'Time slot is already taken'
      });
    }

    // Create appointment
    const appointment = new Appointment({
      user: req.user._id,
      date: new Date(date),
      time,
      type,
      duration,
      notes,
      price
    });

    // Set up reminders
    const appointmentDate = new Date(date);
    const [hours, minutes] = time.split(':');
    appointmentDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);

    // 24-hour reminder
    const reminder24h = new Date(appointmentDate.getTime() - 24 * 60 * 60 * 1000);
    if (reminder24h > new Date()) {
      appointment.reminders.push({
        type: 'email',
        scheduledFor: reminder24h
      });
    }

    // 2-hour reminder
    const reminder2h = new Date(appointmentDate.getTime() - 2 * 60 * 60 * 1000);
    if (reminder2h > new Date()) {
      appointment.reminders.push({
        type: 'email',
        scheduledFor: reminder2h
      });
    }

    await appointment.save();
    await appointment.populate('user', 'name email phone');

    // Send confirmation email
    try {
      await sendEmail({
        to: req.user.email,
        subject: 'Randevu Onayı - Psikolog Onur Uslu',
        template: 'appointmentConfirmation',
        data: {
          name: req.user.name,
          date: appointment.formattedDate,
          time: appointment.time,
          type: appointment.typeTurkish,
          duration: appointment.duration,
          price: appointment.price
        }
      });
    } catch (emailError) {
      console.error('Confirmation email failed:', emailError);
      // Don't fail appointment creation if email fails
    }

    res.status(201).json({
      success: true,
      message: 'Appointment created successfully',
      data: {
        appointment
      }
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
 * /api/appointments/{id}:
 *   put:
 *     summary: Update appointment
 *     tags: [Appointments]
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
 *             properties:
 *               date:
 *                 type: string
 *                 format: date
 *               time:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [individual, couple, online, in-person]
 *               duration:
 *                 type: integer
 *               notes:
 *                 type: string
 *               price:
 *                 type: number
 *     responses:
 *       200:
 *         description: Appointment updated successfully
 *       400:
 *         description: Validation error
 *       403:
 *         description: Cannot modify appointment
 *       404:
 *         description: Appointment not found
 */
router.put('/:id', authenticateToken, requireAppointmentAccess, [
  body('date')
    .optional()
    .isISO8601()
    .withMessage('Date must be in ISO format'),
  body('time')
    .optional()
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Time must be in HH:MM format'),
  body('type')
    .optional()
    .isIn(['individual', 'couple', 'online', 'in-person'])
    .withMessage('Invalid appointment type'),
  body('duration')
    .optional()
    .isInt({ min: 30, max: 120 })
    .withMessage('Duration must be between 30 and 120 minutes'),
  body('price')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Price must be a positive number'),
  body('notes')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Notes cannot exceed 1000 characters')
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

    // Check if appointment can be modified
    if (!req.appointment.canBeRescheduled()) {
      return res.status(403).json({
        success: false,
        message: 'Appointment cannot be modified less than 12 hours before scheduled time'
      });
    }

    const { date, time, type, duration, notes, price } = req.body;
    const updateData = {};

    // Check for time slot conflicts if time is being changed
    if (date || time) {
      const checkDate = date ? new Date(date) : req.appointment.date;
      const checkTime = time || req.appointment.time;

      const existingAppointment = await Appointment.findOne({
        _id: { $ne: req.appointment._id },
        date: checkDate,
        time: checkTime,
        status: { $in: ['scheduled', 'confirmed'] }
      });

      if (existingAppointment) {
        return res.status(409).json({
          success: false,
          message: 'Time slot is already taken'
        });
      }
    }

    // Update fields
    if (date) updateData.date = new Date(date);
    if (time) updateData.time = time;
    if (type) updateData.type = type;
    if (duration) updateData.duration = duration;
    if (notes !== undefined) updateData.notes = notes;
    if (price) updateData.price = price;

    const updatedAppointment = await Appointment.findByIdAndUpdate(
      req.appointment._id,
      updateData,
      { new: true, runValidators: true }
    ).populate('user', 'name email phone');

    res.json({
      success: true,
      message: 'Appointment updated successfully',
      data: {
        appointment: updatedAppointment
      }
    });
  } catch (error) {
    console.error('Update appointment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update appointment'
    });
  }
});

/**
 * @swagger
 * /api/appointments/{id}/cancel:
 *   post:
 *     summary: Cancel appointment
 *     tags: [Appointments]
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
 *               - reason
 *             properties:
 *               reason:
 *                 type: string
 *                 example: "Schedule conflict"
 *     responses:
 *       200:
 *         description: Appointment cancelled successfully
 *       403:
 *         description: Cannot cancel appointment
 *       404:
 *         description: Appointment not found
 */
router.post('/:id/cancel', authenticateToken, requireAppointmentAccess, [
  body('reason')
    .notEmpty()
    .withMessage('Cancellation reason is required')
    .isLength({ max: 500 })
    .withMessage('Reason cannot exceed 500 characters')
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

    // Check if appointment can be cancelled
    if (!req.appointment.canBeCancelled()) {
      return res.status(403).json({
        success: false,
        message: 'Appointment cannot be cancelled less than 24 hours before scheduled time'
      });
    }

    const { reason } = req.body;

    // Cancel appointment
    await req.appointment.cancel(reason, req.user._id);
    await req.appointment.populate('user', 'name email phone');

    // Send cancellation email
    try {
      await sendEmail({
        to: req.appointment.user.email,
        subject: 'Randevu İptali - Psikolog Onur Uslu',
        template: 'appointmentCancellation',
        data: {
          name: req.appointment.user.name,
          date: req.appointment.formattedDate,
          time: req.appointment.time,
          type: req.appointment.typeTurkish,
          reason
        }
      });
    } catch (emailError) {
      console.error('Cancellation email failed:', emailError);
      // Don't fail cancellation if email fails
    }

    res.json({
      success: true,
      message: 'Appointment cancelled successfully',
      data: {
        appointment: req.appointment
      }
    });
  } catch (error) {
    console.error('Cancel appointment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel appointment'
    });
  }
});

/**
 * @swagger
 * /api/appointments/{id}/confirm:
 *   post:
 *     summary: Confirm appointment (Admin only)
 *     tags: [Appointments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Appointment ID
 *     responses:
 *       200:
 *         description: Appointment confirmed successfully
 *       403:
 *         description: Admin access required
 *       404:
 *         description: Appointment not found
 */
router.post('/:id/confirm', authenticateToken, requireAdmin, requireAppointmentAccess, async (req, res) => {
  try {
    await req.appointment.confirm();
    await req.appointment.populate('user', 'name email phone');

    res.json({
      success: true,
      message: 'Appointment confirmed successfully',
      data: {
        appointment: req.appointment
      }
    });
  } catch (error) {
    console.error('Confirm appointment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to confirm appointment'
    });
  }
});

/**
 * @swagger
 * /api/appointments/{id}/complete:
 *   post:
 *     summary: Complete appointment (Admin only)
 *     tags: [Appointments]
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
 *             properties:
 *               sessionNotes:
 *                 type: string
 *                 example: "Good progress made"
 *               followUpRequired:
 *                 type: boolean
 *                 example: true
 *               followUpDate:
 *                 type: string
 *                 format: date
 *                 example: "2024-02-22"
 *     responses:
 *       200:
 *         description: Appointment completed successfully
 *       403:
 *         description: Admin access required
 *       404:
 *         description: Appointment not found
 */
router.post('/:id/complete', authenticateToken, requireAdmin, requireAppointmentAccess, [
  body('sessionNotes')
    .optional()
    .isLength({ max: 2000 })
    .withMessage('Session notes cannot exceed 2000 characters'),
  body('followUpRequired')
    .optional()
    .isBoolean()
    .withMessage('Follow up required must be boolean'),
  body('followUpDate')
    .optional()
    .isISO8601()
    .withMessage('Follow up date must be in ISO format')
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

    const { sessionNotes, followUpRequired, followUpDate } = req.body;

    await req.appointment.complete(sessionNotes);
    
    if (followUpRequired && followUpDate) {
      req.appointment.followUpRequired = followUpRequired;
      req.appointment.followUpDate = new Date(followUpDate);
      await req.appointment.save();
    }

    await req.appointment.populate('user', 'name email phone');

    res.json({
      success: true,
      message: 'Appointment completed successfully',
      data: {
        appointment: req.appointment
      }
    });
  } catch (error) {
    console.error('Complete appointment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to complete appointment'
    });
  }
});

/**
 * @swagger
 * /api/appointments/available-slots:
 *   get:
 *     summary: Get available time slots for a date
 *     tags: [Appointments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: date
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: Date to check availability
 *     responses:
 *       200:
 *         description: Available slots retrieved successfully
 *       400:
 *         description: Invalid date
 */
router.get('/available-slots', authenticateToken, [
  query('date')
    .isISO8601()
    .withMessage('Date must be in ISO format')
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

    const date = new Date(req.query.date);
    const nextDay = new Date(date);
    nextDay.setDate(nextDay.getDate() + 1);

    // Get existing appointments for the date
    const existingAppointments = await Appointment.find({
      date: { $gte: date, $lt: nextDay },
      status: { $in: ['scheduled', 'confirmed'] }
    });

    // Generate all possible time slots (9:00 - 22:00, 50-minute intervals)
    const allSlots = [];
    for (let hour = 9; hour < 22; hour++) {
      for (let minute = 0; minute < 60; minute += 50) {
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        allSlots.push(timeString);
      }
    }

    // Filter out taken slots
    const takenSlots = existingAppointments.map(apt => apt.time);
    const availableSlots = allSlots.filter(slot => !takenSlots.includes(slot));

    res.json({
      success: true,
      data: {
        date: date.toISOString().split('T')[0],
        availableSlots
      }
    });
  } catch (error) {
    console.error('Get available slots error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get available slots'
    });
  }
});

module.exports = router;
