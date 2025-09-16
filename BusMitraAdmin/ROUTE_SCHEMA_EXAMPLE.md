# Route Schema Documentation

This document shows the exact Firestore schema that the admin dashboard form follows when creating/editing routes.

## Firestore Document Structure

### Collection: `routes`
### Document ID: `route_102` (auto-generated from route name)

```json
{
  "active": true,
  "createdAt": "2025-09-14T08:00:00Z",
  "distance": 17,
  "endPoint": "Thiruvanmiyur",
  "estimatedTime": 50,
  "id": "route_102",
  "name": "Route 102: Broadway to Thiruvanmiyur",
  "startPoint": "Broadway Bus Terminus",
  "stops": [
    {
      "id": "stop_1",
      "latitude": 13.0878,
      "longitude": 80.2785,
      "name": "Broadway Bus Terminus",
      "sequence": 1
    },
    {
      "id": "stop_2",
      "latitude": 13.05,
      "longitude": 80.2824,
      "name": "Marina Beach",
      "sequence": 2
    },
    {
      "id": "stop_3",
      "latitude": 13.033,
      "longitude": 80.2684,
      "name": "Mylapore",
      "sequence": 3
    },
    {
      "id": "stop_4",
      "latitude": 13.0007,
      "longitude": 80.255,
      "name": "Adyar",
      "sequence": 4
    },
    {
      "id": "stop_5",
      "latitude": 12.9846,
      "longitude": 80.2591,
      "name": "Thiruvanmiyur",
      "sequence": 5
    }
  ],
  "updatedAt": "2025-09-14T08:00:00Z"
}
```

## Form Features

### 1. Basic Route Information
- **Route Name**: Full descriptive name (e.g., "Route 102: Broadway to Thiruvanmiyur")
- **Start Point**: Starting location name
- **End Point**: Ending location name
- **Distance**: In kilometers (number)
- **Estimated Time**: In minutes (number)
- **Status**: Active/Inactive (boolean)

### 2. Stops Management
- **Dynamic Stops**: Add/remove stops as needed
- **Minimum 2 stops**: Form validation ensures at least 2 stops
- **Stop Details**:
  - **Stop Name**: Human-readable name
  - **Stop ID**: Auto-generated (stop_1, stop_2, etc.)
  - **Latitude**: GPS coordinate (number)
  - **Longitude**: GPS coordinate (number)
  - **Sequence**: Order in route (auto-managed)

### 3. Auto-Generated Fields
- **Route ID**: Generated from route name (e.g., "Route 102" → "route_102")
- **Stop IDs**: Generated based on sequence (stop_1, stop_2, etc.)
- **Timestamps**: createdAt and updatedAt automatically managed
- **Sequences**: Stop sequences automatically reordered when stops are added/removed

### 4. Validation Rules
- **Route Name**: Required, minimum 1 character
- **Start/End Points**: Required, minimum 1 character each
- **Distance**: Must be positive number
- **Estimated Time**: Must be positive number
- **Stops**: Minimum 2 stops required
- **Stop Names**: Required for each stop
- **Coordinates**: Valid latitude (-90 to 90) and longitude (-180 to 180)

### 5. Form UI Features
- **Responsive Design**: Works on desktop and mobile
- **Real-time Validation**: Shows errors as user types
- **Dynamic Stop Management**: Add/remove stops with validation
- **Auto-save Sequences**: Stop sequences automatically update
- **Search & Filter**: Find routes by name, start/end points
- **Status Management**: Easy active/inactive toggle

## Usage in Admin Dashboard

1. **Create Route**: Click "Add New Route" button
2. **Fill Basic Info**: Enter route name, start/end points, distance, time
3. **Add Stops**: Use "Add Stop" button to add route stops
4. **Enter Stop Details**: Fill in stop name and coordinates
5. **Save Route**: Form validates and saves to Firestore
6. **Edit Route**: Click edit button to modify existing routes
7. **Delete Route**: Remove routes with confirmation

## Integration with User App

The routes created in the admin dashboard are immediately available in the user app for:
- Bus search and discovery
- Live tracking
- Stop suggestions
- Route visualization on maps
