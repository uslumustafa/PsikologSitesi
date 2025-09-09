# Psikolog Onur Uslu - Backend API

A comprehensive Node.js/Express backend API for psychologist appointment management system.

## Features

- 🔐 **JWT Authentication** - Secure user authentication and authorization
- 📅 **Appointment Management** - Full CRUD operations for appointments
- 📧 **Email Notifications** - Automated email reminders and confirmations
- 👥 **Role-based Access** - Admin and user role management
- 🛡️ **Security** - Rate limiting, CORS, helmet, input validation
- 📊 **Admin Dashboard** - Comprehensive statistics and management
- ⏰ **Reminder System** - Automated appointment reminders via cron jobs
- 📚 **API Documentation** - Swagger/OpenAPI documentation

## Tech Stack

- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **MongoDB** - Database
- **Mongoose** - ODM for MongoDB
- **JWT** - Authentication
- **Nodemailer** - Email service
- **Node-cron** - Scheduled tasks
- **Swagger** - API documentation

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd psikolog-sitem/backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Configuration**
   ```bash
   cp env.example .env
   ```
   
   Update the `.env` file with your configuration:
   ```env
   NODE_ENV=development
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/psikolog_db
   JWT_SECRET=your-super-secret-jwt-key
   SMTP_USER=your-email@gmail.com
   SMTP_PASS=your-app-password
   ```

4. **Start MongoDB**
   ```bash
   # Using Docker
   docker run -d -p 27017:27017 --name mongodb mongo:latest
   
   # Or install MongoDB locally
   # Follow MongoDB installation guide for your OS
   ```

5. **Run the application**
   ```bash
   # Development mode
   npm run dev
   
   # Production mode
   npm start
   ```

## API Documentation

Once the server is running, you can access the API documentation at:
- **Swagger UI**: http://localhost:5000/api-docs
- **OpenAPI JSON**: http://localhost:5000/api-docs.json

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `POST /api/auth/verify-email` - Verify email address
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password
- `POST /api/auth/refresh` - Refresh access token
- `GET /api/auth/me` - Get current user profile
- `POST /api/auth/logout` - User logout

### Appointments
- `GET /api/appointments` - Get appointments (with filters)
- `GET /api/appointments/:id` - Get appointment by ID
- `POST /api/appointments` - Create new appointment
- `PUT /api/appointments/:id` - Update appointment
- `POST /api/appointments/:id/cancel` - Cancel appointment
- `POST /api/appointments/:id/confirm` - Confirm appointment (Admin)
- `POST /api/appointments/:id/complete` - Complete appointment (Admin)
- `GET /api/appointments/available-slots` - Get available time slots

### Users
- `GET /api/users/profile` - Get user profile
- `PUT /api/users/profile` - Update user profile
- `POST /api/users/change-password` - Change password
- `GET /api/users/appointments` - Get user's appointments
- `GET /api/users/appointments/upcoming` - Get upcoming appointments
- `GET /api/users/appointments/history` - Get appointment history
- `GET /api/users/statistics` - Get user statistics
- `DELETE /api/users/delete-account` - Delete user account

### Admin
- `GET /api/admin/dashboard` - Get dashboard statistics
- `GET /api/admin/users` - Get all users
- `GET /api/admin/users/:id` - Get user by ID
- `PATCH /api/admin/users/:id/toggle-status` - Toggle user status
- `PATCH /api/admin/users/:id/change-role` - Change user role
- `GET /api/admin/appointments` - Get all appointments
- `POST /api/admin/reminders/send` - Send manual reminder
- `GET /api/admin/reminders/stats` - Get reminder statistics
- `POST /api/admin/email/broadcast` - Send broadcast email

## Database Models

### User Model
```javascript
{
  name: String,
  email: String (unique),
  password: String (hashed),
  phone: String,
  role: String (user/admin),
  isActive: Boolean,
  emailVerified: Boolean,
  profile: {
    dateOfBirth: Date,
    gender: String,
    address: Object,
    emergencyContact: Object,
    medicalInfo: Object
  }
}
```

### Appointment Model
```javascript
{
  user: ObjectId (ref: User),
  date: Date,
  time: String,
  type: String (individual/couple/online/in-person),
  status: String (scheduled/confirmed/completed/cancelled/no-show),
  duration: Number (minutes),
  notes: String,
  price: Number,
  paymentStatus: String (pending/paid/refunded),
  reminders: Array,
  sessionNotes: String,
  followUpRequired: Boolean
}
```

## Email Templates

The system includes the following email templates:
- **Email Verification** - Sent after user registration
- **Password Reset** - Sent when user requests password reset
- **Appointment Confirmation** - Sent when appointment is created
- **Appointment Reminder** - Sent 24h and 2h before appointment
- **Appointment Cancellation** - Sent when appointment is cancelled
- **Broadcast Email** - For admin announcements

## Reminder System

The reminder system uses cron jobs to automatically send email reminders:
- **24-hour reminder** - Sent 24 hours before appointment
- **2-hour reminder** - Sent 2 hours before appointment
- **Cleanup job** - Runs daily to clean up old reminders

## Security Features

- **Helmet** - Security headers
- **CORS** - Cross-origin resource sharing
- **Rate Limiting** - Prevent abuse
- **Input Validation** - Express-validator
- **XSS Protection** - XSS clean middleware
- **NoSQL Injection Protection** - Mongo sanitize
- **JWT Authentication** - Secure token-based auth

## Development

### Scripts
```bash
npm start          # Start production server
npm run dev        # Start development server with nodemon
npm test           # Run tests
npm run seed       # Seed database with sample data
```

### Project Structure
```
backend/
├── models/           # Database models
├── routes/           # API routes
├── middleware/       # Custom middleware
├── utils/            # Utility functions
├── jobs/             # Cron jobs
├── scripts/          # Database scripts
├── server.js         # Main server file
├── package.json      # Dependencies
└── README.md         # This file
```

## Deployment

### Environment Variables
Make sure to set the following environment variables in production:

```env
NODE_ENV=production
PORT=5000
MONGODB_URI=mongodb://your-production-db
JWT_SECRET=your-production-jwt-secret
SMTP_USER=your-production-email
SMTP_PASS=your-production-email-password
```

### Docker Deployment
```bash
# Build Docker image
docker build -t psikolog-backend .

# Run container
docker run -d -p 5000:5000 --env-file .env psikolog-backend
```

### PM2 Deployment
```bash
# Install PM2
npm install -g pm2

# Start application
pm2 start server.js --name psikolog-backend

# Save PM2 configuration
pm2 save
pm2 startup
```

## Testing

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test -- --grep "Authentication"
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new features
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support, email psikologonuruslu@gmail.com or create an issue in the repository.

## Changelog

### v1.0.0
- Initial release
- User authentication and authorization
- Appointment management
- Email notifications
- Admin dashboard
- Reminder system
- API documentation
