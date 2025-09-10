# BusMitra Server

Backend server for BusMitra Admin Panel with email functionality for sending driver credentials.

## Features

- ✅ **Email Service**: Send driver credentials via Gmail SMTP
- ✅ **Professional Templates**: Beautiful HTML email templates
- ✅ **Security**: Rate limiting, CORS, Helmet protection
- ✅ **Validation**: Request validation with Joi
- ✅ **Error Handling**: Comprehensive error handling
- ✅ **Health Check**: Server health monitoring

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
```bash
cp .env.example .env
```

Edit `.env` file with your Gmail credentials:
```env
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
EMAIL_USER=your-email@gmail.com
EMAIL_APP_PASSWORD=your-gmail-app-password
```

### 3. Set up Gmail App Password

1. **Enable 2-Factor Authentication** on your Google Account
2. Go to **Google Account Settings** → **Security**
3. Click **App passwords**
4. Select **Mail** and generate a new password
5. Use this password in `EMAIL_APP_PASSWORD`

### 4. Start the Server

**Development:**
```bash
npm run dev
```

**Production:**
```bash
npm start
```

Server will run on `http://localhost:3001`

## API Endpoints

### Health Check
```
GET /health
```

### Send Driver Credentials
```
POST /api/email/send-driver-credentials
Content-Type: application/json

{
  "email": "driver@example.com",
  "name": "John Doe",
  "driverId": "DRV1234",
  "password": "Abc123Xy"
}
```

### Test Email Service
```
GET /api/email/test
```

### Send Test Email
```
POST /api/email/test-email
Content-Type: application/json

{
  "email": "test@example.com",
  "name": "Test Driver",
  "driverId": "TEST123",
  "password": "TestPass123"
}
```

## Email Template Features

- 🎨 **Professional Design**: Modern, responsive HTML template
- 📱 **Mobile Friendly**: Works on all devices
- 🔒 **Security Warnings**: Clear instructions for credential safety
- 📋 **Step-by-step Guide**: Instructions for new drivers
- 🏢 **Branded**: BusMitra branding and contact info

## Integration with Frontend

Update your React frontend to call the email API:

```javascript
const sendDriverCredentials = async (driverData) => {
  try {
    const response = await fetch('http://localhost:3001/api/email/send-driver-credentials', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(driverData)
    });
    
    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error sending credentials:', error);
    throw error;
  }
};
```

## Security Features

- **Rate Limiting**: 100 requests per 15 minutes per IP
- **CORS Protection**: Configured for your frontend domain
- **Helmet**: Security headers
- **Input Validation**: Joi schema validation
- **Error Handling**: No sensitive data in error responses

## Production Deployment

### Environment Variables for Production
```env
NODE_ENV=production
PORT=3001
FRONTEND_URL=https://your-domain.com
EMAIL_USER=admin@your-domain.com
EMAIL_APP_PASSWORD=your-secure-password
```

### Deployment Options
- **Heroku**: Easy deployment with Procfile
- **Vercel**: Serverless functions
- **DigitalOcean**: VPS deployment
- **AWS**: EC2 or Lambda

## Troubleshooting

### Email Not Sending
1. Check Gmail App Password is correct
2. Verify 2FA is enabled on Gmail account
3. Check server logs for detailed error messages
4. Test with `/api/email/test` endpoint

### CORS Issues
1. Update `FRONTEND_URL` in `.env`
2. Restart server after changing environment variables

### Rate Limiting
- Default: 100 requests per 15 minutes
- Adjust in `server.js` if needed

## Development

### Project Structure
```
BusMitraServer/
├── server.js              # Main server file
├── routes/
│   └── email.js           # Email API routes
├── services/
│   └── emailService.js    # Email service with NodeMailer
├── middleware/
│   ├── validation.js      # Request validation
│   └── errorHandler.js    # Error handling
├── package.json
├── .env.example
└── README.md
```

### Adding New Features
1. Create new routes in `routes/` directory
2. Add services in `services/` directory
3. Update validation schemas
4. Test with appropriate endpoints

## Support

For issues or questions:
1. Check server logs for error details
2. Verify environment variables
3. Test email service with `/api/email/test`
4. Check Gmail App Password setup

---

**BusMitra Server** - Professional email service for driver credential management 🚌
