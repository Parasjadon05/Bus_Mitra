import { mapConfig } from '@/config/tomtom.config'

export interface BusStand {
  id: string
  name: string
  address: string
  coordinates: [number, number] // [longitude, latitude]
  distance: number // in meters
  type: 'bus_stop' | 'bus_terminal' | 'bus_station'
}

export interface UserLocation {
  latitude: number
  longitude: number
  accuracy?: number
}

export class MapService {
  private apiKey: string | undefined

  constructor() {
    this.apiKey = mapConfig.apiKey
  }

  /**
   * Get user's current location using browser geolocation API
   */
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
  }

  /**
   * Get address from coordinates using reverse geocoding
   */
  async getAddressFromCoordinates(latitude: number, longitude: number): Promise<string> {
    try {
      // Try multiple reverse geocoding services
      const addressPromises = [
        this.reverseGeocodeWithOpenStreetMap(latitude, longitude),
        this.reverseGeocodeWithTomTom(latitude, longitude)
      ]

      // Foursquare reverse geocoding disabled due to API deprecation

      // Get the first successful result
      const results = await Promise.allSettled(addressPromises)
      
      for (const result of results) {
        if (result.status === 'fulfilled' && result.value) {
          return result.value
        }
      }

      // Fallback to coordinates if no address found
      return `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`
      
    } catch (error) {
      console.error('Reverse geocoding error:', error)
      return `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`
    }
  }

  /**
   * Reverse geocoding using OpenStreetMap Nominatim (FREE)
   */
  private async reverseGeocodeWithOpenStreetMap(latitude: number, longitude: number): Promise<string | null> {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?` +
        `format=json&` +
        `lat=${latitude}&` +
        `lon=${longitude}&` +
        `addressdetails=1&` +
        `accept-language=en`
      )

      if (!response.ok) {
        throw new Error(`Nominatim API error: ${response.statusText}`)
      }

      const data = await response.json()
      
      if (data && data.display_name) {
        // Format the address nicely
        const address = data.display_name
        // Remove country and postal code for cleaner display
        return address
          .split(',')
          .slice(0, -2) // Remove last 2 parts (usually country and postal code)
          .join(',')
          .trim()
      }

      return null
    } catch (error) {
      return null
    }
  }

  /**
   * Reverse geocoding using TomTom API
   */
  private async reverseGeocodeWithTomTom(latitude: number, longitude: number): Promise<string | null> {
    if (!this.apiKey || this.apiKey === 'YOUR_TOMTOM_API_KEY_HERE' || this.apiKey.length <= 10) {
      return null
    }

    try {
      const response = await fetch(
        `https://api.tomtom.com/search/2/reverseGeocode/${latitude},${longitude}.json?` +
        `key=${this.apiKey}&` +
        `radius=100&` +
        `returnSpeedLimit=false&` +
        `returnRoadUse=false&` +
        `roadUse=false&` +
        `returnMatchType=false&` +
        `language=en-GB`
      )

      if (!response.ok) {
        throw new Error(`TomTom API error: ${response.statusText}`)
      }

      const data = await response.json()
      
      if (data.addresses && data.addresses.length > 0) {
        const address = data.addresses[0].address
        // Format the address nicely
        const parts = []
        if (address.streetName) parts.push(address.streetName)
        if (address.municipalitySubdivision) parts.push(address.municipalitySubdivision)
        if (address.municipality) parts.push(address.municipality)
        if (address.countrySubdivision) parts.push(address.countrySubdivision)
        
        return parts.join(', ')
      }

      return null
    } catch (error) {
      return null
    }
  }


  /**
   * Search for nearby bus stands using FREE data sources (NO CREDIT CARD REQUIRED)
   */
  async findNearbyBusStands(userLocation: UserLocation): Promise<BusStand[]> {
    console.log('🔍 Starting findNearbyBusStands for:', userLocation)
    
    const searchPromises: Promise<BusStand[]>[] = []
    
    // 1. Enhanced OpenStreetMap Overpass API (FREE - Most Comprehensive)
    searchPromises.push(this.searchWithEnhancedOverpassAPI(userLocation))
    
    // 2. Free TomTom API (FREE - 2500 requests/day)
    if (this.apiKey && this.apiKey !== 'YOUR_TOMTOM_API_KEY_HERE' && this.apiKey.length > 10) {
      console.log('🔑 TomTom API key available, adding TomTom search')
      searchPromises.push(this.searchWithTomTom(userLocation))
    } else {
      console.log('❌ TomTom API key not available or invalid')
    }
    
    // 3. Free Foursquare API (DISABLED - API Deprecated)
    // Disabled due to 410 "This endpoint is no longer supported" errors
    // Foursquare has deprecated their v3 API endpoints
    
    try {
      console.log(`🚀 Running ${searchPromises.length} search promises in parallel`)
      
      // Run all searches in parallel and get the first successful result
      const results = await Promise.allSettled(searchPromises)
      
      console.log('📊 Search results:', results.map((r, i) => ({
        index: i,
        status: r.status,
        valueLength: r.status === 'fulfilled' ? r.value.length : 'N/A'
      })))
      
      for (let i = 0; i < results.length; i++) {
        const result = results[i]
        if (result.status === 'fulfilled' && result.value.length > 0) {
          console.log(`✅ Using result from search ${i} with ${result.value.length} bus stands`)
          return result.value
        }
      }
      
      console.log('🔄 No API returned data, falling back to enhanced local data')
      // If no API returns data, use enhanced local data
      return this.getEnhancedBusStands(userLocation)
      
    } catch (error) {
      console.log('❌ Error in findNearbyBusStands, falling back to enhanced local data:', error)
      return this.getEnhancedBusStands(userLocation)
    }
  }




  /**
   * Enhanced OpenStreetMap Overpass API search (FREE - Optimized for maximum coverage)
   */
  private async searchWithEnhancedOverpassAPI(userLocation: UserLocation): Promise<BusStand[]> {
    const { latitude, longitude } = userLocation
    const radius = mapConfig.searchRadius / 1000 // Convert to km
    const maxResults = mapConfig.maxResults

    // Multiple Overpass queries for comprehensive coverage
    const queries = [
      // Query 1: Standard bus transport
      `[out:json][timeout:25];
      (
        node["public_transport"="platform"]["bus"="yes"](around:${radius},${latitude},${longitude});
        node["highway"="bus_stop"](around:${radius},${latitude},${longitude});
        node["amenity"="bus_station"](around:${radius},${latitude},${longitude});
        way["public_transport"="platform"]["bus"="yes"](around:${radius},${latitude},${longitude});
        way["highway"="bus_stop"](around:${radius},${latitude},${longitude});
        way["amenity"="bus_station"](around:${radius},${latitude},${longitude});
      );
      out center;`,
      
      // Query 2: Railway and transit stations
      `[out:json][timeout:25];
      (
        node["railway"="station"](around:${radius},${latitude},${longitude});
        node["public_transport"="station"](around:${radius},${latitude},${longitude});
        way["railway"="station"](around:${radius},${latitude},${longitude});
        way["public_transport"="station"](around:${radius},${latitude},${longitude});
      );
      out center;`,
      
      // Query 3: Broader public transport
      `[out:json][timeout:25];
      (
        node["public_transport"~"^(platform|station|stop)$"](around:${radius},${latitude},${longitude});
        way["public_transport"~"^(platform|station|stop)$"](around:${radius},${latitude},${longitude});
      );
      out center;`,
      
      // Query 4: Transport amenities
      `[out:json][timeout:25];
      (
        node["amenity"~"^(bus_station|ferry_terminal|taxi)$"](around:${radius},${latitude},${longitude});
        way["amenity"~"^(bus_station|ferry_terminal|taxi)$"](around:${radius},${latitude},${longitude});
      );
      out center;`,
      
      // Query 5: Chennai-specific bus stops (try different tags)
      `[out:json][timeout:25];
      (
        node["name"~"bus"](around:${radius},${latitude},${longitude});
        node["name"~"stop"](around:${radius},${latitude},${longitude});
        way["name"~"bus"](around:${radius},${latitude},${longitude});
        way["name"~"stop"](around:${radius},${latitude},${longitude});
      );
      out center;`
    ]

    const allResults: BusStand[] = []

    for (let i = 0; i < queries.length; i++) {
      try {
        const response = await fetch('https://overpass-api.de/api/interpreter', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: `data=${encodeURIComponent(queries[i])}`
        })

        if (!response.ok) {
          continue
        }

        const data = await response.json()
        
        if (data.elements && data.elements.length > 0) {
          const busStands = data.elements
            .map((element: any, index: number) => {
              // Get coordinates (handle both nodes and ways)
              let lat, lon
              if (element.type === 'node') {
                lat = element.lat
                lon = element.lon
              } else if (element.type === 'way' && element.center) {
                lat = element.center.lat
                lon = element.center.lon
              } else {
                return null
              }

              // Get name from tags
              const name = element.tags?.name || 
                          element.tags?.['name:en'] || 
                          element.tags?.['name:ta'] || // Tamil name for Chennai
                          element.tags?.['name:hi'] || // Hindi name
                          element.tags?.ref || 
                          `Bus Stop ${index + 1}`

              // Get address information
              const address = this.buildAddressFromTags(element.tags)

              // Determine type
              const type = this.determineBusStandTypeFromTags(element.tags)

              // Calculate distance
              const distance = this.calculateDistance(latitude, longitude, lat, lon)

              return {
                id: `osm_enhanced_${element.type}_${element.id}`,
                name,
                address,
                coordinates: [lon, lat] as [number, number],
                distance,
                type
              }
            })
            .filter((stand: BusStand | null) => stand !== null)

          allResults.push(...busStands)
        }
        
        // Small delay between queries to be respectful to the API
        if (i < queries.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 100))
        }
        
      } catch (error) {
        continue
      }
    }

    // Remove duplicates and sort by distance
    const uniqueResults = this.removeDuplicateBusStands(allResults)
    
    return uniqueResults
      .sort((a, b) => a.distance - b.distance)
      .slice(0, maxResults)
  }

  /**
   * Search using OpenStreetMap Overpass API for real bus stands
   */
  private async searchWithOverpassAPI(userLocation: UserLocation): Promise<BusStand[]> {
    const { latitude, longitude } = userLocation
    const radius = mapConfig.searchRadius / 1000 // Convert to km for Overpass API
    const maxResults = mapConfig.maxResults

    // Overpass API query to find bus stops, terminals, and stations
    // Using a more comprehensive search with multiple fallback queries
    const overpassQuery = `
      [out:json][timeout:30];
      (
        // Primary bus transport queries
        node["public_transport"="platform"]["bus"="yes"](around:${radius},${latitude},${longitude});
        node["highway"="bus_stop"](around:${radius},${latitude},${longitude});
        node["amenity"="bus_station"](around:${radius},${latitude},${longitude});
        node["railway"="station"]["public_transport"="station"](around:${radius},${latitude},${longitude});
        node["amenity"="ferry_terminal"](around:${radius},${latitude},${longitude});
        
        // Ways (areas) for bus transport
        way["public_transport"="platform"]["bus"="yes"](around:${radius},${latitude},${longitude});
        way["highway"="bus_stop"](around:${radius},${latitude},${longitude});
        way["amenity"="bus_station"](around:${radius},${latitude},${longitude});
        way["railway"="station"]["public_transport"="station"](around:${radius},${latitude},${longitude});
        way["amenity"="ferry_terminal"](around:${radius},${latitude},${longitude});
        
        // Broader public transport queries
        node["public_transport"~"^(platform|station|stop)$"](around:${radius},${latitude},${longitude});
        way["public_transport"~"^(platform|station|stop)$"](around:${radius},${latitude},${longitude});
        
        // Railway stations that might have bus connections
        node["railway"="station"](around:${radius},${latitude},${longitude});
        way["railway"="station"](around:${radius},${latitude},${longitude});
        
        // General transport amenities
        node["amenity"~"^(bus_station|ferry_terminal)$"](around:${radius},${latitude},${longitude});
        way["amenity"~"^(bus_station|ferry_terminal)$"](around:${radius},${latitude},${longitude});
      );
      out center;
    `

    try {
      console.log('🔍 Searching for bus stands with Overpass API...')
      console.log('📍 Location:', { latitude, longitude })
      console.log('📏 Search radius:', radius, 'km')
      
      const response = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `data=${encodeURIComponent(overpassQuery)}`
      })

      if (!response.ok) {
        throw new Error(`Overpass API error: ${response.statusText}`)
      }

      const data = await response.json()
      
      console.log('📊 Overpass API response:', data)
      console.log('🔢 Found elements:', data.elements?.length || 0)
      
      if (!data.elements || data.elements.length === 0) {
        console.log('❌ No bus stands found in this area')
        return []
      }

      const busStands: BusStand[] = data.elements
        .map((element: any, index: number) => {
          // Get coordinates (handle both nodes and ways)
          let lat, lon
          if (element.type === 'node') {
            lat = element.lat
            lon = element.lon
          } else if (element.type === 'way' && element.center) {
            lat = element.center.lat
            lon = element.center.lon
          } else {
            return null
          }

          // Get name from tags
          const name = element.tags?.name || 
                      element.tags?.['name:en'] || 
                      element.tags?.ref || 
                      `Bus Stop ${index + 1}`

          // Get address information
          const address = this.buildAddressFromTags(element.tags)

          // Determine type
          const type = this.determineBusStandTypeFromTags(element.tags)

          // Calculate distance
          const distance = this.calculateDistance(latitude, longitude, lat, lon)

          return {
            id: `osm_${element.type}_${element.id}`,
            name,
            address,
            coordinates: [lon, lat] as [number, number],
            distance,
            type
          }
        })
        .filter((stand: BusStand | null) => stand !== null)
        .sort((a: BusStand, b: BusStand) => a.distance - b.distance)
        .slice(0, maxResults)

      return busStands

    } catch (error) {
      console.error('Overpass API error:', error)
      
      // Try alternative Overpass API server
      try {
        console.log('🔄 Trying alternative Overpass API server...')
        const response = await fetch('https://overpass-api.openstreetmap.ru/api/interpreter', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: `data=${encodeURIComponent(overpassQuery)}`
        })

        if (!response.ok) {
          throw new Error(`Alternative Overpass API error: ${response.statusText}`)
        }

        const data = await response.json()
        
        console.log('📊 Alternative Overpass API response:', data)
        console.log('🔢 Found elements:', data.elements?.length || 0)
        
        if (!data.elements || data.elements.length === 0) {
          console.log('❌ No bus stands found with alternative API')
          return []
        }

        const busStands: BusStand[] = data.elements
          .map((element: any, index: number) => {
            // Get coordinates (handle both nodes and ways)
            let lat, lon
            if (element.type === 'node') {
              lat = element.lat
              lon = element.lon
            } else if (element.type === 'way' && element.center) {
              lat = element.center.lat
              lon = element.center.lon
            } else {
              return null
            }

            // Get name from tags
            const name = element.tags?.name || 
                        element.tags?.['name:en'] || 
                        element.tags?.ref || 
                        `Bus Stop ${index + 1}`

            // Get address information
            const address = this.buildAddressFromTags(element.tags)

            // Determine type
            const type = this.determineBusStandTypeFromTags(element.tags)

            // Calculate distance
            const distance = this.calculateDistance(latitude, longitude, lat, lon)

            return {
              id: `osm_${element.type}_${element.id}`,
              name,
              address,
              coordinates: [lon, lat] as [number, number],
              distance,
              type
            }
          })
          .filter((stand: BusStand | null) => stand !== null)
          .sort((a: BusStand, b: BusStand) => a.distance - b.distance)
          .slice(0, maxResults)

        return busStands

      } catch (altError) {
        console.error('Alternative Overpass API also failed:', altError)
        throw error // Throw original error
      }
    }
  }

  /**
   * Build address from OSM tags
   */
  private buildAddressFromTags(tags: any): string {
    const parts = []
    
    if (tags?.['addr:housenumber']) parts.push(tags['addr:housenumber'])
    if (tags?.['addr:street']) parts.push(tags['addr:street'])
    if (tags?.['addr:suburb']) parts.push(tags['addr:suburb'])
    if (tags?.['addr:city']) parts.push(tags['addr:city'])
    if (tags?.['addr:state']) parts.push(tags['addr:state'])
    
    if (parts.length === 0) {
      // Fallback to other location tags
      if (tags?.place) parts.push(tags.place)
      if (tags?.locality) parts.push(tags.locality)
      if (tags?.city) parts.push(tags.city)
    }
    
    return parts.length > 0 ? parts.join(', ') : 'Address not available'
  }

  /**
   * Determine bus stand type from OSM tags
   */
  private determineBusStandTypeFromTags(tags: any): BusStand['type'] {
    if (tags?.['amenity'] === 'bus_station' || tags?.['public_transport'] === 'station') {
      return 'bus_station'
    }
    if (tags?.['railway'] === 'station' || tags?.['amenity'] === 'ferry_terminal') {
      return 'bus_terminal'
    }
    return 'bus_stop'
  }

  /**
   * Search using TomTom API
   */
  private async searchWithTomTom(userLocation: UserLocation): Promise<BusStand[]> {
    const { latitude, longitude } = userLocation
    const radius = mapConfig.searchRadius
    const maxResults = mapConfig.maxResults

    try {
      // Use POI search endpoint that we tested successfully
      const url = `${mapConfig.baseUrl}/search/2/poiSearch/bus%20stop.json`
      const params = new URLSearchParams({
        key: this.apiKey!,
        lat: latitude.toString(),
        lon: longitude.toString(),
        radius: radius.toString(),
        limit: maxResults.toString()
      })

      const response = await fetch(`${url}?${params}`)
      
      if (!response.ok) {
        return []
      }

      const data = await response.json()
      
      if (!data.results || data.results.length === 0) {
        return []
      }

      const busStands: BusStand[] = data.results.map((result: any, index: number) => ({
        id: `tomtom_${result.id}`,
        name: result.poi?.name || result.address?.freeformAddress || 'Bus Stop',
        address: result.address?.freeformAddress || 'Address not available',
        coordinates: [result.position.lon, result.position.lat] as [number, number],
        distance: result.dist || this.calculateDistance(
          latitude, 
          longitude, 
          result.position.lat, 
          result.position.lon
        ),
        type: this.determineBusStandType(result)
      }))

      return busStands
        .sort((a, b) => a.distance - b.distance)
        .slice(0, maxResults)

    } catch (error) {
      return []
    }
  }

  /**
   * Get enhanced bus stands with realistic data for the area
   */
  private getEnhancedBusStands(userLocation: UserLocation): BusStand[] {
    const { latitude, longitude } = userLocation
    const city = this.getCityFromCoordinates(latitude, longitude)
    
    console.log(`🏙️ Detected city: ${city} for coordinates: ${latitude}, ${longitude}`)
    
    // Get city-specific bus stands
    const cityBusStands = this.getCitySpecificBusStands(city, latitude, longitude)
    console.log(`🏢 City-specific bus stands:`, cityBusStands)
    
    // Add some generic nearby bus stands
    const nearbyStands = this.generateNearbyBusStands(userLocation)
    console.log(`📍 Nearby bus stands:`, nearbyStands)
    
    // Combine and sort by distance
    const allStands = [...cityBusStands, ...nearbyStands]
      .sort((a, b) => a.distance - b.distance)
      .slice(0, mapConfig.maxResults)
    
    console.log(`🚏 Final bus stands (${allStands.length}):`, allStands)
    
    return allStands
  }

  /**
   * Get city-specific bus stands with real names
   */
  private getCitySpecificBusStands(city: string, latitude: number, longitude: number): BusStand[] {
    const stands: BusStand[] = []
    
    if (city === 'Chennai') {
      // Real Chennai bus stands and terminals
      const chennaiStands = [
        {
          name: 'Chennai Central Bus Terminal',
          address: 'Chennai Central Railway Station, Chennai',
          coordinates: [80.2206, 12.9716] as [number, number],
          type: 'bus_terminal' as const
        },
        {
          name: 'CMBT (Chennai Mofussil Bus Terminus)',
          address: 'Koyambedu, Chennai',
          coordinates: [80.2000, 13.0000] as [number, number],
          type: 'bus_station' as const
        },
        {
          name: 'Tambaram Bus Stand',
          address: 'Tambaram Railway Station, Chennai',
          coordinates: [80.1200, 12.9200] as [number, number],
          type: 'bus_stop' as const
        },
        {
          name: 'Anna Nagar Bus Depot',
          address: 'Anna Nagar, Chennai',
          coordinates: [80.2200, 13.0800] as [number, number],
          type: 'bus_station' as const
        },
        {
          name: 'T. Nagar Bus Stand',
          address: 'T. Nagar, Chennai',
          coordinates: [80.2300, 13.0400] as [number, number],
          type: 'bus_stop' as const
        }
      ]
      
      stands.push(...chennaiStands.map(stand => ({
        id: `chennai_${stand.name.replace(/\s+/g, '_').toLowerCase()}`,
        name: stand.name,
        address: stand.address,
        coordinates: stand.coordinates,
        distance: this.calculateDistance(latitude, longitude, stand.coordinates[1], stand.coordinates[0]),
        type: stand.type
      })))
    } else if (city === 'Delhi') {
      // Real Delhi bus stands
      const delhiStands = [
        {
          name: 'ISBT Kashmere Gate',
          address: 'Kashmere Gate, Delhi',
          coordinates: [77.2300, 28.6600] as [number, number],
          type: 'bus_terminal' as const
        },
        {
          name: 'Anand Vihar ISBT',
          address: 'Anand Vihar, Delhi',
          coordinates: [77.3200, 28.6500] as [number, number],
          type: 'bus_station' as const
        },
        {
          name: 'Sarai Kale Khan ISBT',
          address: 'Sarai Kale Khan, Delhi',
          coordinates: [77.2800, 28.5800] as [number, number],
          type: 'bus_station' as const
        }
      ]
      
      stands.push(...delhiStands.map(stand => ({
        id: `delhi_${stand.name.replace(/\s+/g, '_').toLowerCase()}`,
        name: stand.name,
        address: stand.address,
        coordinates: stand.coordinates,
        distance: this.calculateDistance(latitude, longitude, stand.coordinates[1], stand.coordinates[0]),
        type: stand.type
      })))
    }
    
    return stands
  }

  /**
   * Generate nearby bus stands around user location
   */
  private generateNearbyBusStands(userLocation: UserLocation): BusStand[] {
    const { latitude, longitude } = userLocation
    const city = this.getCityFromCoordinates(latitude, longitude)
    
    const nearbyStands: BusStand[] = [
      {
        id: 'nearby_1',
        name: 'Local Bus Stop',
        address: `Near your location, ${city}`,
        coordinates: [longitude + 0.001, latitude + 0.001],
        distance: this.calculateDistance(latitude, longitude, latitude + 0.001, longitude + 0.001),
        type: 'bus_stop'
      },
      {
        id: 'nearby_2',
        name: 'Community Bus Stand',
        address: `Community area, ${city}`,
        coordinates: [longitude - 0.002, latitude + 0.0015],
        distance: this.calculateDistance(latitude, longitude, latitude + 0.0015, longitude - 0.002),
        type: 'bus_stop'
      },
      {
        id: 'nearby_3',
        name: 'Shopping Complex Bus Stop',
        address: `Near shopping area, ${city}`,
        coordinates: [longitude + 0.002, latitude - 0.001],
        distance: this.calculateDistance(latitude, longitude, latitude - 0.001, longitude + 0.002),
        type: 'bus_stop'
      }
    ]
    
    return nearbyStands
  }

  /**
   * Get mock bus stands for demonstration
   */
  private getMockBusStands(userLocation: UserLocation): BusStand[] {
    const { latitude, longitude } = userLocation
    
    // Determine city based on coordinates
    const city = this.getCityFromCoordinates(latitude, longitude)
    
    // Generate mock bus stands around the user location with city-specific names
    const mockStands: BusStand[] = [
      {
        id: 'mock_1',
        name: 'Central Bus Stop',
        address: `Near Central Park, ${city}`,
        coordinates: [longitude + 0.001, latitude + 0.001],
        distance: this.calculateDistance(latitude, longitude, latitude + 0.001, longitude + 0.001),
        type: 'bus_stop'
      },
      {
        id: 'mock_2',
        name: 'Railway Station Bus Terminal',
        address: `${city} Railway Station, ${city}`,
        coordinates: [longitude - 0.002, latitude + 0.0015],
        distance: this.calculateDistance(latitude, longitude, latitude + 0.0015, longitude - 0.002),
        type: 'bus_terminal'
      },
      {
        id: 'mock_3',
        name: 'Mall Complex Bus Stop',
        address: `Near Mall Complex, ${city}`,
        coordinates: [longitude + 0.002, latitude - 0.001],
        distance: this.calculateDistance(latitude, longitude, latitude - 0.001, longitude + 0.002),
        type: 'bus_stop'
      },
      {
        id: 'mock_4',
        name: 'Airport Bus Station',
        address: `${city} Airport Terminal, ${city}`,
        coordinates: [longitude - 0.001, latitude - 0.002],
        distance: this.calculateDistance(latitude, longitude, latitude - 0.002, longitude - 0.001),
        type: 'bus_station'
      },
      {
        id: 'mock_5',
        name: 'University Bus Stop',
        address: `Near ${city} University, ${city}`,
        coordinates: [longitude + 0.003, latitude + 0.002],
        distance: this.calculateDistance(latitude, longitude, latitude + 0.002, longitude + 0.003),
        type: 'bus_stop'
      }
    ]

    return mockStands
      .sort((a, b) => a.distance - b.distance)
      .slice(0, mapConfig.maxResults)
  }

  /**
   * Determine city name from coordinates
   */
  private getCityFromCoordinates(latitude: number, longitude: number): string {
    // Chennai coordinates: ~12.9716° N, 80.2206° E
    if (latitude >= 12.5 && latitude <= 13.5 && longitude >= 79.5 && longitude <= 81.0) {
      return 'Chennai'
    }
    // Delhi coordinates: ~28.6139° N, 77.2090° E
    else if (latitude >= 28.0 && latitude <= 29.0 && longitude >= 76.5 && longitude <= 77.5) {
      return 'Delhi'
    }
    // Mumbai coordinates: ~19.0760° N, 72.8777° E
    else if (latitude >= 18.5 && latitude <= 19.5 && longitude >= 72.0 && longitude <= 73.5) {
      return 'Mumbai'
    }
    // Bangalore coordinates: ~12.9716° N, 77.5946° E
    else if (latitude >= 12.5 && latitude <= 13.5 && longitude >= 77.0 && longitude <= 78.0) {
      return 'Bangalore'
    }
    // Hyderabad coordinates: ~17.3850° N, 78.4867° E
    else if (latitude >= 17.0 && latitude <= 18.0 && longitude >= 78.0 && longitude <= 79.0) {
      return 'Hyderabad'
    }
    // Kolkata coordinates: ~22.5726° N, 88.3639° E
    else if (latitude >= 22.0 && latitude <= 23.0 && longitude >= 88.0 && longitude <= 89.0) {
      return 'Kolkata'
    }
    // Pune coordinates: ~18.5204° N, 73.8567° E
    else if (latitude >= 18.0 && latitude <= 19.0 && longitude >= 73.0 && longitude <= 74.5) {
      return 'Pune'
    }
    // Default fallback
    else {
      return 'Your City'
    }
  }

  /**
   * Calculate distance between two coordinates using Haversine formula
   */
  calculateDistance(
    lat1: number, 
    lon1: number, 
    lat2: number, 
    lon2: number
  ): number {
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
   * Format distance for display
   */
  formatDistance(distanceInMeters: number): string {
    if (distanceInMeters < 1000) {
      return `${Math.round(distanceInMeters)}m`
    } else {
      return `${(distanceInMeters / 1000).toFixed(1)}km`
    }
  }

  /**
   * Determine bus stand type based on search result
   */
  private determineBusStandType(result: any): BusStand['type'] {
    const name = result.poi?.name?.toLowerCase() || ''
    const category = result.poi?.categorySet?.[0]?.id || ''

    if (name.includes('terminal') || name.includes('depot')) {
      return 'bus_terminal'
    } else if (name.includes('station')) {
      return 'bus_station'
    } else {
      return 'bus_stop'
    }
  }

  /**
   * Remove duplicate bus stands based on coordinates
   */
  private removeDuplicateBusStands(busStands: BusStand[]): BusStand[] {
    const seen = new Set<string>()
    return busStands.filter(stand => {
      const key = `${stand.coordinates[0]}_${stand.coordinates[1]}`
      if (seen.has(key)) {
        return false
      }
      seen.add(key)
      return true
    })
  }

  /**
   * Get directions between two points
   */
  async getDirections(
    from: [number, number], 
    to: [number, number]
  ): Promise<any> {
    try {
      const url = `${mapConfig.baseUrl}/routing/1/calculateRoute/${from[0]},${from[1]}:${to[0]},${to[1]}/json`
      const params = new URLSearchParams({
        key: this.apiKey,
        instructionsType: 'text',
        language: 'en'
      })

      const response = await fetch(`${url}?${params}`)
      
      if (!response.ok) {
        throw new Error(`Directions API error: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Error getting directions:', error)
      return null
    }
  }
}

// Export singleton instance
export const mapService = new MapService()
