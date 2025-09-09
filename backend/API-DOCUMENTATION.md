# Psikolog Onur Uslu - API Documentation

## Overview

This API provides comprehensive functionality for a psychologist appointment management system. It includes user authentication, appointment management, email notifications, and administrative features.

## Base URL

```
Development: http://localhost:5000/api
Production: https://your-domain.com/api
```

## Authentication

The API uses JWT (JSON Web Tokens) for authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

## Response Format

All API responses follow this format:

```json
{
  "success": true|false,
  "message": "Description of the result",
  "data": {
    // Response data
  },
  "errors": [
    // Validation errors (if any)
  ]
}
```

## Error Codes

- `400` - Bad Request (validation errors)
- `401` - Unauthorized (invalid/missing token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `409` - Conflict (duplicate data)
- `429` - Too Many Requests (rate limited)
- `500` - Internal Server Error

## Rate Limiting

- General API: 100 requests per 15 minutes
- Authentication endpoints: 5 requests per 15 minutes

## Endpoints

### Authentication

#### Register User
```http
POST /api/auth/register
```

**Request Body:**
```json
{
  "name": "Ahmet Yılmaz",
  "email": "ahmet@example.com",
  "password": "password123",
  "phone": "05551234567"
}
```

**Response:**
```json
{
  "success": true,
  "message": "User registered successfully. Please check your email for verification.",
  "data": {
    "user": {
      "id": "60f7b3b3b3b3b3b3b3b3b3b3",
      "name": "Ahmet Yılmaz",
      "email": "ahmet@example.com",
      "phone": "05551234567",
      "role": "user",
      "isActive": true,
      "emailVerified": false
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

#### Login User
```http
POST /api/auth/login
```

**Request Body:**
```json
{
  "email": "ahmet@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "60f7b3b3b3b3b3b3b3b3b3b3",
      "name": "Ahmet Yılmaz",
      "email": "ahmet@example.com",
      "phone": "05551234567",
      "role": "user",
      "isActive": true,
      "emailVerified": true
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

#### Get Current User Profile
```http
GET /api/auth/me
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "60f7b3b3b3b3b3b3b3b3b3b3",
      "name": "Ahmet Yılmaz",
      "email": "ahmet@example.com",
      "phone": "05551234567",
      "role": "user",
      "isActive": true,
      "emailVerified": true,
      "profile": {
        "dateOfBirth": "1990-05-20T00:00:00.000Z",
        "gender": "male",
        "address": {
          "street": "Atatürk Caddesi No:123",
          "city": "Gebze",
          "postalCode": "41400",
          "country": "Turkey"
        }
      },
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z"
    }
  }
}
```

### Appointments

#### Get Appointments
```http
GET /api/appointments?page=1&limit=10&status=scheduled&type=individual
Authorization: Bearer <token>
```

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10, max: 100)
- `status` (optional): Filter by status (scheduled, confirmed, completed, cancelled, no-show)
- `type` (optional): Filter by type (individual, couple, online, in-person)
- `date` (optional): Filter by date (YYYY-MM-DD format)

**Response:**
```json
{
  "success": true,
  "data": {
    "appointments": [
      {
        "id": "60f7b3b3b3b3b3b3b3b3b3b4",
        "user": {
          "id": "60f7b3b3b3b3b3b3b3b3b3b3",
          "name": "Ahmet Yılmaz",
          "email": "ahmet@example.com",
          "phone": "05551234567"
        },
        "date": "2024-02-15T00:00:00.000Z",
        "time": "14:00",
        "type": "individual",
        "status": "scheduled",
        "duration": 50,
        "price": 500,
        "paymentStatus": "pending",
        "notes": "First session",
        "formattedDate": "15 Şubat 2024 Perşembe",
        "typeTurkish": "Bireysel Terapi"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 25,
      "pages": 3
    }
  }
}
```

#### Create Appointment
```http
POST /api/appointments
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "date": "2024-02-15",
  "time": "14:00",
  "type": "individual",
  "duration": 50,
  "notes": "First session",
  "price": 500
}
```

**Response:**
```json
{
  "success": true,
  "message": "Appointment created successfully",
  "data": {
    "appointment": {
      "id": "60f7b3b3b3b3b3b3b3b3b3b4",
      "user": "60f7b3b3b3b3b3b3b3b3b3b3",
      "date": "2024-02-15T00:00:00.000Z",
      "time": "14:00",
      "type": "individual",
      "status": "scheduled",
      "duration": 50,
      "price": 500,
      "paymentStatus": "pending",
      "notes": "First session",
      "reminders": [
        {
          "type": "email",
          "sent": false,
          "scheduledFor": "2024-02-14T14:00:00.000Z"
        },
        {
          "type": "email",
          "sent": false,
          "scheduledFor": "2024-02-15T12:00:00.000Z"
        }
      ],
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z"
    }
  }
}
```

#### Get Available Time Slots
```http
GET /api/appointments/available-slots?date=2024-02-15
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "date": "2024-02-15",
    "availableSlots": [
      "09:00", "09:50", "10:40", "11:30",
      "13:00", "13:50", "14:40", "15:30",
      "16:20", "17:10", "18:00", "18:50",
      "19:40", "20:30", "21:20"
    ]
  }
}
```

#### Cancel Appointment
```http
POST /api/appointments/{id}/cancel
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "reason": "Schedule conflict"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Appointment cancelled successfully",
  "data": {
    "appointment": {
      "id": "60f7b3b3b3b3b3b3b3b3b3b4",
      "status": "cancelled",
      "cancellationReason": "Schedule conflict",
      "cancelledAt": "2024-01-15T10:30:00.000Z",
      "cancelledBy": "60f7b3b3b3b3b3b3b3b3b3b3"
    }
  }
}
```

### Users

#### Update User Profile
```http
PUT /api/users/profile
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "name": "Ahmet Yılmaz Updated",
  "phone": "05551234568",
  "profile": {
    "dateOfBirth": "1990-05-20",
    "gender": "male",
    "address": {
      "street": "Updated Street No:456",
      "city": "Gebze",
      "postalCode": "41400",
      "country": "Turkey"
    },
    "emergencyContact": {
      "name": "Fatma Yılmaz",
      "phone": "05551234569",
      "relationship": "Mother"
    },
    "medicalInfo": {
      "hasInsurance": true,
      "insuranceProvider": "SGK",
      "previousTherapy": true,
      "currentMedications": ["Antidepressant"],
      "allergies": ["Pollen"],
      "medicalConditions": ["Anxiety"]
    }
  }
}
```

#### Change Password
```http
POST /api/users/change-password
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "currentPassword": "oldpassword123",
  "newPassword": "newpassword123"
}
```

#### Get User Statistics
```http
GET /api/users/statistics
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalAppointments": 15,
    "completedAppointments": 12,
    "upcomingAppointments": 3,
    "cancelledAppointments": 2,
    "totalSpent": 7500,
    "averagePrice": 500,
    "typeBreakdown": [
      { "_id": "individual", "count": 10 },
      { "_id": "couple", "count": 5 }
    ],
    "monthlyStats": [
      {
        "_id": { "year": 2024, "month": 1 },
        "count": 5,
        "totalSpent": 2500
      }
    ]
  }
}
```

### Admin

#### Get Dashboard Statistics
```http
GET /api/admin/dashboard
Authorization: Bearer <admin-token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "users": {
      "total": 150,
      "active": 145,
      "newThisMonth": 25
    },
    "appointments": {
      "total": 500,
      "today": 8,
      "thisWeek": 45,
      "thisMonth": 180,
      "statusBreakdown": [
        { "_id": "scheduled", "count": 120 },
        { "_id": "confirmed", "count": 80 },
        { "_id": "completed", "count": 250 },
        { "_id": "cancelled", "count": 40 },
        { "_id": "no-show", "count": 10 }
      ]
    },
    "revenue": {
      "totalRevenue": 125000,
      "averagePrice": 500,
      "count": 250
    },
    "reminders": {
      "todayAppointments": 8,
      "pendingReminders": 12,
      "sentToday": 15,
      "isRunning": true
    },
    "recentAppointments": [
      {
        "id": "60f7b3b3b3b3b3b3b3b3b3b4",
        "user": {
          "name": "Ahmet Yılmaz",
          "email": "ahmet@example.com"
        },
        "date": "2024-02-15T00:00:00.000Z",
        "time": "14:00",
        "type": "individual",
        "status": "scheduled"
      }
    ]
  }
}
```

#### Get All Users (Admin)
```http
GET /api/admin/users?page=1&limit=10&role=user&isActive=true
Authorization: Bearer <admin-token>
```

#### Toggle User Status (Admin)
```http
PATCH /api/admin/users/{id}/toggle-status
Authorization: Bearer <admin-token>
```

#### Send Broadcast Email (Admin)
```http
POST /api/admin/email/broadcast
Authorization: Bearer <admin-token>
```

**Request Body:**
```json
{
  "subject": "Important Announcement",
  "message": "This is an important message for all users",
  "targetRole": "all"
}
```

## Data Models

### User Model
```json
{
  "id": "ObjectId",
  "name": "String (required, 2-100 chars)",
  "email": "String (required, unique, valid email)",
  "password": "String (required, min 6 chars, hashed)",
  "phone": "String (required, Turkish phone format)",
  "role": "String (user|admin, default: user)",
  "isActive": "Boolean (default: true)",
  "emailVerified": "Boolean (default: false)",
  "profile": {
    "dateOfBirth": "Date",
    "gender": "String (male|female|other|prefer_not_to_say)",
    "address": {
      "street": "String",
      "city": "String",
      "postalCode": "String",
      "country": "String (default: Turkey)"
    },
    "emergencyContact": {
      "name": "String",
      "phone": "String",
      "relationship": "String"
    },
    "medicalInfo": {
      "hasInsurance": "Boolean",
      "insuranceProvider": "String",
      "previousTherapy": "Boolean",
      "currentMedications": ["String"],
      "allergies": ["String"],
      "medicalConditions": ["String"]
    }
  },
  "createdAt": "Date",
  "updatedAt": "Date"
}
```

### Appointment Model
```json
{
  "id": "ObjectId",
  "user": "ObjectId (ref: User)",
  "date": "Date (required, future date)",
  "time": "String (required, HH:MM format)",
  "type": "String (individual|couple|online|in-person)",
  "status": "String (scheduled|confirmed|completed|cancelled|no-show)",
  "duration": "Number (30-120 minutes, default: 50)",
  "notes": "String (max 1000 chars)",
  "price": "Number (required, positive)",
  "paymentStatus": "String (pending|paid|refunded)",
  "reminders": [
    {
      "type": "String (email|sms)",
      "sent": "Boolean",
      "sentAt": "Date",
      "scheduledFor": "Date"
    }
  ],
  "cancellationReason": "String (max 500 chars)",
  "cancelledAt": "Date",
  "cancelledBy": "ObjectId (ref: User)",
  "sessionNotes": "String (max 2000 chars)",
  "followUpRequired": "Boolean",
  "followUpDate": "Date",
  "createdAt": "Date",
  "updatedAt": "Date"
}
```

## Webhooks

The API supports webhooks for real-time notifications:

### Appointment Created
```json
{
  "event": "appointment.created",
  "data": {
    "appointment": { /* appointment object */ },
    "user": { /* user object */ }
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### Appointment Cancelled
```json
{
  "event": "appointment.cancelled",
  "data": {
    "appointment": { /* appointment object */ },
    "user": { /* user object */ },
    "reason": "Schedule conflict"
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

## SDK Examples

### JavaScript/Node.js
```javascript
const axios = require('axios');

const api = axios.create({
  baseURL: 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Login
const login = async (email, password) => {
  const response = await api.post('/auth/login', { email, password });
  return response.data.data.token;
};

// Create appointment
const createAppointment = async (token, appointmentData) => {
  const response = await api.post('/appointments', appointmentData, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return response.data;
};

// Usage
(async () => {
  const token = await login('ahmet@example.com', 'password123');
  const appointment = await createAppointment(token, {
    date: '2024-02-15',
    time: '14:00',
    type: 'individual',
    price: 500
  });
  console.log('Appointment created:', appointment);
})();
```

### Python
```python
import requests

class PsikologAPI:
    def __init__(self, base_url='http://localhost:5000/api'):
        self.base_url = base_url
        self.token = None
    
    def login(self, email, password):
        response = requests.post(f'{self.base_url}/auth/login', json={
            'email': email,
            'password': password
        })
        data = response.json()
        self.token = data['data']['token']
        return self.token
    
    def create_appointment(self, appointment_data):
        headers = {'Authorization': f'Bearer {self.token}'}
        response = requests.post(f'{self.base_url}/appointments', 
                               json=appointment_data, headers=headers)
        return response.json()

# Usage
api = PsikologAPI()
api.login('ahmet@example.com', 'password123')
appointment = api.create_appointment({
    'date': '2024-02-15',
    'time': '14:00',
    'type': 'individual',
    'price': 500
})
print('Appointment created:', appointment)
```

## Testing

Use the provided test credentials for development:

```
Admin: admin@psikologonuruslu.com / admin123
User: ahmet@example.com / user123
User: ayse@example.com / user123
User: mehmet@example.com / user123
```

## Support

For API support and questions:
- Email: psikologonuruslu@gmail.com
- Documentation: http://localhost:5000/api-docs
- Issues: Create an issue in the repository
