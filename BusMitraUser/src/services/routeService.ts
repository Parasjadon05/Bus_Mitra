import { doc, getDoc, collection, getDocs, query, where } from 'firebase/firestore'
import { db } from '@/lib/firebase'

export interface RouteStop {
  id: string
  name: string
  latitude: number
  longitude: number
  sequence: number
}

export interface Route {
  id: string
  name: string
  startPoint: string
  endPoint: string
  active: boolean
  distance?: number
  estimatedTime?: number
  stops?: RouteStop[]
  createdAt?: string
  updatedAt?: string
}

export interface Bus {
  id: string
  busNumber: string
  licensePlate?: string
  model?: string
  manufacturer?: string
  year?: number
  capacity?: number
  status: 'active' | 'maintenance' | 'inactive'
  assignedRoute?: string
  driverId?: string
  createdAt?: any
  updatedAt?: any
}

export interface Driver {
  id: string
  driverId: string
  name: string
  phone: string
  licenseNumber: string
  status: 'active' | 'inactive'
  assignedBus?: string
  createdAt?: any
  updatedAt?: any
}

export class RouteService {
  /**
   * Get all active routes
   */
  async getAllActiveRoutes(): Promise<Route[]> {
    try {
      const routesRef = collection(db, 'routes')
      const q = query(routesRef, where('active', '==', true))
      const querySnapshot = await getDocs(q)
      
      const routes: Route[] = []
      querySnapshot.forEach((doc) => {
        routes.push({
          id: doc.id,
          ...doc.data()
        } as Route)
      })
      
      return routes
    } catch (error) {
      console.error('Error fetching routes:', error)
      return []
    }
  }

  /**
   * Get route by ID
   */
  async getRouteById(routeId: string): Promise<Route | null> {
    try {
      const routeRef = doc(db, 'routes', routeId)
      const routeSnap = await getDoc(routeRef)
      
      if (routeSnap.exists()) {
        return {
          id: routeSnap.id,
          ...routeSnap.data()
        } as Route
      }
      
      return null
    } catch (error) {
      console.error('Error fetching route:', error)
      return null
    }
  }

  /**
   * Get all buses assigned to a specific route
   */
  async getBusesByRoute(routeId: string): Promise<Bus[]> {
    try {
      const busesRef = collection(db, 'buses')
      const q = query(busesRef, where('assignedRoute', '==', routeId), where('status', '==', 'active'))
      const querySnapshot = await getDocs(q)
      
      const buses: Bus[] = []
      querySnapshot.forEach((doc) => {
        buses.push({
          id: doc.id,
          ...doc.data()
        } as Bus)
      })
      
      return buses
    } catch (error) {
      console.error('Error fetching buses for route:', error)
      return []
    }
  }

  /**
   * Get driver details by ID
   */
  async getDriverById(driverId: string): Promise<Driver | null> {
    try {
      const driverRef = doc(db, 'drivers', driverId)
      const driverSnap = await getDoc(driverRef)
      
      if (driverSnap.exists()) {
        return {
          id: driverSnap.id,
          ...driverSnap.data()
        } as Driver
      }
      
      return null
    } catch (error) {
      console.error('Error fetching driver:', error)
      return null
    }
  }

  /**
   * Get all stops from all active routes
   */
  async getAllStopsFromRoutes(): Promise<RouteStop[]> {
    try {
      const routes = await this.getAllActiveRoutes()
      const allStops: RouteStop[] = []
      const stopMap = new Map<string, RouteStop>()
      
      routes.forEach(route => {
        if (route.stops && Array.isArray(route.stops)) {
          route.stops.forEach(stop => {
            if (typeof stop === 'object' && stop.id) {
              stopMap.set(stop.id, stop)
            }
          })
        }
      })
      
      return Array.from(stopMap.values())
    } catch (error) {
      console.error('Error fetching stops from routes:', error)
      return []
    }
  }
}

export const routeService = new RouteService()