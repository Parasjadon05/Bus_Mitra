import { googleMapsService, PlaceResult, Location } from './googleMapsService'
import { routeService, Route, Bus, Driver } from './routeService'

export interface SearchSuggestion {
  coordinates // Check if both locations are within max distance of the route
    (coordinates: any): unknown
  id: string
  address: string
  placeId?: string
  location?: Location
  type?: string
}

export interface BusSearchResult {
  route: Route
  buses: Bus[]
  fromLocation: {
    name: string
    address: string
    location: Location
    distance: number
  }
  toLocation: {
    name: string
    address: string
    location: Location
    distance: number
  }
  connectionType: 'direct' | 'connecting'
  totalDistance?: number
  estimatedTime?: number
  estimatedFare?: number
}

export interface BusSearchParams {
  fromLocation: string
  toLocation: string
  fromCoordinates?: Location
  toCoordinates?: Location
  maxDistance: number
}

export class SearchService {
  /**
   * Search for address suggestions using Google Places API
   */
  async searchAddresses(query: string, location?: Location, limit: number = 5): Promise<SearchSuggestion[]> {
    try {
      if (!query || query.length < 2) {
        return []
      }

      const places = await googleMapsService.searchPlaces(query, location)
      
      return places.slice(0, limit).map((place, index) => ({
        id: `place_${index}`,
        address: place.formatted_address,
        placeId: place.place_id,
        location: place.geometry.location,
        type: place.types?.[0] || 'establishment'
      }))
    } catch (error) {
      console.error('Error searching addresses:', error)
      return []
    }
  }

  /**
   * Search for buses based on journey requirements
   */
  async searchBuses(params: BusSearchParams): Promise<BusSearchResult[]> {
    try {
      console.log('🔍 Starting bus search with params:', params)
      
      // Get all active routes
      const routes = await routeService.getAllActiveRoutes()
      console.log('📊 Found routes:', routes.length)
      
      if (routes.length === 0) {
        console.log('❌ No routes available')
        return []
      }

      // Get coordinates for from and to locations
      let fromLocation: Location
      let toLocation: Location

      if (params.fromCoordinates) {
        fromLocation = params.fromCoordinates
      } else {
        const fromCoords = await googleMapsService.geocodeAddress(params.fromLocation)
        if (!fromCoords) {
          console.log('❌ Could not geocode from location')
          return []
        }
        fromLocation = fromCoords
      }

      if (params.toCoordinates) {
        toLocation = params.toCoordinates
      } else {
        const toCoords = await googleMapsService.geocodeAddress(params.toLocation)
        if (!toCoords) {
          console.log('❌ Could not geocode to location')
          return []
        }
        toLocation = toCoords
      }

      console.log('📍 From location:', fromLocation)
      console.log('📍 To location:', toLocation)

      // Find routes that are close to both locations
      const matchingRoutes = await this.findMatchingRoutes(routes, fromLocation, toLocation, params.maxDistance)
      console.log('🎯 Matching routes found:', matchingRoutes.length)

      // Get buses for each matching route
      const searchResults: BusSearchResult[] = []
      
      for (const routeMatch of matchingRoutes) {
        const buses = await routeService.getBusesByRoute(routeMatch.route.id)
        
        if (buses.length > 0) {
          // Get addresses for the locations
          const fromAddress = await googleMapsService.reverseGeocode(fromLocation) || params.fromLocation
          const toAddress = await googleMapsService.reverseGeocode(toLocation) || params.toLocation

          searchResults.push({
            route: routeMatch.route,
            buses: buses,
            fromLocation: {
              name: routeMatch.fromStop?.name || 'From Location',
              address: fromAddress,
              location: fromLocation,
              distance: routeMatch.fromDistance
            },
            toLocation: {
              name: routeMatch.toStop?.name || 'To Location',
              address: toAddress,
              location: toLocation,
              distance: routeMatch.toDistance
            },
            connectionType: 'direct',
            totalDistance: routeMatch.route.distance,
            estimatedTime: routeMatch.route.estimatedTime,
            estimatedFare: this.calculateFare(routeMatch.route.distance || 0)
          })
        }
      }

      console.log('✅ Found search results:', searchResults.length)
      return searchResults

    } catch (error) {
      console.error('Error searching buses:', error)
      return []
    }
  }

  /**
   * Find routes that match the journey requirements
   */
  private async findMatchingRoutes(
    routes: Route[], 
    fromLocation: Location, 
    toLocation: Location, 
    maxDistance: number
  ): Promise<Array<{
    route: Route
    fromStop?: { name: string; location: Location }
    toStop?: { name: string; location: Location }
    fromDistance: number
    toDistance: number
  }>> {
    const matchingRoutes: Array<{
      route: Route
      fromStop?: { name: string; location: Location }
      toStop?: { name: string; location: Location }
      fromDistance: number
      toDistance: number
    }> = []

    for (const route of routes) {
      if (!route.stops || route.stops.length === 0) {
        continue
      }

      // Find the closest stop to from location
      let closestFromStop: { name: string; location: Location } | undefined
      let minFromDistance = Infinity

      // Find the closest stop to to location
      let closestToStop: { name: string; location: Location } | undefined
      let minToDistance = Infinity

      for (const stop of route.stops) {
        const stopLocation: Location = {
          lat: stop.latitude,
          lng: stop.longitude
        }

        const fromDistance = googleMapsService.calculateDistance(fromLocation, stopLocation)
        const toDistance = googleMapsService.calculateDistance(toLocation, stopLocation)

        if (fromDistance < minFromDistance) {
          minFromDistance = fromDistance
          closestFromStop = {
            name: stop.name,
            location: stopLocation
          }
        }

        if (toDistance < minToDistance) {
          minToDistance = toDistance
          closestToStop = {
            name: stop.name,
            location: stopLocation
          }
        }
      }

      // Check if both locations are within max distance of the route
      if (minFromDistance <= maxDistance && minToDistance <= maxDistance) {
        matchingRoutes.push({
          route,
          fromStop: closestFromStop,
          toStop: closestToStop,
          fromDistance: minFromDistance,
          toDistance: minToDistance
        })
      }
    }

    // Sort by total distance (from + to)
    return matchingRoutes.sort((a, b) => 
      (a.fromDistance + a.toDistance) - (b.fromDistance + b.toDistance)
    )
  }

  /**
   * Calculate estimated fare based on distance
   */
  private calculateFare(distanceKm: number): number {
    // Simple fare calculation: ₹2 per km with minimum ₹5
    const baseFare = 5
    const perKmRate = 2
    return Math.max(baseFare, Math.round(distanceKm * perKmRate))
  }

  /**
   * Get address from coordinates
   */
  async getAddressFromCoordinates(location: Location): Promise<string> {
    try {
      const address = await googleMapsService.reverseGeocode(location)
      return address || `${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}`
    } catch (error) {
      console.error('Error getting address from coordinates:', error)
      return `${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}`
    }
  }
}

export const searchService = new SearchService()