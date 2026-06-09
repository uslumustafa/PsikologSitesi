const mongoose = require("mongoose");
const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Contact = require('../models/Contact');
const auth = require('../middleware/auth');
const contactStore = require('../utils/contactStore');
const { notifyNewContact } = require('../utils/emailService');

/**
 * @swagger
 * tags:
 *   name: Contact
 *   description: Contact form management
 */

/**
 * @swagger
 * /api/contact:
 *   post:
 *     summary: Submit a contact form message
 *     tags: [Contact]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - subject
 *               - message
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               phone:
 *                 type: string
 *               subject:
 *                 type: string
 *               message:
 *                 type: string
 *     responses:
 *       201:
 *         description: Message sent successfully
 *       400:
 *         description: Validation error
 */
router.post('/', [
    body('name').notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('subject').notEmpty().withMessage('Subject is required'),
    body('message').notEmpty().withMessage('Message is required')
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

        // Persist the message. Use MongoDB when available, otherwise the
        // durable file-backed store (survives restarts, no external DB needed).
        let contact;
        if (mongoose.connection.readyState === 1) {
            contact = await new Contact({
                name: req.body.name,
                email: req.body.email,
                phone: req.body.phone,
                subject: req.body.subject,
                message: req.body.message
            }).save();
        } else {
            contact = contactStore.add({
                name: req.body.name,
                email: req.body.email,
                phone: req.body.phone,
                subject: req.body.subject,
                message: req.body.message
            });
        }

        // Notify the site owner by email (best-effort; never blocks the response).
        notifyNewContact(contact).catch(err =>
            console.error('Contact notification email failed:', err.message)
        );

        res.status(201).json({
            success: true,
            message: 'Message sent successfully',
            data: contact
        });
    } catch (error) {
        console.error('Contact submission error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to send message'
        });
    }
});

/**
 * @swagger
 * /api/contact:
 *   get:
 *     summary: Get all messages (Admin only)
 *     tags: [Contact]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of messages
 *       403:
 *         description: Admin access required
 */
router.get('/', auth.authenticateToken, auth.requireAdmin, async (req, res) => {
    try {
        const messages = mongoose.connection.readyState === 1
            ? await Contact.find().sort({ createdAt: -1 })
            : contactStore.getAll();

        res.json({
            success: true,
            data: {
                messages
            }
        });
    } catch (error) {
        console.error('Get messages error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve messages'
        });
    }
});


/**
 * @swagger
 * /api/contact/{id}/read:
 *   patch:
 *     summary: Mark message as read (Admin only)
 *     tags: [Contact]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Message marked as read
 *       404:
 *         description: Message not found
 */
router.patch('/:id/read', auth.authenticateToken, auth.requireAdmin, async (req, res) => {
    try {
        const message = mongoose.connection.readyState === 1
            ? await Contact.findByIdAndUpdate(req.params.id, { read: true }, { new: true })
            : contactStore.markRead(req.params.id);

        if (!message) {
            return res.status(404).json({ success: false, message: 'Message not found' });
        }
        res.json({ success: true, message: 'Message marked as read', data: message });
    } catch (error) {
        console.error('Mark read error:', error);
        res.status(500).json({ success: false, message: 'Failed to update message' });
    }
});

/**
 * @swagger
 * /api/contact/{id}:
 *   delete:
 *     summary: Delete a message (Admin only)
 *     tags: [Contact]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Message deleted
 *       404:
 *         description: Message not found
 */
router.delete('/:id', auth.authenticateToken, auth.requireAdmin, async (req, res) => {
    try {
        let deleted;
        if (mongoose.connection.readyState === 1) {
            deleted = await Contact.findByIdAndDelete(req.params.id);
        } else {
            deleted = contactStore.remove(req.params.id);
        }

        if (!deleted) {
            return res.status(404).json({ success: false, message: 'Message not found' });
        }
        res.json({ success: true, message: 'Message deleted' });
    } catch (error) {
        console.error('Delete message error:', error);
        res.status(500).json({ success: false, message: 'Failed to delete message' });
    }
});

module.exports = router;
