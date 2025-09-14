import { useState, useEffect } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Bus as BusIcon, MapPin, Clock, Navigation, Gauge, Users, Loader2, Wifi, WifiOff } from 'lucide-react'
import { routeService, Route, Bus, Driver } from '@/services/routeService'
import MapComponent from '@/components/MapComponent'
import RouteTracker from '@/components/RouteTracker'
import { detectBusDirection, getRouteByDirection, Direction } from '@/utils/directionUtils'

export default function BusDetails() {
  const { busId: busNumber } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const [currentSpeed, setCurrentSpeed] = useState(35)
  const [eta, setEta] = useState('5 min')
  const [routeData, setRouteData] = useState<Route | null>(null)
  const [busData, setBusData] = useState<Bus | null>(null)
  const [driverData, setDriverData] = useState<Driver | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isConnected, setIsConnected] = useState(true)
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null)
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null)
  const [realTimeSpeed, setRealTimeSpeed] = useState<number | null>(null)
  const [realTimeETA, setRealTimeETA] = useState<string | null>(null)

  // Callback to receive real-time speed and ETA from MapComponent
  const handleSpeedAndETAUpdate = (speed: number | null, eta: string | null) => {
    setRealTimeSpeed(speed)
    setRealTimeETA(eta)
  }

  // Get search result data from navigation state
  const searchResult = location.state?.searchResult
  const busWithDetails = location.state?.busWithDetails

  // Fetch route and bus data from Firebase
  useEffect(() => {
    const fetchData = async () => {
      if (!busNumber) {
        setError('No bus number provided')
        setIsLoading(false)
        return
      }

      try {
        setIsLoading(true)
        setError(null)
        
        console.log('🔍 Fetching data for bus:', busNumber)
        
        // Get all routes and find the one that matches this bus
        const routes = await routeService.getAllActiveRoutes()
        const matchingRoute = routes.find(route => 
          route.name.includes(busNumber) || 
          route.id === busNumber
        )
        
        if (!matchingRoute) {
          setError('Route not found for this bus')
          setIsLoading(false)
          return
        }

        console.log('📊 Route found:', matchingRoute)
        setRouteData(matchingRoute)

        // Get buses assigned to this route
        const buses = await routeService.getBusesByRoute(matchingRoute.id)
        const bus = buses.find(b => b.busNumber === busNumber) || buses[0]
        
        if (bus) {
          console.log('🚌 Bus found:', bus)
          setBusData(bus)
          
          // Get driver if assigned
          if (bus.driverId) {
            const driver = await routeService.getDriverById(bus.driverId)
            if (driver) {
              setDriverData(driver)
            }
          }
        }

      } catch (error) {
        console.error('Error fetching data:', error)
        setError('Failed to load bus details')
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [busNumber])

  // Get user's current location (optional - only if user explicitly allows)
  useEffect(() => {
    // Skip automatic location request to avoid permission dialog
    // User location is not required for bus tracking functionality
    console.log('📍 Skipping automatic user location request - focusing on bus location')
  }, [])

  // Set up real-time location tracking
  useEffect(() => {
    if (!busNumber) return

    console.log('🚌 Setting up tracking for bus:', busNumber)
    
    // For now, we'll use mock data until real-time tracking is implemented
    // In the future, this will connect to Firebase Realtime Database or WebSocket
    
    // Simulate connection status
    setIsConnected(true)
    
    // Cleanup on unmount
    return () => {
      console.log('🧹 Cleaning up tracking listeners')
    }
  }, [busNumber])

  // Use real data if available, otherwise fallback to mock data
  
  // Create stops from real route data if available
  const createStopsFromRouteData = (routeData: Route) => {
    
    const stops = []
    const addedStopIds = new Set<string>()
    
    // Always add from stop first
    stops.push({
      id: 'start',
      name: routeData.fromStop.stopName,
      time: '10:00 AM',
      status: 'completed' as const
    })
    addedStopIds.add(routeData.fromStop.id)
    
    // Add route stops in order, skipping from and to stops
    routeData.routeStops.forEach((stop, index) => {
      if (!addedStopIds.has(stop.id) && stop.id !== routeData.from && stop.id !== routeData.to) {
        stops.push({
          id: `stop-${index}`,
          name: stop.stopName,
          time: `10:${15 + (stops.length * 15)} AM`,
          status: stops.length === 1 ? 'current' as const : 'upcoming' as const
        })
        addedStopIds.add(stop.id)
      }
    })
    
    // Always add to stop last
    stops.push({
      id: 'end',
      name: routeData.toStop.stopName,
      time: `10:${15 + (stops.length * 15)} AM`,
      status: 'upcoming' as const
    })
    addedStopIds.add(routeData.toStop.id)
    
    return stops
  }
  
  // Get current route data based on direction
  const getCurrentRouteData = () => {
    if (currentDirection === 'coming' && comingRoute && comingStops.length > 0) {
      return {
        route: comingRoute,
        stops: comingStops,
        fromStop: comingStops[comingStops.length - 1], // Last stop becomes from
        toStop: comingStops[0] // First stop becomes to
      }
    } else if (goingRoute && goingStops.length > 0) {
      return {
        route: goingRoute,
        stops: goingStops,
        fromStop: goingStops[0], // First stop is from
        toStop: goingStops[goingStops.length - 1] // Last stop is to
      }
    }
    return null
  }

  const currentRouteData = getCurrentRouteData()

  const computedBusData = currentRouteData && firebaseBusData ? {
    id: busNumber,
    busNumber: firebaseBusData.licensePlate,
    route: `${currentRouteData.fromStop.stopName} → ${currentRouteData.toStop.stopName}`,
    direction: currentDirection,
    driver: firebaseBusData.driver?.name || 'Unknown Driver',
    capacity: firebaseBusData.capacity,
    currentPassengers: 28, // This would come from real-time data in future
    status: busStatus?.status === 'in_transit' ? 'on-time' : 
            busStatus?.status === 'delayed' ? 'delayed' : 
            busStatus?.status === 'at_stop' ? 'at-stop' : 'off-duty',
    currentLocation: busStatus?.location ? 
      `${busStatus.location.lat.toFixed(6)}, ${busStatus.location.lng.toFixed(6)}` : 
      currentRouteData.fromStop.stopName,
    nextStop: busStatus?.nextStop || currentRouteData.toStop.stopName,
    fare: currentRouteData.route.fare,
    estimatedTime: currentRouteData.route.estimatedTime,
    totalDistance: currentRouteData.route.distance,
    stops: currentRouteData.stops.map((stop, index) => ({
      id: stop.id,
      name: stop.stopName,
      time: `10:${15 + (index * 15)} AM`,
      status: 'upcoming' as const
    }))
  } : routeData ? {
    id: busNumber,
    busNumber: routeData.routeNumber,
    route: `${routeData.fromStop.stopName} → ${routeData.toStop.stopName}`,
    driver: 'Unknown Driver',
    capacity: 40,
    currentPassengers: 28,
    status: busStatus?.status === 'in_transit' ? 'on-time' : 
            busStatus?.status === 'delayed' ? 'delayed' : 
            busStatus?.status === 'at_stop' ? 'at-stop' : 'off-duty',
    currentLocation: busStatus?.location ? 
      `${busStatus.location.lat.toFixed(6)}, ${busStatus.location.lng.toFixed(6)}` : 
      routeData.fromStop.stopName,
    nextStop: busStatus?.nextStop || routeData.toStop.stopName,
    fare: routeData.fare,
    estimatedTime: routeData.estimatedTime,
    totalDistance: routeData.distance,
    stops: createStopsFromRouteData(routeData)
  } : busWithDetails ? {
    id: busNumber,
    busNumber: busWithDetails.bus.busNumber,
    route: busWithDetails.route ? 
      `${busWithDetails.fromStop?.name || 'N/A'} → ${busWithDetails.toStop?.name || 'N/A'}` :
      busWithDetails.bus.busName,
    driver: busWithDetails.driver?.name || 'Unknown Driver',
    capacity: busWithDetails.bus.capacity || 40,
    currentPassengers: 28, // This would come from real-time data in future
    status: busStatus?.status === 'in_transit' ? 'on-time' : 
            busStatus?.status === 'delayed' ? 'delayed' : 
            busStatus?.status === 'at_stop' ? 'at-stop' : 'off-duty',
    currentLocation: busStatus?.location ? 
      `${busStatus.location.lat.toFixed(6)}, ${busStatus.location.lng.toFixed(6)}` : 
      busWithDetails.fromStop?.name || 'Unknown Location',
    nextStop: busStatus?.nextStop || busWithDetails.toStop?.name || 'Unknown Stop',
    fare: busWithDetails.route?.fare || 0,
    estimatedTime: busWithDetails.route?.estimatedTime || 'N/A',
    totalDistance: busWithDetails.route?.distance || 0,
    stops: [
      { 
        id: 'start', 
        name: busWithDetails.fromStop?.name || 'Start', 
        time: '10:00 AM', 
        status: 'completed' as const 
      },
      { 
        id: 'current', 
        name: busWithDetails.fromStop?.name || 'Current Location', 
        time: '10:15 AM', 
        status: 'current' as const 
      },
      { 
        id: 'next', 
        name: busWithDetails.toStop?.name || 'Next Stop', 
        time: '10:30 AM', 
        status: 'upcoming' as const 
      },
      { 
        id: 'end', 
        name: busWithDetails.toStop?.name || 'End', 
        time: '10:45 AM', 
        status: 'upcoming' as const 
      }
    ]
  } : searchResult ? {
    id: busNumber,
    busNumber: searchResult.route.routeNumber || 'BUS-001',
    route: `${searchResult.fromBusStand.name} → ${searchResult.toBusStand.name}`,
    driver: 'Rajesh Kumar',
    capacity: 40,
    currentPassengers: 28,
    status: 'on-time',
    currentLocation: searchResult.fromBusStand.name,
    nextStop: searchResult.toBusStand.name,
    fare: searchResult.estimatedFare,
    estimatedTime: searchResult.estimatedTime,
    totalDistance: searchResult.totalDistance,
    stops: [
      { id: 'start', name: searchResult.fromBusStand.name, time: '10:00 AM', status: 'completed' as const },
      { id: 'current', name: 'Central Park', time: '10:15 AM', status: 'current' as const },
      { id: 'end', name: searchResult.toBusStand.name, time: '10:30 AM', status: 'upcoming' as const }
    ]
  } : {
    // Fallback mock data
    id: busNumber,
    busNumber: 'BUS-001',
    route: 'Delhi → Khurja',
    driver: 'Rajesh Kumar',
    capacity: 40,
    currentPassengers: 28,
    status: 'on-time',
    currentLocation: 'Near Central Park',
    nextStop: 'Railway Station',
    stops: [
      { id: 'start', name: 'Delhi Central', time: '10:00 AM', status: 'completed' as const },
      { id: 'current', name: 'Central Park', time: '10:15 AM', status: 'current' as const },
      { id: 'next1', name: 'Railway Station', time: '10:30 AM', status: 'upcoming' as const },
      { id: 'next2', name: 'Mall Complex', time: '10:45 AM', status: 'upcoming' as const },
      { id: 'end', name: 'Khurja Terminal', time: '11:00 AM', status: 'upcoming' as const }
    ]
  }

  // Simulate real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSpeed(prev => prev + (Math.random() - 0.5) * 5)
      setEta(prev => {
        const current = parseInt(prev)
        return `${Math.max(1, current + (Math.random() - 0.5) * 2)} min`
      })
    }, 3000)

    return () => clearInterval(interval)
  }, [])


  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center py-4">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => navigate('/discover')}
              className="mr-4"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Bus details and journey details</h1>
              <p className="text-sm text-gray-600">{computedBusData.busNumber} - {computedBusData.route}</p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
              <p className="text-lg font-medium text-gray-900">Loading route details...</p>
              <p className="text-sm text-gray-600">Fetching stops and route information</p>
            </div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <BusIcon className="h-8 w-8 text-red-600" />
              </div>
              <p className="text-lg font-medium text-gray-900">Error Loading Route</p>
              <p className="text-sm text-gray-600 mb-4">{error}</p>
              <Button onClick={() => window.location.reload()}>
                Try Again
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Panel - Route Information */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Navigation className="h-5 w-5" />
                  Route of selected bus from start to end
                  {computedBusData?.direction && (
                    <Badge variant={computedBusData.direction === 'going' ? 'default' : 'secondary'} className="ml-2">
                      {computedBusData.direction === 'going' ? '🟢 Going' : '🔵 Coming'}
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <RouteTracker 
                  stops={computedBusData.stops}
                  currentStop={computedBusData.nextStop}
                  nextStop={computedBusData.stops.find(s => s.status === 'upcoming')?.name}
                  estimatedArrival={computedBusData.estimatedTime}
                />
              </CardContent>
            </Card>
          </div>

          {/* Right Panel - Live Tracking Map */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  On map tracking live bus to my bus stand
                </CardTitle>
              </CardHeader>
              <CardContent>
                <MapComponent
                  userLocation={userLocation}
                  busStands={[]}
                  liveBusData={busStatus ? {
                    busId: busStatus.busId,
                    driverId: busStatus.driverId,
                    location: busStatus.location,
                    status: busStatus.status,
                    nextStop: busStatus.nextStop,
                    estimatedArrival: busStatus.estimatedArrival,
                    lastUpdated: busStatus.lastUpdated
                  } : null}
                  routeStops={currentRouteData ? currentRouteData.stops.map(stop => ({
                    id: stop.id,
                    name: stop.stopName,
                    coordinates: { 
                      lat: stop.coordinates?.latitude || 0, 
                      lng: stop.coordinates?.longitude || 0 
                    }
                  })) : routeData ? [
                    ...(routeData.fromStop ? [{
                      id: routeData.fromStop.id,
                      name: routeData.fromStop.stopName,
                      coordinates: { lat: routeData.fromStop.coordinates.lat, lng: routeData.fromStop.coordinates.lng }
                    }] : []),
                    ...routeData.routeStops.map(stop => ({
                      id: stop.id,
                      name: stop.stopName,
                      coordinates: { lat: stop.coordinates.lat, lng: stop.coordinates.lng }
                    })),
                    ...(routeData.toStop ? [{
                      id: routeData.toStop.id,
                      name: routeData.toStop.stopName,
                      coordinates: { lat: routeData.toStop.coordinates.lat, lng: routeData.toStop.coordinates.lng }
                    }] : [])
                  ] : undefined}
                  userFromStop={busWithDetails?.fromStop ? {
                    id: busWithDetails.fromStop.name,
                    name: busWithDetails.fromStop.name,
                    coordinates: { lat: busWithDetails.fromStop.coordinates?.lat || 0, lng: busWithDetails.fromStop.coordinates?.lng || 0 }
                  } : undefined}
                  onSpeedAndETAUpdate={handleSpeedAndETAUpdate}
                  className="h-96 w-full"
                />

                {/* Driver Status Message */}
                {(busStatus && busStatus.status === 'off_duty') || (busWithDetails?.realtimeStatus?.status === 'off_duty') && (
                  <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center">
                        <Clock className="h-4 w-4 text-amber-600" />
                      </div>
                      <div>
                        <h4 className="font-medium text-amber-800">Driver Has Ended Duty</h4>
                        <p className="text-sm text-amber-600">
                          This bus is no longer in service for today. The driver has completed their shift.
                        </p>
                        <p className="text-xs text-amber-500 mt-1">
                          Check the schedule for next available service or tomorrow's routes.
                        </p>
                        {busStatus?.lastUpdated && (
                          <p className="text-xs text-amber-400 mt-1">
                            Duty ended at: {new Date(busStatus.lastUpdated).toLocaleTimeString()}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Live Updates */}
                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                    <span className="text-sm font-medium">
                      {(busStatus && busStatus.status === 'off_duty') || (busWithDetails?.realtimeStatus?.status === 'off_duty') 
                        ? 'Last Known Location:' 
                        : 'Current Location:'
                      }
                    </span>
                    <span className="text-sm text-blue-600">
                      {busStatus?.location ? 
                        `${busStatus.location.lat.toFixed(6)}, ${busStatus.location.lng.toFixed(6)}` : 
                        computedBusData.currentLocation
                      }
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <span className="text-sm font-medium">Distance to Bus Stop:</span>
                    <span className="text-sm text-green-600">
                      {searchResult ? `${(searchResult.fromBusStand.distance / 1000).toFixed(1)} km` : '1.2 km'}
                    </span>
                  </div>
                  {searchResult && (
                    <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                      <span className="text-sm font-medium">From Stop:</span>
                      <span className="text-sm text-purple-600">{searchResult.fromBusStand.name}</span>
                    </div>
                  )}
                  {searchResult && (
                    <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                      <span className="text-sm font-medium">To Stop:</span>
                      <span className="text-sm text-orange-600">{searchResult.toBusStand.name}</span>
                    </div>
                  )}
                  {busStatus && (
                    <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                      <span className="text-sm font-medium">Bus Status:</span>
                      <span className="text-sm text-yellow-600 capitalize">
                        {busStatus.status.replace('_', ' ')}
                      </span>
                    </div>
                  )}
                  {busStatus?.location.speed && (
                    <div className="flex items-center justify-between p-3 bg-indigo-50 rounded-lg">
                      <span className="text-sm font-medium">Current Speed:</span>
                      <span className="text-sm text-indigo-600">
                        {Math.round(busStatus.location.speed * 3.6)} km/h
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* ETA & Speed Info */}
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardContent className="p-6 text-center">
                  <Clock className="h-8 w-8 mx-auto mb-3 text-blue-600" />
                  <h3 className="text-2xl font-bold text-blue-600">
                    {realTimeETA || eta}
                  </h3>
                  <p className="text-sm text-gray-600">Estimated Time of Arrival</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6 text-center">
                  <Gauge className="h-8 w-8 mx-auto mb-3 text-green-600" />
                  <h3 className="text-2xl font-bold text-green-600">
                    {busStatus?.location?.speed ? 
                      `${Math.round(busStatus.location.speed * 3.6)}` : 
                      realTimeSpeed !== null ? 
                        `${Math.round(realTimeSpeed * 3.6)}` : 
                        'Calculating...'
                    } km/h
                  </h3>
                  <p className="text-sm text-gray-600">Current Speed</p>
                </CardContent>
              </Card>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <Button className="w-full" size="lg">
                Get Notifications
              </Button>
              <Button variant="outline" className="w-full" size="lg">
                Share Location
              </Button>
            </div>
          </div>
        </div>
        )}
      </div>
    </div>
  )
}
