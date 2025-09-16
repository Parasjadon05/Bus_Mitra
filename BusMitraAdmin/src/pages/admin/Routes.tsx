import { useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Plus, Search, Edit, Trash2, MapPin, Clock, Loader2, X, Navigation } from "lucide-react";
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
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { routeService, Route } from "@/lib/firebaseService";

// Stop schema for individual stops
const stopSchema = z.object({
  id: z.string().min(1, "Stop ID is required"),
  name: z.string().min(1, "Stop name is required"),
  latitude: z.number().min(-90).max(90, "Invalid latitude"),
  longitude: z.number().min(-180).max(180, "Invalid longitude"),
  sequence: z.number().min(1, "Sequence must be at least 1"),
});

// Main route schema following Firestore structure
const routeSchema = z.object({
  id: z.string().optional(), // Will be auto-generated
  name: z.string().min(1, "Route name is required").max(100, "Route name too long"),
  startPoint: z.string().min(1, "Start point is required").max(50, "Start point too long"),
  endPoint: z.string().min(1, "End point is required").max(50, "End point too long"),
  active: z.boolean().default(true),
  distance: z.number().min(0, "Distance must be positive").max(1000, "Distance too large"),
  estimatedTime: z.number().min(0, "Estimated time must be positive").max(1440, "Estimated time too large"),
  stops: z.array(stopSchema).min(2, "At least 2 stops are required").max(50, "Too many stops"),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

type RouteFormData = z.infer<typeof routeSchema>;
type StopFormData = z.infer<typeof stopSchema>;

export default function Routes() {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAddStopDialogOpen, setIsAddStopDialogOpen] = useState(false);
  const [isEditStopDialogOpen, setIsEditStopDialogOpen] = useState(false);
  const [editingStopIndex, setEditingStopIndex] = useState<number | null>(null);
  const [editingRoute, setEditingRoute] = useState<Route | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    control,
    watch,
    formState: { errors },
  } = useForm<RouteFormData>({
    resolver: zodResolver(routeSchema),
    defaultValues: {
      active: true,
      distance: 0,
      estimatedTime: 0,
      stops: [
        { id: "stop_1", name: "", latitude: 0, longitude: 0, sequence: 1 },
        { id: "stop_2", name: "", latitude: 0, longitude: 0, sequence: 2 },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "stops",
  });

  // Separate form for adding stops
  const {
    register: registerStop,
    handleSubmit: handleSubmitStop,
    reset: resetStop,
    formState: { errors: stopErrors },
  } = useForm<StopFormData>({
    resolver: zodResolver(stopSchema),
    defaultValues: {
      id: "",
      name: "",
      latitude: 0,
      longitude: 0,
      sequence: 1,
    },
  });

  // Reset form to default values
  const resetForm = () => {
    reset({
      name: "",
      startPoint: "",
      endPoint: "",
      active: true,
      distance: 0,
      estimatedTime: 0,
      stops: [
        { id: "stop_1", name: "", latitude: 0, longitude: 0, sequence: 1 },
        { id: "stop_2", name: "", latitude: 0, longitude: 0, sequence: 2 },
      ],
    });
  };

  // Validate form before submission
  const validateForm = (data: RouteFormData): string | null => {
    // Check if all stops have names
    const emptyStops = data.stops.filter(stop => !stop.name.trim());
    if (emptyStops.length > 0) {
      return "All stops must have names";
    }

    // Check if all stops have valid coordinates
    const invalidStops = data.stops.filter(stop => 
      isNaN(stop.latitude) || isNaN(stop.longitude) ||
      stop.latitude < -90 || stop.latitude > 90 ||
      stop.longitude < -180 || stop.longitude > 180
    );
    if (invalidStops.length > 0) {
      return "All stops must have valid coordinates";
    }

    return null;
  };

  // Load routes from Firebase
  useEffect(() => {
    loadRoutes();
  }, []);

  const loadRoutes = async () => {
    try {
      setIsLoading(true);
      const routesData = await routeService.getAll();
      console.log("Routes data loaded:", routesData);
      console.log("Route IDs:", routesData.map(r => r.id));
      setRoutes(routesData);
    } catch (error: any) {
      console.error("Error loading routes:", error);
      toast({
        title: "Error",
        description: "Failed to load routes. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Generate route ID
  const generateRouteId = (name: string) => {
    const routeNumber = name.match(/\d+/)?.[0] || Math.floor(Math.random() * 1000);
    return `route_${routeNumber}`;
  };

  // Generate stop ID
  const generateStopId = (sequence: number) => {
    return `stop_${sequence}`;
  };

  // CRUD Operations
  const onSubmit = async (data: RouteFormData) => {
    try {
      setIsSubmitting(true);
      
      // Validate form
      const validationError = validateForm(data);
      if (validationError) {
        toast({
          title: "Validation Error",
          description: validationError,
          variant: "destructive",
        });
        return;
      }

      // Generate route ID if not editing
      const routeId = editingRoute?.id || generateRouteId(data.name);
      console.log("Route ID for operation:", routeId);
      console.log("Editing route:", editingRoute);
      
      // Clean and validate stops data
      const updatedStops = data.stops
        .filter(stop => stop.name.trim() !== "") // Remove empty stops
        .map((stop, index) => ({
          id: generateStopId(index + 1),
          name: stop.name.trim(),
          latitude: Number(stop.latitude),
          longitude: Number(stop.longitude),
          sequence: index + 1,
        }));

      // Validate coordinates
      const invalidCoords = updatedStops.some(stop => 
        isNaN(stop.latitude) || isNaN(stop.longitude) ||
        stop.latitude < -90 || stop.latitude > 90 ||
        stop.longitude < -180 || stop.longitude > 180
      );

      if (invalidCoords) {
        toast({
          title: "Validation Error",
          description: "Please enter valid latitude (-90 to 90) and longitude (-180 to 180) values",
          variant: "destructive",
        });
        return;
      }
      
      const routeData = {
        id: routeId,
        name: data.name.trim(),
        startPoint: data.startPoint.trim(),
        endPoint: data.endPoint.trim(),
        active: data.active,
        distance: Number(data.distance) || 0,
        estimatedTime: Number(data.estimatedTime) || 0,
        stops: updatedStops,
        createdAt: editingRoute?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      console.log("Submitting route data:", routeData);

      if (editingRoute) {
        // Check if route exists in Firestore
        const existingRoute = await routeService.getById(editingRoute.id!);
        if (existingRoute) {
          // Route exists, update it
          await routeService.update(editingRoute.id!, routeData);
          toast({
            title: "Success",
            description: "Route updated successfully!",
          });
          setIsEditDialogOpen(false);
        } else {
          // Route doesn't exist, create it with the same ID
          console.log("Route not found, creating new route with ID:", editingRoute.id);
          await routeService.create(routeData);
          toast({
            title: "Success",
            description: "Route created successfully!",
          });
          setIsEditDialogOpen(false);
        }
      } else {
        await routeService.create(routeData);
        toast({
          title: "Success",
          description: "Route added successfully!",
        });
        setIsAddDialogOpen(false);
      }
      
      // Reset form and close dialogs
      resetForm();
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
    console.log("Editing route:", route);
    console.log("Route ID:", route.id);
    setEditingRoute(route);
    setValue("name", route.name || "");
    setValue("startPoint", route.startPoint || "");
    setValue("endPoint", route.endPoint || "");
    setValue("active", route.active || false);
    setValue("distance", route.distance || 0);
    setValue("estimatedTime", route.estimatedTime || 0);
    
    // Set stops data
    if (route.stops && Array.isArray(route.stops)) {
      setValue("stops", route.stops);
    } else {
      setValue("stops", [
        { id: "stop_1", name: "", latitude: 0, longitude: 0, sequence: 1 },
        { id: "stop_2", name: "", latitude: 0, longitude: 0, sequence: 2 },
      ]);
    }
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

  const addStop = () => {
    const nextSequence = fields.length + 1;
    resetStop({
      id: `stop_${nextSequence}`,
      name: "",
      latitude: 0,
      longitude: 0,
      sequence: nextSequence,
    });
    setIsAddStopDialogOpen(true);
  };

  const handleAddStop = (stopData: StopFormData) => {
    append({
      id: stopData.id || `stop_${fields.length + 1}`,
      name: stopData.name,
      latitude: stopData.latitude,
      longitude: stopData.longitude,
      sequence: stopData.sequence,
    });
    resetStop();
    setIsAddStopDialogOpen(false);
    toast({
      title: "Success",
      description: "Stop added successfully!",
    });
  };

  const editStop = (index: number) => {
    const stop = fields[index];
    setEditingStopIndex(index);
    resetStop({
      id: stop.id,
      name: stop.name,
      latitude: stop.latitude,
      longitude: stop.longitude,
      sequence: stop.sequence,
    });
    setIsEditStopDialogOpen(true);
  };

  const handleEditStop = (stopData: StopFormData) => {
    if (editingStopIndex !== null) {
      const currentStops = watch("stops");
      const updatedStops = [...currentStops];
      updatedStops[editingStopIndex] = {
        id: stopData.id,
        name: stopData.name,
        latitude: stopData.latitude,
        longitude: stopData.longitude,
        sequence: stopData.sequence,
      };
      setValue("stops", updatedStops);
    }
    resetStop();
    setEditingStopIndex(null);
    setIsEditStopDialogOpen(false);
    toast({
      title: "Success",
      description: "Stop updated successfully!",
    });
  };

  const removeStop = (index: number) => {
    if (fields.length > 2) {
      remove(index);
      // Re-sequence all remaining stops
      const currentStops = watch("stops");
      const updatedStops = currentStops
        .filter((_, i) => i !== index)
        .map((stop, i) => ({
          ...stop,
          sequence: i + 1,
          id: `stop_${i + 1}`,
        }));
      setValue("stops", updatedStops);
    } else {
      toast({
        title: "Warning",
        description: "At least 2 stops are required",
        variant: "destructive",
      });
    }
  };

  const filteredRoutes = routes.filter(route =>
    (route.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (route.startPoint || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (route.endPoint || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (active: boolean) => {
    return active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800";
  };

  const getStatusLabel = (active: boolean) => {
    return active ? "Active" : "Inactive";
  };

  const totalRoutes = routes.length;
  const activeRoutes = routes.filter(r => r.active === true).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Route Management</h1>
          <p className="text-muted-foreground">Manage bus routes with stops and assign them to buses</p>
        </div>
        
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="mr-2 h-4 w-4" />
              Add New Route
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add New Route</DialogTitle>
              <DialogDescription>
                Create a new bus route with stops and details.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
              {/* Basic Route Information */}
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="name">Route Name</Label>
                  <Input 
                    id="name" 
                    placeholder="Route 102: Broadway to Thiruvanmiyur" 
                    {...register("name")}
                    className={errors.name ? "border-red-500" : ""}
                  />
                  {errors.name && (
                    <p className="text-sm text-red-500">{errors.name.message}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="startPoint">Start Point</Label>
                    <Input 
                      id="startPoint" 
                      placeholder="Broadway Bus Terminus" 
                      {...register("startPoint")}
                      className={errors.startPoint ? "border-red-500" : ""}
                    />
                    {errors.startPoint && (
                      <p className="text-sm text-red-500">{errors.startPoint.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="endPoint">End Point</Label>
                    <Input 
                      id="endPoint" 
                      placeholder="Thiruvanmiyur" 
                      {...register("endPoint")}
                      className={errors.endPoint ? "border-red-500" : ""}
                    />
                    {errors.endPoint && (
                      <p className="text-sm text-red-500">{errors.endPoint.message}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="distance">Distance (km)</Label>
                    <Input 
                      id="distance" 
                      type="number"
                      step="0.1"
                      placeholder="17" 
                      {...register("distance", { valueAsNumber: true })}
                      className={errors.distance ? "border-red-500" : ""}
                    />
                    {errors.distance && (
                      <p className="text-sm text-red-500">{errors.distance.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="estimatedTime">Time (min)</Label>
                    <Input 
                      id="estimatedTime" 
                      type="number"
                      placeholder="50" 
                      {...register("estimatedTime", { valueAsNumber: true })}
                      className={errors.estimatedTime ? "border-red-500" : ""}
                    />
                    {errors.estimatedTime && (
                      <p className="text-sm text-red-500">{errors.estimatedTime.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="active">Status</Label>
                    <select 
                      {...register("active", { setValueAs: (value) => value === "true" })}
                      className="w-full p-2 border rounded-md"
                    >
                      <option value="true">Active</option>
                      <option value="false">Inactive</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Stops Management */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium">Route Stops</h3>
                    <p className="text-xs text-muted-foreground">{fields.length} stops added</p>
                  </div>
                  <Button type="button" onClick={addStop} variant="outline" size="sm">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Stop
                  </Button>
                </div>

                {fields.length > 0 ? (
                  <div className="space-y-2 max-h-40 overflow-y-auto border rounded-md p-3 bg-gray-50">
                    {fields.map((field, index) => (
                      <div key={field.id} className="flex items-center justify-between p-2 bg-white rounded border">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium">#{field.sequence}</span>
                          <span className="text-sm">{field.name || 'Unnamed Stop'}</span>
                          <Badge variant="outline" className="text-xs">{field.id}</Badge>
                        </div>
                        <div className="flex space-x-1">
                          <Button
                            type="button"
                            onClick={() => editStop(index)}
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 text-blue-500 hover:text-blue-700"
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          {fields.length > 2 && (
                            <Button
                              type="button"
                              onClick={() => removeStop(index)}
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 text-muted-foreground text-sm">
                    No stops added yet. Click "Add Stop" to get started.
                  </div>
                )}
                
                {errors.stops && (
                  <p className="text-sm text-red-500">{errors.stops.message}</p>
                )}
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    resetForm();
                    setIsAddDialogOpen(false);
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Routes</p>
                <p className="text-2xl font-bold">{totalRoutes}</p>
              </div>
              <div className="h-8 w-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <MapPin className="h-4 w-4 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Routes</p>
                <p className="text-2xl font-bold text-green-600">
                  {activeRoutes}
                </p>
              </div>
              <div className="h-8 w-8 bg-green-100 rounded-lg flex items-center justify-center">
                <div className="h-4 w-4 bg-green-600 rounded-sm"></div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Inactive Routes</p>
                <p className="text-2xl font-bold text-gray-500">
                  {totalRoutes - activeRoutes}
                </p>
              </div>
              <div className="h-8 w-8 bg-gray-100 rounded-lg flex items-center justify-center">
                <Clock className="h-4 w-4 text-gray-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
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
      <Card>
        <CardHeader>
          <CardTitle>All Routes</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Route</TableHead>
                <TableHead>Start - End</TableHead>
                <TableHead>Stops</TableHead>
                <TableHead>Distance/Time</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                    <p className="text-muted-foreground">Loading routes...</p>
                  </TableCell>
                </TableRow>
              ) : filteredRoutes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <p className="text-muted-foreground">No routes found</p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredRoutes.map((route) => (
                  <TableRow key={route.id}>
                    <TableCell className="font-medium">
                      <div>
                        <div className="font-semibold">{route.name || 'N/A'}</div>
                        <div className="text-sm text-muted-foreground">
                          ID: {route.id || 'N/A'}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>{route.startPoint || 'N/A'}</div>
                        <div className="text-muted-foreground">↓</div>
                        <div>{route.endPoint || 'N/A'}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {route.stops && Array.isArray(route.stops) ? (
                          <div>
                            <div className="font-medium">{route.stops.length} stops</div>
                            <div className="text-muted-foreground">
                              {route.stops.slice(0, 2).map(stop => stop.name).join(', ')}
                              {route.stops.length > 2 && '...'}
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">No stops</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>{route.distance ? `${route.distance} km` : 'N/A'}</div>
                        <div className="text-muted-foreground">
                          {route.estimatedTime ? `${route.estimatedTime} min` : 'N/A'}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(route.active)}>
                        {getStatusLabel(route.active)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
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
                          className="text-red-500 hover:text-red-700"
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

      {/* Edit Dialog - Same as Add Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Route</DialogTitle>
            <DialogDescription>
              Modify the route details and stops.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
            {/* Basic Route Information */}
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Route Name</Label>
                <Input 
                  id="edit-name" 
                  placeholder="Route 102: Broadway to Thiruvanmiyur" 
                  {...register("name")}
                  className={errors.name ? "border-red-500" : ""}
                />
                {errors.name && (
                  <p className="text-sm text-red-500">{errors.name.message}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="edit-startPoint">Start Point</Label>
                  <Input 
                    id="edit-startPoint" 
                    placeholder="Broadway Bus Terminus" 
                    {...register("startPoint")}
                    className={errors.startPoint ? "border-red-500" : ""}
                  />
                  {errors.startPoint && (
                    <p className="text-sm text-red-500">{errors.startPoint.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-endPoint">End Point</Label>
                  <Input 
                    id="edit-endPoint" 
                    placeholder="Thiruvanmiyur" 
                    {...register("endPoint")}
                    className={errors.endPoint ? "border-red-500" : ""}
                  />
                  {errors.endPoint && (
                    <p className="text-sm text-red-500">{errors.endPoint.message}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="edit-distance">Distance (km)</Label>
                  <Input 
                    id="edit-distance" 
                    type="number"
                    step="0.1"
                    placeholder="17" 
                    {...register("distance", { valueAsNumber: true })}
                    className={errors.distance ? "border-red-500" : ""}
                  />
                  {errors.distance && (
                    <p className="text-sm text-red-500">{errors.distance.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-estimatedTime">Time (min)</Label>
                  <Input 
                    id="edit-estimatedTime" 
                    type="number"
                    placeholder="50" 
                    {...register("estimatedTime", { valueAsNumber: true })}
                    className={errors.estimatedTime ? "border-red-500" : ""}
                  />
                  {errors.estimatedTime && (
                    <p className="text-sm text-red-500">{errors.estimatedTime.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-active">Status</Label>
                  <select 
                    {...register("active", { setValueAs: (value) => value === "true" })}
                    className="w-full p-2 border rounded-md"
                  >
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Stops Management */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium">Route Stops</h3>
                  <p className="text-xs text-muted-foreground">{fields.length} stops added</p>
                </div>
                <Button type="button" onClick={addStop} variant="outline" size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Stop
                </Button>
              </div>

              {fields.length > 0 ? (
                <div className="space-y-2 max-h-40 overflow-y-auto border rounded-md p-3 bg-gray-50">
                  {fields.map((field, index) => (
                    <div key={field.id} className="flex items-center justify-between p-2 bg-white rounded border">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium">#{field.sequence}</span>
                        <span className="text-sm">{field.name || 'Unnamed Stop'}</span>
                        <Badge variant="outline" className="text-xs">{field.id}</Badge>
                      </div>
                      <div className="flex space-x-1">
                        <Button
                          type="button"
                          onClick={() => editStop(index)}
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 text-blue-500 hover:text-blue-700"
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        {fields.length > 2 && (
                          <Button
                            type="button"
                            onClick={() => removeStop(index)}
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-muted-foreground text-sm">
                  No stops added yet. Click "Add Stop" to get started.
                </div>
              )}
              
              {errors.stops && (
                <p className="text-sm text-red-500">{errors.stops.message}</p>
              )}
            </div>

            <div className="flex justify-end space-x-2 pt-4 border-t">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => {
                  resetForm();
                  setEditingRoute(null);
                  setIsEditDialogOpen(false);
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

      {/* Add Stop Dialog */}
      <Dialog open={isAddStopDialogOpen} onOpenChange={setIsAddStopDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Stop</DialogTitle>
            <DialogDescription>
              Add a new stop to the route with location details.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmitStop(handleAddStop)} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="stop-name">Stop Name</Label>
              <Input 
                id="stop-name" 
                placeholder="Enter stop name (e.g., Marina Beach)"
                {...registerStop("name")}
                className={stopErrors.name ? "border-red-500" : ""}
              />
              {stopErrors.name && (
                <p className="text-sm text-red-500">{stopErrors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="stop-id">Stop ID</Label>
              <Input 
                id="stop-id" 
                placeholder="stop_1"
                {...registerStop("id")}
                className={stopErrors.id ? "border-red-500" : ""}
              />
              {stopErrors.id && (
                <p className="text-sm text-red-500">{stopErrors.id.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="stop-latitude">Latitude</Label>
                <Input 
                  id="stop-latitude" 
                  type="number"
                  step="0.000001"
                  placeholder="13.05"
                  {...registerStop("latitude", { valueAsNumber: true })}
                  className={stopErrors.latitude ? "border-red-500" : ""}
                />
                {stopErrors.latitude && (
                  <p className="text-sm text-red-500">{stopErrors.latitude.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="stop-longitude">Longitude</Label>
                <Input 
                  id="stop-longitude" 
                  type="number"
                  step="0.000001"
                  placeholder="80.2824"
                  {...registerStop("longitude", { valueAsNumber: true })}
                  className={stopErrors.longitude ? "border-red-500" : ""}
                />
                {stopErrors.longitude && (
                  <p className="text-sm text-red-500">{stopErrors.longitude.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="stop-sequence">Sequence</Label>
              <Input 
                id="stop-sequence" 
                type="number"
                placeholder="1"
                {...registerStop("sequence", { valueAsNumber: true })}
                className={stopErrors.sequence ? "border-red-500" : ""}
              />
              {stopErrors.sequence && (
                <p className="text-sm text-red-500">{stopErrors.sequence.message}</p>
              )}
            </div>

            <div className="flex justify-end space-x-2 pt-4 border-t">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => {
                  resetStop();
                  setIsAddStopDialogOpen(false);
                }}
              >
                Cancel
              </Button>
              <Button type="submit">
                Add Stop
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Stop Dialog */}
      <Dialog open={isEditStopDialogOpen} onOpenChange={setIsEditStopDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Stop</DialogTitle>
            <DialogDescription>
              Modify the stop details and location.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmitStop(handleEditStop)} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-stop-name">Stop Name</Label>
              <Input 
                id="edit-stop-name" 
                placeholder="Enter stop name (e.g., Marina Beach)"
                {...registerStop("name")}
                className={stopErrors.name ? "border-red-500" : ""}
              />
              {stopErrors.name && (
                <p className="text-sm text-red-500">{stopErrors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-stop-id">Stop ID</Label>
              <Input 
                id="edit-stop-id" 
                placeholder="stop_1"
                {...registerStop("id")}
                className={stopErrors.id ? "border-red-500" : ""}
              />
              {stopErrors.id && (
                <p className="text-sm text-red-500">{stopErrors.id.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-stop-latitude">Latitude</Label>
                <Input 
                  id="edit-stop-latitude" 
                  type="number"
                  step="0.000001"
                  placeholder="13.05"
                  {...registerStop("latitude", { valueAsNumber: true })}
                  className={stopErrors.latitude ? "border-red-500" : ""}
                />
                {stopErrors.latitude && (
                  <p className="text-sm text-red-500">{stopErrors.latitude.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-stop-longitude">Longitude</Label>
                <Input 
                  id="edit-stop-longitude" 
                  type="number"
                  step="0.000001"
                  placeholder="80.2824"
                  {...registerStop("longitude", { valueAsNumber: true })}
                  className={stopErrors.longitude ? "border-red-500" : ""}
                />
                {stopErrors.longitude && (
                  <p className="text-sm text-red-500">{stopErrors.longitude.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-stop-sequence">Sequence</Label>
              <Input 
                id="edit-stop-sequence" 
                type="number"
                placeholder="1"
                {...registerStop("sequence", { valueAsNumber: true })}
                className={stopErrors.sequence ? "border-red-500" : ""}
              />
              {stopErrors.sequence && (
                <p className="text-sm text-red-500">{stopErrors.sequence.message}</p>
              )}
            </div>

            <div className="flex justify-end space-x-2 pt-4 border-t">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => {
                  resetStop();
                  setEditingStopIndex(null);
                  setIsEditStopDialogOpen(false);
                }}
              >
                Cancel
              </Button>
              <Button type="submit">
                Update Stop
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}