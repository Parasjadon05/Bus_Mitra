import React from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

// Test schema matching the main form
const stopSchema = z.object({
  id: z.string().min(1, "Stop ID is required"),
  name: z.string().min(1, "Stop name is required"),
  latitude: z.number().min(-90).max(90, "Invalid latitude"),
  longitude: z.number().min(-180).max(180, "Invalid longitude"),
  sequence: z.number().min(1, "Sequence must be at least 1"),
});

const routeSchema = z.object({
  id: z.string().optional(),
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

export default function RouteFormTest() {
  const { register, handleSubmit, control, reset, formState: { errors } } = useForm<RouteFormData>({
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

  const onSubmit = (data: RouteFormData) => {
    console.log("Form submitted with data:", data);
    
    // Simulate the data processing that happens in the real form
    const routeId = `route_${Math.floor(Math.random() * 1000)}`;
    const updatedStops = data.stops
      .filter(stop => stop.name.trim() !== "")
      .map((stop, index) => ({
        id: `stop_${index + 1}`,
        name: stop.name.trim(),
        latitude: Number(stop.latitude),
        longitude: Number(stop.longitude),
        sequence: index + 1,
      }));

    const routeData = {
      id: routeId,
      name: data.name.trim(),
      startPoint: data.startPoint.trim(),
      endPoint: data.endPoint.trim(),
      active: data.active,
      distance: Number(data.distance) || 0,
      estimatedTime: Number(data.estimatedTime) || 0,
      stops: updatedStops,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    console.log("Processed route data:", routeData);
    alert("Form submitted successfully! Check console for data.");
  };

  const addStop = () => {
    const nextSequence = fields.length + 1;
    append({
      id: `stop_${nextSequence}`,
      name: "",
      latitude: 0,
      longitude: 0,
      sequence: nextSequence,
    });
  };

  const removeStop = (index: number) => {
    if (fields.length > 2) {
      remove(index);
    } else {
      alert("At least 2 stops are required");
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Route Form Test</h1>
      
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic Information */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Basic Information</h2>
          
          <div>
            <label className="block text-sm font-medium mb-1">Route Name</label>
            <input
              {...register("name")}
              placeholder="Route 102: Broadway to Thiruvanmiyur"
              className="w-full p-2 border rounded-md"
            />
            {errors.name && <p className="text-red-500 text-sm">{errors.name.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Start Point</label>
              <input
                {...register("startPoint")}
                placeholder="Broadway Bus Terminus"
                className="w-full p-2 border rounded-md"
              />
              {errors.startPoint && <p className="text-red-500 text-sm">{errors.startPoint.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">End Point</label>
              <input
                {...register("endPoint")}
                placeholder="Thiruvanmiyur"
                className="w-full p-2 border rounded-md"
              />
              {errors.endPoint && <p className="text-red-500 text-sm">{errors.endPoint.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Distance (km)</label>
              <input
                {...register("distance", { valueAsNumber: true })}
                type="number"
                placeholder="17"
                className="w-full p-2 border rounded-md"
              />
              {errors.distance && <p className="text-red-500 text-sm">{errors.distance.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Estimated Time (min)</label>
              <input
                {...register("estimatedTime", { valueAsNumber: true })}
                type="number"
                placeholder="50"
                className="w-full p-2 border rounded-md"
              />
              {errors.estimatedTime && <p className="text-red-500 text-sm">{errors.estimatedTime.message}</p>}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Status</label>
            <select {...register("active", { setValueAs: (value) => value === "true" })} className="w-full p-2 border rounded-md">
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </div>
        </div>

        {/* Stops Management */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Route Stops</h2>
            <button type="button" onClick={addStop} className="px-4 py-2 bg-blue-500 text-white rounded-md">
              Add Stop
            </button>
          </div>

          <div className="space-y-3">
            {fields.map((field, index) => (
              <div key={field.id} className="p-4 border rounded-md">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium">Stop {index + 1}</h3>
                  {fields.length > 2 && (
                    <button
                      type="button"
                      onClick={() => removeStop(index)}
                      className="text-red-500 hover:text-red-700"
                    >
                      Remove
                    </button>
                  )}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">Stop Name</label>
                    <input
                      {...register(`stops.${index}.name`)}
                      placeholder={`Stop ${index + 1} name`}
                      className="w-full p-2 border rounded-md"
                    />
                    {errors.stops?.[index]?.name && (
                      <p className="text-red-500 text-sm">{errors.stops[index]?.name?.message}</p>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">Stop ID</label>
                    <input
                      {...register(`stops.${index}.id`)}
                      placeholder="stop_1"
                      className="w-full p-2 border rounded-md"
                    />
                    {errors.stops?.[index]?.id && (
                      <p className="text-red-500 text-sm">{errors.stops[index]?.id?.message}</p>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">Latitude</label>
                    <input
                      {...register(`stops.${index}.latitude`, { valueAsNumber: true })}
                      type="number"
                      step="0.000001"
                      placeholder="13.05"
                      className="w-full p-2 border rounded-md"
                    />
                    {errors.stops?.[index]?.latitude && (
                      <p className="text-red-500 text-sm">{errors.stops[index]?.latitude?.message}</p>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">Longitude</label>
                    <input
                      {...register(`stops.${index}.longitude`, { valueAsNumber: true })}
                      type="number"
                      step="0.000001"
                      placeholder="80.2824"
                      className="w-full p-2 border rounded-md"
                    />
                    {errors.stops?.[index]?.longitude && (
                      <p className="text-red-500 text-sm">{errors.stops[index]?.longitude?.message}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {errors.stops && <p className="text-red-500 text-sm">{errors.stops.message}</p>}
        </div>

        <div className="flex justify-end space-x-2 pt-4 border-t">
          <button
            type="button"
            onClick={() => reset()}
            className="px-4 py-2 border rounded-md"
          >
            Reset
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-green-500 text-white rounded-md"
          >
            Submit Route
          </button>
        </div>
      </form>
    </div>
  );
}
