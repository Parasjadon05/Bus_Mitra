import { MapPin, Bus, Clock, CheckCircle, Circle, ArrowDown } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface RouteStop {
  id: string
  name: string
  time: string
  status: 'completed' | 'current' | 'upcoming'
  isLast?: boolean
}

interface RouteTrackerProps {
  stops: RouteStop[]
  currentStop?: string
  nextStop?: string
  estimatedArrival?: string
}

export default function RouteTracker({ 
  stops, 
  currentStop, 
  nextStop, 
  estimatedArrival 
}: RouteTrackerProps) {
  if (!stops || stops.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500">
        <MapPin className="h-8 w-8 mx-auto mb-2 text-gray-400" />
        <p>No route information available</p>
      </div>
    )
  }

  return (
    <div className="p-4">
      <div className="mb-4">
        <h3 className="font-semibold text-lg text-gray-900 mb-2">Route Progress</h3>
        {currentStop && (
          <div className="flex items-center gap-2 mb-2">
            <Bus className="h-4 w-4 text-blue-600" />
            <span className="text-sm text-gray-600">Currently at: <strong>{currentStop}</strong></span>
          </div>
        )}
        {nextStop && (
          <div className="flex items-center gap-2 mb-2">
            <ArrowDown className="h-4 w-4 text-green-600" />
            <span className="text-sm text-gray-600">Next: <strong>{nextStop}</strong></span>
          </div>
        )}
        {estimatedArrival && (
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-orange-600" />
            <span className="text-sm text-gray-600">ETA: <strong>{estimatedArrival}</strong></span>
          </div>
        )}
      </div>

      <div className="relative">
        {/* Route Line */}
        <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200"></div>
        
        {/* Stops */}
        <div className="space-y-4">
          {stops.map((stop, index) => (
            <div key={stop.id} className="relative flex items-start gap-4">
              {/* Stop Icon */}
              <div className="relative z-10 flex-shrink-0">
                {stop.status === 'completed' ? (
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center border-2 border-green-500">
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  </div>
                ) : stop.status === 'current' ? (
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center border-2 border-blue-500 animate-pulse">
                    <Bus className="h-6 w-6 text-blue-600" />
                  </div>
                ) : (
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center border-2 border-gray-300">
                    <Circle className="h-6 w-6 text-gray-400" />
                  </div>
                )}
              </div>

              {/* Stop Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="font-medium text-gray-900 truncate">{stop.name}</h4>
                  <Badge 
                    variant={
                      stop.status === 'completed' ? 'default' :
                      stop.status === 'current' ? 'secondary' : 'outline'
                    }
                    className={
                      stop.status === 'completed' ? 'bg-green-100 text-green-800' :
                      stop.status === 'current' ? 'bg-blue-100 text-blue-800' : 
                      'bg-gray-100 text-gray-600'
                    }
                  >
                    {stop.status === 'completed' ? 'Passed' :
                     stop.status === 'current' ? 'Current' : 'Upcoming'}
                  </Badge>
                </div>
                <p className="text-sm text-gray-600">{stop.time}</p>
                
                {/* Connection Line */}
                {index < stops.length - 1 && (
                  <div className="mt-2 h-4 w-0.5 bg-gray-200 ml-6"></div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Progress Summary */}
      <div className="mt-6 p-3 bg-gray-50 rounded-lg">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Progress</span>
          <span className="font-medium text-gray-900">
            {stops.filter(s => s.status === 'completed').length} / {stops.length} stops
          </span>
        </div>
        <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-500"
            style={{ 
              width: `${(stops.filter(s => s.status === 'completed').length / stops.length) * 100}%` 
            }}
          ></div>
        </div>
      </div>
    </div>
  )
}
