import { useState, useEffect, useRef } from 'react';
import { driverService } from '@/lib/firebaseService';

interface Location {
  lat: number;
  lng: number;
  accuracy?: number;
  speed?: number;
  heading?: number;
  timestamp: number;
}

interface UseLocationOptions {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
  updateInterval?: number; // in milliseconds
}

export const useLocation = (driverId: string | undefined, isOnDuty: boolean, busNumber?: string, onLocationUpdate?: () => void, options: UseLocationOptions = {}) => {
  const [location, setLocation] = useState<Location | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const watchIdRef = useRef<number | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const {
    enableHighAccuracy = true,
    timeout = 10000,
    maximumAge = 30000,
    updateInterval = 30000 // Update every 30 seconds
  } = options;

  const updateLocation = async (position: GeolocationPosition) => {
    const newLocation: Location = {
      lat: position.coords.latitude,
      lng: position.coords.longitude,
      accuracy: position.coords.accuracy,
      speed: position.coords.speed || undefined,
      heading: position.coords.heading || undefined,
      timestamp: Date.now()
    };

    setLocation(newLocation);
    setError(null);

    // Update location in Firebase if driver is on duty
    if (isOnDuty && driverId) {
      try {
        await driverService.updateLocation(driverId, {
          lat: newLocation.lat,
          lng: newLocation.lng,
          speed: newLocation.speed,
          heading: newLocation.heading,
          accuracy: newLocation.accuracy
        }, busNumber);
        
        // Call the callback to update duty state timestamp
        if (onLocationUpdate) {
          onLocationUpdate();
        }
      } catch (error) {
        console.error('Error updating location in Firebase:', error);
      }
    }
  };

  const handleLocationError = (error: GeolocationPositionError) => {
    let errorMessage = 'Location access denied';
    
    console.log('❌ Driver location error:', {
      code: error.code,
      message: error.message,
      userAgent: navigator.userAgent,
      protocol: window.location.protocol,
      host: window.location.host,
      isMobile: /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    });
    
    switch (error.code) {
      case error.PERMISSION_DENIED:
        errorMessage = 'Location access denied by user. Please enable location permissions in your browser settings and try again.';
        break;
      case error.POSITION_UNAVAILABLE:
        errorMessage = 'Location information unavailable. Please check your GPS/WiFi settings and try again.';
        break;
      case error.TIMEOUT:
        errorMessage = 'Location request timed out. Please try again.';
        break;
      default:
        errorMessage = `Location error: ${error.message}`;
        break;
    }
    
    setError(errorMessage);
    setIsTracking(false);
  };

  const startTracking = () => {
    console.log('🚌 Starting driver location tracking...');
    console.log('🔒 HTTPS:', window.location.protocol === 'https:');
    console.log('📱 User Agent:', navigator.userAgent);
    console.log('🌐 Host:', window.location.host);
    
    if (!navigator.geolocation) {
      const error = 'Geolocation is not supported by this browser';
      console.error('❌', error);
      setError(error);
      return;
    }

    if (!driverId) {
      const error = 'Driver ID is required for location tracking';
      console.error('❌', error);
      setError(error);
      return;
    }

    setIsTracking(true);
    setError(null);

    // Enhanced options for mobile devices
    const locationOptions = {
      enableHighAccuracy: true,
      timeout: 15000, // Increased timeout for mobile
      maximumAge: 30000
    };

    console.log('📍 Requesting location with options:', locationOptions);

    // Get initial position
    navigator.geolocation.getCurrentPosition(
      (position) => {
        console.log('✅ Initial location access granted:', {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy
        });
        updateLocation(position);
      },
      handleLocationError,
      locationOptions
    );

    // Watch position changes
    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        console.log('📍 Location update received:', {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy
        });
        updateLocation(position);
      },
      handleLocationError,
      locationOptions
    );

    // Set up periodic updates to Firebase
    intervalRef.current = setInterval(() => {
      if (isOnDuty && driverId && location) {
        driverService.updateLocation(driverId, {
          lat: location.lat,
          lng: location.lng,
          speed: location.speed,
          heading: location.heading,
          accuracy: location.accuracy
        }, busNumber).catch(error => {
          console.error('Error updating location in Firebase:', error);
        });
      }
    }, updateInterval);
  };

  const stopTracking = () => {
    setIsTracking(false);
    
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  // Start/stop tracking based on duty status
  useEffect(() => {
    if (isOnDuty && driverId) {
      startTracking();
    } else {
      stopTracking();
    }

    // Cleanup on unmount
    return () => {
      stopTracking();
    };
  }, [isOnDuty, driverId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopTracking();
    };
  }, []);

  return {
    location,
    error,
    isTracking,
    startTracking,
    stopTracking
  };
};
