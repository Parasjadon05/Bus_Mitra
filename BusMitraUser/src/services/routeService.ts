import { doc, getDoc, collection, getDocs, query, where } from 'firebase/firestore'
import { db } from '@/lib/firebase'

export interface RouteStop {
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
}

export interface RouteDetails {
  id: string
  routeNumber: string
  routeName: string
  description: string
  from: string
  to: string
  stops: string[]
  distance: number
  estimatedTime: string
  fare: number
  status: 'active' | 'inactive'
  createdAt?: any
  updatedAt?: any
}

export interface RouteWithStops extends RouteDetails {
  fromStop: RouteStop
  toStop: RouteStop
  routeStops: RouteStop[]
}

export class RouteService {
  /**
   * Get route details by ID
   */
  async getRouteById(routeId: string): Promise<RouteDetails | null> {
    try {
      const routeRef = doc(db, 'routes', routeId)
      const routeSnap = await getDoc(routeRef)
      
      if (routeSnap.exists()) {
        return {
          id: routeSnap.id,
          ...routeSnap.data()
        } as RouteDetails
      }
      
      return null
    } catch (error) {
      console.error('Error fetching route:', error)
      return null
    }
  }

  /**
   * Get stop details by ID
   */
  async getStopById(stopId: string): Promise<RouteStop | null> {
    try {
      const stopRef = doc(db, 'stops', stopId)
      const stopSnap = await getDoc(stopRef)
      
      if (stopSnap.exists()) {
        return {
          id: stopSnap.id,
          ...stopSnap.data()
        } as RouteStop
      }
      
      return null
    } catch (error) {
      console.error('Error fetching stop:', error)
      return null
    }
  }

  /**
   * Get multiple stops by IDs
   */
  async getStopsByIds(stopIds: string[]): Promise<RouteStop[]> {
    try {
      const stops: RouteStop[] = []
      
      // Fetch stops in parallel
      const stopPromises = stopIds.map(id => this.getStopById(id))
      const stopResults = await Promise.all(stopPromises)
      
      // Filter out null results
      stopResults.forEach(stop => {
        if (stop) {
          stops.push(stop)
        }
      })
      
      return stops
    } catch (error) {
      console.error('Error fetching stops:', error)
      return []
    }
  }

  /**
   * Get route by bus number (legacy method - now returns going route)
   */
  async getRouteByBusNumber(busNumber: string): Promise<RouteDetails | null> {
    try {
      // First get the bus to find its route
      const busesRef = collection(db, 'buses')
      const busQuery = query(busesRef, where('busNumber', '==', busNumber))
      const busSnapshot = await getDocs(busQuery)
      
      if (busSnapshot.empty) {
        console.log('❌ Bus not found')
        return null
      }
      
      const busData = busSnapshot.docs[0].data()
      // Try going route first, then fallback to legacy fields
      const routeId = busData.goingRoute || busData.assignedRoute || busData.routeId
      
      if (!routeId) {
        console.log('❌ No route assigned to bus')
        return null
      }
      
      return await this.getRouteById(routeId)
    } catch (error) {
      console.error('Error fetching route by bus number:', error)
      return null
    }
  }

  /**
   * Get both routes for a bus (going and coming)
   */
  async getBusRoutes(busNumber: string): Promise<{
    goingRoute: RouteDetails | null;
    comingRoute: RouteDetails | null;
  }> {
    try {
      // First get the bus to find its routes
      const busesRef = collection(db, 'buses')
      const busQuery = query(busesRef, where('busNumber', '==', busNumber))
      const busSnapshot = await getDocs(busQuery)
      
      if (busSnapshot.empty) {
        console.log('❌ Bus not found')
        return { goingRoute: null, comingRoute: null }
      }
      
      const busData = busSnapshot.docs[0].data()
      
      // Get both routes
      let goingRoute = null
      let comingRoute = null
      
      if (busData.goingRoute) {
        goingRoute = await this.getRouteById(busData.goingRoute)
        console.log('🟢 Going route found:', goingRoute?.routeName)
      }
      
      if (busData.comingRoute) {
        comingRoute = await this.getRouteById(busData.comingRoute)
        console.log('🔵 Coming route found:', comingRoute?.routeName)
      }
      
      return { goingRoute, comingRoute }
    } catch (error) {
      console.error('Error fetching bus routes:', error)
      return { goingRoute: null, comingRoute: null }
    }
  }

  /**
   * Get complete route details with all stops
   */
  async getRouteWithStops(busNumber: string): Promise<RouteWithStops | null> {
    try {
      console.log('🔍 Fetching route details for bus:', busNumber)
      
      // Get route details by bus number
      const route = await this.getRouteByBusNumber(busNumber)
      if (!route) {
        console.log('❌ Route not found')
        return null
      }
      
      console.log('📊 Route found:', route.routeName)
      
      // Get from and to stops
      const fromStop = await this.getStopById(route.from)
      const toStop = await this.getStopById(route.to)
      
      if (!fromStop || !toStop) {
        console.log('❌ From or To stop not found')
        return null
      }
      
      console.log('📍 From stop:', fromStop.stopName)
      console.log('📍 To stop:', toStop.stopName)
      
      // Get all route stops
      const routeStops = await this.getStopsByIds(route.stops)
      console.log('🚏 Route stops found:', routeStops.length)
      
      return {
        ...route,
        fromStop,
        toStop,
        routeStops
      }
    } catch (error) {
      console.error('Error fetching route with stops:', error)
      return null
    }
  }

  /**
   * Get all active routes
   */
  async getAllActiveRoutes(): Promise<RouteDetails[]> {
    try {
      const routesRef = collection(db, 'routes')
      const q = query(routesRef, where('status', '==', 'active'))
      const querySnapshot = await getDocs(q)
      
      const routes: RouteDetails[] = []
      querySnapshot.forEach((doc) => {
        routes.push({
          id: doc.id,
          ...doc.data()
        } as RouteDetails)
      })
      
      return routes
    } catch (error) {
      console.error('Error fetching routes:', error)
      return []
    }
  }
}

export const routeService = new RouteService()

