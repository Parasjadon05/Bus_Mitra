import { useState } from "react";
import { Outlet, NavLink, useLocation } from "react-router-dom";
import { 
  Bus,
  Route, 
  Users, 
  LayoutDashboard, 
  Menu, 
  X,
  Settings,
  LogOut,
  MapPin
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

const navigation = [
  { name: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { name: "Routes", href: "/admin/routes", icon: Route },
  { name: "Buses", href: "/admin/buses", icon: Bus },
  { name: "Drivers", href: "/admin/drivers", icon: Users },
];

export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const { user, logout } = useAuth();

  const isActive = (path: string) => {
    if (path === "/admin") {
      return location.pathname === "/admin";
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen bg-dashboard-bg">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-dashboard-sidebar-bg transform transition-transform duration-300 ease-in-out lg:translate-x-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-dashboard-sidebar-muted/20">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-primary rounded-lg">
                <MapPin className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-dashboard-sidebar-fg">TransitHub</h1>
                <p className="text-xs text-dashboard-sidebar-muted">Admin Panel</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-dashboard-sidebar-muted hover:text-dashboard-sidebar-fg"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-2">
            {navigation.map((item) => {
              const active = isActive(item.href);
              return (
                <NavLink
                  key={item.name}
                  to={item.href}
                  className={cn(
                    "flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200",
                    active
                      ? "bg-primary text-primary-foreground shadow-glow"
                      : "text-dashboard-sidebar-muted hover:text-dashboard-sidebar-fg hover:bg-dashboard-sidebar-muted/10"
                  )}
                  onClick={() => setSidebarOpen(false)}
                >
                  <item.icon className="mr-3 h-5 w-5" />
                  {item.name}
                </NavLink>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="px-4 py-6 border-t border-dashboard-sidebar-muted/20 space-y-2">
            <Button
              variant="ghost"
              className="w-full justify-start text-dashboard-sidebar-muted hover:text-dashboard-sidebar-fg hover:bg-dashboard-sidebar-muted/10"
            >
              <Settings className="mr-3 h-4 w-4" />
              Settings
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start text-dashboard-sidebar-muted hover:text-dashboard-sidebar-fg hover:bg-dashboard-sidebar-muted/10"
              onClick={logout}
            >
              <LogOut className="mr-3 h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <header className="bg-card border-b border-border px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden"
              >
                <Menu className="h-5 w-5" />
              </Button>
              <div>
                <h2 className="text-2xl font-bold text-foreground">
                  {navigation.find(item => isActive(item.href))?.name || "Dashboard"}
                </h2>
                <p className="text-sm text-muted-foreground">
                  Manage your public transport system
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-medium text-foreground">{user?.name || "Admin User"}</p>
                <p className="text-xs text-muted-foreground">{user?.email || "admin@transithub.com"}</p>
              </div>
              <div className="h-8 w-8 rounded-full bg-gradient-primary flex items-center justify-center">
                <span className="text-sm font-medium text-primary-foreground">
                  {user?.name?.charAt(0).toUpperCase() || "A"}
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}