# BusMitra - Real-Time Bus Tracking System

A comprehensive real-time bus tracking system built with React, Firebase, and modern web technologies. BusMitra consists of three main applications: Admin Panel, Driver Portal, and User App.

## 🚌 Project Overview

BusMitra is a complete bus tracking solution that enables:
- **Real-time location tracking** of buses
- **Driver duty management** with persistent state
- **User-friendly bus discovery** and tracking
- **Admin panel** for managing buses, routes, drivers, and stops
- **Bidirectional route support** (going and coming routes)

## 🏗️ Architecture

The project consists of three main applications:

### 1. **BusMitraAdmin** - Admin Panel
- Manage buses, routes, drivers, and stops
- Assign going and coming routes to buses
- Monitor system status
- Built with React, TypeScript, and Tailwind CSS

### 2. **BusConductor** - Driver Portal
- Driver authentication and duty management
- Real-time location sharing
- Bus selection and assignment
- Persistent duty state across app reloads
- Built with React, TypeScript, and Firebase

### 3. **BusMitraUser** - User App
- Search for buses by origin and destination
- Real-time bus tracking on interactive maps
- Live location sharing (optional)
- ETA and speed calculations
- Built with React, TypeScript, and MapLibre GL

## 🚀 Features

### Real-Time Tracking
- **Live GPS location sharing** from driver devices
- **Real-time updates** via Firebase Realtime Database
- **Speed and ETA calculations** based on location changes
- **Direction detection** (going/coming routes)

### Driver Management
- **Trip-based bus assignment** - drivers select bus before each trip
- **Persistent duty state** - maintains status across app reloads
- **Location permission handling** with detailed error messages
- **Debug console** for mobile troubleshooting

### User Experience
- **Interactive maps** with MapLibre GL
- **Bus search** by origin and destination stops
- **Live tracking** with real-time location updates
- **Driver status display** (on duty/off duty)
- **Mobile-optimized** interface

### Admin Features
- **Comprehensive management** of buses, routes, drivers, and stops
- **Dual route assignment** (going and coming routes)
- **Real-time monitoring** of system status
- **Data validation** and error handling

## 🛠️ Technology Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for build tooling
- **Tailwind CSS** for styling
- **React Router** for navigation
- **MapLibre GL** for maps
- **React Query** for data fetching

### Backend & Database
- **Firebase Firestore** for data storage
- **Firebase Realtime Database** for live location tracking
- **Firebase Authentication** for user management

### Maps & Location
- **MapLibre GL** for interactive maps
- **Geolocation API** for device location
- **Haversine formula** for distance calculations

## 📁 Project Structure

```
BusMitra/
├── BusMitraAdmin/          # Admin panel application
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Admin pages (Dashboard, Buses, Routes, etc.)
│   │   ├── lib/            # Firebase configuration and services
│   │   └── hooks/          # Custom React hooks
│   └── package.json
├── BusConductor/           # Driver portal application
│   ├── src/
│   │   ├── components/     # Driver-specific components
│   │   ├── hooks/          # Location and duty state hooks
│   │   ├── lib/            # Firebase services
│   │   └── services/       # Driver services
│   └── package.json
├── BusMitraUser/           # User application
│   ├── src/
│   │   ├── components/     # User interface components
│   │   ├── pages/          # User pages (BusDiscovery, BusDetails)
│   │   ├── services/       # Bus and location services
│   │   ├── hooks/          # Custom hooks for data fetching
│   │   └── utils/          # Utility functions
│   └── package.json
└── README.md
```

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn
- Firebase project with Firestore and Realtime Database

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd BusMitra
   ```

2. **Install dependencies for each application**
   ```bash
   # Admin Panel
   cd BusMitraAdmin
   npm install
   
   # Driver Portal
   cd ../BusConductor
   npm install
   
   # User App
   cd ../BusMitraUser
   npm install
   ```

3. **Configure Firebase**
   - Create a Firebase project
   - Enable Firestore and Realtime Database
   - Copy your Firebase config to each app's `.env` file
   - Set up Firebase security rules

4. **Start development servers**
   ```bash
   # Admin Panel (Port 3000)
   cd BusMitraAdmin && npm run dev
   
   # Driver Portal (Port 8080)
   cd BusConductor && npm run dev
   
   # User App (Port 8082)
   cd BusMitraUser && npm run dev
   ```

## 🔧 Configuration

### Environment Variables
Each application requires a `.env` file with Firebase configuration:

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_REALTIME_DB_URL=https://your_project-default-rtdb.region.firebasedatabase.app
```

### Firebase Security Rules
```javascript
// Firestore rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true; // Configure based on your security needs
    }
  }
}

// Realtime Database rules
{
  "rules": {
    ".read": true,
    ".write": true
  }
}
```

## 📱 Mobile Development

For mobile testing, the applications support:
- **Responsive design** for mobile devices
- **Location permission handling** with detailed error messages
- **Debug console** in driver portal for troubleshooting
- **HTTPS support** for location access on mobile devices

### Mobile Location Access
- Modern browsers require HTTPS for location access
- Use ngrok or similar tools for HTTPS tunneling during development
- The debug console provides detailed information about location access issues

## 🗺️ Data Models

### Bus
```typescript
interface Bus {
  id: string;
  busNumber: string;
  capacity: number;
  goingRoute: string;    // Route ID for going direction
  comingRoute: string;   // Route ID for coming direction
  isActive: boolean;
}
```

### Route
```typescript
interface Route {
  id: string;
  routeNumber: string;
  from: string;          // Stop ID
  to: string;            // Stop ID
  stops: string[];       // Array of stop IDs
  distance: number;
  estimatedTime: number;
}
```

### Driver
```typescript
interface Driver {
  id: string;
  name: string;
  phone: string;
  licenseNumber: string;
  busId?: string;        // Currently assigned bus
  isActive: boolean;
}
```

## 🔄 Real-Time Data Flow

1. **Driver starts duty** → Selects bus → Begins location sharing
2. **Location updates** → Stored in Firebase Realtime Database
3. **User searches** → Finds buses → Views real-time tracking
4. **Admin monitors** → Manages system → Updates configurations

## 🐛 Troubleshooting

### Common Issues

1. **Location access denied on mobile**
   - Ensure HTTPS is enabled
   - Check browser permissions
   - Use the debug console for detailed error information

2. **Firebase connection issues**
   - Verify environment variables
   - Check Firebase project configuration
   - Ensure security rules allow access

3. **Map not displaying**
   - Check MapLibre GL configuration
   - Verify API keys and tokens
   - Ensure proper map container setup

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- Firebase for backend services
- MapLibre GL for mapping capabilities
- React community for excellent tooling
- Open source contributors

---

**BusMitra** - Making public transportation smarter and more accessible! 🚌✨
