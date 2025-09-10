import { doc, getDoc, collection, getDocs, query, where } from 'firebase/firestore'
import { db } from '@/lib/firebase'

export interface Bus {
  id: string
  busNumber: string
  licensePlate: string
  model: string
  manufacturer: string
  year: number
  capacity: number
  status: 'active' | 'maintenance' | 'inactive'
  goingRoute?: string
  comingRoute?: string
  driverId?: string
  createdAt?: any
  updatedAt?: any
}

export interface Driver {
  id: string
  name: string
  phone: string
  licenseNumber: string
  status: 'active' | 'inactive'
  assignedBus?: string
  createdAt?: any
  updatedAt?: any
}

export interface BusWithDriver extends Bus {
  driver?: Driver
}

export class BusService {
  /**
   * Get bus details by ID
   */
  async getBusById(busId: string): Promise<Bus | null> {
    try {
      const busRef = doc(db, 'buses', busId)
      const busSnap = await getDoc(busRef)
      
      if (busSnap.exists()) {
        return {
          id: busSnap.id,
          ...busSnap.data()
        } as Bus
      }
      
      return null
    } catch (error) {
      console.error('Error fetching bus:', error)
      return null
    }
  }

  /**
   * Get bus details by bus number
   */
  async getBusByNumber(busNumber: string): Promise<Bus | null> {
    try {
      const busesRef = collection(db, 'buses')
      const q = query(busesRef, where('busNumber', '==', busNumber))
      const querySnapshot = await getDocs(q)
      
      if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0]
        return {
          id: doc.id,
          ...doc.data()
        } as Bus
      }
      
      return null
    } catch (error) {
      console.error('Error fetching bus by number:', error)
      return null
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
   * Get bus with driver details
   */
  async getBusWithDriver(busNumber: string): Promise<BusWithDriver | null> {
    try {
      console.log('🔍 Fetching bus details for:', busNumber)
      
      // Get bus details
      const bus = await this.getBusByNumber(busNumber)
      if (!bus) {
        console.log('❌ Bus not found')
        return null
      }
      
      console.log('🚌 Bus found:', bus.licensePlate)
      
      // Get driver details if assigned
      let driver: Driver | null = null
      if (bus.driverId) {
        driver = await this.getDriverById(bus.driverId)
        if (driver) {
          console.log('👨‍💼 Driver found:', driver.name)
        }
      }
      
      return {
        ...bus,
        driver
      }
    } catch (error) {
      console.error('Error fetching bus with driver:', error)
      return null
    }
  }

  /**
   * Get all active buses
   */
  async getAllActiveBuses(): Promise<Bus[]> {
    try {
      const busesRef = collection(db, 'buses')
      const q = query(busesRef, where('status', '==', 'active'))
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
      console.error('Error fetching buses:', error)
      return []
    }
  }

  /**
   * Get bus with both going and coming routes
   */
  async getBusWithRoutes(busNumber: string): Promise<{
    bus: Bus | null;
    goingRoute: any | null;
    comingRoute: any | null;
  }> {
    try {
      console.log('🔍 Fetching bus with routes for:', busNumber)
      
      // Get bus details
      const bus = await this.getBusByNumber(busNumber)
      if (!bus) {
        console.log('❌ Bus not found')
        return { bus: null, goingRoute: null, comingRoute: null }
      }
      
      console.log('🚌 Bus found:', bus.busNumber)
      
      // Import route service
      const { routeService } = await import('./routeService')
      
      // Get both routes
      let goingRoute = null
      let comingRoute = null
      
      if (bus.goingRoute) {
        goingRoute = await routeService.getRouteById(bus.goingRoute)
        console.log('🟢 Going route:', goingRoute?.routeName)
      }
      
      if (bus.comingRoute) {
        comingRoute = await routeService.getRouteById(bus.comingRoute)
        console.log('🔵 Coming route:', comingRoute?.routeName)
      }
      
      return { bus, goingRoute, comingRoute }
    } catch (error) {
      console.error('Error fetching bus with routes:', error)
      return { bus: null, goingRoute: null, comingRoute: null }
    }
  }
}

export const busService = new BusService()
