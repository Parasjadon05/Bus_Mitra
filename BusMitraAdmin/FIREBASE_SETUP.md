# Firebase Integration Setup Guide

This guide will help you set up Firebase for the BusMitraAdmin application.

## Prerequisites

- Node.js and npm installed
- A Google account
- Basic understanding of Firebase

## Step 1: Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project" or "Add project"
3. Enter your project name (e.g., "busmitra-admin")
4. Choose whether to enable Google Analytics (optional)
5. Click "Create project"

## Step 2: Enable Firestore Database

1. In your Firebase project, go to "Firestore Database" in the left sidebar
2. Click "Create database"
3. Choose "Start in test mode" for development (you can secure it later)
4. Select a location for your database (choose the closest to your users)
5. Click "Done"

## Step 3: Get Firebase Configuration

1. In your Firebase project, go to "Project Settings" (gear icon)
2. Scroll down to "Your apps" section
3. Click "Add app" and select the web icon (</>)
4. Register your app with a nickname (e.g., "BusMitraAdmin")
5. Copy the Firebase configuration object

## Step 4: Configure Environment Variables

1. Create a `.env` file in the root directory of your project
2. Add the following variables with your Firebase config values:

```env
VITE_FIREBASE_API_KEY=your-api-key-here
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id
```

## Step 5: Install Dependencies

The Firebase dependencies are already installed. If you need to reinstall:

```bash
npm install firebase
```

## Step 6: Database Structure

The application uses the following Firestore collections:

### Buses Collection
```javascript
{
  busNumber: string,
  licensePlate: string,
  capacity: number,
  model: string,
  manufacturer: string,
  year: number,
  status: "active" | "maintenance" | "inactive",
  driverId?: string,
  routeId?: string,
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

### Routes Collection
```javascript
{
  name: string,
  description: string,
  startLocation: string,
  endLocation: string,
  stops: string[],
  distance: number,
  estimatedDuration: number,
  fare: number,
  status: "active" | "inactive",
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

### Drivers Collection
```javascript
{
  name: string,
  email: string,
  phone: string,
  licenseNumber: string,
  licenseExpiry: string,
  address: string,
  status: "active" | "inactive" | "suspended",
  busId?: string,
  routeId?: string,
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

## Step 7: Security Rules (Optional)

For production, update your Firestore security rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow read/write access to authenticated users only
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

## Step 8: Test the Integration

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Navigate to the admin panel and try:
   - Adding a new bus
   - Creating a route
   - Adding a driver
   - Editing existing records
   - Deleting records

## Troubleshooting

### Common Issues

1. **Firebase connection errors**: Check your environment variables and ensure they match your Firebase project config.

2. **Permission denied errors**: Make sure your Firestore security rules allow the operations you're trying to perform.

3. **Network errors**: Ensure your internet connection is stable and Firebase services are accessible.

### Debug Mode

To enable debug logging, add this to your browser console:
```javascript
localStorage.setItem('firebase:debug', 'true');
```

## Production Deployment

1. Update your Firestore security rules for production
2. Set up proper authentication if needed
3. Configure Firebase hosting for your app
4. Set up monitoring and alerts

## Support

If you encounter any issues:
1. Check the Firebase Console for error logs
2. Review the browser console for client-side errors
3. Ensure all environment variables are correctly set
4. Verify your Firebase project configuration

## Features Implemented

✅ **Buses Management**
- Create, read, update, delete buses
- Form validation with Zod
- Real-time data loading
- Status management (active, maintenance, inactive)

✅ **Routes Management**
- Create, read, update, delete routes
- Bus stops management
- Distance and duration tracking
- Fare management

✅ **Drivers Management**
- Driver profile management
- License tracking
- Status management
- Contact information

✅ **Dashboard Integration**
- Real-time statistics
- Data visualization
- Quick access to all modules

The application is now fully integrated with Firebase and ready for production use!
