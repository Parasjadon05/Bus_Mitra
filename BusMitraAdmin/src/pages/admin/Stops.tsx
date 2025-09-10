import { useState, useEffect } from "react";
import { Plus, Edit, Trash2, MapPin, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { stopService, Stop } from "@/lib/firebaseService";
import { toast } from "sonner";
import { useAutocomplete } from "@/hooks/useAutocomplete";
import { AutocompleteInput } from "@/components/AutocompleteInput";

const stopSchema = z.object({
  stopName: z.string().min(1, "Stop name is required"),
  stopCode: z.string().min(1, "Stop code is required"),
  address: z.string().min(1, "Address is required"),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  latitude: z.string().optional(),
  longitude: z.string().optional(),
  status: z.enum(["active", "inactive"]),
});

type StopFormData = z.infer<typeof stopSchema>;

export default function Stops() {
  const [stops, setStops] = useState<Stop[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingStop, setEditingStop] = useState<Stop | null>(null);

  // Autocomplete hook for address suggestions
  const addressAutocomplete = useAutocomplete();

  const form = useForm<StopFormData>({
    resolver: zodResolver(stopSchema),
    defaultValues: {
      stopName: "",
      stopCode: "",
      address: "",
      city: "",
      state: "",
      latitude: "",
      longitude: "",
      status: "active",
    },
  });

  useEffect(() => {
    loadStops();
  }, []);

  const loadStops = async () => {
    try {
      setLoading(true);
      const data = await stopService.getAll();
      setStops(data);
    } catch (error) {
      console.error("Error loading stops:", error);
      toast.error("Failed to load stops");
    } finally {
      setLoading(false);
    }
  };

  const handleAddressSelect = (suggestion: any) => {
    addressAutocomplete.handleSuggestionSelect(suggestion);
    form.setValue("address", suggestion.address);
    
    // Auto-fill city and state if available
    if (suggestion.city) {
      form.setValue("city", suggestion.city);
    }
    if (suggestion.state) {
      form.setValue("state", suggestion.state);
    }
    
    // Auto-fill coordinates if available
    if (suggestion.coordinates) {
      form.setValue("latitude", suggestion.coordinates.lat.toString());
      form.setValue("longitude", suggestion.coordinates.lng.toString());
    }
  };

  const handleAddressChange = (value: string) => {
    addressAutocomplete.handleInputChange(value);
    form.setValue("address", value);
  };

  const onSubmit = async (data: StopFormData) => {
    try {
      console.log("Form data received:", data);
      
      const stopData: Omit<Stop, 'id' | 'createdAt' | 'updatedAt'> = {
        stopName: data.stopName,
        stopCode: data.stopCode,
        address: data.address,
        city: data.city,
        state: data.state,
        coordinates: data.latitude && data.longitude ? {
          latitude: parseFloat(data.latitude),
          longitude: parseFloat(data.longitude)
        } : undefined,
        status: data.status,
      };

      console.log("Stop data to save:", stopData);

      if (editingStop) {
        await stopService.update(editingStop.id!, stopData);
        toast.success("Stop updated successfully");
      } else {
        await stopService.create(stopData);
        toast.success("Stop created successfully");
      }

      setIsDialogOpen(false);
      setEditingStop(null);
      form.reset();
      addressAutocomplete.setQuery("");
      loadStops();
    } catch (error) {
      console.error("Error saving stop:", error);
      toast.error("Failed to save stop");
    }
  };

  const handleEdit = (stop: Stop) => {
    setEditingStop(stop);
    form.reset({
      stopName: stop.stopName,
      stopCode: stop.stopCode,
      address: stop.address,
      city: stop.city,
      state: stop.state,
      latitude: stop.coordinates?.latitude?.toString() || "",
      longitude: stop.coordinates?.longitude?.toString() || "",
      status: stop.status,
    });
    addressAutocomplete.setQuery(stop.address);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await stopService.delete(id);
      toast.success("Stop deleted successfully");
      loadStops();
    } catch (error) {
      console.error("Error deleting stop:", error);
      toast.error("Failed to delete stop");
    }
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingStop(null);
    form.reset();
    addressAutocomplete.setQuery("");
  };

  const filteredStops = stops.filter(stop =>
    stop.stopName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    stop.stopCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
    stop.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
    stop.address.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading stops...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Bus Stops</h1>
          <p className="text-muted-foreground">Manage bus stops and their locations</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleCloseDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Add Stop
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingStop ? "Edit Stop" : "Add New Stop"}</DialogTitle>
              <DialogDescription>
                {editingStop ? "Update the stop information" : "Add a new bus stop to the system"}
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="stopName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Stop Name</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., ISBT Anand Vihar" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="stopCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Stop Code</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., ISBT-AV" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Address</FormLabel>
                      <FormControl>
                        <AutocompleteInput
                          placeholder="Full address of the stop"
                          value={addressAutocomplete.query}
                          onChange={handleAddressChange}
                          onSelect={handleAddressSelect}
                          suggestions={addressAutocomplete.suggestions}
                          isLoading={addressAutocomplete.isLoading}
                          isOpen={addressAutocomplete.isOpen}
                          selectedIndex={addressAutocomplete.selectedIndex}
                          onKeyDown={addressAutocomplete.handleKeyDown}
                          onClose={addressAutocomplete.closeDropdown}
                          className={form.formState.errors.address ? "border-destructive" : ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>City</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., New Delhi" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="state"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>State</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Delhi" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="latitude"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Latitude (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., 28.650785" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="longitude"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Longitude (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., 77.318609" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="inactive">Inactive</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={handleCloseDialog}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    {editingStop ? "Update Stop" : "Create Stop"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Stops</CardTitle>
          <CardDescription>
            Manage and view all bus stops in the system
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search stops..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>

          {filteredStops.length === 0 ? (
            <div className="text-center py-8">
              <MapPin className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No stops found</h3>
              <p className="text-muted-foreground">
                {searchTerm ? "Try adjusting your search terms" : "Get started by adding your first bus stop"}
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {filteredStops.map((stop) => (
                <Card key={stop.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <MapPin className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold">{stop.stopName}</h3>
                        <p className="text-sm text-muted-foreground">
                          {stop.stopCode} • {stop.city}, {stop.state}
                        </p>
                        <p className="text-sm text-muted-foreground">{stop.address}</p>
                        {stop.coordinates && (
                          <p className="text-xs text-muted-foreground">
                            📍 {stop.coordinates.latitude.toFixed(6)}, {stop.coordinates.longitude.toFixed(6)}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant={stop.status === "active" ? "default" : "secondary"}>
                        {stop.status}
                      </Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(stop)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This action cannot be undone. This will permanently delete the stop
                              "{stop.stopName}" and remove it from all routes.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(stop.id!)}>
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
