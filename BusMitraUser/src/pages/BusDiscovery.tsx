import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, MapPin, Clock, Bus, Navigation, AlertCircle, RefreshCw, IndianRupee, Wifi, WifiOff } from 'lucide-react'
import { useFirebaseStops } from '@/hooks/useFirebaseStops'
import { useAutocomplete } from '@/hooks/useAutocomplete'
import { useBusSearch } from '@/hooks/useBusSearch'
import MapComponent from '@/components/MapComponent'
import { AutocompleteInput } from '@/components/AutocompleteInput'
import { FirebaseStop } from '@/services/firebaseStopsService'
import { SearchSuggestion } from '@/services/searchService'

// Define BusWithDetails interface locally to match actual data structure
interface BusWithDetails {
  bus: {
    id: string
    busNumber: string
    busName: string
    type: string
    capacity: number
    assignedRoute: string
    status: string
  }
  route: {
    id: string
    routeNumber: string
    routeName: string
    from: string
    to: string
    stops: string[]
    fare: number
    totalDistance: number
    estimatedTime: string
    driverOnDuty?: boolean
    driverId?: string
  }
  fromStop: {
    name: string
    distance: number
  }
  toStop: {
    name: string
    distance: number
  }
  realtimeStatus: {
    busId: string
    driverId: string
    location: {
      lat: number
      lng: number
      timestamp: number
    }
    status: string
    lastUpdated: number
  }
  driver?: {
    id: string
    name: string
    phone: string
  }
}

export default function BusDiscovery() {
  const navigate = useNavigate()
  const [fromLocation, setFromLocation] = useState('')
  const [toLocation, setToLocation] = useState('')
  const [selectedStop, setSelectedStop] = useState<FirebaseStop | null>(null)
  const [showSearchResults, setShowSearchResults] = useState(false)
  const [displayedBuses, setDisplayedBuses] = useState<BusWithDetails[]>([])
  const [isSearching, setIsSearching] = useState(false)
  
  // Use the Firebase stops hook for location and bus stops
  const {
    userLocation,
    userAddress,
    nearbyStops,
    isLoading,
    error,
    getCurrentLocation,
    clearError
  } = useFirebaseStops()

  // Note: useBusData hook was removed, using search results directly

  // Use autocomplete for "From" location search
  const {
    query: fromQuery,
    suggestions: fromSuggestions,
    isLoading: isFromSearching,
    isOpen: isFromDropdownOpen,
    selectedIndex: fromSelectedIndex,
    handleInputChange: handleFromInputChange,
    handleSuggestionSelect: handleFromSuggestionSelect,
    handleKeyDown: handleFromKeyDown,
    closeDropdown: closeFromDropdown
  } = useAutocomplete()

  // Use autocomplete for "To" location search
  const {
    query: toQuery,
    suggestions: toSuggestions,
    isLoading: isToSearching,
    isOpen: isToDropdownOpen,
    selectedIndex: toSelectedIndex,
    handleInputChange: handleToInputChange,
    handleSuggestionSelect: handleToSuggestionSelect,
    handleKeyDown: handleToKeyDown,
    closeDropdown: closeToDropdown
  } = useAutocomplete()

  // Use bus search hook
  const {
    searchResults,
    isSearching: isBusSearching,
    searchBuses,
    retrySearch
  } = useBusSearch()


  // Check real-time driver status for search results
  useEffect(() => {
    if (searchResults && searchResults.length > 0) {
      const checkDriverStatus = async () => {
        const updatedBuses = await Promise.all(
          searchResults.map(async (result: any) => {
            try {
              // Import realtimeLocationService dynamically to avoid circular imports
              const { realtimeLocationService } = await import('@/services/realtimeLocationService')
              const busNumber = result.route.busId || 'BUS-002'
              console.log('🔍 Checking driver status for bus:', busNumber, 'from result:', result.route)
              const isDriverOnDuty = await realtimeLocationService.isDriverOnDuty(busNumber)
              console.log('📊 Driver duty status result:', isDriverOnDuty)
              
              return {
                bus: {
                  id: result.route.busId || result.route.id,
                  busNumber: busNumber,
                  busName: result.route.routeName,
                  type: 'Regular',
                  capacity: 40,
                  assignedRoute: result.route.id,
                  status: 'active'
                },
                route: {
                  ...result.route,
                  driverOnDuty: isDriverOnDuty
                },
                fromStop: result.fromBusStand,
                toStop: result.toBusStand,
                realtimeStatus: {
                  busId: result.route.id,
                  driverId: '',
                  location: {
                    lat: result.fromBusStand.coordinates?.lat || 0,
                    lng: result.fromBusStand.coordinates?.lng || 0,
                    timestamp: Date.now()
                  },
                  status: isDriverOnDuty ? 'in_transit' : 'off_duty',
                  lastUpdated: Date.now()
                }
              }
            } catch (error) {
              console.error('Error checking driver status for bus:', result.route.busId, error)
              // Return original result if error
              return {
                bus: {
                  id: result.route.busId || result.route.id,
                  busNumber: result.route.busId || 'BUS-002',
                  busName: result.route.routeName,
                  type: 'Regular',
                  capacity: 40,
                  assignedRoute: result.route.id,
                  status: 'active'
                },
                route: {
                  ...result.route,
                  driverOnDuty: result.route.driverOnDuty
                },
                fromStop: result.fromBusStand,
                toStop: result.toBusStand,
                realtimeStatus: {
                  busId: result.route.id,
                  driverId: '',
                  location: {
                    lat: result.fromBusStand.coordinates?.lat || 0,
                    lng: result.fromBusStand.coordinates?.lng || 0,
                    timestamp: Date.now()
                  },
                  status: 'in_transit',
                  lastUpdated: Date.now()
                }
              }
            }
          })
        )
        
        setDisplayedBuses(updatedBuses)
      }
      
      checkDriverStatus()
    }
  }, [searchResults])

  // Auto-populate "From" field with user's current location (only once)
  useEffect(() => {
    if (userAddress && !fromLocation && !fromQuery) {
      setFromLocation(userAddress)
      // Also set the fromQuery to show in the autocomplete input
      handleFromInputChange(userAddress)
    }
  }, [userAddress]) // Removed fromLocation and fromQuery dependencies to prevent re-population

  // Sync from query with fromLocation state
  useEffect(() => {
    if (fromQuery !== fromLocation) {
      setFromLocation(fromQuery)
    }
  }, [fromQuery, fromLocation])

  // Sync to query with toLocation state
  useEffect(() => {
    if (toQuery !== toLocation) {
      setToLocation(toQuery)
    }
  }, [toQuery, toLocation])

  // Handle "From" suggestion selection
  const handleFromSelect = (suggestion: SearchSuggestion) => {
    handleFromSuggestionSelect(suggestion)
    setFromLocation(suggestion.address)
  }

  // Handle "To" suggestion selection
  const handleToSelect = (suggestion: SearchSuggestion) => {
    handleToSuggestionSelect(suggestion)
    setToLocation(suggestion.address)
  }

  // Handle bus search with real data
  const handleFindBuses = async () => {
    if (!fromLocation.trim() || !toLocation.trim()) {
      alert('Please enter both from and to locations')
      return
    }

    try {
      setIsSearching(true)
      setShowSearchResults(true)

      // Call the search function - useEffect will handle the results
      await searchBuses({
        fromLocation: fromLocation.trim(),
        toLocation: toLocation.trim(),
        maxDistance: 5 // 5km radius for bus stands
      })

      // The useEffect will handle updating displayedBuses when searchResults changes
      setIsSearching(false)
    } catch (error) {
      console.error('Error searching buses:', error)
      // No fallback buses available
      setDisplayedBuses([])
      setIsSearching(false)
    }
  }

  // Handle getting current location
  const handleGetCurrentLocation = async () => {
    try {
      await getCurrentLocation()
    } catch (error) {
      console.error('Error getting current location:', error)
      alert(`Failed to get location: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // Handle real bus selection
  const handleRealBusSelect = (busWithDetails: BusWithDetails) => {
    // Navigate to bus details page with the route ID since we're working with routes
    // The bus details page will use the busWithDetails from state to get the route info
    navigate(`/bus/${busWithDetails.route.id}`, {
      state: {
        busWithDetails,
        fromLocation,
        toLocation
      }
    })
  }



  const handleRefreshLocation = () => {
    clearError()
    getCurrentLocation()
  }


  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center py-4">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => navigate('/')}
              className="mr-4"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-semibold text-gray-900">Find Your Bus</h1>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Panel - Map View */}
          <div className="space-y-6">
            {/* Search Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Navigation className="h-5 w-5" />
                  Plan Your Journey
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <AutocompleteInput
                      placeholder="From"
                      value={fromQuery}
                      onChange={handleFromInputChange}
                      onSelect={handleFromSelect}
                      suggestions={fromSuggestions}
                      isLoading={isFromSearching}
                      isOpen={isFromDropdownOpen}
                      selectedIndex={fromSelectedIndex}
                      onKeyDown={handleFromKeyDown}
                      onClose={closeFromDropdown}
                      className="flex-1"
                    />
                  </div>
                  <span className="text-sm font-medium text-gray-500">TO</span>
                  <div className="flex-1">
                    <AutocompleteInput
                      placeholder="To"
                      value={toQuery}
                      onChange={handleToInputChange}
                      onSelect={handleToSelect}
                      suggestions={toSuggestions}
                      isLoading={isToSearching}
                      isOpen={isToDropdownOpen}
                      selectedIndex={toSelectedIndex}
                      onKeyDown={handleToKeyDown}
                      onClose={closeToDropdown}
                      className="flex-1"
                    />
                  </div>
                </div>
                <div className="space-y-3">
                  <Button 
                    className="w-full" 
                    onClick={handleFindBuses}
                    disabled={!fromLocation.trim() || !toLocation.trim() || isBusSearching}
                  >
                    {isBusSearching ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Searching...
                      </>
                    ) : (
                      'Find Buses'
                    )}
                  </Button>
                  
                  <Button
                    onClick={handleGetCurrentLocation}
                    disabled={isLoading}
                    variant="outline"
                    className="w-full"
                  >
                    {isLoading ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Getting Location...
                      </>
                    ) : (
                      <>
                        <MapPin className="h-4 w-4 mr-2" />
                        Use My Live Location
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>


            {/* Map Section */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    {isLoading && !userLocation ? 'Fetching your location...' : 'My location to nearest bus stand on map'}
                  </CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRefreshLocation}
                    disabled={isLoading}
                  >
                    <RefreshCw className={`h-4 w-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {error ? (
                  <div className="h-64 bg-red-50 rounded-lg flex items-center justify-center">
                    <div className="text-center text-red-600">
                      <AlertCircle className="h-12 w-12 mx-auto mb-2" />
                      <p className="font-medium">Location Error</p>
                      <p className="text-sm">{error}</p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleRefreshLocation}
                        className="mt-2"
                      >
                        Try Again
                      </Button>
                    </div>
                  </div>
                ) : isLoading && !userLocation ? (
                  <div className="h-64 bg-blue-50 rounded-lg flex items-center justify-center">
                    <div className="text-center text-blue-600">
                      <RefreshCw className="h-12 w-12 mx-auto mb-2 animate-spin" />
                      <p className="font-medium">Getting your location...</p>
                      <p className="text-sm">Please allow location access</p>
                    </div>
                  </div>
                ) : (
                  <MapComponent
                    userLocation={userLocation}
                    userAddress={userAddress}
                    busStands={nearbyStops.map(stop => ({
                      id: stop.id,
                      name: stop.stopName,
                      address: stop.address,
                      coordinates: [stop.coordinates?.longitude || 0, stop.coordinates?.latitude || 0] as [number, number],
                      distance: stop.distance || 0,
                      type: 'bus_stop' as const
                    }))}
                    onBusStandSelect={(busStand) => {
                      const stop = nearbyStops.find(s => s.id === busStand.id)
                      if (stop) setSelectedStop(stop)
                    }}
                    selectedBusStand={selectedStop ? {
                      id: selectedStop.id,
                      name: selectedStop.stopName,
                      address: selectedStop.address,
                      coordinates: [selectedStop.coordinates?.longitude || 0, selectedStop.coordinates?.latitude || 0] as [number, number],
                      distance: selectedStop.distance || 0,
                      type: 'bus_stop' as const
                    } : null}
                    className="h-64"
                  />
                )}
                
                {/* Location Info */}
                {userLocation && (
                  <div className="mt-4 space-y-2">
                    <div className="h-8 bg-gray-100 rounded flex items-center px-3">
                      <span className="text-sm text-gray-600">
                        📍 Current Location: {userAddress || `${userLocation.latitude.toFixed(4)}, ${userLocation.longitude.toFixed(4)}`}
                      </span>
                    </div>
                    {nearbyStops.length > 0 && (
                      <>
                        <div className="h-8 bg-blue-100 rounded flex items-center px-3">
                          <span className="text-sm text-blue-600">
                            🚌 Nearest Bus Stop: {nearbyStops[0].stopName} ({Math.round(nearbyStops[0].distance || 0)}m away)
                          </span>
                        </div>
                        <div className="h-8 bg-green-100 rounded flex items-center px-3">
                          <span className="text-sm text-green-600">
                            ⏰ Walking Time: ~{Math.ceil((nearbyStops[0].distance || 0) / 100)} minutes
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Data Source Notice */}
            {isLoading && (
              <Card className="border-yellow-200 bg-yellow-50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-yellow-800">
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span className="text-sm font-medium">Loading Real Data</span>
                  </div>
                  <p className="text-sm text-yellow-700 mt-1">
                    Searching for real bus stops and terminals around your location...
                  </p>
                </CardContent>
              </Card>
            )}
            
            {!isLoading && nearbyStops.length > 0 && (
              <Card className="border-green-200 bg-green-50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-green-800">
                    <MapPin className="h-4 w-4" />
                    <span className="text-sm font-medium">
                      Firebase Database
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Using verified bus stops from your admin database
                  </p>
                </CardContent>
              </Card>
            )}

            {false && (
              <Card className={`${
                nearbyStops[0].id.startsWith('foursquare_')
                  ? 'border-orange-200 bg-orange-50'
                  : nearbyStops[0].id.startsWith('tomtom_')
                    ? 'border-cyan-200 bg-cyan-50'
                    : nearbyStops[0].id.startsWith('osm_enhanced_')
                      ? 'border-green-200 bg-green-50'
                      : nearbyStops[0].id.startsWith('osm_')
                        ? 'border-teal-200 bg-teal-50'
                        : nearbyStops[0].id.startsWith('chennai_') || nearbyStops[0].id.startsWith('delhi_')
                          ? 'border-purple-200 bg-purple-50'
                          : 'border-green-200 bg-green-50'
              }`}>
                <CardContent className="p-4">
                  <div className={`flex items-center gap-2 ${
                    nearbyStops[0].id.startsWith('foursquare_')
                      ? 'text-orange-800'
                      : nearbyStops[0].id.startsWith('tomtom_')
                        ? 'text-cyan-800'
                        : nearbyStops[0].id.startsWith('osm_enhanced_')
                          ? 'text-green-800'
                          : nearbyStops[0].id.startsWith('osm_')
                            ? 'text-teal-800'
                            : nearbyStops[0].id.startsWith('chennai_') || nearbyStops[0].id.startsWith('delhi_')
                              ? 'text-purple-800'
                              : 'text-green-800'
                  }`}>
                    <AlertCircle className="h-4 w-4" />
                    <span className="text-sm font-medium">
                      {nearbyStops[0].id.startsWith('foursquare_')
                        ? 'Foursquare Data'
                        : nearbyStops[0].id.startsWith('tomtom_')
                          ? 'TomTom Data'
                          : nearbyStops[0].id.startsWith('osm_enhanced_')
                            ? 'Enhanced OpenStreetMap Data (FREE)'
                            : nearbyStops[0].id.startsWith('osm_')
                              ? 'OpenStreetMap Data'
                              : nearbyStops[0].id.startsWith('chennai_') || nearbyStops[0].id.startsWith('delhi_')
                                ? 'Enhanced Local Data'
                                : 'Demo Mode'
                      }
                    </span>
                  </div>
                  <p className={`text-sm mt-1 ${
                    nearbyStops[0].id.startsWith('foursquare_')
                      ? 'text-orange-700'
                      : nearbyStops[0].id.startsWith('tomtom_')
                        ? 'text-cyan-700'
                        : nearbyStops[0].id.startsWith('osm_enhanced_')
                          ? 'text-green-700'
                          : nearbyStops[0].id.startsWith('osm_')
                            ? 'text-teal-700'
                            : nearbyStops[0].id.startsWith('chennai_') || nearbyStops[0].id.startsWith('delhi_')
                              ? 'text-purple-700'
                              : 'text-green-700'
                  }`}>
                    {nearbyStops[0].id.startsWith('foursquare_')
                      ? 'Showing detailed venue data from Foursquare Places API!'
                      : nearbyStops[0].id.startsWith('tomtom_')
                        ? 'Showing bus stands from TomTom API!'
                        : nearbyStops[0].id.startsWith('osm_enhanced_')
                          ? 'Showing comprehensive bus data from Enhanced OpenStreetMap - completely FREE with multiple query types!'
                          : nearbyStops[0].id.startsWith('osm_')
                            ? 'Showing real bus stops from OpenStreetMap data!'
                            : nearbyStops[0].id.startsWith('chennai_') || nearbyStops[0].id.startsWith('delhi_')
                              ? 'Showing real bus stands from your city with accurate names and locations!'
                              : 'Using sample bus stands. Real data not available in this area.'
                    }
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Nearby Bus Stops */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Nearby Bus Stops
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex items-center justify-center py-4">
                    <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                    <span className="text-sm text-muted-foreground">Loading nearby stops...</span>
                  </div>
                ) : nearbyStops.length > 0 ? (
                  <div className="space-y-2">
                    {nearbyStops.slice(0, 5).map((stop) => (
                      <div
                        key={stop.id}
                        className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                          selectedStop?.id === stop.id
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:border-primary/50'
                        }`}
                        onClick={() => setSelectedStop(stop)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-medium text-sm">{stop.stopName}</h4>
                            <p className="text-xs text-muted-foreground mt-1">{stop.address}</p>
                            <p className="text-xs text-muted-foreground">{stop.city}, {stop.state}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs font-medium">
                              {stop.distance ? `${(stop.distance / 1000).toFixed(1)} km` : 'N/A'}
                            </p>
                            <Badge variant="secondary" className="text-xs mt-1">
                              {stop.stopCode}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No nearby bus stops found. Please add stops in the admin panel.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Panel - Bus List */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bus className="h-5 w-5" />
                  {showSearchResults ? 'Search Results' : 'Available Buses'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="min-h-[600px]">
                  {!showSearchResults ? (
                    // Placeholder when no search has been performed
                    <div className="h-[600px] flex flex-col items-center justify-center text-center space-y-4">
                    <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                      <Bus className="h-10 w-10 text-white" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-lg font-semibold text-gray-900">Find Your Perfect Bus</h3>
                      <p className="text-gray-600 max-w-sm">
                        Enter your destination above and click "Find Buses" to discover available routes and real-time bus information.
                      </p>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <MapPin className="h-4 w-4" />
                      <span>Search by location</span>
                    </div>
                  </div>
                ) : (
                  // Show search results or loading state
                  <div className="space-y-4">
                    {isSearching || isBusSearching ? (
                      <div className="h-full flex items-center justify-center">
                        <div className="text-center space-y-3">
                          <RefreshCw className="h-8 w-8 mx-auto animate-spin text-blue-500" />
                          <p className="text-gray-600 font-medium">Searching for buses...</p>
                          <p className="text-sm text-gray-500">Finding routes between your locations</p>
                        </div>
                      </div>
                    ) : displayedBuses.length > 0 ? (
                      // Show real bus data
                      <div>
                        {/* Simple Results Header */}
                        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-medium text-gray-700">
                              Found {displayedBuses.length} bus{displayedBuses.length !== 1 ? 'es' : ''}
                            </span>
                          </div>
                        </div>
                        
                        {displayedBuses.map((busWithDetails, index) => (
                        <Card 
                          key={`${busWithDetails.bus.id}-${index}`}
                          className="cursor-pointer hover:shadow-md transition-shadow"
                          onClick={() => handleRealBusSelect(busWithDetails)}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                                  <Bus className="h-5 w-5 text-blue-600" />
                                </div>
                                <div>
                                  <h3 className="font-semibold text-lg">{busWithDetails.bus.busNumber}</h3>
                                  <p className="text-sm text-gray-600">{busWithDetails.route?.routeName || busWithDetails.bus.busName}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {/* Driver Duty Status - Show different badges based on status */}
                                {busWithDetails.realtimeStatus?.status === 'off_duty' && (
                                  <Badge variant="secondary" className="text-xs">
                                    <Clock className="h-3 w-3 mr-1" />
                                    Off Duty
                                  </Badge>
                                )}
                                
                                {/* Bus Status */}
                                <Badge variant={
                                  busWithDetails.realtimeStatus?.status === 'in_transit' ? 'default' :
                                  busWithDetails.realtimeStatus?.status === 'at_stop' ? 'secondary' :
                                  busWithDetails.realtimeStatus?.status === 'delayed' ? 'destructive' : 'outline'
                                }>
                                  {busWithDetails.realtimeStatus?.status === 'in_transit' ? 'In Transit' :
                                   busWithDetails.realtimeStatus?.status === 'at_stop' ? 'At Stop' :
                                   busWithDetails.realtimeStatus?.status === 'delayed' ? 'Delayed' : 'Off Duty'}
                                </Badge>
                                
                                {/* Connection Status */}
                                {busWithDetails.realtimeStatus && (
                                  <div className="flex items-center gap-1">
                                    {busWithDetails.realtimeStatus.status !== 'off_duty' ? (
                                      <Wifi className="h-4 w-4 text-green-600" />
                                    ) : (
                                      <WifiOff className="h-4 w-4 text-red-600" />
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4 text-gray-500" />
                                <span className="font-medium">
                                  ETA: {busWithDetails.route?.estimatedTime || 'N/A'}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <IndianRupee className="h-4 w-4 text-gray-500" />
                                <span className="font-medium">
                                  ₹{busWithDetails.route?.fare || 'N/A'}
                                </span>
                              </div>
                            </div>
                            
                            
                            <div className="mt-3 pt-3 border-t">
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-600">
                                  From: {busWithDetails.fromStop?.name || 'N/A'}
                                </span>
                                <Button size="sm" variant="outline">
                                  View Details
                                </Button>
                              </div>
                            </div>
                            
                            {busWithDetails.route?.driverId && (
                              <div className="mt-2 text-xs text-gray-500">
                                Driver ID: {busWithDetails.route.driverId}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                      </div>
                    ) : (
                      // No results found
                      <div className="h-full flex items-center justify-center">
                        <div className="text-center space-y-3">
                          <Bus className="h-12 w-12 mx-auto text-gray-400" />
                          <div className="space-y-1">
                            <h3 className="text-lg font-medium text-gray-900">No Buses Found</h3>
                            <p className="text-gray-600 text-sm">
                              We couldn't find any buses connecting these locations.
                            </p>
                          </div>
                          <Button onClick={retrySearch} variant="outline" size="sm">
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Try Again
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
