import { Bus, Route, Users, TrendingUp, Clock, MapPin, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const stats = [
  {
    title: "Total Buses",
    value: "24",
    change: "+2",
    icon: Bus,
    color: "text-primary",
    bgColor: "bg-primary/10"
  },
  {
    title: "Active Routes",
    value: "8",
    change: "+1",
    icon: Route,
    color: "text-success",
    bgColor: "bg-success/10"
  },
  {
    title: "Drivers",
    value: "32",
    change: "+4",
    icon: Users,
    color: "text-warning",
    bgColor: "bg-warning/10"
  },
  {
    title: "Daily Trips",
    value: "156",
    change: "+12",
    icon: TrendingUp,
    color: "text-accent",
    bgColor: "bg-accent/10"
  },
];

const recentActivity = [
  {
    id: 1,
    type: "bus_added",
    message: "New bus KA-05-AB-1234 added to Route A",
    time: "2 hours ago",
    status: "success"
  },
  {
    id: 2,
    type: "driver_assigned",
    message: "Driver Rajesh Kumar assigned to Route B",
    time: "4 hours ago",
    status: "info"
  },
  {
    id: 3,
    type: "route_updated",
    message: "Route C schedule updated - 2 new stops added",
    time: "1 day ago",
    status: "warning"
  },
  {
    id: 4,
    type: "maintenance",
    message: "Bus KA-05-CD-5678 scheduled for maintenance",
    time: "2 days ago",
    status: "error"
  },
];

const activeBuses = [
  { id: "KA-05-AB-1234", route: "Route A", driver: "Rajesh Kumar", status: "On Route", location: "MG Road" },
  { id: "KA-05-CD-5678", route: "Route B", driver: "Suresh Babu", status: "At Stop", location: "City Center" },
  { id: "KA-05-EF-9012", route: "Route C", driver: "Manjunath", status: "On Route", location: "Electronic City" },
  { id: "KA-05-GH-3456", route: "Route A", driver: "Pradeep", status: "Break", location: "Bus Depot" },
];

export default function Dashboard() {
  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="bg-gradient-hero rounded-2xl p-8 text-white">
        <div className="max-w-3xl">
          <h1 className="text-3xl font-bold mb-2">Welcome to TransitHub Admin</h1>
          <p className="text-white/90 mb-6">
            Monitor and manage your city's public transport system. Track buses in real-time, 
            manage routes, and ensure smooth operations for better commuter experience.
          </p>
          <div className="flex space-x-4">
            <Button variant="secondary" className="bg-white/20 text-white border-white/30 hover:bg-white/30">
              <MapPin className="mr-2 h-4 w-4" />
              View Live Map
            </Button>
            <Button variant="outline" className="border-white/30 text-white hover:bg-white/10">
              Generate Reports
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <Card key={stat.title} className="bg-gradient-card shadow-card hover:shadow-elevated transition-all duration-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                  <div className="flex items-center mt-2">
                    <p className="text-3xl font-bold">{stat.value}</p>
                    <span className="ml-2 text-sm text-success font-medium">
                      {stat.change}
                    </span>
                  </div>
                </div>
                <div className={`p-3 rounded-xl ${stat.bgColor}`}>
                  <stat.icon className={`h-6 w-6 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Active Buses */}
        <Card className="bg-gradient-card shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Bus className="mr-2 h-5 w-5 text-primary" />
              Active Buses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {activeBuses.map((bus) => (
                <div key={bus.id} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                  <div>
                    <p className="font-medium">{bus.id}</p>
                    <p className="text-sm text-muted-foreground">{bus.route} • {bus.driver}</p>
                  </div>
                  <div className="text-right">
                    <Badge 
                      variant={bus.status === "On Route" ? "default" : 
                              bus.status === "At Stop" ? "secondary" : "outline"}
                      className="mb-1"
                    >
                      {bus.status}
                    </Badge>
                    <p className="text-xs text-muted-foreground flex items-center">
                      <MapPin className="mr-1 h-3 w-3" />
                      {bus.location}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="bg-gradient-card shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Clock className="mr-2 h-5 w-5 text-primary" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-start space-x-3 p-3 bg-muted/50 rounded-lg">
                  <div className={`p-2 rounded-full ${
                    activity.status === "success" ? "bg-success/10 text-success" :
                    activity.status === "info" ? "bg-primary/10 text-primary" :
                    activity.status === "warning" ? "bg-warning/10 text-warning" :
                    "bg-destructive/10 text-destructive"
                  }`}>
                    <AlertCircle className="h-3 w-3" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{activity.message}</p>
                    <p className="text-xs text-muted-foreground">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="bg-gradient-card shadow-card">
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button className="p-6 h-auto flex-col space-y-2 bg-primary/5 border-2 border-primary/20 hover:bg-primary/10">
              <Bus className="h-8 w-8 text-primary" />
              <span className="font-medium">Add New Bus</span>
              <span className="text-xs text-muted-foreground">Register a new bus to the system</span>
            </Button>
            <Button className="p-6 h-auto flex-col space-y-2 bg-success/5 border-2 border-success/20 hover:bg-success/10">
              <Route className="h-8 w-8 text-success" />
              <span className="font-medium">Create Route</span>
              <span className="text-xs text-muted-foreground">Set up a new bus route</span>
            </Button>
            <Button className="p-6 h-auto flex-col space-y-2 bg-warning/5 border-2 border-warning/20 hover:bg-warning/10">
              <Users className="h-8 w-8 text-warning" />
              <span className="font-medium">Add Driver</span>
              <span className="text-xs text-muted-foreground">Register a new driver</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}