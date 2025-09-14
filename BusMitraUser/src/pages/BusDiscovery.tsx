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
  
  const {
    userLocation,
    userAddress,
    nearbyStops,
    isLoading,
    error,
    getCurrentLocation,
    clearError
  } = useFirebaseStops()

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

  const {
    searchResults,
    isSearching: isBusSearching,
    searchBuses,
    retrySearch
  } = useBusSearch()

  useEffect(() => {
    if (searchResults && searchResults.length > 0) {
      const checkDriverStatus = async () => {
        const updatedBuses = await Promise.all(
          searchResults.map(async (result: any) => {
            try {
              const { realtimeLocationService } = await import('@/services/realtimeLocationService')
              const busNumber = result.route.busId || 'BUS-002'
              console.log('Checking driver status for bus:', busNumber, 'from result:', result.route)
              const isDriverOnDuty = await realtimeLocationService.isDriverOnDuty(busNumber)
              console.log('Driver duty status result:', isDriverOnDuty)
              
              return {
                bus: {
                  id: result.route.busId || result.route.id,
                  busNumber,
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

  useEffect(() => {
    if (userAddress && !fromLocation && !fromQuery) {
      setFromLocation(userAddress)
      handleFromInputChange(userAddress)
    }
  }, [userAddress])

  useEffect(() => {
    if (fromQuery !== fromLocation) {
      setFromLocation(fromQuery)
    }
  }, [fromQuery, fromLocation])

  useEffect(() => {
    if (toQuery !== toLocation) {
      setToLocation(toQuery)
    }
  }, [toQuery, toLocation])

  const handleFromSelect = (suggestion: SearchSuggestion) => {
    handleFromSuggestionSelect(suggestion)
    setFromLocation(suggestion.address)
  }

  const handleToSelect = (suggestion: SearchSuggestion) => {
    handleToSuggestionSelect(suggestion)
    setToLocation(suggestion.address)
  }

  const handleFindBuses = async () => {
    if (!fromLocation.trim() || !toLocation.trim()) {
      alert('Please enter both from and to locations')
      return
    }
    try {
      setIsSearching(true)
      setShowSearchResults(true)
      await searchBuses({
        fromLocation: fromLocation.trim(),
        toLocation: toLocation.trim(),
        maxDistance: 5
      })
      setIsSearching(false)
    } catch (error) {
      console.error('Error searching buses:', error)
      setDisplayedBuses([])
      setIsSearching(false)
    }
  }

  const handleGetCurrentLocation = async () => {
    try {
      await getCurrentLocation()
    } catch (error) {
      console.error('Error getting current location:', error)
      alert(`Failed to get location: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const handleRealBusSelect = (busWithDetails: BusWithDetails) => {
    navigate(`/bus/${busWithDetails.route.id}`, {
      state: { busWithDetails, fromLocation, toLocation }
    })
  }

  const handleRefreshLocation = () => {
    clearError()
    getCurrentLocation()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
      <header className="bg-white/90 backdrop-blur-md shadow-lg sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center py-4">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => navigate('/')}
              className="mr-4 text-[#87281B] hover:bg-[#87281B]/10 transition-colors duration-200"
            >
              <ArrowLeft className="h-6 w-6" />
            </Button>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#87281B] tracking-tight">Find Your Bus</h1>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Left Panel - Map & Search */}
          <div className="space-y-6">
            {/* Search Section */}
            <Card className="bg-white rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 border border-gray-100/50">
              <CardHeader className="border-b border-gray-100/70 p-6">
                <CardTitle className="flex items-center gap-3 text-[#87281B] text-xl sm:text-2xl font-semibold">
                  <Navigation className="h-6 w-6" />
                  Plan Your Journey
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-5">
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  <div className="w-full sm:w-1/2">
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
                      className="w-full border border-gray-200 rounded-lg p-3 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-[#87281B]/40 transition-all duration-200"
                    />
                  </div>
                  <span className="hidden sm:block text-lg font-medium text-gray-600">to</span>
                  <div className="w-full sm:w-1/2">
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
                      className="w-full border border-gray-200 rounded-lg p-3 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-[#87281B]/40 transition-all duration-200"
                    />
                  </div>
                </div>
                <div className="space-y-4">
                  <Button 
                    className="w-full bg-gradient-to-r from-[#87281B] to-[#601c13] text-white py-3 rounded-xl text-lg font-medium shadow-md hover:shadow-lg transition-all duration-300 disabled:opacity-70"
                    onClick={handleFindBuses}
                    disabled={!fromLocation.trim() || !toLocation.trim() || isBusSearching}
                  >
                    {isBusSearching ? (
                      <>
                        <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
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
                    className="w-full border-2 border-[#87281B] text-[#87281B] hover:bg-[#87281B]/5 py-3 rounded-xl text-lg font-medium transition-all duration-300"
                  >
                    {isLoading ? (
                      <>
                        <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
                        Getting Location...
                      </>
                    ) : (
                      <>
                        <MapPin className="h-5 w-5 mr-2" />
                        Use My Live Location
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Map Section */}
            <Card className="bg-white rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 border border-gray-100/50">
              <CardHeader className="border-b border-gray-100/70 p-6">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-3 text-[#87281B] text-xl sm:text-2xl font-semibold">
                    <MapPin className="h-6 w-6" />
                    {isLoading && !userLocation ? 'Fetching your location...' : 'My Location & Nearby Stops'}
                  </CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRefreshLocation}
                    disabled={isLoading}
                    className="border-[#87281B] text-[#87281B] hover:bg-[#87281B]/5"
                  >
                    <RefreshCw className={`h-4 w-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                {error ? (
                  <div className="h-64 bg-red-50/80 rounded-xl flex items-center justify-center">
                    <div className="text-center text-red-600">
                      <AlertCircle className="h-12 w-12 mx-auto mb-2" />
                      <p className="font-medium text-lg">Location Error</p>
                      <p className="text-sm text-red-500">{error}</p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleRefreshLocation}
                        className="mt-3 border-[#87281B] text-[#87281B] hover:bg-[#87281B]/5"
                      >
                        Try Again
                      </Button>
                    </div>
                  </div>
                ) : isLoading && !userLocation ? (
                  <div className="h-64 bg-gray-100/80 rounded-xl flex items-center justify-center">
                    <div className="text-center text-gray-600">
                      <RefreshCw className="h-12 w-12 mx-auto mb-2 animate-spin" />
                      <p className="font-medium text-lg">Getting your location...</p>
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
                    className="h-64 rounded-xl"
                  />
                )}
                {userLocation && (
                  <div className="mt-5 space-y-3">
                    <div className="h-12 bg-gray-50/80 rounded-xl flex items-center px-4 shadow-sm">
                      <span className="text-sm sm:text-base text-gray-700">
                        Current Location: {userAddress || `${userLocation.latitude.toFixed(4)}, ${userLocation.longitude.toFixed(4)}`}
                      </span>
                    </div>
                    {nearbyStops.length > 0 && (
                      <>
                        <div className="h-12 bg-[#87281B]/10 rounded-xl flex items-center px-4 shadow-sm">
                          <span className="text-sm sm:text-base text-[#87281B]">
                            Nearest Stop: {nearbyStops[0].stopName} ({Math.round(nearbyStops[0].distance || 0)}m)
                          </span>
                        </div>
                        <div className="h-12 bg-green-50/80 rounded-xl flex items-center px-4 shadow-sm">
                          <span className="text-sm sm:text-base text-green-700">
                            Walk Time: ~{Math.ceil((nearbyStops[0].distance || 0) / 100)} mins
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
              <Card className="bg-[#87281B]/10 border border-[#87281B]/20 rounded-xl shadow-md">
                <CardContent className="p-4 flex items-center gap-2 text-[#87281B]">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span className="text-sm font-medium">Loading Real Data</span>
                  <span className="text-xs text-[#87281B]/70">Searching for bus stops...</span>
                </CardContent>
              </Card>
            )}

            {!isLoading && nearbyStops.length > 0 && (
              <Card className="bg-green-50/80 border border-green-200 rounded-xl shadow-md">
                <CardContent className="p-4 flex items-center gap-2 text-green-800">
                  <MapPin className="h-4 w-4" />
                  <span className="text-sm font-medium">Firebase Database</span>
                  <span className="text-xs text-green-600">Verified stops from admin</span>
                </CardContent>
              </Card>
            )}

            {/* Nearby Bus Stops */}
            <Card className="bg-white rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 border border-gray-100/50">
              <CardHeader className="border-b border-gray-100/70 p-6">
                <CardTitle className="flex items-center gap-3 text-[#87281B] text-xl sm:text-2xl font-semibold">
                  <MapPin className="h-6 w-6" />
                  Nearby Bus Stops
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                {isLoading ? (
                  <div className="flex items-center justify-center py-4">
                    <RefreshCw className="h-4 w-4 animate-spin mr-2 text-[#87281B]" />
                    <span className="text-sm text-gray-600">Loading stops...</span>
                  </div>
                ) : nearbyStops.length > 0 ? (
                  <div className="space-y-4">
                    {nearbyStops.slice(0, 5).map((stop) => (
                      <div
                        key={stop.id}
                        className={`p-4 rounded-xl border cursor-pointer transition-all duration-200 ${
                          selectedStop?.id === stop.id
                            ? 'border-[#87281B] bg-[#87281B]/5 shadow-md'
                            : 'border-gray-200 hover:border-[#87281B]/40 hover:shadow-sm'
                        }`}
                        onClick={() => setSelectedStop(stop)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-semibold text-base sm:text-lg text-gray-900">{stop.stopName}</h4>
                            <p className="text-xs sm:text-sm text-gray-500 mt-1">{stop.address}</p>
                            <p className="text-xs sm:text-sm text-gray-500">{stop.city}, {stop.state}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs sm:text-sm font-medium text-gray-700">
                              {stop.distance ? `${(stop.distance / 1000).toFixed(1)} km` : 'N/A'}
                            </p>
                            <Badge variant="secondary" className="text-xs sm:text-sm mt-1 bg-gray-100 text-gray-800">
                              {stop.stopCode}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm sm:text-base text-gray-500 text-center py-6">
                    No nearby bus stops found. Add stops in the admin panel.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Panel - Bus List */}
          <div>
            <Card className="bg-white rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 border border-gray-100/50">
              <CardHeader className="border-b border-gray-100/70 p-6">
                <CardTitle className="flex items-center gap-3 text-[#87281B] text-xl sm:text-2xl font-semibold">
                  <Bus className="h-6 w-6" />
                  {showSearchResults ? 'Search Results' : 'Available Buses'}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="min-h-[600px] sm:min-h-[400px]">
                  {!showSearchResults ? (
                    <div className="h-full flex flex-col items-center justify-center text-center space-y-6 bg-gray-50/80 rounded-xl p-6">
                      <div className="w-28 h-28 bg-gradient-to-br from-[#87281B] to-[#601c13] rounded-full flex items-center justify-center shadow-lg">
                        <Bus className="h-14 w-14 text-white" />
                      </div>
                      <div className="space-y-3">
                        <h3 className="text-xl sm:text-2xl font-semibold text-gray-900">Find Your Perfect Bus</h3>
                        <p className="text-gray-600 text-sm sm:text-base max-w-md">
                          Enter your destinations above and click "Find Buses" to explore real-time routes.
                        </p>
                      </div>
                      <div className="flex items-center gap-2 text-sm sm:text-base text-gray-500">
                        <MapPin className="h-5 w-5" />
                        <span>Search by location</span>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {isSearching || isBusSearching ? (
                        <div className="h-full flex items-center justify-center">
                          <div className="text-center space-y-4">
                            <RefreshCw className="h-10 w-10 mx-auto animate-spin text-[#87281B]" />
                            <p className="text-gray-700 font-medium text-lg sm:text-xl">Searching for buses...</p>
                            <p className="text-sm sm:text-base text-gray-500">Finding routes between your locations</p>
                          </div>
                        </div>
                      ) : displayedBuses.length > 0 ? (
                        <div>
                          <div className="mb-4 p-3 bg-[#87281B]/5 rounded-xl">
                            <span className="font-medium text-gray-700 text-sm sm:text-base">
                              Found {displayedBuses.length} bus{displayedBuses.length !== 1 ? 'es' : ''}
                            </span>
                          </div>
                          {displayedBuses.map((busWithDetails, index) => (
                            <Card
                              key={`${busWithDetails.bus.id}-${index}`}
                              className="cursor-pointer hover:shadow-xl transition-all duration-300"
                              onClick={() => handleRealBusSelect(busWithDetails)}
                            >
                              <CardContent className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                                <div className="flex items-center gap-4 flex-1">
                                  <div className="w-12 h-12 bg-gradient-to-br from-[#87281B]/10 to-[#601c13]/10 rounded-full flex items-center justify-center">
                                    <Bus className="h-6 w-6 text-[#87281B]" />
                                  </div>
                                  <div>
                                    <h3 className="font-semibold text-lg sm:text-xl text-gray-900">{busWithDetails.bus.busNumber}</h3>
                                    <p className="text-sm sm:text-base text-gray-600">{busWithDetails.route?.routeName || busWithDetails.bus.busName}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-3 flex-shrink-0">
                                  {busWithDetails.realtimeStatus?.status === 'off_duty' && (
                                    <Badge variant="secondary" className="bg-gray-100 text-gray-800 text-xs sm:text-sm py-1 px-2">
                                      <Clock className="h-3 w-3 mr-1" />
                                      Off Duty
                                    </Badge>
                                  )}
                                  <Badge variant={
                                    busWithDetails.realtimeStatus?.status === 'in_transit' ? 'default' :
                                    busWithDetails.realtimeStatus?.status === 'at_stop' ? 'secondary' :
                                    busWithDetails.realtimeStatus?.status === 'delayed' ? 'destructive' : 'outline'
                                  } className="text-xs sm:text-sm py-1 px-2">
                                    {busWithDetails.realtimeStatus?.status === 'in_transit' ? 'In Transit' :
                                     busWithDetails.realtimeStatus?.status === 'at_stop' ? 'At Stop' :
                                     busWithDetails.realtimeStatus?.status === 'delayed' ? 'Delayed' : 'Off Duty'}
                                  </Badge>
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
                              </CardContent>
                              <CardContent className="p-4 pt-0 border-t border-gray-100/70">
                                <div className="grid grid-cols-2 gap-4 text-sm sm:text-base text-gray-700">
                                  <div className="flex items-center gap-2">
                                    <Clock className="h-4 w-4" />
                                    <span>ETA: {busWithDetails.route?.estimatedTime || 'N/A'}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <IndianRupee className="h-4 w-4" />
                                    <span>₹{busWithDetails.route?.fare || 'N/A'}</span>
                                  </div>
                                </div>
                                <div className="mt-4 flex items-center justify-between text-sm sm:text-base">
                                  <span className="text-gray-600">
                                    From: {busWithDetails.fromStop?.name || 'N/A'}
                                  </span>
                                  <Button size="sm" variant="outline" className="border-[#87281B] text-[#87281B] hover:bg-[#87281B]/5">
                                    View Details
                                  </Button>
                                </div>
                                {busWithDetails.route?.driverId && (
                                  <div className="mt-2 text-xs sm:text-sm text-gray-500">
                                    Driver ID: {busWithDetails.route.driverId}
                                  </div>
                                )}
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      ) : (
                        <div className="h-full flex items-center justify-center">
                          <div className="text-center space-y-4">
                            <Bus className="h-12 w-12 mx-auto text-gray-400" />
                            <div className="space-y-2">
                              <h3 className="text-lg sm:text-xl font-medium text-gray-900">No Buses Found</h3>
                              <p className="text-gray-600 text-sm sm:text-base">
                                No buses available for these locations.
                              </p>
                            </div>
                            <Button onClick={retrySearch} variant="outline" size="sm" className="border-[#87281B] text-[#87281B] hover:bg-[#87281B]/5">
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