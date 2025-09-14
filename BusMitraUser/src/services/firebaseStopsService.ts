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

  // Convert coordinates to address using Nominatim (free service)
  async getAddressFromCoordinates(lat: number, lng: number): Promise<string> {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`
      )
      
      if (!response.ok) {
        throw new Error('Failed to fetch address')
      }
      
      const data = await response.json()
      return data.display_name || `${lat.toFixed(6)}, ${lng.toFixed(6)}`
    } catch (error) {
      console.error('Error getting address from coordinates:', error)
      return `${lat.toFixed(6)}, ${lng.toFixed(6)}`
    }
  },

  // Search for stops by name/address in routes
  async searchStops(searchQuery: string, limit: number = 10): Promise<FirebaseStop[]> {
    try {
      console.log('🔍 Searching stops in routes for:', searchQuery)
      
      // Get all routes from Firebase
      const routesRef = collection(db, 'routes')
      const routesSnapshot = await getDocs(routesRef)
      
      const allStops: FirebaseStop[] = []
      const stopMap = new Map<string, FirebaseStop>() // To avoid duplicates
      
      routesSnapshot.forEach((routeDoc) => {
        const routeData = routeDoc.data()
        
        // Add start point
        if (routeData.startPoint) {
          const startStop: FirebaseStop = {
            id: `${routeDoc.id}-start`,
            name: routeData.startPoint,
            address: routeData.startPoint,
            coordinates: { lat: 0, lng: 0 }, // Will be filled from stops array if available
            routeId: routeDoc.id,
            sequence: 0
          }
          stopMap.set(startStop.name.toLowerCase(), startStop)
        }
        
        // Add end point
        if (routeData.endPoint) {
          const endStop: FirebaseStop = {
            id: `${routeDoc.id}-end`,
            name: routeData.endPoint,
            address: routeData.endPoint,
            coordinates: { lat: 0, lng: 0 }, // Will be filled from stops array if available
            routeId: routeDoc.id,
            sequence: 999
          }
          stopMap.set(endStop.name.toLowerCase(), endStop)
        }
        
        // Add stops from the stops array
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
            stopMap.set(routeStop.name.toLowerCase(), routeStop)
          })
        }
      })
      
      // Convert map to array
      const allStopsArray = Array.from(stopMap.values())
      
      // Filter stops based on search query
      const filteredStops = allStopsArray.filter(stop => 
        stop.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        stop.address.toLowerCase().includes(searchQuery.toLowerCase())
      )
      
      // Sort by relevance (exact matches first, then partial matches)
      const sortedStops = filteredStops.sort((a, b) => {
        const aExact = a.name.toLowerCase() === searchQuery.toLowerCase()
        const bExact = b.name.toLowerCase() === searchQuery.toLowerCase()
        
        if (aExact && !bExact) return -1
        if (!aExact && bExact) return 1
        
        return a.name.localeCompare(b.name)
      })
      
      console.log(`✅ Found ${sortedStops.length} stops matching "${searchQuery}"`)
      return sortedStops.slice(0, limit)
      
    } catch (error) {
      console.error('Error searching stops:', error)
      return []
    }
  },

  // Find nearest stops from user location (simplified version)
  async findNearestStops(userLocation: UserLocation, radiusInMeters: number = 5000): Promise<FirebaseStop[]> {
    try {
      console.log('📍 Finding nearest stops to:', userLocation)
      
      // Get all stops first
      const allStops = await this.searchStops('', 100) // Get more stops for distance calculation
      
      // Filter stops that have coordinates
      const stopsWithCoords = allStops.filter(stop => 
        stop.coordinates.lat !== 0 && stop.coordinates.lng !== 0
      )
      
      // Calculate distances and filter by radius
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
      
      console.log(`✅ Found ${nearbyStops.length} nearby stops`)
      return nearbyStops
      
    } catch (error) {
      console.error('Error finding nearest stops:', error)
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
