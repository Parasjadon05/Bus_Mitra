const emailService = require('./services/emailService');
require('dotenv').config();

async function testEmailService() {
  console.log('🧪 Testing BusMitra Email Service...\n');

  // Test 1: Check email service connection
  console.log('1. Testing email service connection...');
  const connectionTest = await emailService.testConnection();
  
  if (connectionTest.success) {
    console.log('✅ Email service connection: SUCCESS');
  } else {
    console.log('❌ Email service connection: FAILED');
    console.log('Error:', connectionTest.error);
    console.log('\nPlease check your .env file and Gmail App Password setup.');
    return;
  }

  // Test 2: Send test email (only if EMAIL_USER is configured)
  if (process.env.EMAIL_USER && process.env.EMAIL_USER !== 'your-email@gmail.com') {
    console.log('\n2. Sending test email...');
    
    const testData = {
      email: process.env.EMAIL_USER, // Send to yourself for testing
      name: 'Test Driver',
      driverId: 'TEST1234',
      password: 'TestPass123'
    };

    const emailResult = await emailService.sendDriverCredentials(testData);
    
    if (emailResult.success) {
      console.log('✅ Test email sent: SUCCESS');
      console.log('Message ID:', emailResult.messageId);
      console.log('Check your inbox for the test email!');
    } else {
      console.log('❌ Test email failed:', emailResult.error);
    }
  } else {
    console.log('\n2. Skipping test email (EMAIL_USER not configured)');
    console.log('To test email sending, update your .env file with a real Gmail address.');
  }

  console.log('\n🎉 Email service test completed!');
  console.log('\nNext steps:');
  console.log('1. Update your .env file with real Gmail credentials');
  console.log('2. Run: npm run dev');
  console.log('3. Test the API endpoints');
}

// Run the test
testEmailService().catch(console.error);
