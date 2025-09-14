// Firebase connection test utility
import { db } from '@/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';

export const testFirebaseConnection = async () => {
  try {
    console.log('Testing Firebase connection...');
    
    // Test reading from a collection
    const testCollection = collection(db, 'test');
    const snapshot = await getDocs(testCollection);
    
    console.log('✅ Firebase connection successful');
    console.log('Documents found:', snapshot.size);
    
    return true;
  } catch (error) {
    console.error('❌ Firebase connection failed:', error);
    return false;
  }
};

// Test function for routes collection
export const testRoutesCollection = async () => {
  try {
    console.log('Testing routes collection...');
    
    const routesCollection = collection(db, 'routes');
    const snapshot = await getDocs(routesCollection);
    
    console.log('✅ Routes collection accessible');
    console.log('Routes found:', snapshot.size);
    
    return true;
  } catch (error) {
    console.error('❌ Routes collection error:', error);
    return false;
  }
};
