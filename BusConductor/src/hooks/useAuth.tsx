import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { Driver, driverService } from '@/lib/firebaseService';

interface AuthContextType {
  driver: Driver | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (driverId: string, password: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [driver, setDriver] = useState<Driver | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if driver is already logged in (from localStorage)
    const savedDriver = localStorage.getItem('busmitra_driver');
    if (savedDriver) {
      try {
        setDriver(JSON.parse(savedDriver));
      } catch (error) {
        console.error('Error parsing saved driver data:', error);
        localStorage.removeItem('busmitra_driver');
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (driverId: string, password: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      const authenticatedDriver = await driverService.authenticate(driverId, password);
      
      if (authenticatedDriver) {
        setDriver(authenticatedDriver);
        localStorage.setItem('busmitra_driver', JSON.stringify(authenticatedDriver));
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setDriver(null);
    localStorage.removeItem('busmitra_driver');
  };

  const value: AuthContextType = {
    driver,
    isAuthenticated: !!driver,
    isLoading,
    login,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
