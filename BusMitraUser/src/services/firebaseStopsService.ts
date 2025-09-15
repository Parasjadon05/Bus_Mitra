
import { collection, getDocs, query, where } from 'firebase/firestore'
import { db } from '@/lib/firebase'

export interface UserLocation {
  latitude: number
  longitude: number
  accuracy?: number
}

export interface FirebaseStop {
  id: string
  name: string
  address: string
  coordinates: {
    lat: number
    lng: number
  }
  routeId?: string
  sequence?: number
  distance?: number
}

export const firebaseStopsService = {
  // Get user's current location using browser geolocation
  async getCurrentLocation(): Promise<UserLocation> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by this browser'))
        return
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy
          })
        },
        (error) => {
          reject(new Error(`Geolocation error: ${error.message}`))
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000 // 5 minutes
        }
      )
    })
  },

  // Convert coordinates to address using Google Maps Geocoding API
  async getAddressFromCoordinates(lat: number, lng: number): Promise<string> {
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}`
      )
      if (!response.ok) {
        throw new Error('Failed to fetch address from Google Maps API')
      }
      const data = await response.json()
      if (data.status === 'OK' && data.results[0]) {
        return data.results[0].formatted_address
      }
      return `${lat.toFixed(6)}, ${lng.toFixed(6)}`
    } catch (error) {
      return `${lat.toFixed(6)}, ${lng.toFixed(6)}`
    }
  },

  // Search for stops by name/address in Firebase database
  async getStopsFromDB(searchQuery: string, limit: number = 10): Promise<FirebaseStop[]> {
    try {
      const routesRef = collection(db, 'routes')
      const routesSnapshot = await getDocs(routesRef)
      
      const allStops: FirebaseStop[] = []
      const stopMap = new Map<string, FirebaseStop>()
      
      routesSnapshot.forEach((routeDoc) => {
        const routeData = routeDoc.data()
        
        if (routeData.startPoint) {
          const startStop: FirebaseStop = {
            id: `${routeDoc.id}-start`,
            name: routeData.startPoint,
            address: routeData.startPoint,
            coordinates: { lat: routeData.startLat || 0, lng: routeData.startLng || 0 },
            routeId: routeDoc.id,
            sequence: 0
          }
          if (startStop.coordinates.lat !== 0 && startStop.coordinates.lng !== 0) {
            stopMap.set(startStop.name.toLowerCase(), startStop)
          }
        }
        
        if (routeData.endPoint) {
          const endStop: FirebaseStop = {
            id: `${routeDoc.id}-end`,
            name: routeData.endPoint,
            address: routeData.endPoint,
            coordinates: { lat: routeData.endLat || 0, lng: routeData.endLng || 0 },
            routeId: routeDoc.id,
            sequence: 999
          }
          if (endStop.coordinates.lat !== 0 && endStop.coordinates.lng !== 0) {
            stopMap.set(endStop.name.toLowerCase(), endStop)
          }
        }
        
        if (routeData.stops && Array.isArray(routeData.stops)) {
          routeData.stops.forEach((stop: any, index: number) => {
            const routeStop: FirebaseStop = {
              id: `${routeDoc.id}-stop-${stop.id || index}`,
              name: stop.name || stop.stopName || `Stop ${index + 1}`,
              address: stop.address || stop.name || stop.stopName || `Stop ${index + 1}`,
              coordinates: {
                lat: stop.latitude || stop.lat || 0,
                lng: stop.longitude || stop.lng || 0
              },
              routeId: routeDoc.id,
              sequence: stop.sequence || index + 1
            }
            if (routeStop.coordinates.lat !== 0 && routeStop.coordinates.lng !== 0) {
              stopMap.set(routeStop.name.toLowerCase(), routeStop)
            }
          })
        }
      })
      
      const allStopsArray = Array.from(stopMap.values())
      
      const filteredStops = allStopsArray.filter(stop => 
        stop.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        stop.address.toLowerCase().includes(searchQuery.toLowerCase())
      )
      
      const sortedStops = filteredStops.sort((a, b) => {
        const aExact = a.name.toLowerCase() === searchQuery.toLowerCase()
        const bExact = b.name.toLowerCase() === searchQuery.toLowerCase()
        
        if (aExact && !bExact) return -1
        if (!aExact && bExact) return 1
        
        return a.name.localeCompare(b.name)
      })
      
      return sortedStops.slice(0, limit)
      
    } catch (error) {
      return []
    }
  },

  // Find nearest stops from user location in Firebase database
  async getNearbyStopsFromDB(userLocation: UserLocation, radiusInMeters: number = 50000): Promise<FirebaseStop[]> {
    try {
      const allStops = await this.getStopsFromDB('', 100)
      
      const stopsWithCoords = allStops.filter(stop => 
        stop.coordinates.lat !== 0 && 
        stop.coordinates.lng !== 0 && 
        !isNaN(stop.coordinates.lat) && 
        !isNaN(stop.coordinates.lng)
      )
      
      if (stopsWithCoords.length === 0) {
        return []
      }
      
      const nearbyStops = stopsWithCoords
        .map(stop => ({
          ...stop,
          distance: this.calculateDistance(
            userLocation.latitude,
            userLocation.longitude,
            stop.coordinates.lat,
            stop.coordinates.lng
          )
        }))
        .filter(stop => stop.distance <= radiusInMeters)
        .sort((a, b) => a.distance - b.distance)
        .slice(0, 10)
      
      return nearbyStops
      
    } catch (error) {
      return []
    }
  },

  // Calculate distance between two coordinates (Haversine formula)
  calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371e3 // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180
    const φ2 = lat2 * Math.PI / 180
    const Δφ = (lat2 - lat1) * Math.PI / 180
    const Δλ = (lng2 - lng1) * Math.PI / 180

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))

    return R * c // Distance in meters
  }
}
