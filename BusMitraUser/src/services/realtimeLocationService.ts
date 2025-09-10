import { ref, onValue, off, set, update, get, child } from 'firebase/database'
import { realtimeDb } from '@/lib/firebase'

export interface BusLocation {
  lat: number
  lng: number
  timestamp: number
  speed?: number
  heading?: number
  accuracy?: number
}

export interface BusStatus {
  busId: string
  driverId: string
  location: BusLocation
  status: 'in_transit' | 'at_stop' | 'off_duty' | 'delayed'
  nextStop?: string
  estimatedArrival?: string
  lastUpdated: number
}

export interface LocationUpdateCallback {
  (busStatus: BusStatus): void
}

export interface ConnectionStatusCallback {
  (isConnected: boolean): void
}

export class RealtimeLocationService {
  private locationListeners: Map<string, () => void> = new Map()
  private connectionListeners: (() => void)[] = []

  /**
   * Start listening to real-time bus location updates
   */
  startListeningToBus(busId: string, callback: LocationUpdateCallback): () => void {
    console.log('🚌 LIVE BUS TRACKING: Starting to listen to bus:', busId)
    
    // Listen to direct bus path first (current structure)
    const busRef = ref(realtimeDb, busId)
    const busLocationRef = ref(realtimeDb, `bus_locations/${busId}`)
    
    // Create a combined listener that checks both paths
    const unsubscribeBus = onValue(busRef, (snapshot) => {
      if (snapshot.exists()) {
        this.handleLocationUpdate(snapshot, busId, callback)
      }
    })
    
    const unsubscribeBusLocation = onValue(busLocationRef, (snapshot) => {
      if (snapshot.exists()) {
        this.handleLocationUpdate(snapshot, busId, callback)
      }
    })
    
    // Return a function that unsubscribes from both listeners
    return () => {
      unsubscribeBus()
      unsubscribeBusLocation()
    }
  }

  private handleLocationUpdate(snapshot: any, busId: string, callback: LocationUpdateCallback) {
    const data = snapshot.val()
    if (data) {
      const busStatus: BusStatus = {
        busId,
        driverId: data.driverId || '',
        location: data.location || { lat: 0, lng: 0, timestamp: 0 },
        status: data.status || 'off_duty',
        nextStop: data.nextStop,
        estimatedArrival: data.estimatedArrival,
        lastUpdated: data.lastUpdated || Date.now()
      }
      
      console.log('📍 LIVE BUS LOCATION:', {
        busId: busStatus.busId,
        coordinates: `${busStatus.location.lat}, ${busStatus.location.lng}`,
        status: busStatus.status,
        lastUpdated: new Date(busStatus.lastUpdated).toLocaleTimeString()
      })
      callback(busStatus)
    } else {
      console.log('❌ LIVE BUS TRACKING: No data for bus:', busId)
    }
  }

  /**
   * Stop listening to a specific bus
   */
  stopListeningToBus(busId: string): void {
    const unsubscribe = this.locationListeners.get(busId)
    if (unsubscribe) {
      unsubscribe()
      this.locationListeners.delete(busId)
    }
  }

  /**
   * Stop listening to all buses
   */
  stopListeningToAllBuses(): void {
    this.locationListeners.forEach((unsubscribe) => {
      unsubscribe()
    })
    this.locationListeners.clear()
  }

  /**
   * Get current bus location (one-time read)
   */
  async getCurrentBusLocation(busId: string): Promise<BusStatus | null> {
    try {
      // Check direct bus path first (current structure)
      const busRef = ref(realtimeDb, busId)
      const busLocationRef = ref(realtimeDb, `bus_locations/${busId}`)
      
      const [busSnapshot, busLocationSnapshot] = await Promise.all([
        get(busRef),
        get(busLocationRef)
      ])
      
      // Check direct bus path first
      if (busSnapshot.exists()) {
        const data = busSnapshot.val()
        return {
          busId,
          driverId: data.driverId || '',
          location: data.location || { lat: 0, lng: 0, timestamp: 0 },
          status: data.status || 'off_duty',
          nextStop: data.nextStop,
          estimatedArrival: data.estimatedArrival,
          lastUpdated: data.lastUpdated || Date.now()
        }
      }
      
      // Fallback to bus_locations path
      if (busLocationSnapshot.exists()) {
        const data = busLocationSnapshot.val()
        return {
          busId,
          driverId: data.driverId || '',
          location: data.location || { lat: 0, lng: 0, timestamp: 0 },
          status: data.status || 'off_duty',
          nextStop: data.nextStop,
          estimatedArrival: data.estimatedArrival,
          lastUpdated: data.lastUpdated || Date.now()
        }
      }
      
      return null
    } catch (error) {
      console.error('Error getting bus location:', error)
      return null
    }
  }

  /**
   * Check if a bus has an active driver on duty
   */
  async isDriverOnDuty(busId: string): Promise<boolean> {
    try {
      // Check both possible paths: direct bus number and under bus_locations
      const busRef = ref(realtimeDb, busId)
      const busLocationRef = ref(realtimeDb, `bus_locations/${busId}`)
      
      const [busSnapshot, busLocationSnapshot] = await Promise.all([
        get(busRef),
        get(busLocationRef)
      ])
      
      // Check direct bus path first (current structure)
      if (busSnapshot.exists()) {
        const data = busSnapshot.val()
        const status = data.status || 'off_duty'
        const lastUpdated = data.lastUpdated || 0
        const now = Date.now()
        
        console.log(`🔍 Checking duty status for ${busId}:`, { status, lastUpdated, timeDiff: now - lastUpdated })
        
        // Consider driver on duty if:
        // 1. Status is not 'off_duty'
        // 2. Last update was within last 5 minutes (driver is actively sharing location)
        const isOnDuty = status !== 'off_duty' && (now - lastUpdated) < 300000
        console.log(`✅ Driver duty status for ${busId}:`, isOnDuty)
        return isOnDuty
      }
      
      // Fallback to bus_locations path (legacy structure)
      if (busLocationSnapshot.exists()) {
        const data = busLocationSnapshot.val()
        const status = data.status || 'off_duty'
        const lastUpdated = data.lastUpdated || 0
        const now = Date.now()
        
        console.log(`🔍 Checking duty status for ${busId} (legacy path):`, { status, lastUpdated, timeDiff: now - lastUpdated })
        
        const isOnDuty = status !== 'off_duty' && (now - lastUpdated) < 300000
        console.log(`✅ Driver duty status for ${busId} (legacy):`, isOnDuty)
        return isOnDuty
      }
      
      console.log(`❌ No data found for bus ${busId}`)
      return false
    } catch (error) {
      console.error('Error checking driver duty status:', error)
      return false
    }
  }

  /**
   * Get duty status for multiple buses
   */
  async getBusesDutyStatus(busIds: string[]): Promise<Map<string, boolean>> {
    const dutyStatusMap = new Map<string, boolean>()
    
    try {
      const promises = busIds.map(async (busId) => {
        const isOnDuty = await this.isDriverOnDuty(busId)
        dutyStatusMap.set(busId, isOnDuty)
      })
      
      await Promise.all(promises)
      return dutyStatusMap
    } catch (error) {
      console.error('Error getting buses duty status:', error)
      return dutyStatusMap
    }
  }

  /**
   * Listen to Firebase connection status
   */
  listenToConnectionStatus(callback: ConnectionStatusCallback): () => void {
    const connectedRef = ref(realtimeDb, '.info/connected')
    
    const unsubscribe = onValue(connectedRef, (snapshot) => {
      const isConnected = snapshot.val() === true
      console.log('🌐 Firebase connection status:', isConnected ? 'Connected' : 'Disconnected')
      callback(isConnected)
    })

    this.connectionListeners.push(unsubscribe)
    
    return () => {
      unsubscribe()
      const index = this.connectionListeners.indexOf(unsubscribe)
      if (index > -1) {
        this.connectionListeners.splice(index, 1)
      }
    }
  }

  /**
   * Get all active buses (buses with recent location updates)
   */
  async getActiveBuses(): Promise<BusStatus[]> {
    try {
      const busesRef = ref(realtimeDb, 'bus_locations')
      const snapshot = await get(busesRef)
      
      if (snapshot.exists()) {
        const busesData = snapshot.val()
        const activeBuses: BusStatus[] = []
        
        Object.keys(busesData).forEach(busId => {
          const data = busesData[busId]
          const lastUpdated = data.lastUpdated || 0
          const fiveMinutesAgo = Date.now() - (5 * 60 * 1000)
          
          // Only include buses updated in the last 5 minutes
          if (lastUpdated > fiveMinutesAgo) {
            activeBuses.push({
              busId,
              driverId: data.driverId || '',
              location: data.location || { lat: 0, lng: 0, timestamp: 0 },
              status: data.status || 'off_duty',
              nextStop: data.nextStop,
              estimatedArrival: data.estimatedArrival,
              lastUpdated
            })
          }
        })
        
        return activeBuses
      }
      
      return []
    } catch (error) {
      console.error('Error getting active buses:', error)
      return []
    }
  }

  /**
   * Calculate distance between two coordinates (in meters)
   */
  calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
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
   * Calculate ETA based on current location and destination
   */
  calculateETA(currentLocation: BusLocation, destination: { lat: number, lng: number }, averageSpeed: number = 25): string {
    const distance = this.calculateDistance(
      currentLocation.lat,
      currentLocation.lng,
      destination.lat,
      destination.lng
    )
    
    const timeInMinutes = Math.round((distance / 1000) / (averageSpeed / 60))
    
    if (timeInMinutes < 1) {
      return 'Less than 1 min'
    } else if (timeInMinutes < 60) {
      return `${timeInMinutes} min`
    } else {
      const hours = Math.floor(timeInMinutes / 60)
      const minutes = timeInMinutes % 60
      return `${hours}h ${minutes}m`
    }
  }

  /**
   * Clean up all listeners
   */
  cleanup(): void {
    this.stopListeningToAllBuses()
    this.connectionListeners.forEach(unsubscribe => unsubscribe())
    this.connectionListeners = []
  }
}

export const realtimeLocationService = new RealtimeLocationService()

