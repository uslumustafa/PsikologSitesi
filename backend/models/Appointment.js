const mongoose = require('mongoose');

/**
 * @swagger
 * components:
 *   schemas:
 *     Appointment:
 *       type: object
 *       required:
 *         - user
 *         - date
 *         - time
 *         - type
 *         - status
 *       properties:
 *         _id:
 *           type: string
 *           description: The auto-generated id of the appointment
 *         user:
 *           type: string
 *           description: Reference to the user who made the appointment
 *         date:
 *           type: string
 *           format: date
 *           description: Appointment date
 *         time:
 *           type: string
 *           description: Appointment time
 *         type:
 *           type: string
 *           enum: [individual, couple, online, in-person]
 *           description: Type of therapy session
 *         status:
 *           type: string
 *           enum: [scheduled, confirmed, completed, cancelled, no-show]
 *           default: scheduled
 *           description: Current status of the appointment
 *         duration:
 *           type: number
 *           default: 50
 *           description: Duration in minutes
 *         notes:
 *           type: string
 *           description: Additional notes about the appointment
 *         price:
 *           type: number
 *           description: Price of the appointment
 *         paymentStatus:
 *           type: string
 *           enum: [pending, paid, refunded]
 *           default: pending
 *           description: Payment status
 *         reminders:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [email, sms]
 *               sent:
 *                 type: boolean
 *                 default: false
 *               sentAt:
 *                 type: string
 *                 format: date-time
 *           description: Reminder tracking
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Appointment creation timestamp
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Last update timestamp
 */

const appointmentSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User is required']
  },
  date: {
    type: Date,
    required: [true, 'Appointment date is required'],
    validate: {
      validator: function(value) {
        return value > new Date();
      },
      message: 'Appointment date must be in the future'
    }
  },
  time: {
    type: String,
    required: [true, 'Appointment time is required'],
    match: [
      /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
      'Please provide a valid time format (HH:MM)'
    ]
  },
  type: {
    type: String,
    required: [true, 'Appointment type is required'],
    enum: {
      values: ['individual', 'couple', 'online', 'in-person'],
      message: 'Appointment type must be individual, couple, online, or in-person'
    }
  },
  status: {
    type: String,
    enum: {
      values: ['scheduled', 'confirmed', 'completed', 'cancelled', 'no-show'],
      message: 'Status must be scheduled, confirmed, completed, cancelled, or no-show'
    },
    default: 'scheduled'
  },
  duration: {
    type: Number,
    default: 50,
    min: [30, 'Duration must be at least 30 minutes'],
    max: [120, 'Duration cannot exceed 120 minutes']
  },
  notes: {
    type: String,
    maxlength: [1000, 'Notes cannot exceed 1000 characters']
  },
  price: {
    type: Number,
    required: [true, 'Price is required'],
    min: [0, 'Price cannot be negative']
  },
  paymentStatus: {
    type: String,
    enum: {
      values: ['pending', 'paid', 'refunded'],
      message: 'Payment status must be pending, paid, or refunded'
    },
    default: 'pending'
  },
  reminders: [{
    type: {
      type: String,
      enum: ['email', 'sms'],
      required: true
    },
    sent: {
      type: Boolean,
      default: false
    },
    sentAt: {
      type: Date
    },
    scheduledFor: {
      type: Date,
      required: true
    }
  }],
  cancellationReason: {
    type: String,
    maxlength: [500, 'Cancellation reason cannot exceed 500 characters']
  },
  cancelledAt: {
    type: Date
  },
  cancelledBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  sessionNotes: {
    type: String,
    maxlength: [2000, 'Session notes cannot exceed 2000 characters']
  },
  followUpRequired: {
    type: Boolean,
    default: false
  },
  followUpDate: {
    type: Date
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better query performance
appointmentSchema.index({ user: 1, date: 1 });
appointmentSchema.index({ date: 1, time: 1 });
appointmentSchema.index({ status: 1 });
appointmentSchema.index({ type: 1 });
appointmentSchema.index({ paymentStatus: 1 });
appointmentSchema.index({ createdAt: -1 });

// Virtual for appointment datetime
appointmentSchema.virtual('datetime').get(function() {
  const date = new Date(this.date);
  const [hours, minutes] = this.time.split(':');
  date.setHours(parseInt(hours), parseInt(minutes), 0, 0);
  return date;
});

// Virtual for appointment end time
appointmentSchema.virtual('endTime').get(function() {
  const startTime = new Date(this.datetime);
  const endTime = new Date(startTime.getTime() + this.duration * 60000);
  return endTime;
});

// Virtual for formatted date
appointmentSchema.virtual('formattedDate').get(function() {
  return this.date.toLocaleDateString('tr-TR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long'
  });
});

// Virtual for formatted time
appointmentSchema.virtual('formattedTime').get(function() {
  return this.time;
});

// Virtual for appointment status in Turkish
appointmentSchema.virtual('statusTurkish').get(function() {
  const statusMap = {
    'scheduled': 'Planlandı',
    'confirmed': 'Onaylandı',
    'completed': 'Tamamlandı',
    'cancelled': 'İptal Edildi',
    'no-show': 'Gelmedi'
  };
  return statusMap[this.status] || this.status;
});

// Virtual for appointment type in Turkish
appointmentSchema.virtual('typeTurkish').get(function() {
  const typeMap = {
    'individual': 'Bireysel Terapi',
    'couple': 'Çift Terapisi',
    'online': 'Online Terapi',
    'in-person': 'Yüz Yüze Terapi'
  };
  return typeMap[this.type] || this.type;
});

// Pre-save middleware to validate appointment time
appointmentSchema.pre('save', function(next) {
  // Check if appointment is during business hours (9:00 - 22:00)
  const hour = parseInt(this.time.split(':')[0]);
  if (hour < 9 || hour > 21) {
    return next(new Error('Appointments can only be scheduled between 9:00 and 22:00'));
  }

  // Check if appointment is not in the past
  const appointmentDateTime = new Date(this.date);
  const [hours, minutes] = this.time.split(':');
  appointmentDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
  
  if (appointmentDateTime <= new Date()) {
    return next(new Error('Cannot schedule appointment in the past'));
  }

  next();
});

// Method to check if appointment can be cancelled
appointmentSchema.methods.canBeCancelled = function() {
  const now = new Date();
  const appointmentTime = new Date(this.datetime);
  const hoursUntilAppointment = (appointmentTime - now) / (1000 * 60 * 60);
  
  return hoursUntilAppointment > 24 && this.status === 'scheduled';
};

// Method to check if appointment can be rescheduled
appointmentSchema.methods.canBeRescheduled = function() {
  const now = new Date();
  const appointmentTime = new Date(this.datetime);
  const hoursUntilAppointment = (appointmentTime - now) / (1000 * 60 * 60);
  
  return hoursUntilAppointment > 12 && this.status === 'scheduled';
};

// Method to cancel appointment
appointmentSchema.methods.cancel = function(reason, cancelledBy) {
  this.status = 'cancelled';
  this.cancellationReason = reason;
  this.cancelledAt = new Date();
  this.cancelledBy = cancelledBy;
  return this.save();
};

// Method to confirm appointment
appointmentSchema.methods.confirm = function() {
  this.status = 'confirmed';
  return this.save();
};

// Method to complete appointment
appointmentSchema.methods.complete = function(sessionNotes) {
  this.status = 'completed';
  this.sessionNotes = sessionNotes;
  return this.save();
};

// Method to mark as no-show
appointmentSchema.methods.markAsNoShow = function() {
  this.status = 'no-show';
  return this.save();
};

// Static method to find appointments by date range
appointmentSchema.statics.findByDateRange = function(startDate, endDate) {
  return this.find({
    date: {
      $gte: startDate,
      $lte: endDate
    }
  }).populate('user', 'name email phone');
};

// Static method to find appointments by user
appointmentSchema.statics.findByUser = function(userId) {
  return this.find({ user: userId })
    .sort({ date: 1, time: 1 })
    .populate('user', 'name email phone');
};

// Static method to find upcoming appointments
appointmentSchema.statics.findUpcoming = function() {
  return this.find({
    date: { $gte: new Date() },
    status: { $in: ['scheduled', 'confirmed'] }
  }).populate('user', 'name email phone');
};

// Static method to find appointments needing reminders
appointmentSchema.statics.findNeedingReminders = function() {
  const now = new Date();
  const reminderTimes = [
    new Date(now.getTime() + 24 * 60 * 60 * 1000), // 24 hours
    new Date(now.getTime() + 2 * 60 * 60 * 1000)   // 2 hours
  ];

  return this.find({
    date: { $in: reminderTimes },
    status: { $in: ['scheduled', 'confirmed'] },
    'reminders.sent': false
  }).populate('user', 'name email phone');
};

module.exports = mongoose.model('Appointment', appointmentSchema);
