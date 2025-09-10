import { collection, query, where, getDocs, orderBy } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { firebaseStopsService, FirebaseStop } from './firebaseStopsService'
import { realtimeLocationService } from './realtimeLocationService'

export interface BusRoute {
  id: string
  routeName: string
  routeNumber: string
  from: string
  to: string
  stops: string[]
  fare: number
  status: 'active' | 'inactive'
  busId?: string
  driverId?: string
  estimatedTime?: string
  distance?: number
  driverOnDuty?: boolean
  direction?: 'going' | 'coming'
}

export interface BusSearchResult {
  route: BusRoute
  fromBusStand: {
    name: string
    distance: number
    coordinates: { lat: number; lng: number }
  }
  toBusStand: {
    name: string
    distance: number
    coordinates: { lat: number; lng: number }
  }
  connectionType: 'direct' | 'connecting'
  totalDistance?: number
  estimatedFare?: number
  estimatedTime?: string
}

export interface BusSearchParams {
  fromLocation: string
  toLocation: string
  fromCoordinates?: { lat: number; lng: number }
  toCoordinates?: { lat: number; lng: number }
  maxDistance: number
}

export class BusSearchService {
  async searchBuses(params: BusSearchParams): Promise<BusSearchResult[]> {
    try {
      console.log('🔍 Starting bus search with params:', params)
      
      const routes = await this.getAllActiveRoutes()
      console.log('📊 Found routes:', routes.length)
      
      const allStops = await firebaseStopsService.getAllActiveStops()
      console.log('📍 Found stops:', allStops.length)
      
      const fromCoordinates = await this.getCoordinatesFromAddress(params.fromLocation)
      const toCoordinates = await this.getCoordinatesFromAddress(params.toLocation)
      
      if (!fromCoordinates || !toCoordinates) {
        console.log('❌ Could not get coordinates for locations, trying fallback approach')
        
        const fromStops = allStops.filter(stop => 
          stop.stopName.toLowerCase().includes(params.fromLocation.toLowerCase().split(',')[0]) ||
          stop.address.toLowerCase().includes(params.fromLocation.toLowerCase().split(',')[0]) ||
          stop.city.toLowerCase().includes(params.fromLocation.toLowerCase().split(',')[0])
        )
        
        const toStops = allStops.filter(stop => 
          stop.stopName.toLowerCase().includes(params.toLocation.toLowerCase().split(',')[0]) ||
          stop.address.toLowerCase().includes(params.toLocation.toLowerCase().split(',')[0]) ||
          stop.city.toLowerCase().includes(params.toLocation.toLowerCase().split(',')[0])
        )
        
        console.log('🔄 Fallback - Found stops by name matching:')
        console.log('📍 From stops:', fromStops.length)
        console.log('📍 To stops:', toStops.length)
        
        if (fromStops.length === 0 || toStops.length === 0) {
          console.log('❌ No matching stops found in fallback')
          return []
        }
        
        const fromCoords = fromStops[0].coordinates
        const toCoords = toStops[0].coordinates
        
        if (!fromCoords || !toCoords) {
          console.log('❌ Matching stops don\'t have coordinates')
          return []
        }
        
        const fallbackFromCoords = { lat: fromCoords.latitude, lng: fromCoords.longitude }
        const fallbackToCoords = { lat: toCoords.latitude, lng: toCoords.longitude }
        
        console.log('✅ Using fallback coordinates:', fallbackFromCoords, fallbackToCoords)
        
        const bufferRadius = 5000
        console.log('🎯 Using fixed buffer radius:', bufferRadius, 'meters')
        
        const fromStopsInRadius = allStops
          .filter(stop => stop.coordinates)
          .map(stop => ({
            ...stop,
            distance: this.calculateDistance(
              fallbackFromCoords.lat,
              fallbackFromCoords.lng,
              stop.coordinates!.latitude,
              stop.coordinates!.longitude
            )
          }))
          .filter(stop => stop.distance <= bufferRadius)
          .sort((a, b) => a.distance - b.distance)
        
        const toStopsInRadius = allStops
          .filter(stop => stop.coordinates)
          .map(stop => ({
            ...stop,
            distance: this.calculateDistance(
              fallbackToCoords.lat,
              fallbackToCoords.lng,
              stop.coordinates!.latitude,
              stop.coordinates!.longitude
            )
          }))
          .filter(stop => stop.distance <= bufferRadius)
          .sort((a, b) => a.distance - b.distance)
        
        console.log('🚏 Fallback - From stops in radius:', fromStopsInRadius.length)
        console.log('🚏 Fallback - To stops in radius:', toStopsInRadius.length)
        
        return this.findBusesInRadius(routes, fromStopsInRadius, toStopsInRadius)
      }
      
      const routeDistance = this.calculateDistance(
        fromCoordinates.lat,
        fromCoordinates.lng,
        toCoordinates.lat,
        toCoordinates.lng
      )
      console.log('📏 Route distance:', routeDistance, 'meters')
      
      const bufferRadius = routeDistance * 0.1666
      console.log('🎯 Buffer radius:', bufferRadius, 'meters')
      
      const fromStopsInRadius = allStops
        .filter(stop => stop.coordinates)
        .map(stop => ({
          ...stop,
          distance: this.calculateDistance(
            fromCoordinates.lat,
            fromCoordinates.lng,
            stop.coordinates!.latitude,
            stop.coordinates!.longitude
          )
        }))
        .filter(stop => stop.distance <= bufferRadius)
        .sort((a, b) => a.distance - b.distance)
      
      const toStopsInRadius = allStops
        .filter(stop => stop.coordinates)
        .map(stop => ({
          ...stop,
          distance: this.calculateDistance(
            toCoordinates.lat,
            toCoordinates.lng,
            stop.coordinates!.latitude,
            stop.coordinates!.longitude
          )
        }))
        .filter(stop => stop.distance <= bufferRadius)
        .sort((a, b) => a.distance - b.distance)
      
      console.log('🚏 From stops in radius:', fromStopsInRadius.length)
      console.log('�� To stops in radius:', toStopsInRadius.length)
      
      return this.findBusesInRadius(routes, fromStopsInRadius, toStopsInRadius)

    } catch (error) {
      console.error('Error searching buses:', error)
      return []
    }
  }

  private async getCoordinatesFromAddress(address: string): Promise<{ lat: number; lng: number } | null> {
    try {
      console.log('🌍 Geocoding address:', address)
      
      const addressVariations = [
        address,
        address.split(',')[0],
        address.replace(/,/g, ' '),
        address.split(',').slice(0, 2).join(', '),
      ]
      
      for (const variation of addressVariations) {
        console.log('🔄 Trying address variation:', variation)
        
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(variation)}&limit=1&countrycodes=in&addressdetails=1`
        console.log('🔗 Geocoding URL:', url)
        
        const response = await fetch(url)
        console.log('📡 Geocoding response status:', response.status, response.statusText)
        
        if (response.ok) {
          const data = await response.json()
          console.log('📊 Geocoding response data:', data)
          
          if (data.length > 0) {
            const result = {
              lat: parseFloat(data[0].lat),
              lng: parseFloat(data[0].lon)
            }
            console.log('✅ Found coordinates:', result)
            return result
          } else {
            console.log('❌ No results found for variation:', variation)
          }
        } else {
          console.log('❌ Geocoding request failed:', response.status, response.statusText)
        }
        
        await new Promise(resolve => setTimeout(resolve, 100))
      }
      
      console.log('❌ All address variations failed for:', address)
      return null
    } catch (error) {
      console.error('❌ Error getting coordinates from address:', error)
      return null
    }
  }

  private async getAllActiveRoutes(): Promise<BusRoute[]> {
    try {
      const [routesSnapshot, busesSnapshot] = await Promise.all([
        getDocs(query(collection(db, 'routes'), where('status', '==', 'active'))),
        getDocs(query(collection(db, 'buses'), where('status', '==', 'active')))
      ])
      
      const routeToBusesMap = new Map<string, any[]>()
      busesSnapshot.forEach((doc) => {
        const bus = { id: doc.id, ...doc.data() }
        
        if (bus.goingRoute) {
          if (!routeToBusesMap.has(bus.goingRoute)) {
            routeToBusesMap.set(bus.goingRoute, [])
          }
          routeToBusesMap.get(bus.goingRoute)!.push({ ...bus, direction: 'going' })
        }
        
        if (bus.comingRoute && bus.comingRoute !== bus.goingRoute) {
          if (!routeToBusesMap.has(bus.comingRoute)) {
            routeToBusesMap.set(bus.comingRoute, [])
          }
          routeToBusesMap.get(bus.comingRoute)!.push({ ...bus, direction: 'coming' })
        }
        
        if ((bus.routeId || bus.assignedRoute) && !bus.goingRoute && !bus.comingRoute) {
          const routeId = bus.routeId || bus.assignedRoute
          if (!routeToBusesMap.has(routeId)) {
            routeToBusesMap.set(routeId, [])
          }
          routeToBusesMap.get(routeId)!.push({ ...bus, direction: 'going' })
        }
      })
      
      const routes: BusRoute[] = []
      const busNumbers: string[] = []
      
      routesSnapshot.forEach((doc) => {
        const routeData = { id: doc.id, ...doc.data() } as BusRoute
        
        const assignedBuses = routeToBusesMap.get(doc.id) || []
        
        assignedBuses.forEach(assignedBus => {
          const routeWithBus = {
            ...routeData,
            busId: assignedBus.busNumber,
            driverId: assignedBus.driverId,
            direction: assignedBus.direction
          }
          routes.push(routeWithBus)
          busNumbers.push(assignedBus.busNumber)
        })
      })
      
      if (busNumbers.length > 0) {
        const dutyStatusMap = await realtimeLocationService.getBusesDutyStatus(busNumbers)
        
        routes.forEach(route => {
          if (route.busId) {
            route.driverOnDuty = dutyStatusMap.get(route.busId) || false
          }
        })
      }
      
      const sortedRoutes = routes.sort((a, b) => a.routeName.localeCompare(b.routeName))
      console.log('🚌 All routes with buses:', sortedRoutes.map(route => ({
        routeId: route.id,
        routeName: route.routeName,
        busId: route.busId,
        direction: route.direction,
        from: route.from,
        to: route.to
      })))
      return sortedRoutes
    } catch (error) {
      console.error('Error fetching routes:', error)
      return []
    }
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3
    const φ1 = lat1 * Math.PI / 180
    const φ2 = lat2 * Math.PI / 180
    const Δφ = (lat2 - lat1) * Math.PI / 180
    const Δλ = (lon2 - lon1) * Math.PI / 180

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))

    return R * c
  }

  private findBusesInRadius(
    routes: BusRoute[], 
    fromStopsInRadius: (FirebaseStop & { distance: number })[], 
    toStopsInRadius: (FirebaseStop & { distance: number })[]
  ): BusSearchResult[] {
    const searchResults: BusSearchResult[] = []
    const processedRoutes = new Set<string>()
    
    console.log('🔍 Searching for routes from', fromStopsInRadius.length, 'from stops to', toStopsInRadius.length, 'to stops')
    
    for (const fromStop of fromStopsInRadius) {
      const routesFromStop = routes.filter(route => route.from === fromStop.id)
      console.log(`📍 Found ${routesFromStop.length} routes starting from ${fromStop.stopName}`)
      
      for (const route of routesFromStop) {
        const routeKey = `${route.id}-${route.busId}-${route.direction}`
        if (!processedRoutes.has(routeKey)) {
          processedRoutes.add(routeKey)
          
          const nearestToStop = this.findNearestStopInRoute(route, toStopsInRadius)
          
          if (nearestToStop) {
            console.log(`✅ Valid route found: ${route.busId} (${route.routeName}) ${route.direction} from ${fromStop.stopName} to ${nearestToStop.stopName}`)
            searchResults.push({
              route,
              fromBusStand: {
                name: fromStop.stopName,
                distance: fromStop.distance,
                coordinates: {
                  lat: fromStop.coordinates!.latitude,
                  lng: fromStop.coordinates!.longitude
                }
              },
              toBusStand: {
                name: nearestToStop.stopName,
                distance: nearestToStop.distance,
                coordinates: {
                  lat: nearestToStop.coordinates!.latitude,
                  lng: nearestToStop.coordinates!.longitude
                }
              },
              connectionType: 'direct',
              totalDistance: route.distance,
              estimatedFare: route.fare,
              estimatedTime: route.estimatedTime
            })
          } else {
            console.log(`❌ Route ${route.busId} (${route.routeName}) doesn't go to any "to" stops`)
          }
        }
      }
    }
    
    console.log('✅ Found search results:', searchResults.length)
    console.log('🔍 Search results details:', searchResults.map(result => ({
      busId: result.route.busId,
      routeName: result.route.routeName,
      direction: result.route.direction,
      from: result.fromBusStand.name,
      to: result.toBusStand.name
    })))
    return searchResults
  }

  private findNearestStopInRoute(route: BusRoute, stopsInRadius: (FirebaseStop & { distance: number })[]): (FirebaseStop & { distance: number }) | null {
    const routeStopsInRadius = stopsInRadius.filter(stop => 
      route.stops.includes(stop.id) || route.from === stop.id || route.to === stop.id
    )
    
    return routeStopsInRadius.length > 0 ? routeStopsInRadius[0] : null
  }
}

export const busSearchService = new BusSearchService()
