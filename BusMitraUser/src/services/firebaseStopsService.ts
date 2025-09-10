import { collection, getDocs, query, where } from 'firebase/firestore'
import { db } from '@/lib/firebase'

export interface FirebaseStop {
  id: string
  stopName: string
  stopCode: string
  address: string
  city: string
  state: string
  coordinates?: {
    latitude: number
    longitude: number
  }
  status: 'active' | 'inactive'
  distance?: number // Distance from user location in meters
}

export interface UserLocation {
  latitude: number
  longitude: number
  accuracy?: number
}

export class FirebaseStopsService {
  /**
   * Get user's current location using browser geolocation API
   */
  async getCurrentLocation(): Promise<UserLocation> {
    return new Promise((resolve, reject) => {
      console.log('🌍 Requesting location access...')
      console.log('🔒 HTTPS:', window.location.protocol === 'https:')
      console.log('📱 User Agent:', navigator.userAgent)
      
      if (!navigator.geolocation) {
        const error = 'Geolocation is not supported by this browser'
        console.error('❌', error)
        reject(new Error(error))
        return
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          console.log('✅ Location access granted:', {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy
          })
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy
          })
        },
        (error) => {
          let errorMessage = ''
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = 'Location access denied by user. Please enable location permissions in your browser settings.'
              break
            case error.POSITION_UNAVAILABLE:
              errorMessage = 'Location information is unavailable. Please check your GPS/WiFi settings.'
              break
            case error.TIMEOUT:
              errorMessage = 'Location request timed out. Please try again.'
              break
            default:
              errorMessage = `Unknown location error: ${error.message}`
              break
          }
          console.error('❌ Location error:', {
            code: error.code,
            message: error.message,
            userAgent: navigator.userAgent,
            protocol: window.location.protocol,
            host: window.location.host
          })
          reject(new Error(errorMessage))
        },
        {
          enableHighAccuracy: true,
          timeout: 15000, // Increased timeout for mobile
          maximumAge: 300000 // 5 minutes
        }
      )
    })
  }

  /**
   * Get all active bus stops from Firebase
   */
  async getAllActiveStops(): Promise<FirebaseStop[]> {
    try {
      const stopsRef = collection(db, 'stops')
      const q = query(stopsRef, where('status', '==', 'active'))
      const querySnapshot = await getDocs(q)
      
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as FirebaseStop[]
    } catch (error) {
      console.error('Error fetching stops from Firebase:', error)
      return []
    }
  }

  /**
   * Find nearest bus stops from Firebase data
   */
  async findNearestStops(userLocation: UserLocation, maxDistance: number = 5000): Promise<FirebaseStop[]> {
    try {
      const allStops = await this.getAllActiveStops()
      
      // Filter stops that have coordinates and calculate distances
      const stopsWithDistance = allStops
        .filter(stop => stop.coordinates)
        .map(stop => ({
          ...stop,
          distance: this.calculateDistance(
            userLocation.latitude,
            userLocation.longitude,
            stop.coordinates!.latitude,
            stop.coordinates!.longitude
          )
        }))
        .filter(stop => stop.distance <= maxDistance)
        .sort((a, b) => a.distance - b.distance)

      return stopsWithDistance
    } catch (error) {
      console.error('Error finding nearest stops:', error)
      return []
    }
  }

  /**
   * Calculate distance between two coordinates using Haversine formula
   */
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3 // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180
    const φ2 = lat2 * Math.PI / 180
    const Δφ = (lat2 - lat1) * Math.PI / 180
    const Δλ = (lon2 - lon1) * Math.PI / 180

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))

    return R * c // Distance in meters
  }

  /**
   * Get address from coordinates using reverse geocoding
   */
  async getAddressFromCoordinates(latitude: number, longitude: number): Promise<string> {
    try {
      // Use OpenStreetMap Nominatim for reverse geocoding (free)
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`
      )

      if (response.ok) {
        const data = await response.json()
        return data.display_name || `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
      }

      return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
    } catch (error) {
      console.error('Error getting address from coordinates:', error)
      return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
    }
  }
}

export const firebaseStopsService = new FirebaseStopsService()
