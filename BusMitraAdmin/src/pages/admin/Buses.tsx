import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Plus, Search, Edit, Trash2, Bus as BusIcon, Loader2 } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Check, ChevronsUpDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { busService, routeService, Bus, Route } from "@/lib/firebaseService";

// Form validation schema
const busSchema = z.object({
  busNumber: z.string().min(1, "Bus number is required"),
  licensePlate: z.string().min(1, "License plate is required"),
  capacity: z.number().min(1, "Capacity must be at least 1"),
  model: z.string().min(1, "Model is required"),
  manufacturer: z.string().min(1, "Manufacturer is required"),
  year: z.number().min(1900, "Year must be valid"),
  assignedRoute: z.string().min(1, "Route assignment is required"),
  status: z.enum(["active", "maintenance", "inactive"]),
});

type BusFormData = z.infer<typeof busSchema>;

export default function Buses() {
  const [buses, setBuses] = useState<Bus[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingBus, setEditingBus] = useState<Bus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [routeSearchOpen, setRouteSearchOpen] = useState(false);
  const [editRouteSearchOpen, setEditRouteSearchOpen] = useState(false);
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<BusFormData>({
    resolver: zodResolver(busSchema),
  });

  // Watch form values
  const assignedRoute = watch("assignedRoute");

  // Load buses and routes from Firebase
  useEffect(() => {
    loadBuses();
    loadRoutes();
  }, []);

  const loadBuses = async () => {
    try {
      setIsLoading(true);
      const busesData = await busService.getAll();
      setBuses(busesData);
    } catch (error: any) {
      console.error("Error loading buses:", error);
      toast({
        title: "Error",
        description: "Failed to load buses. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadRoutes = async () => {
    try {
      const routesData = await routeService.getAll();
      console.log("Routes loaded for bus assignment:", routesData);
      const activeRoutes = routesData.filter(route => route.active === true);
      console.log("Active routes for assignment:", activeRoutes);
      setRoutes(activeRoutes);
    } catch (error: any) {
      console.error("Error loading routes:", error);
      toast({
        title: "Error",
        description: "Failed to load routes. Please try again.",
        variant: "destructive",
      });
    }
  };

  const getRouteName = (routeId: string): string => {
    const route = routes.find(r => r.id === routeId);
    return route ? route.name : routeId;
  };

  // CRUD Operations
  const onSubmit = async (data: BusFormData) => {
    try {
      setIsSubmitting(true);
      
      const busData = {
        busNumber: data.busNumber,
        licensePlate: data.licensePlate,
        capacity: data.capacity,
        model: data.model,
        manufacturer: data.manufacturer,
        year: data.year,
        assignedRoute: data.assignedRoute,
        status: data.status
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
      setRouteSearchOpen(false);
      setEditRouteSearchOpen(false);
      loadBuses();
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
    setValue("busNumber", bus.busNumber || "");
    setValue("licensePlate", bus.licensePlate || "");
    setValue("capacity", bus.capacity || 0);
    setValue("model", bus.model || "");
    setValue("manufacturer", bus.manufacturer || "");
    setValue("year", bus.year || new Date().getFullYear());
    setValue("assignedRoute", bus.assignedRoute || "");
    setValue("status", bus.status || "active");
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

  const filteredBuses = buses.filter(bus =>
    bus.busNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    bus.licensePlate?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    bus.model?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    bus.manufacturer?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    getRouteName(bus.assignedRoute || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    if (!status) return "bg-muted text-muted-foreground";
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
    if (!status) return "Unknown";
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  const totalBuses = buses.length;
  const activeBuses = buses.filter(b => b.status === "active").length;
  const maintenanceBuses = buses.filter(b => b.status === "maintenance").length;
  const totalCapacity = buses.reduce((sum, bus) => sum + (bus.capacity || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Bus Management</h1>
          <p className="text-muted-foreground">Manage bus fleet and assign routes to buses</p>
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
                    placeholder="DL-01-AB-1234" 
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
                  <Label htmlFor="year">Year</Label>
                  <Input 
                    id="year" 
                    type="number"
                    placeholder="2023" 
                    {...register("year", { valueAsNumber: true })}
                    className={errors.year ? "border-destructive" : ""}
                  />
                  {errors.year && (
                    <p className="text-sm text-destructive">{errors.year.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="capacity">Capacity</Label>
                  <Input 
                    id="capacity" 
                    type="number"
                    placeholder="50" 
                    {...register("capacity", { valueAsNumber: true })}
                    className={errors.capacity ? "border-destructive" : ""}
                  />
                  {errors.capacity && (
                    <p className="text-sm text-destructive">{errors.capacity.message}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="assignedRoute">Assigned Route</Label>
                  <Popover open={routeSearchOpen} onOpenChange={setRouteSearchOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={routeSearchOpen}
                        className="w-full justify-between h-10 px-3 py-2 text-left font-normal"
                      >
                        <span className="truncate">
                          {assignedRoute ? 
                            routes.find((route) => route.id === assignedRoute)?.name || "Select route..." :
                            "Select route..."
                          }
                        </span>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
                      <Command>
                        <CommandInput placeholder="Search routes..." />
                        <CommandList>
                          <CommandEmpty>No routes found.</CommandEmpty>
                          <CommandGroup>
                            {routes.map((route) => (
                              <CommandItem
                                key={route.id}
                                value={route.name}
                                onSelect={() => {
                                  setValue("assignedRoute", route.id!);
                                  setRouteSearchOpen(false);
                                }}
                              >
                                <Check
                                  className={`mr-2 h-4 w-4 ${
                                    assignedRoute === route.id ? "opacity-100" : "opacity-0"
                                  }`}
                                />
                                <div className="flex flex-col">
                                  <span className="font-medium">{route.name}</span>
                                  <span className="text-sm text-muted-foreground">
                                    {route.startPoint} → {route.endPoint}
                                  </span>
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  {errors.assignedRoute && (
                    <p className="text-sm text-destructive">{errors.assignedRoute.message}</p>
                  )}
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
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setIsAddDialogOpen(false);
                    setRouteSearchOpen(false);
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
                <p className="text-2xl font-bold">{totalBuses}</p>
              </div>
              <div className="h-8 w-8 bg-primary/10 rounded-lg flex items-center justify-center">
                <BusIcon className="h-4 w-4 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-card shadow-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Buses</p>
                <p className="text-2xl font-bold text-success">
                  {activeBuses}
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
                  {maintenanceBuses}
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
                <p className="text-sm text-muted-foreground">Total Capacity</p>
                <p className="text-2xl font-bold">{totalCapacity}</p>
              </div>
              <div className="h-8 w-8 bg-accent/20 rounded-lg flex items-center justify-center">
                <div className="h-4 w-4 bg-accent rounded-full"></div>
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
              placeholder="Search buses..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
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
                <TableHead>Year</TableHead>
                <TableHead>Capacity</TableHead>
                <TableHead>Assigned Route</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                    <p className="text-muted-foreground">Loading buses...</p>
                  </TableCell>
                </TableRow>
              ) : filteredBuses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    <p className="text-muted-foreground">No buses found</p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredBuses.map((bus) => (
                  <TableRow key={bus.id}>
                    <TableCell className="font-medium">
                      <div>
                        <div className="font-semibold">{bus.busNumber}</div>
                        <div className="text-sm text-muted-foreground">{bus.manufacturer}</div>
                      </div>
                    </TableCell>
                    <TableCell>{bus.licensePlate}</TableCell>
                    <TableCell>{bus.model}</TableCell>
                    <TableCell>{bus.year}</TableCell>
                    <TableCell>{bus.capacity} seats</TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {getRouteName(bus.assignedRoute || "")}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(bus.status)}>
                        {getStatusLabel(bus.status)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
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
                  placeholder="DL-01-AB-1234" 
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
                <Label htmlFor="edit-year">Year</Label>
                <Input 
                  id="edit-year" 
                  type="number"
                  placeholder="2023" 
                  {...register("year", { valueAsNumber: true })}
                  className={errors.year ? "border-destructive" : ""}
                />
                {errors.year && (
                  <p className="text-sm text-destructive">{errors.year.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-capacity">Capacity</Label>
                <Input 
                  id="edit-capacity" 
                  type="number"
                  placeholder="50" 
                  {...register("capacity", { valueAsNumber: true })}
                  className={errors.capacity ? "border-destructive" : ""}
                />
                {errors.capacity && (
                  <p className="text-sm text-destructive">{errors.capacity.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-assignedRoute">Assigned Route</Label>
                <Popover open={editRouteSearchOpen} onOpenChange={setEditRouteSearchOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={editRouteSearchOpen}
                      className="w-full justify-between h-10 px-3 py-2 text-left font-normal"
                    >
                      <span className="truncate">
                        {assignedRoute ? 
                          routes.find((route) => route.id === assignedRoute)?.name || "Select route..." :
                          "Select route..."
                        }
                      </span>
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
                    <Command>
                      <CommandInput placeholder="Search routes..." />
                      <CommandList>
                        <CommandEmpty>No routes found.</CommandEmpty>
                        <CommandGroup>
                          {routes.map((route) => (
                            <CommandItem
                              key={route.id}
                              value={route.name}
                              onSelect={() => {
                                setValue("assignedRoute", route.id!);
                                setEditRouteSearchOpen(false);
                              }}
                            >
                              <Check
                                className={`mr-2 h-4 w-4 ${
                                  assignedRoute === route.id ? "opacity-100" : "opacity-0"
                                }`}
                              />
                              <div className="flex flex-col">
                                <span className="font-medium">{route.name}</span>
                                <span className="text-sm text-muted-foreground">
                                  {route.startPoint} → {route.endPoint}
                                </span>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                {errors.assignedRoute && (
                  <p className="text-sm text-destructive">{errors.assignedRoute.message}</p>
                )}
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
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => {
                  setIsEditDialogOpen(false);
                  setEditRouteSearchOpen(false);
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