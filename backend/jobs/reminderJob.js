const cron = require('node-cron');
const Appointment = require('../models/Appointment');
const { sendEmail } = require('../utils/emailService');

class ReminderJob {
  constructor() {
    this.isRunning = false;
    this.jobs = [];
  }

  /**
   * Start all reminder jobs
   */
  start() {
    if (this.isRunning) {
      console.log('Reminder jobs are already running');
      return;
    }

    console.log('Starting reminder jobs...');

    // Check for reminders every 5 minutes
    this.jobs.push(
      cron.schedule('*/5 * * * *', () => {
        this.checkAndSendReminders();
      }, {
        scheduled: false,
        timezone: 'Europe/Istanbul'
      })
    );

    // Daily cleanup job at 2 AM
    this.jobs.push(
      cron.schedule('0 2 * * *', () => {
        this.cleanupOldReminders();
      }, {
        scheduled: false,
        timezone: 'Europe/Istanbul'
      })
    );

    // Start all jobs
    this.jobs.forEach(job => job.start());
    this.isRunning = true;

    console.log('Reminder jobs started successfully');
  }

  /**
   * Stop all reminder jobs
   */
  stop() {
    if (!this.isRunning) {
      console.log('Reminder jobs are not running');
      return;
    }

    console.log('Stopping reminder jobs...');
    this.jobs.forEach(job => job.stop());
    this.jobs = [];
    this.isRunning = false;

    console.log('Reminder jobs stopped successfully');
  }

  /**
   * Check and send pending reminders
   */
  async checkAndSendReminders() {
    try {
      const now = new Date();
      
      // Find appointments with pending reminders
      const appointments = await Appointment.find({
        status: { $in: ['scheduled', 'confirmed'] },
        'reminders.sent': false,
        'reminders.scheduledFor': { $lte: now }
      }).populate('user', 'name email phone');

      console.log(`Found ${appointments.length} appointments with pending reminders`);

      for (const appointment of appointments) {
        await this.sendReminderForAppointment(appointment);
      }
    } catch (error) {
      console.error('Error checking reminders:', error);
    }
  }

  /**
   * Send reminder for a specific appointment
   */
  async sendReminderForAppointment(appointment) {
    try {
      const now = new Date();
      const appointmentTime = new Date(appointment.datetime);
      const timeUntilAppointment = appointmentTime - now;
      const hoursUntilAppointment = timeUntilAppointment / (1000 * 60 * 60);

      // Determine reminder type based on time until appointment
      let reminderType = 'general';
      if (hoursUntilAppointment <= 2 && hoursUntilAppointment > 0) {
        reminderType = '2hour';
      } else if (hoursUntilAppointment <= 24 && hoursUntilAppointment > 0) {
        reminderType = '24hour';
      }

      // Send email reminder
      await sendEmail({
        to: appointment.user.email,
        subject: 'Randevu Hatırlatması - Psikolog Onur Uslu',
        template: 'appointmentReminder',
        data: {
          name: appointment.user.name,
          date: appointment.formattedDate,
          time: appointment.time,
          type: appointment.typeTurkish,
          duration: appointment.duration,
          hoursUntil: Math.round(hoursUntilAppointment)
        }
      });

      // Mark reminder as sent
      const reminderIndex = appointment.reminders.findIndex(
        r => !r.sent && r.scheduledFor <= now
      );

      if (reminderIndex !== -1) {
        appointment.reminders[reminderIndex].sent = true;
        appointment.reminders[reminderIndex].sentAt = new Date();
        await appointment.save();
      }

      console.log(`Reminder sent for appointment ${appointment._id} (${reminderType})`);
    } catch (error) {
      console.error(`Error sending reminder for appointment ${appointment._id}:`, error);
    }
  }

  /**
   * Clean up old reminders and expired appointments
   */
  async cleanupOldReminders() {
    try {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

      // Clean up old sent reminders
      await Appointment.updateMany(
        {
          'reminders.sent': true,
          'reminders.sentAt': { $lt: oneWeekAgo }
        },
        {
          $pull: {
            reminders: {
              sent: true,
              sentAt: { $lt: oneWeekAgo }
            }
          }
        }
      );

      // Clean up expired appointment reminders
      const expiredDate = new Date();
      expiredDate.setHours(expiredDate.getHours() - 1);

      await Appointment.updateMany(
        {
          date: { $lt: expiredDate },
          status: { $in: ['scheduled', 'confirmed'] }
        },
        {
          $set: { status: 'no-show' }
        }
      );

      console.log('Cleanup job completed');
    } catch (error) {
      console.error('Error during cleanup:', error);
    }
  }

  /**
   * Manually send reminder for specific appointment
   */
  async sendManualReminder(appointmentId) {
    try {
      const appointment = await Appointment.findById(appointmentId)
        .populate('user', 'name email phone');

      if (!appointment) {
        throw new Error('Appointment not found');
      }

      if (appointment.status !== 'scheduled' && appointment.status !== 'confirmed') {
        throw new Error('Cannot send reminder for non-scheduled appointment');
      }

      await this.sendReminderForAppointment(appointment);
      return { success: true, message: 'Reminder sent successfully' };
    } catch (error) {
      console.error('Error sending manual reminder:', error);
      return { success: false, message: error.message };
    }
  }

  /**
   * Get reminder statistics
   */
  async getReminderStats() {
    try {
      const now = new Date();
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Today's appointments
      const todayAppointments = await Appointment.countDocuments({
        date: { $gte: today, $lt: tomorrow },
        status: { $in: ['scheduled', 'confirmed'] }
      });

      // Pending reminders
      const pendingReminders = await Appointment.countDocuments({
        status: { $in: ['scheduled', 'confirmed'] },
        'reminders.sent': false,
        'reminders.scheduledFor': { $lte: now }
      });

      // Sent reminders today
      const sentToday = await Appointment.countDocuments({
        'reminders.sent': true,
        'reminders.sentAt': { $gte: today, $lt: tomorrow }
      });

      return {
        todayAppointments,
        pendingReminders,
        sentToday,
        isRunning: this.isRunning
      };
    } catch (error) {
      console.error('Error getting reminder stats:', error);
      return null;
    }
  }

  /**
   * Reschedule reminders for an appointment
   */
  async rescheduleReminders(appointmentId) {
    try {
      const appointment = await Appointment.findById(appointmentId);
      if (!appointment) {
        throw new Error('Appointment not found');
      }

      // Clear existing reminders
      appointment.reminders = [];

      // Set up new reminders
      const appointmentDate = new Date(appointment.datetime);

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
      return { success: true, message: 'Reminders rescheduled successfully' };
    } catch (error) {
      console.error('Error rescheduling reminders:', error);
      return { success: false, message: error.message };
    }
  }
}

// Create singleton instance
const reminderJob = new ReminderJob();

module.exports = reminderJob;
