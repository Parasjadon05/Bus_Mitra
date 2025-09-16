# Route Form Usage Guide

## Overview
The admin dashboard now includes a comprehensive route creation/editing form that follows the exact Firestore schema structure.

## Form Features

### 1. Basic Route Information
- **Route Name**: Full descriptive name (e.g., "Route 102: Broadway to Thiruvanmiyur")
- **Start Point**: Starting location name (e.g., "Broadway Bus Terminus")
- **End Point**: Ending location name (e.g., "Thiruvanmiyur")
- **Distance**: In kilometers (number, 0-1000)
- **Estimated Time**: In minutes (number, 0-1440)
- **Status**: Active/Inactive toggle

### 2. Dynamic Stops Management
- **Add Stops**: Click "Add Stop" button to add new stops
- **Remove Stops**: Click X button on stop cards (minimum 2 stops required)
- **Stop Details**:
  - **Stop Name**: Human-readable name (required)
  - **Stop ID**: Auto-generated (stop_1, stop_2, etc.)
  - **Latitude**: GPS coordinate (-90 to 90)
  - **Longitude**: GPS coordinate (-180 to 180)
  - **Sequence**: Auto-managed based on order

## Step-by-Step Usage

### Creating a New Route

1. **Click "Add New Route"** button
2. **Fill Basic Information**:
   - Enter route name: "Route 102: Broadway to Thiruvanmiyur"
   - Enter start point: "Broadway Bus Terminus"
   - Enter end point: "Thiruvanmiyur"
   - Set distance: 17 (km)
   - Set estimated time: 50 (minutes)
   - Select status: Active

3. **Add Route Stops**:
   - Default 2 stops are provided
   - Click "Add Stop" to add more stops
   - For each stop, fill in:
     - Stop name (e.g., "Marina Beach")
     - Latitude (e.g., 13.05)
     - Longitude (e.g., 80.2824)

4. **Submit Form**:
   - Click "Add Route" button
   - Form validates all data
   - Route is saved to Firestore
   - Success message appears

### Editing an Existing Route

1. **Click Edit Button** on any route in the table
2. **Modify Fields** as needed
3. **Add/Remove Stops**:
   - Use "Add Stop" to add new stops
   - Use X button to remove stops (minimum 2 required)
4. **Update Route**:
   - Click "Update Route" button
   - Changes are saved to Firestore

## Form Validation

### Client-Side Validation
- **Required Fields**: All basic info fields are required
- **Stop Names**: All stops must have names
- **Coordinates**: Valid latitude (-90 to 90) and longitude (-180 to 180)
- **Distance**: Must be positive number (0-1000)
- **Time**: Must be positive number (0-1440)
- **Minimum Stops**: At least 2 stops required

### Server-Side Validation
- **Data Cleaning**: Trims whitespace, converts numbers
- **Coordinate Validation**: Ensures valid GPS coordinates
- **Stop Validation**: Removes empty stops, validates all data

## Data Structure

### Firestore Document Example
```json
{
  "id": "route_102",
  "name": "Route 102: Broadway to Thiruvanmiyur",
  "startPoint": "Broadway Bus Terminus",
  "endPoint": "Thiruvanmiyur",
  "active": true,
  "distance": 17,
  "estimatedTime": 50,
  "stops": [
    {
      "id": "stop_1",
      "name": "Broadway Bus Terminus",
      "latitude": 13.0878,
      "longitude": 80.2785,
      "sequence": 1
    },
    {
      "id": "stop_2",
      "name": "Marina Beach",
      "latitude": 13.05,
      "longitude": 80.2824,
      "sequence": 2
    }
  ],
  "createdAt": "2025-01-27T10:30:00Z",
  "updatedAt": "2025-01-27T10:30:00Z"
}
```

## Error Handling

### Common Validation Errors
- **"At least 2 stops are required"**: Add more stops before submitting
- **"All stops must have names"**: Fill in stop names
- **"Please enter valid latitude/longitude values"**: Check coordinate ranges
- **"Route name is required"**: Fill in route name
- **"Start/End point is required"**: Fill in start and end points

### Form Reset
- **Cancel Button**: Resets form to default values
- **After Submission**: Form automatically resets
- **After Edit**: Form resets when closing edit dialog

## Tips for Success

1. **Use Descriptive Names**: Make route names clear and descriptive
2. **Accurate Coordinates**: Use precise GPS coordinates for stops
3. **Logical Sequence**: Add stops in the order they appear on the route
4. **Test Coordinates**: Verify coordinates are within valid ranges
5. **Save Frequently**: Save your work regularly to avoid data loss

## Integration

Routes created in the admin dashboard are immediately available in:
- **User App**: Bus search and discovery
- **Live Tracking**: Real-time bus location
- **Stop Suggestions**: Autocomplete functionality
- **Map Visualization**: Route display on maps
