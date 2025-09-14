import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Plus, Search, Edit, Trash2, MapPin, Clock, Loader2 } from "lucide-react";
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
import { useToast } from "@/hooks/use-toast";
import { routeService, Route } from "@/lib/firebaseService";

// Form validation schema
const routeSchema = z.object({
  name: z.string().min(1, "Route name is required"),
  startPoint: z.string().min(1, "Start point is required"),
  endPoint: z.string().min(1, "End point is required"),
  active: z.boolean(),
  distance: z.number().optional(),
  estimatedTime: z.number().optional(),
  description: z.string().optional(),
});

type RouteFormData = z.infer<typeof routeSchema>;

export default function Routes() {
  const [routes, setRoutes] = useState<Route[]>([]);
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
    formState: { errors },
  } = useForm<RouteFormData>({
    resolver: zodResolver(routeSchema),
  });

  // Load routes from Firebase
  useEffect(() => {
    loadRoutes();
  }, []);

  const loadRoutes = async () => {
    try {
      setIsLoading(true);
      const routesData = await routeService.getAll();
      console.log("Routes data loaded:", routesData);
      console.log("First route:", routesData[0]);
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

  // CRUD Operations
  const onSubmit = async (data: RouteFormData) => {
    try {
      setIsSubmitting(true);
      
      const routeData = {
        name: data.name,
        startPoint: data.startPoint,
        endPoint: data.endPoint,
        active: data.active,
        distance: data.distance || 0,
        estimatedTime: data.estimatedTime || 0,
        description: data.description || "",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

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
    setValue("name", route.name || "");
    setValue("startPoint", route.startPoint || "");
    setValue("endPoint", route.endPoint || "");
    setValue("active", route.active || false);
    setValue("distance", route.distance || 0);
    setValue("estimatedTime", route.estimatedTime || 0);
    setValue("description", route.description || "");
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
    (route.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (route.startPoint || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (route.endPoint || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (route.description || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (active: boolean) => {
    return active ? "bg-success text-success-foreground" : "bg-muted text-muted-foreground";
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
          <p className="text-muted-foreground">Manage bus routes and assign them to buses</p>
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
              <div className="space-y-2">
                <Label htmlFor="name">Route Name</Label>
                <Input 
                  id="name" 
                  placeholder="Route 102: Broadway to Thiruvanmiyur" 
                  {...register("name")}
                  className={errors.name ? "border-destructive" : ""}
                />
                {errors.name && (
                  <p className="text-sm text-destructive">{errors.name.message}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea 
                  id="description" 
                  placeholder="Route description..." 
                  {...register("description")}
                  className={errors.description ? "border-destructive" : ""}
                />
                {errors.description && (
                  <p className="text-sm text-destructive">{errors.description.message}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startPoint">Start Point</Label>
                  <Input 
                    id="startPoint" 
                    placeholder="Broadway Bus Terminus" 
                    {...register("startPoint")}
                    className={errors.startPoint ? "border-destructive" : ""}
                  />
                  {errors.startPoint && (
                    <p className="text-sm text-destructive">{errors.startPoint.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endPoint">End Point</Label>
                  <Input 
                    id="endPoint" 
                    placeholder="Thiruvanmiyur" 
                    {...register("endPoint")}
                    className={errors.endPoint ? "border-destructive" : ""}
                  />
                  {errors.endPoint && (
                    <p className="text-sm text-destructive">{errors.endPoint.message}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="distance">Distance (km)</Label>
                  <Input 
                    id="distance" 
                    type="number"
                    placeholder="17" 
                    {...register("distance", { valueAsNumber: true })}
                    className={errors.distance ? "border-destructive" : ""}
                  />
                  {errors.distance && (
                    <p className="text-sm text-destructive">{errors.distance.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="estimatedTime">Estimated Time (min)</Label>
                  <Input 
                    id="estimatedTime" 
                    type="number"
                    placeholder="50" 
                    {...register("estimatedTime", { valueAsNumber: true })}
                    className={errors.estimatedTime ? "border-destructive" : ""}
                  />
                  {errors.estimatedTime && (
                    <p className="text-sm text-destructive">{errors.estimatedTime.message}</p>
                  )}
                </div>
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
                {errors.active && (
                  <p className="text-sm text-destructive">{errors.active.message}</p>
                )}
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-card shadow-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Routes</p>
                <p className="text-2xl font-bold">{totalRoutes}</p>
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
                <p className="text-sm text-muted-foreground">Inactive Routes</p>
                <p className="text-2xl font-bold text-muted-foreground">
                  {totalRoutes - activeRoutes}
                </p>
              </div>
              <div className="h-8 w-8 bg-muted/10 rounded-lg flex items-center justify-center">
                <Clock className="h-4 w-4 text-muted-foreground" />
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
                <TableHead>Start - End</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                    <p className="text-muted-foreground">Loading routes...</p>
                  </TableCell>
                </TableRow>
              ) : filteredRoutes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
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
                          {route.distance ? `${route.distance} km` : ''} 
                          {route.estimatedTime ? ` • ${route.estimatedTime} min` : ''}
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
                      <div className="text-sm text-muted-foreground max-w-xs truncate">
                        {route.description || "No description"}
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
              <Label htmlFor="edit-description">Description (Optional)</Label>
              <Textarea 
                id="edit-description" 
                placeholder="Route description..." 
                {...register("description")}
                className={errors.description ? "border-destructive" : ""}
              />
              {errors.description && (
                <p className="text-sm text-destructive">{errors.description.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-startLocation">Start Location</Label>
                <Input 
                  id="edit-startLocation" 
                  placeholder="Enter start location" 
                  {...register("startLocation")}
                  className={errors.startLocation ? "border-destructive" : ""}
                />
                {errors.startLocation && (
                  <p className="text-sm text-destructive">{errors.startLocation.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-endLocation">End Location</Label>
                <Input 
                  id="edit-endLocation" 
                  placeholder="Enter end location" 
                  {...register("endLocation")}
                  className={errors.endLocation ? "border-destructive" : ""}
                />
                {errors.endLocation && (
                  <p className="text-sm text-destructive">{errors.endLocation.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-status">Status</Label>
              <select 
                {...register("status")}
                className="w-full p-2 border rounded-md"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
              {errors.status && (
                <p className="text-sm text-destructive">{errors.status.message}</p>
              )}
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