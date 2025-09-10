import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Plus, Search, Edit, Trash2, Eye, MapPin, Clock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { routeService, stopService, Route, Stop } from "@/lib/firebaseService";

// Form validation schema
const routeSchema = z.object({
  routeNumber: z.string().min(1, "Route number is required"),
  routeName: z.string().min(1, "Route name is required"),
  description: z.string().min(1, "Description is required"),
  from: z.string().min(1, "From stop is required"),
  to: z.string().min(1, "To stop is required"),
  stops: z.array(z.string()).min(1, "At least one stop is required"),
  distance: z.number().min(0.1, "Distance must be greater than 0"),
  estimatedTime: z.string().min(1, "Estimated time is required"),
  fare: z.number().min(0, "Fare cannot be negative"),
  status: z.enum(["active", "inactive"]),
});

type RouteFormData = z.infer<typeof routeSchema>;

export default function Routes() {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [stops, setStops] = useState<Stop[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingRoute, setEditingRoute] = useState<Route | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<RouteFormData>({
    resolver: zodResolver(routeSchema),
  });


  // Load routes from Firebase
  useEffect(() => {
    loadRoutes();
    loadStops();
  }, []);

  const loadRoutes = async () => {
    try {
      setIsLoading(true);
      const routesData = await routeService.getAll();
      setRoutes(routesData);
    } catch (error: any) {
      console.error("Error loading routes:", error);
      let errorMessage = "Failed to load routes. Please try again.";
      
      if (error.code === 'permission-denied') {
        errorMessage = "Permission denied. Please check your Firebase security rules.";
      } else if (error.code === 'unavailable') {
        errorMessage = "Firebase service is unavailable. Please check your connection.";
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadStops = async () => {
    try {
      const stopsData = await stopService.getAll();
      setStops(stopsData.filter(stop => stop.status === 'active'));
    } catch (error: any) {
      console.error("Error loading stops:", error);
      toast({
        title: "Error",
        description: "Failed to load stops. Please try again.",
        variant: "destructive",
      });
    }
  };

  const getStopName = (stopId: string): string => {
    const stop = stops.find(s => s.id === stopId);
    return stop ? stop.stopName : stopId;
  };

  // CRUD Operations
  const onSubmit = async (data: RouteFormData) => {
    console.log("Form submitted with data:", data);
    try {
      setIsSubmitting(true);
      
      // Transform form data to match the Route interface
      const routeData = {
        routeNumber: data.routeNumber,
        routeName: data.routeName,
        description: data.description,
        from: data.from,
        to: data.to,
        stops: data.stops, // This is already an array due to the Zod transform
        distance: data.distance,
        estimatedTime: data.estimatedTime,
        fare: data.fare,
        status: data.status
      };
      
      console.log("Route data to save:", routeData);

      if (editingRoute) {
        await routeService.update(editingRoute.id!, routeData);
        toast({
          title: "Success",
          description: "Route updated successfully!",
        });
        setIsEditDialogOpen(false);
      } else {
        await routeService.create(routeData);
        toast({
          title: "Success",
          description: "Route added successfully!",
        });
        setIsAddDialogOpen(false);
      }
      reset();
      setEditingRoute(null);
      loadRoutes();
    } catch (error) {
      console.error("Error saving route:", error);
      toast({
        title: "Error",
        description: "Failed to save route. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (route: Route) => {
    setEditingRoute(route);
    setValue("routeNumber", route.routeNumber || "");
    setValue("routeName", route.routeName || route.name || "");
    setValue("description", route.description);
    setValue("from", route.from || route.startLocation || "");
    setValue("to", route.to || route.endLocation || "");
    setValue("stops", route.stops);
    setValue("distance", route.distance);
    setValue("estimatedTime", route.estimatedTime || `${route.estimatedDuration || 30} min`);
    setValue("fare", route.fare);
    setValue("status", route.status);
    
    setIsEditDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this route?")) {
      try {
        await routeService.delete(id);
        toast({
          title: "Success",
          description: "Route deleted successfully!",
        });
        loadRoutes();
      } catch (error) {
        console.error("Error deleting route:", error);
        toast({
          title: "Error",
          description: "Failed to delete route. Please try again.",
          variant: "destructive",
        });
      }
    }
  };

  const filteredRoutes = routes.filter(route =>
    (route.routeNumber || route.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (route.routeName || route.description || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    getStopName(route.from || route.startLocation || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    getStopName(route.to || route.endLocation || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-success text-success-foreground";
      case "inactive":
        return "bg-muted text-muted-foreground";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getStatusLabel = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  const totalDistance = routes.reduce((sum, route) => sum + route.distance, 0);
  const totalStops = routes.reduce((sum, route) => sum + route.stops.length, 0);
  const activeRoutes = routes.filter(r => r.status === "active").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Route Management</h1>
          <p className="text-muted-foreground">Manage bus routes and optimize public transport coverage</p>
        </div>
        
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-primary hover:opacity-90">
              <Plus className="mr-2 h-4 w-4" />
              Add New Route
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Add New Route</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="routeNumber">Route Number</Label>
                  <Input 
                    id="routeNumber" 
                    placeholder="R001" 
                    {...register("routeNumber")}
                    className={errors.routeNumber ? "border-destructive" : ""}
                  />
                  {errors.routeNumber && (
                    <p className="text-sm text-destructive">{errors.routeNumber.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="routeName">Route Name</Label>
                  <Input 
                    id="routeName" 
                    placeholder="City Center Express" 
                    {...register("routeName")}
                    className={errors.routeName ? "border-destructive" : ""}
                  />
                  {errors.routeName && (
                    <p className="text-sm text-destructive">{errors.routeName.message}</p>
                  )}
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input 
                  id="description" 
                  placeholder="City center route connecting major landmarks" 
                  {...register("description")}
                  className={errors.description ? "border-destructive" : ""}
                />
                {errors.description && (
                  <p className="text-sm text-destructive">{errors.description.message}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="from">From</Label>
                  <Select onValueChange={(value) => setValue("from", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select start stop" />
                    </SelectTrigger>
                    <SelectContent>
                      {stops.map((stop) => (
                        <SelectItem key={stop.id} value={stop.id!}>
                          {stop.stopName} ({stop.stopCode})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.from && (
                    <p className="text-sm text-destructive">{errors.from.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="to">To</Label>
                  <Select onValueChange={(value) => setValue("to", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select end stop" />
                    </SelectTrigger>
                    <SelectContent>
                      {stops.map((stop) => (
                        <SelectItem key={stop.id} value={stop.id!}>
                          {stop.stopName} ({stop.stopCode})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.to && (
                    <p className="text-sm text-destructive">{errors.to.message}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="distance">Distance (km)</Label>
                  <Input 
                    id="distance" 
                    type="number" 
                    step="0.1"
                    placeholder="12.5" 
                    {...register("distance", { valueAsNumber: true })}
                    className={errors.distance ? "border-destructive" : ""}
                  />
                  {errors.distance && (
                    <p className="text-sm text-destructive">{errors.distance.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="estimatedTime">Estimated Time</Label>
                  <Input 
                    id="estimatedTime" 
                    placeholder="30-45 min" 
                    {...register("estimatedTime")}
                    className={errors.estimatedTime ? "border-destructive" : ""}
                  />
                  {errors.estimatedTime && (
                    <p className="text-sm text-destructive">{errors.estimatedTime.message}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fare">Base Fare (₹)</Label>
                  <Input 
                    id="fare" 
                    type="number" 
                    placeholder="25" 
                    {...register("fare", { valueAsNumber: true })}
                    className={errors.fare ? "border-destructive" : ""}
                  />
                  {errors.fare && (
                    <p className="text-sm text-destructive">{errors.fare.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select onValueChange={(value) => setValue("status", value as "active" | "inactive")}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.status && (
                    <p className="text-sm text-destructive">{errors.status.message}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="stops">Bus Stops</Label>
                <div className="border rounded-md p-4 max-h-48 overflow-y-auto">
                  {stops.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No stops available. Please add stops first.</p>
                  ) : (
                    <div className="space-y-2">
                      {stops.map((stop) => (
                        <div key={stop.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`stop-${stop.id}`}
                            checked={watch("stops")?.includes(stop.id!) || false}
                            onCheckedChange={(checked) => {
                              const currentStops = watch("stops") || [];
                              if (checked) {
                                setValue("stops", [...currentStops, stop.id!]);
                              } else {
                                setValue("stops", currentStops.filter(id => id !== stop.id));
                              }
                            }}
                          />
                          <Label htmlFor={`stop-${stop.id}`} className="text-sm">
                            {stop.stopName} ({stop.stopCode}) - {stop.city}
                          </Label>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {errors.stops && (
                  <p className="text-sm text-destructive">{errors.stops.message}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Select the stops that this route will pass through.
                </p>
              </div>


              <div className="flex justify-end space-x-2 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setIsAddDialogOpen(false);
                    reset();
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    "Add Route"
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-card shadow-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Routes</p>
                <p className="text-2xl font-bold">{routes.length}</p>
              </div>
              <div className="h-8 w-8 bg-primary/10 rounded-lg flex items-center justify-center">
                <MapPin className="h-4 w-4 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-card shadow-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Routes</p>
                <p className="text-2xl font-bold text-success">
                  {activeRoutes}
                </p>
              </div>
              <div className="h-8 w-8 bg-success/10 rounded-lg flex items-center justify-center">
                <div className="h-4 w-4 bg-success rounded-sm"></div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-card shadow-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Distance</p>
                <p className="text-2xl font-bold">{totalDistance.toFixed(1)} km</p>
              </div>
              <div className="h-8 w-8 bg-accent/20 rounded-lg flex items-center justify-center">
                <Clock className="h-4 w-4 text-accent" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-card shadow-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Bus Stops</p>
                <p className="text-2xl font-bold">{totalStops}</p>
              </div>
              <div className="h-8 w-8 bg-warning/10 rounded-lg flex items-center justify-center">
                <div className="h-4 w-4 bg-warning rounded-full"></div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card className="bg-gradient-card shadow-card">
        <CardContent className="p-6">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search routes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Routes Table */}
      <Card className="bg-gradient-card shadow-card">
        <CardHeader>
          <CardTitle>All Routes</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Route</TableHead>
                <TableHead>From - To</TableHead>
                <TableHead>Distance</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Stops</TableHead>
                <TableHead>Fare (₹)</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                    <p className="text-muted-foreground">Loading routes...</p>
                  </TableCell>
                </TableRow>
              ) : filteredRoutes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    <p className="text-muted-foreground">No routes found</p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredRoutes.map((route) => (
                  <TableRow key={route.id}>
                    <TableCell className="font-medium">
                      <div>
                        <div className="font-semibold">{route.routeNumber || route.name}</div>
                        <div className="text-sm text-muted-foreground">{route.routeName || route.description}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>{getStopName(route.from || route.startLocation || "")}</div>
                        <div className="text-muted-foreground">↓</div>
                        <div>{getStopName(route.to || route.endLocation || "")}</div>
                      </div>
                    </TableCell>
                    <TableCell>{route.distance} km</TableCell>
                    <TableCell>{route.estimatedTime || `${route.estimatedDuration || 30} min`}</TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <MapPin className="mr-1 h-3 w-3 text-muted-foreground" />
                        {route.stops.length}
                      </div>
                    </TableCell>
                    <TableCell>₹{route.fare}</TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(route.status)}>
                        {getStatusLabel(route.status)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleEdit(route)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDelete(route.id!)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Route</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-routeNumber">Route Number</Label>
                <Input 
                  id="edit-routeNumber" 
                  placeholder="R001" 
                  {...register("routeNumber")}
                  className={errors.routeNumber ? "border-destructive" : ""}
                />
                {errors.routeNumber && (
                  <p className="text-sm text-destructive">{errors.routeNumber.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-routeName">Route Name</Label>
                <Input 
                  id="edit-routeName" 
                  placeholder="City Center Express" 
                  {...register("routeName")}
                  className={errors.routeName ? "border-destructive" : ""}
                />
                {errors.routeName && (
                  <p className="text-sm text-destructive">{errors.routeName.message}</p>
                )}
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Input 
                id="edit-description" 
                placeholder="City center route connecting major landmarks" 
                {...register("description")}
                className={errors.description ? "border-destructive" : ""}
              />
              {errors.description && (
                <p className="text-sm text-destructive">{errors.description.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-from">From</Label>
                <Select onValueChange={(value) => setValue("from", value)} defaultValue={editingRoute?.from}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select start stop" />
                  </SelectTrigger>
                  <SelectContent>
                    {stops.map((stop) => (
                      <SelectItem key={stop.id} value={stop.id!}>
                        {stop.stopName} ({stop.stopCode})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.from && (
                  <p className="text-sm text-destructive">{errors.from.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-to">To</Label>
                <Select onValueChange={(value) => setValue("to", value)} defaultValue={editingRoute?.to}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select end stop" />
                  </SelectTrigger>
                  <SelectContent>
                    {stops.map((stop) => (
                      <SelectItem key={stop.id} value={stop.id!}>
                        {stop.stopName} ({stop.stopCode})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.to && (
                  <p className="text-sm text-destructive">{errors.to.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-distance">Distance (km)</Label>
                <Input 
                  id="edit-distance" 
                  type="number" 
                  step="0.1"
                  placeholder="12.5" 
                  {...register("distance", { valueAsNumber: true })}
                  className={errors.distance ? "border-destructive" : ""}
                />
                {errors.distance && (
                  <p className="text-sm text-destructive">{errors.distance.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-estimatedTime">Estimated Time</Label>
                <Input 
                  id="edit-estimatedTime" 
                  placeholder="30-45 min" 
                  {...register("estimatedTime")}
                  className={errors.estimatedTime ? "border-destructive" : ""}
                />
                {errors.estimatedTime && (
                  <p className="text-sm text-destructive">{errors.estimatedTime.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-fare">Base Fare (₹)</Label>
                <Input 
                  id="edit-fare" 
                  type="number" 
                  placeholder="25" 
                  {...register("fare", { valueAsNumber: true })}
                  className={errors.fare ? "border-destructive" : ""}
                />
                {errors.fare && (
                  <p className="text-sm text-destructive">{errors.fare.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-status">Status</Label>
                <Select onValueChange={(value) => setValue("status", value as "active" | "inactive")}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
                {errors.status && (
                  <p className="text-sm text-destructive">{errors.status.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-stops">Bus Stops</Label>
              <div className="border rounded-md p-4 max-h-48 overflow-y-auto">
                {stops.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No stops available. Please add stops first.</p>
                ) : (
                  <div className="space-y-2">
                    {stops.map((stop) => (
                      <div key={stop.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`edit-stop-${stop.id}`}
                          checked={watch("stops")?.includes(stop.id!) || false}
                          onCheckedChange={(checked) => {
                            const currentStops = watch("stops") || [];
                            if (checked) {
                              setValue("stops", [...currentStops, stop.id!]);
                            } else {
                              setValue("stops", currentStops.filter(id => id !== stop.id));
                            }
                          }}
                        />
                        <Label htmlFor={`edit-stop-${stop.id}`} className="text-sm">
                          {stop.stopName} ({stop.stopCode}) - {stop.city}
                        </Label>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {errors.stops && (
                <p className="text-sm text-destructive">{errors.stops.message}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Select the stops that this route will pass through.
              </p>
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => {
                  setIsEditDialogOpen(false);
                  reset();
                  setEditingRoute(null);
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  "Update Route"
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}