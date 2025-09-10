import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Plus, Search, Edit, Trash2, Eye, Filter, Loader2 } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { busService, Bus, routeService, Route, stopService, Stop } from "@/lib/firebaseService";

// Form validation schema
const busSchema = z.object({
  busNumber: z.string().min(1, "Bus number is required"),
  licensePlate: z.string().min(1, "License plate is required"),
  capacity: z.number().min(1, "Capacity must be at least 1"),
  model: z.string().min(1, "Model is required"),
  manufacturer: z.string().min(1, "Manufacturer is required"),
  year: z.number().min(1900).max(new Date().getFullYear() + 1),
  status: z.enum(["active", "maintenance", "inactive"]),
  driverId: z.string().optional(),
  goingRoute: z.string().optional(),
  comingRoute: z.string().optional(),
});

type BusFormData = z.infer<typeof busSchema>;

export default function Buses() {
  const [buses, setBuses] = useState<Bus[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [stops, setStops] = useState<Stop[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingBus, setEditingBus] = useState<Bus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<BusFormData>({
    resolver: zodResolver(busSchema),
  });

  // Load buses and routes from Firebase
  useEffect(() => {
    loadData();
  }, []);

  const getStopName = (stopId: string): string => {
    const stop = stops.find(s => s.id === stopId);
    return stop ? stop.stopName : stopId;
  };

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [busesData, routesData, stopsData] = await Promise.all([
        busService.getAll(),
        routeService.getAll(),
        stopService.getAll()
      ]);
      setBuses(busesData);
      setRoutes(routesData);
      setStops(stopsData);
    } catch (error: any) {
      console.error("Error loading data:", error);
      let errorMessage = "Failed to load data. Please try again.";
      
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

  // CRUD Operations
  const onSubmit = async (data: BusFormData) => {
    try {
      setIsSubmitting(true);
      
      // Handle route assignment - convert "none" to undefined
      const busData = {
        ...data,
        goingRoute: data.goingRoute === "none" ? undefined : data.goingRoute,
        comingRoute: data.comingRoute === "none" ? undefined : data.comingRoute
      };
      
      if (editingBus) {
        await busService.update(editingBus.id!, busData);
        toast({
          title: "Success",
          description: "Bus updated successfully!",
        });
        setIsEditDialogOpen(false);
      } else {
        await busService.create(busData);
        toast({
          title: "Success",
          description: "Bus added successfully!",
        });
        setIsAddDialogOpen(false);
      }
      reset();
      setEditingBus(null);
      loadData();
    } catch (error) {
      console.error("Error saving bus:", error);
      toast({
        title: "Error",
        description: "Failed to save bus. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (bus: Bus) => {
    setEditingBus(bus);
    setValue("busNumber", bus.busNumber);
    setValue("licensePlate", bus.licensePlate);
    setValue("capacity", bus.capacity);
    setValue("model", bus.model);
    setValue("manufacturer", bus.manufacturer);
    setValue("year", bus.year);
    setValue("status", bus.status);
    setValue("driverId", bus.driverId || "");
    setValue("goingRoute", bus.goingRoute || "none");
    setValue("comingRoute", bus.comingRoute || "none");
    setIsEditDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this bus?")) {
      try {
        await busService.delete(id);
        toast({
          title: "Success",
          description: "Bus deleted successfully!",
        });
        loadBuses();
      } catch (error) {
        console.error("Error deleting bus:", error);
        toast({
          title: "Error",
          description: "Failed to delete bus. Please try again.",
          variant: "destructive",
        });
      }
    }
  };

  const filteredBuses = buses.filter(bus => {
    const matchesSearch = bus.busNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         bus.licensePlate.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         bus.model.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === "all" || bus.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-success text-success-foreground";
      case "maintenance":
        return "bg-warning text-warning-foreground";
      case "inactive":
        return "bg-muted text-muted-foreground";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getStatusLabel = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Bus Management</h1>
          <p className="text-muted-foreground">Manage your bus fleet and track vehicle information</p>
        </div>
        
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-primary hover:opacity-90">
              <Plus className="mr-2 h-4 w-4" />
              Add New Bus
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Add New Bus</DialogTitle>
              <DialogDescription>
                Add a new bus to your fleet. Fill in all the required information.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="busNumber">Bus Number</Label>
                  <Input 
                    id="busNumber" 
                    placeholder="BUS-001" 
                    {...register("busNumber")}
                    className={errors.busNumber ? "border-destructive" : ""}
                  />
                  {errors.busNumber && (
                    <p className="text-sm text-destructive">{errors.busNumber.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="licensePlate">License Plate</Label>
                  <Input 
                    id="licensePlate" 
                    placeholder="KA-05-AB-1234" 
                    {...register("licensePlate")}
                    className={errors.licensePlate ? "border-destructive" : ""}
                  />
                  {errors.licensePlate && (
                    <p className="text-sm text-destructive">{errors.licensePlate.message}</p>
                  )}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="model">Model</Label>
                  <Input 
                    id="model" 
                    placeholder="Tata Starbus" 
                    {...register("model")}
                    className={errors.model ? "border-destructive" : ""}
                  />
                  {errors.model && (
                    <p className="text-sm text-destructive">{errors.model.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="manufacturer">Manufacturer</Label>
                  <Input 
                    id="manufacturer" 
                    placeholder="Tata Motors" 
                    {...register("manufacturer")}
                    className={errors.manufacturer ? "border-destructive" : ""}
                  />
                  {errors.manufacturer && (
                    <p className="text-sm text-destructive">{errors.manufacturer.message}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="capacity">Capacity</Label>
                  <Input 
                    id="capacity" 
                    type="number" 
                    placeholder="40" 
                    {...register("capacity", { valueAsNumber: true })}
                    className={errors.capacity ? "border-destructive" : ""}
                  />
                  {errors.capacity && (
                    <p className="text-sm text-destructive">{errors.capacity.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="year">Year</Label>
                  <Input 
                    id="year" 
                    type="number" 
                    placeholder="2024" 
                    {...register("year", { valueAsNumber: true })}
                    className={errors.year ? "border-destructive" : ""}
                  />
                  {errors.year && (
                    <p className="text-sm text-destructive">{errors.year.message}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select onValueChange={(value) => setValue("status", value as "active" | "maintenance" | "inactive")}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
                {errors.status && (
                  <p className="text-sm text-destructive">{errors.status.message}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="goingRoute">Going Route</Label>
                  <Select onValueChange={(value) => setValue("goingRoute", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select going route (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No route assigned</SelectItem>
                      {routes.map((route) => (
                        <SelectItem key={route.id} value={route.id!}>
                          {route.routeName} ({getStopName(route.from || "")} → {getStopName(route.to || "")})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.goingRoute && (
                    <p className="text-sm text-destructive">{errors.goingRoute.message}</p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="comingRoute">Coming Route</Label>
                  <Select onValueChange={(value) => setValue("comingRoute", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select coming route (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No route assigned</SelectItem>
                      {routes.map((route) => (
                        <SelectItem key={route.id} value={route.id!}>
                          {route.routeName} ({getStopName(route.from || "")} → {getStopName(route.to || "")})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.comingRoute && (
                    <p className="text-sm text-destructive">{errors.comingRoute.message}</p>
                  )}
                </div>
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
                    "Add Bus"
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
                <p className="text-sm text-muted-foreground">Total Buses</p>
                <p className="text-2xl font-bold">{buses.length}</p>
              </div>
              <div className="h-8 w-8 bg-primary/10 rounded-lg flex items-center justify-center">
                <div className="h-4 w-4 bg-primary rounded-sm"></div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-card shadow-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active</p>
                <p className="text-2xl font-bold text-success">
                  {buses.filter(b => b.status === "active").length}
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
                <p className="text-sm text-muted-foreground">Maintenance</p>
                <p className="text-2xl font-bold text-warning">
                  {buses.filter(b => b.status === "maintenance").length}
                </p>
              </div>
              <div className="h-8 w-8 bg-warning/10 rounded-lg flex items-center justify-center">
                <div className="h-4 w-4 bg-warning rounded-sm"></div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-card shadow-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Inactive</p>
                <p className="text-2xl font-bold text-muted-foreground">
                  {buses.filter(b => b.status === "inactive").length}
                </p>
              </div>
              <div className="h-8 w-8 bg-muted/20 rounded-lg flex items-center justify-center">
                <div className="h-4 w-4 bg-muted rounded-sm"></div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="bg-gradient-card shadow-card">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search buses..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full sm:w-48">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="maintenance">Maintenance</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Buses Table */}
      <Card className="bg-gradient-card shadow-card">
        <CardHeader>
          <CardTitle>All Buses</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Bus Number</TableHead>
                <TableHead>License Plate</TableHead>
                <TableHead>Model</TableHead>
                <TableHead>Manufacturer</TableHead>
                <TableHead>Capacity</TableHead>
                <TableHead>Year</TableHead>
                <TableHead>Routes</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                    <p className="text-muted-foreground">Loading buses...</p>
                  </TableCell>
                </TableRow>
              ) : filteredBuses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8">
                    <p className="text-muted-foreground">No buses found</p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredBuses.map((bus) => (
                  <TableRow key={bus.id}>
                    <TableCell className="font-medium">{bus.busNumber}</TableCell>
                    <TableCell>{bus.licensePlate}</TableCell>
                    <TableCell>{bus.model}</TableCell>
                    <TableCell>{bus.manufacturer}</TableCell>
                    <TableCell>{bus.capacity}</TableCell>
                    <TableCell>{bus.year}</TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="text-sm">
                          <span className="font-medium text-green-600">Going:</span>
                          {bus.goingRoute && bus.goingRoute !== "none" ? (
                            (() => {
                              const route = routes.find(r => r.id === bus.goingRoute);
                              return route ? (
                                <span className="ml-1">
                                  {route.routeName}
                                  <br />
                                  <span className="text-muted-foreground text-xs">
                                    {getStopName(route.from || "")} → {getStopName(route.to || "")}
                                  </span>
                                </span>
                              ) : (
                                <span className="text-muted-foreground text-xs ml-1">Route not found</span>
                              );
                            })()
                          ) : (
                            <span className="text-muted-foreground text-xs ml-1">No route</span>
                          )}
                        </div>
                        <div className="text-sm">
                          <span className="font-medium text-blue-600">Coming:</span>
                          {bus.comingRoute && bus.comingRoute !== "none" ? (
                            (() => {
                              const route = routes.find(r => r.id === bus.comingRoute);
                              return route ? (
                                <span className="ml-1">
                                  {route.routeName}
                                  <br />
                                  <span className="text-muted-foreground text-xs">
                                    {getStopName(route.from || "")} → {getStopName(route.to || "")}
                                  </span>
                                </span>
                              ) : (
                                <span className="text-muted-foreground text-xs ml-1">Route not found</span>
                              );
                            })()
                          ) : (
                            <span className="text-muted-foreground text-xs ml-1">No route</span>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(bus.status)}>
                        {getStatusLabel(bus.status)}
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
                          onClick={() => handleEdit(bus)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDelete(bus.id!)}
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
            <DialogTitle>Edit Bus</DialogTitle>
            <DialogDescription>
              Update the bus information. You can modify any field as needed.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-busNumber">Bus Number</Label>
                <Input 
                  id="edit-busNumber" 
                  placeholder="BUS-001" 
                  {...register("busNumber")}
                  className={errors.busNumber ? "border-destructive" : ""}
                />
                {errors.busNumber && (
                  <p className="text-sm text-destructive">{errors.busNumber.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-licensePlate">License Plate</Label>
                <Input 
                  id="edit-licensePlate" 
                  placeholder="KA-05-AB-1234" 
                  {...register("licensePlate")}
                  className={errors.licensePlate ? "border-destructive" : ""}
                />
                {errors.licensePlate && (
                  <p className="text-sm text-destructive">{errors.licensePlate.message}</p>
                )}
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-model">Model</Label>
                <Input 
                  id="edit-model" 
                  placeholder="Tata Starbus" 
                  {...register("model")}
                  className={errors.model ? "border-destructive" : ""}
                />
                {errors.model && (
                  <p className="text-sm text-destructive">{errors.model.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-manufacturer">Manufacturer</Label>
                <Input 
                  id="edit-manufacturer" 
                  placeholder="Tata Motors" 
                  {...register("manufacturer")}
                  className={errors.manufacturer ? "border-destructive" : ""}
                />
                {errors.manufacturer && (
                  <p className="text-sm text-destructive">{errors.manufacturer.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-capacity">Capacity</Label>
                <Input 
                  id="edit-capacity" 
                  type="number" 
                  placeholder="40" 
                  {...register("capacity", { valueAsNumber: true })}
                  className={errors.capacity ? "border-destructive" : ""}
                />
                {errors.capacity && (
                  <p className="text-sm text-destructive">{errors.capacity.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-year">Year</Label>
                <Input 
                  id="edit-year" 
                  type="number" 
                  placeholder="2024" 
                  {...register("year", { valueAsNumber: true })}
                  className={errors.year ? "border-destructive" : ""}
                />
                {errors.year && (
                  <p className="text-sm text-destructive">{errors.year.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-status">Status</Label>
              <Select onValueChange={(value) => setValue("status", value as "active" | "maintenance" | "inactive")}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
              {errors.status && (
                <p className="text-sm text-destructive">{errors.status.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-goingRoute">Going Route</Label>
                <Select onValueChange={(value) => setValue("goingRoute", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select going route (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No route assigned</SelectItem>
                    {routes.map((route) => (
                      <SelectItem key={route.id} value={route.id!}>
                        {route.routeName} ({getStopName(route.from || "")} → {getStopName(route.to || "")})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.goingRoute && (
                  <p className="text-sm text-destructive">{errors.goingRoute.message}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-comingRoute">Coming Route</Label>
                <Select onValueChange={(value) => setValue("comingRoute", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select coming route (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No route assigned</SelectItem>
                    {routes.map((route) => (
                      <SelectItem key={route.id} value={route.id!}>
                        {route.routeName} ({getStopName(route.from || "")} → {getStopName(route.to || "")})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.comingRoute && (
                  <p className="text-sm text-destructive">{errors.comingRoute.message}</p>
                )}
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => {
                  setIsEditDialogOpen(false);
                  reset();
                  setEditingBus(null);
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
                  "Update Bus"
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}