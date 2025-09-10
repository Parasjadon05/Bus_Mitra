const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.transporter = this.createTransporter();
  }

  createTransporter() {
    // Gmail SMTP configuration
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER, // Your Gmail address
        pass: process.env.EMAIL_APP_PASSWORD // Gmail App Password
      }
    });
  }

  async sendDriverCredentials(driverData) {
    const { email, name, driverId, password } = driverData;

    const mailOptions = {
      from: {
        name: 'BusMitra Admin',
        address: process.env.EMAIL_USER
      },
      to: email,
      subject: 'Welcome to BusMitra - Your Driver Credentials',
      html: this.generateDriverCredentialsTemplate(name, driverId, password),
      text: this.generateDriverCredentialsText(name, driverId, password)
    };

    try {
      const result = await this.transporter.sendMail(mailOptions);
      console.log('Email sent successfully:', result.messageId);
      return {
        success: true,
        messageId: result.messageId,
        message: 'Credentials sent successfully'
      };
    } catch (error) {
      console.error('Email sending failed:', error);
      return {
        success: false,
        error: error.message,
        message: 'Failed to send credentials'
      };
    }
  }

  generateDriverCredentialsTemplate(name, driverId, password) {
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>BusMitra Driver Credentials</title>
        <style>
            body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
                background-color: #f4f4f4;
            }
            .container {
                background-color: #ffffff;
                padding: 30px;
                border-radius: 10px;
                box-shadow: 0 0 20px rgba(0,0,0,0.1);
            }
            .header {
                text-align: center;
                margin-bottom: 30px;
                padding-bottom: 20px;
                border-bottom: 3px solid #3b82f6;
            }
            .logo {
                font-size: 28px;
                font-weight: bold;
                color: #3b82f6;
                margin-bottom: 10px;
            }
            .credentials-box {
                background-color: #f8fafc;
                border: 2px solid #e2e8f0;
                border-radius: 8px;
                padding: 20px;
                margin: 20px 0;
            }
            .credential-item {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 10px 0;
                border-bottom: 1px solid #e2e8f0;
            }
            .credential-item:last-child {
                border-bottom: none;
            }
            .credential-label {
                font-weight: bold;
                color: #374151;
            }
            .credential-value {
                font-family: 'Courier New', monospace;
                background-color: #ffffff;
                padding: 8px 12px;
                border-radius: 4px;
                border: 1px solid #d1d5db;
                color: #1f2937;
                font-weight: bold;
            }
            .warning {
                background-color: #fef3c7;
                border: 1px solid #f59e0b;
                border-radius: 6px;
                padding: 15px;
                margin: 20px 0;
                color: #92400e;
            }
            .warning-icon {
                color: #f59e0b;
                font-weight: bold;
            }
            .footer {
                text-align: center;
                margin-top: 30px;
                padding-top: 20px;
                border-top: 1px solid #e2e8f0;
                color: #6b7280;
                font-size: 14px;
            }
            .button {
                display: inline-block;
                background-color: #3b82f6;
                color: white;
                padding: 12px 24px;
                text-decoration: none;
                border-radius: 6px;
                font-weight: bold;
                margin: 10px 0;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="logo">🚌 BusMitra</div>
                <p>Public Transport Management System</p>
            </div>

            <h2>Welcome to BusMitra, ${name}!</h2>
            
            <p>Your driver account has been successfully created. Below are your login credentials:</p>

            <div class="credentials-box">
                <div class="credential-item">
                    <span class="credential-label">Driver ID:</span>
                    <span class="credential-value">${driverId}</span>
                </div>
                <div class="credential-item">
                    <span class="credential-label">Password:</span>
                    <span class="credential-value">${password}</span>
                </div>
            </div>

            <div class="warning">
                <span class="warning-icon">⚠️ Important:</span>
                <ul>
                    <li>Please save these credentials securely</li>
                    <li>Do not share your password with anyone</li>
                    <li>Change your password after first login</li>
                    <li>Contact admin if you need assistance</li>
                </ul>
            </div>

            <h3>Next Steps:</h3>
            <ol>
                <li>Download the BusMitra Driver App</li>
                <li>Login using the credentials above</li>
                <li>Complete your profile setup</li>
                <li>Start your first shift</li>
            </ol>

            <div class="footer">
                <p>This is an automated message from BusMitra Admin Panel.</p>
                <p>If you have any questions, please contact your supervisor.</p>
                <p>&copy; 2024 BusMitra. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
    `;
  }

  generateDriverCredentialsText(name, driverId, password) {
    return `
Welcome to BusMitra, ${name}!

Your driver account has been successfully created.

LOGIN CREDENTIALS:
==================
Driver ID: ${driverId}
Password: ${password}

IMPORTANT SECURITY NOTES:
- Please save these credentials securely
- Do not share your password with anyone
- Change your password after first login
- Contact admin if you need assistance

NEXT STEPS:
1. Download the BusMitra Driver App
2. Login using the credentials above
3. Complete your profile setup
4. Start your first shift

This is an automated message from BusMitra Admin Panel.
If you have any questions, please contact your supervisor.

© 2024 BusMitra. All rights reserved.
    `;
  }

  async testConnection() {
    try {
      await this.transporter.verify();
      console.log('Email service connection verified');
      return { success: true, message: 'Email service is ready' };
    } catch (error) {
      console.error('Email service connection failed:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new EmailService();
