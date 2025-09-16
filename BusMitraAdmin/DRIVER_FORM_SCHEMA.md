# Driver Form Schema Documentation

## Overview
The driver creation/editing form has been updated to follow the exact Firestore schema structure shown in the Firebase console, with auto-generated credentials and email functionality.

## Firestore Schema Compliance

### Document Structure
The form now creates drivers with the exact schema structure:

```json
{
  "assignedRoute": "route_520",
  "busNumber": "KA01AB1234", 
  "createdAt": "September 13, 2025 at 1:30:15 PM UTC+5:30",
  "driverId": "DRV001",
  "email": "rajesh.kumar@busmitra.com",
  "experience": "5 years",
  "id": "driver_001",
  "lastLogin": "September 13, 2025 at 1:29:51 PM UTC+5:30",
  "licenseNumber": "DL042011234567",
  "name": "Rajesh Kumar",
  "password": "password123",
  "phone": "+91 9876543210",
  "status": "available",
  "updatedAt": "September 13, 2025 at 1:30:33 PM UTC+5:30"
}
```

## Form Fields

### 1. **Basic Information**
- **Name**: Full name (required, max 100 chars)
- **Email**: Email address (required, valid email format)
- **Phone**: Phone number (required, 10-20 chars)

### 2. **Professional Details**
- **License Number**: Driving license number (required, max 50 chars)
- **Experience**: Years of experience (required, max 50 chars)

### 3. **Assignment Information**
- **Assigned Route**: Route ID (optional)
- **Bus Number**: Vehicle number (optional)
- **Status**: Driver availability status (required)

### 4. **Auto-Generated Fields**
- **Driver ID**: Auto-generated (e.g., "DRV001")
- **Password**: Auto-generated secure password
- **ID**: Document ID (e.g., "driver_001")
- **Timestamps**: createdAt, updatedAt, lastLogin

## Status Options

The form now uses the correct status values from the schema:

- **Available**: Driver is ready for duty
- **Unavailable**: Driver is not available
- **On Break**: Driver is on break
- **Off Duty**: Driver is off duty

## Form Layout

### Compact Design
- **Dialog Size**: `sm:max-w-2xl` (compact, focused)
- **Grid Layout**: 2-column and 3-column grids for efficient space usage
- **Spacing**: Reduced spacing for cleaner appearance

### Field Organization
```
┌─────────────────────────────────┐
│ Full Name: [________________]  │
│ Email: [______] Phone: [______] │
│ License: [____] Experience: [__]│
│ Route: [__] Bus: [__] Status: [▼]│
└─────────────────────────────────┘
```

## Auto-Generation Features

### 1. **Driver ID Generation**
- **Format**: `DRV` + 4-digit number
- **Example**: `DRV001`, `DRV002`, etc.
- **Uniqueness**: Ensures unique IDs across all drivers

### 2. **Password Generation**
- **Length**: 8 characters
- **Characters**: Letters (upper/lower) + numbers
- **Security**: Random generation for each driver

### 3. **Document ID Generation**
- **Format**: `driver_` + timestamp
- **Example**: `driver_001`, `driver_002`, etc.
- **Uniqueness**: Timestamp-based for uniqueness

### 4. **Timestamp Management**
- **createdAt**: When driver is created
- **updatedAt**: When driver is last modified
- **lastLogin**: Set to creation time initially

## Email Integration

### Credentials Email
After creating a driver, the system:
1. **Generates credentials** (Driver ID + Password)
2. **Shows credentials dialog** with copy functionality
3. **Sends email** to driver with login details
4. **Confirms delivery** with success message

### Email Content
The email includes:
- Driver name and email
- Generated Driver ID
- Generated password
- Login instructions
- Contact information

## Validation Rules

### Required Fields
- **Name**: Must not be empty, max 100 characters
- **Email**: Valid email format
- **Phone**: 10-20 characters
- **License Number**: Must not be empty, max 50 characters
- **Experience**: Must not be empty, max 50 characters
- **Status**: Must be one of the valid options

### Optional Fields
- **Assigned Route**: Can be left empty
- **Bus Number**: Can be left empty

## Database Integration

### Firestore Collection
- **Collection**: `drivers`
- **Document ID**: Auto-generated unique ID
- **Fields**: All schema fields included

### Data Types
- **Strings**: name, email, phone, licenseNumber, experience, etc.
- **Timestamps**: createdAt, updatedAt, lastLogin
- **Enums**: status (available, unavailable, on_break, off_duty)

## User Experience

### Form Workflow
1. **Fill Form**: Enter driver details
2. **Submit**: Form validates and saves to Firestore
3. **Credentials**: Auto-generated credentials shown
4. **Email**: Send credentials to driver
5. **Confirmation**: Success message displayed

### Error Handling
- **Real-time validation**: Shows errors as user types
- **Field-specific errors**: Each field shows its own errors
- **Clear messages**: Descriptive error text
- **Visual indicators**: Red borders on invalid fields

## Benefits

### 1. **Schema Compliance**
- **Exact match**: Follows Firebase console schema exactly
- **Data consistency**: Ensures proper data structure
- **Future-proof**: Compatible with existing data

### 2. **User Experience**
- **Compact form**: Efficient use of space
- **Clear workflow**: Logical step-by-step process
- **Auto-generation**: Reduces manual work
- **Email integration**: Seamless credential delivery

### 3. **Data Integrity**
- **Validation**: Comprehensive field validation
- **Auto-generation**: Consistent ID and password format
- **Timestamps**: Proper tracking of creation and updates
- **Status management**: Clear driver availability states

## Technical Implementation

### Form Schema
```typescript
const driverSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  phone: z.string().min(10).max(20),
  licenseNumber: z.string().min(1).max(50),
  experience: z.string().min(1).max(50),
  assignedRoute: z.string().optional(),
  busNumber: z.string().optional(),
  status: z.enum(["available", "unavailable", "on_break", "off_duty"]),
});
```

### Data Processing
```typescript
const driverData = {
  ...formData,
  driverId: generateDriverId(),
  password: generateDriverPassword(),
  id: `driver_${Date.now()}`,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  lastLogin: new Date().toISOString(),
};
```

The driver form now perfectly matches the Firestore schema and provides a seamless experience for creating and managing drivers with auto-generated credentials and email functionality.
