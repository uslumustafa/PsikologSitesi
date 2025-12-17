const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Contact = require('../models/Contact');
const auth = require('../middleware/auth');

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

        // Check if MongoDB is connected
        const mongoose = require('mongoose');
        if (mongoose.connection.readyState !== 1) {
            console.log('MongoDB not connected, using mock contact submission');
            return res.status(201).json({
                success: true,
                message: 'Message sent successfully (Mock Mode)',
                data: {
                    _id: 'mock-message-' + Date.now(),
                    ...req.body,
                    createdAt: new Date(),
                    read: false
                }
            });
        }

        const contact = new Contact({
            name: req.body.name,
            email: req.body.email,
            phone: req.body.phone,
            subject: req.body.subject,
            message: req.body.message
        });

        await contact.save();

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
        // Check if MongoDB is connected
        const mongoose = require('mongoose');
        if (mongoose.connection.readyState !== 1) {
            console.log('MongoDB not connected, using mock messages');
            return res.json({
                success: true,
                data: {
                    messages: [
                        {
                            _id: 'mock-msg-1',
                            name: 'Ahmet Yılmaz',
                            email: 'ahmet@example.com',
                            phone: '05551112233',
                            subject: 'Randevu Hakkında',
                            message: 'Merhaba, online terapi seansları hakkında bilgi almak istiyorum.',
                            createdAt: new Date(Date.now() - 86400000), // 1 day ago
                            read: true
                        },
                        {
                            _id: 'mock-msg-2',
                            name: 'Ayşe Demir',
                            email: 'ayse@example.com',
                            phone: '05554445566',
                            subject: 'Fiyat Bilgisi',
                            message: 'Seans ücretlerinizi öğrenebilir miyim?',
                            createdAt: new Date(Date.now() - 172800000), // 2 days ago
                            read: false
                        },
                        {
                            _id: 'mock-msg-3',
                            name: 'Mehmet Kaya',
                            email: 'mehmet@example.com',
                            phone: '',
                            subject: 'Ofis Konumu',
                            message: 'Gebze ofisiniz tam olarak nerede?',
                            createdAt: new Date(Date.now() - 259200000), // 3 days ago
                            read: false
                        }
                    ]
                }
            });
        }

        const messages = await Contact.find().sort({ createdAt: -1 });

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

module.exports = router;
