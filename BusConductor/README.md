# BusMitra Driver App

## Project Overview

BusMitra Driver App is a mobile-first application designed for bus drivers to manage their daily operations, track routes, and communicate with passengers in real-time.

## Features

- **Driver Authentication**: Secure login with driver credentials
- **Bus Selection**: Choose from available buses and routes
- **Duty Management**: Start/end duty with location tracking
- **Real-time Tracking**: Share location with passengers
- **Route Information**: View detailed route and bus information
- **Mobile Optimized**: Designed for mobile devices

## Technologies Used

This project is built with:

- **Vite** - Fast build tool and development server
- **TypeScript** - Type-safe JavaScript
- **React** - Modern UI library
- **shadcn/ui** - Beautiful UI components
- **Tailwind CSS** - Utility-first CSS framework
- **React Router DOM** - Client-side routing
- **TanStack Query** - Data fetching and state management
- **React Hook Form** - Form handling
- **Zod** - Schema validation

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <YOUR_GIT_URL>
cd BusConductor
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:8080`

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── DriverLogin.tsx  # Driver authentication
│   ├── DriverPortal.tsx # Main driver interface
│   └── DriverDetails.tsx # Driver information display
├── pages/              # Page components
├── hooks/              # Custom React hooks
├── lib/                # Utility functions
└── main.tsx           # Application entry point
```

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

### Demo Credentials

For testing purposes, you can use:
- **Driver ID**: D001, D002
- **Password**: any password

## Features in Detail

### Driver Login
- Secure authentication with driver credentials
- Form validation and error handling
- Demo mode for testing

### Bus Selection
- View available buses and routes
- Search functionality
- Real-time availability status
- Bus details (capacity, type, route)

### Duty Management
- Start duty with location permission
- Real-time location tracking
- End duty functionality
- Status indicators

### Mobile Optimization
- Responsive design for mobile devices
- Touch-friendly interface
- Optimized for small screens

## Deployment

Build the project for production:

```bash
npm run build
```

The built files will be in the `dist` directory, ready for deployment to any static hosting service.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

This project is licensed under the MIT License.