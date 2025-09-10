export interface SearchSuggestion {
  id: string
  address: string
  placeId?: string
  coordinates?: {
    lat: number
    lng: number
  }
  type?: string
  city?: string
  state?: string
}

export class SearchService {
  private apiKey: string | undefined

  constructor() {
    this.apiKey = import.meta.env.VITE_TOMTOM_API_KEY
  }

  async searchAddresses(query: string, limit: number = 5): Promise<SearchSuggestion[]> {
    console.log('SearchService: searchAddresses called with query:', query)
    if (!query || query.length < 2) {
      console.log('SearchService: Query too short, returning empty array')
      return []
    }

    const searchPromises: Promise<SearchSuggestion[]>[] = []

    // 1. TomTom Search API (FREE - 2500 requests/day)
    console.log('SearchService: API Key available:', !!this.apiKey, 'Length:', this.apiKey?.length)
    if (this.apiKey && this.apiKey !== 'YOUR_TOMTOM_API_KEY_HERE' && this.apiKey.length > 10) {
      console.log('SearchService: Adding TomTom search to promises')
      searchPromises.push(this.searchWithTomTom(query, limit))
    }

    // 2. OpenStreetMap Nominatim API (FREE - No limits but rate limited)
    searchPromises.push(this.searchWithNominatim(query, limit))

    try {
      console.log('SearchService: Starting search with', searchPromises.length, 'promises')
      const results = await Promise.allSettled(searchPromises)
      
      const allSuggestions: SearchSuggestion[] = []
      
      for (const result of results) {
        if (result.status === 'fulfilled') {
          console.log('SearchService: Got', result.value.length, 'suggestions from API')
          allSuggestions.push(...result.value)
        } else {
          console.log('SearchService: API call failed:', result.reason)
        }
      }

      // Remove duplicates and limit results
      const uniqueSuggestions = this.removeDuplicates(allSuggestions)
      console.log('SearchService: Returning', uniqueSuggestions.length, 'unique suggestions')
      return uniqueSuggestions.slice(0, limit)

    } catch (error) {
      console.log('SearchService: Error in search:', error)
      return []
    }
  }

  private async searchWithTomTom(query: string, limit: number): Promise<SearchSuggestion[]> {
    try {
      const response = await fetch(
        `https://api.tomtom.com/search/2/search/${encodeURIComponent(query)}.json?key=${this.apiKey}&limit=${limit}&countrySet=IN&typeahead=true`
      )

      if (!response.ok) {
        return []
      }

      const data = await response.json()
      
      return data.results?.map((result: any, index: number) => ({
        id: `tomtom_${index}`,
        address: result.address?.freeformAddress || result.poi?.name || 'Unknown address',
        placeId: result.id,
        coordinates: result.position ? {
          lat: result.position.lat,
          lng: result.position.lon
        } : undefined,
        type: result.type,
        city: result.address?.municipality || result.address?.localName,
        state: result.address?.countrySubdivision
      })) || []

    } catch (error) {
      return []
    }
  }

  private async searchWithNominatim(query: string, limit: number): Promise<SearchSuggestion[]> {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=${limit}&countrycodes=in&addressdetails=1`
      )

      if (!response.ok) {
        return []
      }

      const data = await response.json()
      
      return data.map((result: any, index: number) => ({
        id: `nominatim_${index}`,
        address: result.display_name,
        placeId: result.place_id,
        coordinates: {
          lat: parseFloat(result.lat),
          lng: parseFloat(result.lon)
        },
        type: result.type,
        city: result.address?.city || result.address?.town || result.address?.village,
        state: result.address?.state
      }))

    } catch (error) {
      return []
    }
  }

  private removeDuplicates(suggestions: SearchSuggestion[]): SearchSuggestion[] {
    const seen = new Set<string>()
    return suggestions.filter(suggestion => {
      const key = suggestion.address.toLowerCase().trim()
      if (seen.has(key)) {
        return false
      }
      seen.add(key)
      return true
    })
  }

  async getAddressFromCoordinates(lat: number, lng: number): Promise<string> {
    try {
      // Try TomTom reverse geocoding first
      if (this.apiKey && this.apiKey !== 'YOUR_TOMTOM_API_KEY_HERE' && this.apiKey.length > 10) {
        const response = await fetch(
          `https://api.tomtom.com/search/2/reverseGeocode/${lat},${lng}.json?key=${this.apiKey}`
        )

        if (response.ok) {
          const data = await response.json()
          if (data.addresses && data.addresses.length > 0) {
            return data.addresses[0].address.freeformAddress
          }
        }
      }

      // Fallback to OpenStreetMap Nominatim
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`
      )

      if (response.ok) {
        const data = await response.json()
        return data.display_name || `${lat.toFixed(6)}, ${lng.toFixed(6)}`
      }

      return `${lat.toFixed(6)}, ${lng.toFixed(6)}`

    } catch (error) {
      return `${lat.toFixed(6)}, ${lng.toFixed(6)}`
    }
  }
}

export const searchService = new SearchService()