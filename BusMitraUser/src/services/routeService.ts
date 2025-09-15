
import { collection, query, where, getDocs, getDoc, doc } from 'firebase/firestore'
import { db } from '@/lib/firebase'

export interface Route {
  id: string
  name: string
  startPoint: string
  endPoint: string
  distance: number
  estimatedTime: number
  fare?: number
  active: boolean
  createdAt: string
  updatedAt: string
  stops: Array<{
    id: string
    name: string
    latitude: number
    longitude: number
    sequence: number
    address?: string
  }>
}

export interface RouteBus {
  id: string
  busNumber: string
  busName?: string
  type?: string
  capacity?: number
  assignedRoute: string
  status?: string
  driverId?: string
}

export interface Driver {
  id: string
  name: string
  phone: string
}

export const routeService = {
  /**
   * Fetches all routes from the Firebase 'routes' collection.
   * @returns An array of Route objects.
   * @throws Error if the query fails.
   */
  getAllRoutes: async (): Promise<Route[]> => {
    try {
      const routesSnapshot = await getDocs(collection(db, 'routes'))
      const routes: Route[] = routesSnapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name || '',
        startPoint: doc.data().startPoint || '',
        endPoint: doc.data().endPoint || '',
        distance: Number(doc.data().distance) || 0,
        estimatedTime: Number(doc.data().estimatedTime) || 0,
        fare: doc.data().fare ? Number(doc.data().fare) : undefined,
        active: doc.data().active ?? true,
        createdAt: doc.data().createdAt || '',
        updatedAt: doc.data().updatedAt || '',
        stops: (doc.data().stops || []).map((stop: any) => ({
          id: stop.id || '',
          name: stop.name || '',
          latitude: Number(stop.latitude) || 0,
          longitude: Number(stop.longitude) || 0,
          sequence: Number(stop.sequence) || 0,
          address: stop.address || undefined
        }))
      }))
      return routes
    } catch (error) {
      throw new Error('Failed to fetch routes from Firebase')
    }
  },

  /**
   * Fetches buses from the 'buses' collection that are assigned to a specific route.
   * @param routeId The ID of the route to filter buses by.
   * @returns An array of RouteBus objects.
   * @throws Error if the query fails.
   */
  getBusesByAssignedRoute: async (routeId: string): Promise<RouteBus[]> => {
    try {
      const q = query(collection(db, 'buses'), where('assignedRoute', '==', routeId))
      const busesSnapshot = await getDocs(q)
      const buses: RouteBus[] = busesSnapshot.docs.map(doc => ({
        id: doc.id,
        busNumber: doc.data().busNumber || '',
        busName: doc.data().busName || undefined,
        type: doc.data().type || 'Regular',
        capacity: Number(doc.data().capacity) || 40,
        assignedRoute: doc.data().assignedRoute || '',
        status: doc.data().status || 'active',
        driverId: doc.data().driverId || undefined
      }))
      return buses
    } catch (error) {
      throw new Error(`Failed to fetch buses for route ${routeId}`)
    }
  },

  /**
   * Fetches driver details from the 'drivers' collection by driver ID.
   * @param driverId The ID of the driver to fetch.
   * @returns A Driver object or undefined if not found.
   * @throws Error if the query fails.
   */
  getDriverById: async (driverId: string): Promise<Driver | undefined> => {
    try {
      const driverDoc = await getDoc(doc(db, 'drivers', driverId))
      if (driverDoc.exists()) {
        return {
          id: driverDoc.id,
          name: driverDoc.data().name || '',
          phone: driverDoc.data().phone || ''
        }
      }
      return undefined
    } catch (error) {
      throw new Error(`Failed to fetch driver ${driverId}`)
    }
  }
}
