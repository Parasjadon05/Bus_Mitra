import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs, 
  getDoc,
  query,
  orderBy,
  where,
  Timestamp 
} from 'firebase/firestore';
import { db } from './firebase';

// Types
export interface Bus {
  id?: string;
  busNumber: string;
  licensePlate: string;
  capacity: number;
  model: string;
  manufacturer: string;
  year: number;
  status: 'active' | 'maintenance' | 'inactive';
  assignedRoute?: string; // Route ID that this bus is assigned to
  driverId?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface Route {
  id?: string;
  name: string; // e.g., "Route 102: Broadway to Thiruvanmiyur"
  startPoint: string; // e.g., "Broadway Bus Terminus"
  endPoint: string; // e.g., "Thiruvanmiyur"
  active: boolean; // true/false
  distance?: number; // in kilometers
  estimatedTime?: number; // in minutes
  stops?: Array<{
    id: string;
    name: string;
    latitude: number;
    longitude: number;
    sequence: number;
  }>;
  createdAt?: string;
  updatedAt?: string;
  // Optional fields for admin panel
  routeNumber?: string; // Will be extracted from name
  description?: string;
}

export interface Driver {
  id?: string;
  driverId: string; // Auto-generated unique ID
  name: string;
  email: string;
  phone: string;
  licenseNumber: string;
  licenseExpiry: string;
  address: string;
  status: 'active' | 'inactive' | 'suspended';
  password: string; // Auto-generated password
  busId?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

// Generic CRUD operations
class FirebaseService<T> {
  constructor(private collectionName: string) {}

  async create(data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const docRef = await addDoc(collection(db, this.collectionName), {
      ...data,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    return docRef.id;
  }

  async getAll(): Promise<T[]> {
    const querySnapshot = await getDocs(
      query(collection(db, this.collectionName), orderBy('createdAt', 'desc'))
    );
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as T[];
  }

  async getById(id: string): Promise<T | null> {
    const docRef = doc(db, this.collectionName, id);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return {
        id: docSnap.id,
        ...docSnap.data(),
      } as T;
    }
    return null;
  }

  async update(id: string, data: Partial<Omit<T, 'id' | 'createdAt'>>): Promise<void> {
    const docRef = doc(db, this.collectionName, id);
    await updateDoc(docRef, {
      ...data,
      updatedAt: Timestamp.now(),
    });
  }

  async delete(id: string): Promise<void> {
    const docRef = doc(db, this.collectionName, id);
    await deleteDoc(docRef);
  }

  async getByField(field: string, value: any): Promise<T[]> {
    const q = query(
      collection(db, this.collectionName), 
      where(field, '==', value),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as T[];
  }
}

// Specific services
export const busService = new FirebaseService<Bus>('buses');
export const routeService = new FirebaseService<Route>('routes');
export const driverService = new FirebaseService<Driver>('drivers');

// Utility functions
export const formatTimestamp = (timestamp: Timestamp | undefined): string => {
  if (!timestamp) return 'N/A';
  return timestamp.toDate().toLocaleDateString();
};

export const formatDateTime = (timestamp: Timestamp | undefined): string => {
  if (!timestamp) return 'N/A';
  return timestamp.toDate().toLocaleString();
};

// Driver utility functions
export const generateDriverId = (): string => {
  const prefix = 'DRV';
  const randomNum = Math.floor(Math.random() * 9000) + 1000; // 4-digit number
  return `${prefix}${randomNum}`;
};

export const generateDriverPassword = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let password = '';
  for (let i = 0; i < 8; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
};
