import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { User, Phone, LogOut, CreditCard } from "lucide-react";

interface Driver {
  id: string;
  name: string;
  driverId: string;
  licenseNumber: string;
  phone: string;
  email: string;
  status: string;
  address: string;
  licenseExpiry: string;
}

interface DriverDetailsProps {
  driver: Driver;
  onLogout: () => void;
}

export default function DriverDetails({ driver, onLogout }: DriverDetailsProps) {
  return (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
              <User className="w-5 h-5 text-primary" />
            </div>
            Driver Details
          </CardTitle>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onLogout}
            className="text-muted-foreground hover:text-foreground"
          >
            <LogOut className="w-4 h-4 mr-1" />
            Logout
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-4">
          <div>
            <h3 className="text-lg font-semibold text-foreground">{driver.name}</h3>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="secondary" className="text-xs">
                Driver ID: {driver.driverId}
              </Badge>
              <Badge 
                variant={driver.status === 'active' ? 'default' : 'secondary'} 
                className="text-xs"
              >
                Status: {driver.status}
              </Badge>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Phone className="w-4 h-4" />
                <span>{driver.phone}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <User className="w-4 h-4" />
                <span>{driver.email}</span>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-muted-foreground">
                <CreditCard className="w-4 h-4" />
                <span>{driver.licenseNumber}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <CreditCard className="w-4 h-4" />
                <span>Expires: {driver.licenseExpiry}</span>
              </div>
            </div>
          </div>
          
          <div className="text-sm text-muted-foreground">
            <span>Address: {driver.address}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}