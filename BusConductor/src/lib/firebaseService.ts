import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy,
  Timestamp 
} from 'firebase/firestore';
import { db } from './firebase';

// Driver interface
export interface Driver {
  id?: string;
  driverId: string;
  name: string;
  email: string;
  phone: string;
  licenseNumber: string;
  licenseExpiry: string;
  address: string;
  status: 'active' | 'inactive' | 'suspended';
  password: string;
  busId?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

// Bus interface
export interface Bus {
  id?: string;
  busNumber: string;
  routeId?: string;
  capacity: number;
  type?: string;
  status: 'available' | 'in-service' | 'maintenance' | 'active';
  driverId?: string;
  manufacturer?: string;
  model?: string;
  year?: number;
  licensePlate?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

// Stop interface
export interface Stop {
  id?: string;
  stopName: string;
  stopCode: string;
  address: string;
  city: string;
  state: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  status: 'active' | 'inactive';
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

// Route interface
export interface Route {
  id?: string;
  routeNumber: string; // e.g., "R001", "BUS-101"
  routeName: string; // e.g., "City Center Express"
  description: string;
  from: string; // Start stop ID
  to: string; // End stop ID
  stops: string[]; // Array of stop IDs
  distance: number; // in kilometers
  estimatedTime: string; // e.g., "30-45 min"
  fare: number;
  status: 'active' | 'inactive';
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

// Driver Service
export const driverService = {
  // Get driver by driverId and password
  async authenticate(driverId: string, password: string): Promise<Driver | null> {
    try {
      const driversRef = collection(db, 'drivers');
      const q = query(driversRef, where('driverId', '==', driverId));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        return null;
      }
      
      const driverDoc = querySnapshot.docs[0];
      const driverData = driverDoc.data() as Driver;
      
      // Check password (in production, use proper hashing)
      if (driverData.password === password && driverData.status === 'active') {
        return { ...driverData, id: driverDoc.id };
      }
      
      return null;
    } catch (error) {
      console.error('Error authenticating driver:', error);
      throw error;
    }
  },

  // Get driver by ID
  async getById(id: string): Promise<Driver | null> {
    try {
      const driverRef = doc(db, 'drivers', id);
      const driverSnap = await getDoc(driverRef);
      
      if (driverSnap.exists()) {
        return { ...driverSnap.data() as Driver, id: driverSnap.id };
      }
      
      return null;
    } catch (error) {
      console.error('Error getting driver:', error);
      throw error;
    }
  },

  // Update driver location (for tracking) - Write to Realtime Database
async updateLocation(driverId: string, location: { lat: number; lng: number; speed?: number; heading?: number; accuracy?: number }, busNumber: string) {
    try {
      if (!busNumber) {
        console.log('⚠️ No bus number provided for location update');
        return;
      }
      
      // Write to Realtime Database for real-time tracking
      const { ref: realtimeRef, set } = await import('firebase/database');
      const { realtimeDb } = await import('@/lib/firebase');
      
      // Store directly under bus number to match current Firebase console structure
      const busLocationRef = realtimeRef(realtimeDb, busNumber);
      await set(busLocationRef, {
        busId: busNumber,
        driverId: driverId,
        location: {
          lat: location.lat,
          lng: location.lng,
          speed: location.speed || null,
          heading: location.heading || null,
          accuracy: location.accuracy || null,
          timestamp: Date.now()
        },
        status: 'in_transit',
        lastUpdated: Date.now()
      });
      
      console.log('✅ Location updated in Realtime Database for bus:', busNumber);
    } catch (error) {
      console.error('Error updating driver location:', error);
      throw error;
    }
  }
};

// Bus Service
export const busService = {
  // Get all available buses
  async getAvailableBuses(): Promise<Bus[]> {
    try {
      const busesRef = collection(db, 'buses');
      const q = query(busesRef, where('status', 'in', ['available', 'active']));
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => ({
        ...doc.data() as Bus,
        id: doc.id
      }));
    } catch (error) {
      console.error('Error getting available buses:', error);
      throw error;
    }
  },

  // Get bus by ID
  async getById(id: string): Promise<Bus | null> {
    try {
      const busRef = doc(db, 'buses', id);
      const busSnap = await getDoc(busRef);
      
      if (busSnap.exists()) {
        return { ...busSnap.data() as Bus, id: busSnap.id };
      }
      
      return null;
    } catch (error) {
      console.error('Error getting bus:', error);
      throw error;
    }
  },

  // Assign bus to driver
  async assignToDriver(busId: string, driverId: string) {
    try {
      const busRef = doc(db, 'buses', busId);
      await updateDoc(busRef, {
        driverId: driverId,
        status: 'in-service',
        updatedAt: Timestamp.now()
      });
    } catch (error) {
      console.error('Error assigning bus to driver:', error);
      throw error;
    }
  },

  // Release bus from driver
  async releaseFromDriver(busId: string) {
    try {
      const busRef = doc(db, 'buses', busId);
      await updateDoc(busRef, {
        driverId: null,
        status: 'available',
        updatedAt: Timestamp.now()
      });
    } catch (error) {
      console.error('Error releasing bus from driver:', error);
      throw error;
    }
  }
};

// Route Service
export const routeService = {
  // Get all active routes
  async getActiveRoutes(): Promise<Route[]> {
    try {
      const routesRef = collection(db, 'routes');
      const q = query(routesRef, where('status', '==', 'active'));
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => ({
        ...doc.data() as Route,
        id: doc.id
      }));
    } catch (error) {
      console.error('Error getting active routes:', error);
      throw error;
    }
  },

  // Get route by ID
  async getById(id: string): Promise<Route | null> {
    try {
      const routeRef = doc(db, 'routes', id);
      const routeSnap = await getDoc(routeRef);
      
      if (routeSnap.exists()) {
        return { ...routeSnap.data() as Route, id: routeSnap.id };
      }
      
      return null;
    } catch (error) {
      console.error('Error getting route:', error);
      throw error;
    }
  }
};

// Stop Service
export const stopService = {
  // Get all active stops
  async getActiveStops(): Promise<Stop[]> {
    try {
      const stopsRef = collection(db, 'stops');
      const q = query(stopsRef, where('status', '==', 'active'));
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => ({
        ...doc.data() as Stop,
        id: doc.id
      }));
    } catch (error) {
      console.error('Error getting active stops:', error);
      throw error;
    }
  },

  // Get stop by ID
  async getStopById(stopId: string): Promise<Stop | null> {
    try {
      const stopRef = doc(db, 'stops', stopId);
      const stopSnap = await getDoc(stopRef);
      
      if (stopSnap.exists()) {
        return { ...stopSnap.data() as Stop, id: stopSnap.id };
      }
      
      return null;
    } catch (error) {
      console.error('Error getting stop:', error);
      throw error;
    }
  }
};
