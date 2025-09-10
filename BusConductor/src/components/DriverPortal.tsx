import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, Bus as BusIcon, MapPin, Clock, Users, Play, Loader2, Navigation, RefreshCw } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "@/hooks/useLocation";
import { useDutyState } from "@/hooks/useDutyState";
import { busService, routeService, stopService, Bus, Route, Stop } from "@/lib/firebaseService";
import DriverLogin from "./DriverLogin";
import DriverDetails from "./DriverDetails";

export default function DriverPortal() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBus, setSelectedBus] = useState<Bus | null>(null);
  const [buses, setBuses] = useState<Bus[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [stops, setStops] = useState<Stop[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [debugLogs, setDebugLogs] = useState<string[]>([]);
  const [showDebugConsole, setShowDebugConsole] = useState(false);
  const { driver, isAuthenticated, logout } = useAuth();
  const { dutyState, startDuty, endDuty, updateLocationTimestamp } = useDutyState();
  const { location, error: locationError, isTracking } = useLocation(driver?.id, dutyState.isOnDuty, selectedBus?.busNumber, updateLocationTimestamp);

  // Capture console logs for mobile debugging
  useEffect(() => {
    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;

    console.log = (...args) => {
      originalLog(...args);
      setDebugLogs(prev => [...prev.slice(-9), `[LOG] ${args.join(' ')}`]);
    };

    console.error = (...args) => {
      originalError(...args);
      setDebugLogs(prev => [...prev.slice(-9), `[ERROR] ${args.join(' ')}`]);
    };

    console.warn = (...args) => {
      originalWarn(...args);
      setDebugLogs(prev => [...prev.slice(-9), `[WARN] ${args.join(' ')}`]);
    };

    return () => {
      console.log = originalLog;
      console.error = originalError;
      console.warn = originalWarn;
    };
  }, []);

  // Load buses and routes on component mount
  useEffect(() => {
    if (isAuthenticated) {
      loadData();
    }
  }, [isAuthenticated]);

  // Restore selected bus if driver was on duty
  useEffect(() => {
    if (isAuthenticated && dutyState.isOnDuty && dutyState.selectedBusId && buses.length > 0) {
      const restoredBus = buses.find(bus => bus.id === dutyState.selectedBusId);
      if (restoredBus) {
        setSelectedBus(restoredBus);
        console.log('🔄 DUTY RESTORE: Restored selected bus:', restoredBus.busNumber);
        toast({
          title: "Duty Restored",
          description: `Welcome back! Your duty for bus ${restoredBus.busNumber} has been restored.`,
        });
      }
    }
  }, [isAuthenticated, dutyState.isOnDuty, dutyState.selectedBusId, buses]);

  const getStopName = (stopId: string): string => {
    const stop = stops.find(s => s.id === stopId);
    return stop ? stop.stopName : stopId;
  };

  const loadData = async () => {
    try {
      setIsLoading(true);
      
      const [busesData, routesData, stopsData] = await Promise.all([
        busService.getAvailableBuses(),
        routeService.getActiveRoutes(),
        stopService.getActiveStops()
      ]);
      
      // If no buses found, show a message
      if (busesData.length === 0) {
        toast({
          title: "No Buses Found",
          description: "No available buses in the database. Please add buses in the admin panel.",
          variant: "default"
        });
      }
      
      // Combine bus and route data
      const busesWithRoutes = busesData.map(bus => {
        const route = bus.routeId ? routesData.find(r => r.id === bus.routeId) : null;
        return {
          ...bus,
          routeName: route ? `${getStopName(route.from || "")} → ${getStopName(route.to || "")}` : 'No route assigned',
          route: route || null
        };
      });
      
      setBuses(busesWithRoutes);
      setRoutes(routesData);
      setStops(stopsData);
      
      toast({
        title: "Data Loaded",
        description: `Found ${busesWithRoutes.length} available buses`,
      });
    } catch (error) {
      console.error('Error loading data:', error);
      
      // Fallback to mock data if Firebase fails
      const mockBuses = [
        {
          id: "MOCK001",
          busNumber: "42A",
          routeId: "ROUTE001",
          capacity: 45,
          type: "AC Deluxe",
          status: "available" as const,
          routeName: "City Center → Airport",
          route: null
        },
        {
          id: "MOCK002",
          busNumber: "15B",
          routeId: "ROUTE002", 
          capacity: 52,
          type: "Non-AC",
          status: "available" as const,
          routeName: "Railway Station → Mall Complex",
          route: null
        },
        {
          id: "MOCK003",
          busNumber: "23C",
          routeId: "ROUTE003",
          capacity: 38,
          type: "AC Standard",
          status: "available" as const,
          routeName: "Hospital → University",
          route: null
        }
      ];
      
      setBuses(mockBuses);
      setRoutes([]);
      
      toast({
        title: "Using Demo Data",
        description: "Unable to connect to database. Showing demo buses.",
        variant: "default"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const filteredBuses = buses.filter(bus =>
    bus.busNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (bus.route && bus.routeName.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleStartDuty = async () => {
    if (!selectedBus || !driver) return;
    
    try {
      // Check if it's mock data
      if (selectedBus.id?.startsWith('MOCK')) {
        // For mock data, just start duty without Firebase
        startDuty(selectedBus.id);
        toast({
          title: "Duty Started! 🚌",
          description: `You're now on duty for Bus ${selectedBus.busNumber} (Demo Mode)`,
        });
      } else {
        // Assign bus to driver in Firebase
        await busService.assignToDriver(selectedBus.id!, driver.id!);
        
        startDuty(selectedBus.id);
        toast({
          title: "Duty Started! 🚌",
          description: `You're now on duty for Bus ${selectedBus.busNumber}`,
        });
      }
    } catch (error) {
      console.error('Error starting duty:', error);
      toast({
        title: "Error",
        description: "Failed to start duty. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleEndDuty = async () => {
    if (!selectedBus) return;
    
    try {
      // Check if it's mock data
      if (selectedBus.id?.startsWith('MOCK')) {
        // For mock data, just end duty without Firebase
        endDuty();
        setSelectedBus(null);
        toast({
          title: "Duty Ended",
          description: "You're now off duty. Have a safe trip! (Demo Mode)",
        });
      } else {
        // Release bus from driver in Firebase
        await busService.releaseFromDriver(selectedBus.id!);
        
        endDuty();
        setSelectedBus(null);
        toast({
          title: "Duty Ended",
          description: "You're now off duty. Have a safe trip!",
        });
      }
    } catch (error) {
      console.error('Error ending duty:', error);
      toast({
        title: "Error",
        description: "Failed to end duty. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleLogin = (driverId: string) => {
    // Login is handled by the useAuth hook
    // This function is called after successful authentication
  };

  const handleLogout = () => {
    logout();
    setIsOnDuty(false);
    setSelectedBus(null);
    toast({
      title: "Logged Out",
      description: "You have been successfully logged out.",
    });
  };

  if (!isAuthenticated) {
    return <DriverLogin onLogin={handleLogin} />;
  }

  if (dutyState.isOnDuty && selectedBus) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-md mx-auto space-y-6">
          <div className="text-center space-y-2">
            <div className="w-20 h-20 bg-gradient-to-br from-primary to-primary-glow rounded-full flex items-center justify-center mx-auto">
              <BusIcon className="w-10 h-10 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">On Duty</h1>
            <Badge className="bg-secondary text-secondary-foreground">
              Bus {selectedBus.busNumber}
            </Badge>
            {dutyState.dutyStartTime && (
              <div className="text-sm text-muted-foreground">
                <div>Duty Duration: {Math.floor((Date.now() - dutyState.dutyStartTime) / 60000)} minutes</div>
                {dutyState.lastLocationUpdate && (
                  <div>Last Update: {new Date(dutyState.lastLocationUpdate).toLocaleTimeString()}</div>
                )}
                {Math.floor((Date.now() - dutyState.dutyStartTime) / 3600000) >= 8 && (
                  <div className="text-amber-600 font-medium">⚠️ Long duty shift - consider taking a break</div>
                )}
              </div>
            )}
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-primary" />
                Current Route
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg font-medium">{selectedBus.routeName}</p>
              <div className="flex items-center gap-4 mt-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  {selectedBus.capacity} seats
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {selectedBus.type}
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="bg-gradient-to-r from-transit-success/10 to-transit-info/10 p-4 rounded-lg border border-transit-success/20">
            <div className="flex items-center gap-2 text-transit-success mb-2">
              <div className={`w-2 h-2 rounded-full ${isTracking ? 'bg-transit-success animate-pulse' : 'bg-red-500'}`}></div>
              <span className="font-medium">
                {isTracking ? 'Location Tracking Active' : 'Location Tracking Inactive'}
              </span>
            </div>
            <p className="text-sm text-muted-foreground mb-2">
              Your location is being shared with passengers for real-time tracking.
            </p>
            {location && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Navigation className="w-3 h-3" />
                <span>Lat: {location.lat.toFixed(6)}, Lng: {location.lng.toFixed(6)}</span>
                {location.accuracy && (
                  <span>(±{Math.round(location.accuracy)}m)</span>
                )}
              </div>
            )}
            {locationError && (
              <div className="mt-2">
                <div className="text-xs text-red-500 mb-2">
                  Location Error: {locationError}
                </div>
                <Button
                  onClick={() => window.location.reload()}
                  size="sm"
                  variant="outline"
                  className="text-xs"
                >
                  <RefreshCw className="w-3 h-3 mr-1" />
                  Retry Location Access
                </Button>
              </div>
            )}
          </div>

          {/* Debug Console Toggle */}
          <Button 
            onClick={() => setShowDebugConsole(!showDebugConsole)}
            variant="outline"
            size="sm"
            className="w-full mb-2"
          >
            {showDebugConsole ? 'Hide' : 'Show'} Debug Console
          </Button>

          {/* Debug Console */}
          {showDebugConsole && (
            <div className="bg-gray-900 text-green-400 p-3 rounded-lg text-xs font-mono max-h-40 overflow-y-auto">
              <div className="text-white mb-2 font-bold">Debug Console:</div>
              {debugLogs.length === 0 ? (
                <div className="text-gray-500">No logs yet...</div>
              ) : (
                debugLogs.map((log, index) => (
                  <div key={index} className="mb-1">
                    {log}
                  </div>
                ))
              )}
            </div>
          )}

          <Button 
            onClick={handleEndDuty}
            variant="destructive"
            size="lg"
            className="w-full"
          >
            End Duty
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-md mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-20 h-20 bg-gradient-to-br from-primary to-primary-glow rounded-full flex items-center justify-center mx-auto">
            <BusIcon className="w-10 h-10 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Driver Portal</h1>
          <p className="text-muted-foreground">Select your bus and start your duty</p>
        </div>

        {/* Driver Details */}
        {driver && (
          <DriverDetails driver={driver} onLogout={handleLogout} />
        )}

        {/* Search and Refresh */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search by bus number or route..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={loadData}
            disabled={isLoading}
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        {/* Bus List */}
        <div className="space-y-3">
          {isLoading ? (
            <Card>
              <CardContent className="p-6 text-center">
                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
                <p className="text-muted-foreground">Loading buses...</p>
              </CardContent>
            </Card>
          ) : (
            filteredBuses.map((bus) => (
              <Card 
                key={bus.id}
                className={`cursor-pointer transition-all hover:shadow-md ${
                  selectedBus?.id === bus.id 
                    ? 'ring-2 ring-primary bg-primary/5' 
                    : 'hover:border-primary/30'
                } ${bus.status === 'in-service' ? 'opacity-50 cursor-not-allowed' : ''}`}
                onClick={() => {
                  if (bus.status === 'available' || bus.status === 'active') {
                    setSelectedBus(bus);
                  }
                }}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                        <BusIcon className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">Bus {bus.busNumber}</h3>
                        <Badge 
                          variant={(bus.status === 'available' || bus.status === 'active') ? 'secondary' : 'default'}
                          className="text-xs"
                        >
                          {(bus.status === 'available' || bus.status === 'active') ? 'Available' : 'In Service'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="w-4 h-4 text-muted-foreground" />
                      <span>{bus.routeName}</span>
                    </div>
                    
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {bus.capacity} seats
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {bus.type || bus.model || 'Standard'}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Selected Bus Info */}
        {selectedBus && (
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-primary">Selected Bus</h3>
                  <p className="text-sm text-muted-foreground">
                    Bus {selectedBus.busNumber} - {selectedBus.routeName}
                  </p>
                </div>
                <Badge variant="secondary" className="text-xs">
                  {selectedBus.capacity} seats
                </Badge>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Start Duty Button */}
        {selectedBus && (
          <Button 
            onClick={handleStartDuty}
            size="lg"
            className="w-full bg-gradient-to-r from-primary to-primary-glow hover:from-primary-glow hover:to-primary shadow-lg"
          >
            <Play className="w-4 h-4 mr-2" />
            Start Duty - Bus {selectedBus.busNumber}
          </Button>
        )}

        {filteredBuses.length === 0 && searchQuery && (
          <Card>
            <CardContent className="p-6 text-center">
              <BusIcon className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground">No buses found matching "{searchQuery}"</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}