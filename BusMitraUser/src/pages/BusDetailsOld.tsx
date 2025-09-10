import { useState, useEffect } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Bus, MapPin, Clock, Navigation, Gauge, Users, Loader2, Wifi, WifiOff } from 'lucide-react'
import { routeService, RouteWithStops } from '@/services/routeService'
import { realtimeLocationService, BusStatus } from '@/services/realtimeLocationService'
import MapComponent from '@/components/MapComponent'

export default function BusDetails() {
  const { busId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const [currentSpeed, setCurrentSpeed] = useState(35)
  const [eta, setEta] = useState('5 min')
  const [routeData, setRouteData] = useState<RouteWithStops | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busStatus, setBusStatus] = useState<BusStatus | null>(null)
  const [isConnected, setIsConnected] = useState(true)
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null)
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null)

  // Get search result data from navigation state
  const searchResult = location.state?.searchResult
  const busWithDetails = location.state?.busWithDetails

  // Fetch route data from Firebase
  useEffect(() => {
    const fetchRouteData = async () => {
      if (!busId) {
        setError('No bus ID provided')
        setIsLoading(false)
        return
      }

      try {
        setIsLoading(true)
        setError(null)
        
        const route = await routeService.getRouteWithStops(busId)
        if (route) {
          setRouteData(route)
          console.log('✅ Route data loaded:', route)
        } else {
          setError('Route not found')
        }
      } catch (err) {
        console.error('Error fetching route data:', err)
        setError('Failed to load route data')
      } finally {
        setIsLoading(false)
      }
    }

    fetchRouteData()
  }, [busId])

  // Get user's current location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          })
        },
        (error) => {
          console.error('Error getting user location:', error)
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000
        }
      )
    }
  }, [])

  // Set up real-time location tracking
  useEffect(() => {
    if (!busId) return

    console.log('🔍 Setting up real-time tracking for bus:', busId)

    // Start listening to bus location updates
    const unsubscribeLocation = realtimeLocationService.startListeningToBus(
      busId,
      (status: BusStatus) => {
        console.log('📍 Real-time bus update:', status)
        setBusStatus(status)
        setLastUpdateTime(new Date())
        
        // Update speed if available
        if (status.location.speed) {
          setCurrentSpeed(Math.round(status.location.speed * 3.6)) // Convert m/s to km/h
        }
        
        // Update ETA if available
        if (status.estimatedArrival) {
          setEta(status.estimatedArrival)
        }
      }
    )

    // Listen to connection status
    const unsubscribeConnection = realtimeLocationService.listenToConnectionStatus(
      (connected: boolean) => {
        console.log('🌐 Connection status:', connected ? 'Connected' : 'Disconnected')
        setIsConnected(connected)
      }
    )

    // Cleanup on unmount
    return () => {
      console.log('🧹 Cleaning up real-time listeners')
      unsubscribeLocation()
      unsubscribeConnection()
    }
  }, [busId])

  // Use real data if available, otherwise fallback to mock data
  console.log('🔍 BusDetails - busWithDetails:', busWithDetails)
  console.log('🔍 BusDetails - routeData:', routeData)
  console.log('🔍 BusDetails - searchResult:', searchResult)
  
  const busData = busWithDetails ? {
    id: busId,
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
    stops: busWithDetails.routeStops ? [
      { name: busWithDetails.fromStop?.name || 'Start', time: '10:00 AM', status: 'completed' },
      ...busWithDetails.routeStops.map((stop: any, index: number) => ({
        name: stop.stopName,
        time: `10:${15 + (index * 15)} AM`,
        status: index === 0 ? 'current' : 'upcoming'
      })),
      { name: busWithDetails.toStop?.name || 'End', time: '10:30 AM', status: 'upcoming' }
    ] : []
  } : routeData ? {
    id: busId,
    busNumber: routeData.routeNumber,
    route: `${routeData.fromStop.stopName} → ${routeData.toStop.stopName}`,
    driver: 'Rajesh Kumar', // This would come from Firebase in real implementation
    capacity: 40, // This would come from Firebase in real implementation
    currentPassengers: 28, // This would come from Firebase in real implementation
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
    stops: [
      { name: routeData.fromStop.stopName, time: '10:00 AM', status: 'completed' },
      ...routeData.routeStops.map((stop, index) => ({
        name: stop.stopName,
        time: `10:${15 + (index * 15)} AM`,
        status: index === 0 ? 'current' : 'upcoming'
      })),
      { name: routeData.toStop.stopName, time: '10:30 AM', status: 'upcoming' }
    ]
  } : searchResult ? {
    id: busId,
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
      { name: searchResult.fromBusStand.name, time: '10:00 AM', status: 'completed' },
      { name: 'Central Park', time: '10:15 AM', status: 'current' },
      { name: searchResult.toBusStand.name, time: '10:30 AM', status: 'upcoming' }
    ]
  } : {
    // Fallback mock data
    id: busId,
    busNumber: 'BUS-001',
    route: 'Delhi → Khurja',
    driver: 'Rajesh Kumar',
    capacity: 40,
    currentPassengers: 28,
    status: 'on-time',
    currentLocation: 'Near Central Park',
    nextStop: 'Railway Station',
    stops: [
      { name: 'Delhi Central', time: '10:00 AM', status: 'completed' },
      { name: 'Central Park', time: '10:15 AM', status: 'current' },
      { name: 'Railway Station', time: '10:30 AM', status: 'upcoming' },
      { name: 'Mall Complex', time: '10:45 AM', status: 'upcoming' },
      { name: 'Khurja Terminal', time: '11:00 AM', status: 'upcoming' }
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

  const getStopStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800'
      case 'current':
        return 'bg-blue-100 text-blue-800'
      case 'upcoming':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
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
              onClick={() => navigate('/discover')}
              className="mr-4"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Bus details and journey details</h1>
              <p className="text-sm text-gray-600">{busData.busNumber} - {busData.route}</p>
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
                <Bus className="h-8 w-8 text-red-600" />
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
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Bus Info */}
                  <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                        <Bus className="h-6 w-6 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-lg">{busData.busNumber}</h3>
                          <Badge variant={busData.status === 'on-time' ? 'default' : 'destructive'}>
                            {busData.status}
                          </Badge>
                          <div className="flex items-center gap-1 ml-auto">
                            {isConnected ? (
                              <Wifi className="h-4 w-4 text-green-600" />
                            ) : (
                              <WifiOff className="h-4 w-4 text-red-600" />
                            )}
                            <span className="text-xs text-gray-500">
                              {isConnected ? 'Live' : 'Offline'}
                            </span>
                          </div>
                        </div>
                        <p className="text-sm text-gray-600">Driver: {busData.driver}</p>
                        {lastUpdateTime && (
                          <p className="text-xs text-gray-500">
                            Last update: {lastUpdateTime.toLocaleTimeString()}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Route Stops */}
                  <div className="space-y-3">
                    <h4 className="font-medium text-gray-900">Route Stops</h4>
                    {busData.stops.map((stop, index) => (
                      <div key={index} className="flex items-center gap-3 p-3 rounded-lg border">
                        <div className={`w-3 h-3 rounded-full ${
                          stop.status === 'completed' ? 'bg-green-500' :
                          stop.status === 'current' ? 'bg-blue-500' : 'bg-gray-300'
                        }`} />
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{stop.name}</span>
                            <Badge className={getStopStatusColor(stop.status)}>
                              {stop.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600">ETA: {stop.time}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Bus Status */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-gray-50 rounded-lg text-center">
                      <Users className="h-6 w-6 mx-auto mb-2 text-gray-600" />
                      <p className="text-sm text-gray-600">Passengers</p>
                      <p className="font-semibold">{busData.currentPassengers}/{busData.capacity}</p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg text-center">
                      <MapPin className="h-6 w-6 mx-auto mb-2 text-gray-600" />
                      <p className="text-sm text-gray-600">Next Stop</p>
                      <p className="font-semibold">{busData.nextStop}</p>
                    </div>
                  </div>

                  {/* Route Information */}
                  {searchResult && (
                    <div className="space-y-3">
                      <h4 className="font-medium text-gray-900">Route Information</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-3 bg-blue-50 rounded-lg">
                          <p className="text-sm text-gray-600">Fare</p>
                          <p className="font-semibold text-blue-600">₹{busData.fare}</p>
                        </div>
                        <div className="p-3 bg-green-50 rounded-lg">
                          <p className="text-sm text-gray-600">Distance</p>
                          <p className="font-semibold text-green-600">{busData.totalDistance} km</p>
                        </div>
                      </div>
                      <div className="p-3 bg-yellow-50 rounded-lg">
                        <p className="text-sm text-gray-600">Estimated Time</p>
                        <p className="font-semibold text-yellow-600">{busData.estimatedTime}</p>
                      </div>
                    </div>
                  )}
                </div>
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
                  className="h-96 w-full"
                />

                {/* Live Updates */}
                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                    <span className="text-sm font-medium">Current Location:</span>
                    <span className="text-sm text-blue-600">
                      {busStatus?.location ? 
                        `${busStatus.location.lat.toFixed(6)}, ${busStatus.location.lng.toFixed(6)}` : 
                        busData.currentLocation
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
                  <h3 className="text-2xl font-bold text-blue-600">{eta}</h3>
                  <p className="text-sm text-gray-600">Estimated Time of Arrival</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6 text-center">
                  <Gauge className="h-8 w-8 mx-auto mb-3 text-green-600" />
                  <h3 className="text-2xl font-bold text-green-600">{Math.round(currentSpeed)} km/h</h3>
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
