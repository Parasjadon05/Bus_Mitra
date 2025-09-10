# BusMitra Admin Dashboard

## Project Overview

BusMitra is a comprehensive public transport management system designed for tier-2 cities with real-time tracking and route optimization capabilities.

## Technologies Used

This project is built with:

- **Vite** - Fast build tool and development server
- **TypeScript** - Type-safe JavaScript
- **React** - Modern UI library
- **shadcn/ui** - Beautiful UI components
- **Tailwind CSS** - Utility-first CSS framework
- **Firebase** - Backend as a Service for database and authentication
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
cd BusMitraAdmin
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your Firebase configuration
```

4. Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:8080`

## Features

- **Driver Management**: Add, edit, and manage driver profiles
- **Route Management**: Create and manage bus routes
- **Bus Management**: Track and manage bus fleet
- **Email Integration**: Send driver credentials via email
- **Real-time Updates**: Live data synchronization with Firebase
- **Responsive Design**: Works on desktop and mobile devices

## Project Structure

```
src/
├── components/          # Reusable UI components
├── pages/              # Page components
├── hooks/              # Custom React hooks
├── lib/                # Utility functions and services
├── config/             # Configuration files
└── main.tsx           # Application entry point
```

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

### Firebase Setup

1. Create a Firebase project
2. Enable Firestore Database
3. Set up authentication (optional)
4. Update your `.env` file with Firebase configuration

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