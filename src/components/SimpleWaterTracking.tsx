
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Droplets, Camera, Activity, Clock, Server } from 'lucide-react';
import { useSimpleWaterProduction } from '@/hooks/useSimpleWaterProduction';

interface SimpleWaterTrackingProps {
  machineId: string;
  currentWaterLevel: number;
}

const SimpleWaterTracking = ({ machineId, currentWaterLevel }: SimpleWaterTrackingProps) => {
  const { data, isLoading, error } = useSimpleWaterProduction(machineId, currentWaterLevel);

  const formatDate = (date: Date | null) => {
    if (!date) return 'Never';
    return date.toLocaleString();
  };

  if (isLoading) {
    return (
      <Card className="bg-white dark:bg-gray-800 mb-6">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-300">
            Server-Side Water Production Tracking
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-4">
            <div className="text-sm text-gray-500">Loading tracking data...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="bg-white dark:bg-gray-800 mb-6">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-300">
            Server-Side Water Production Tracking - Error
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-red-500">Error: {error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="mb-6">
      {/* Status Card */}
      <Card className="bg-white dark:bg-gray-800 mb-4">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-300 flex items-center gap-2">
            <Server className="h-4 w-4 text-green-500" />
            Server-Side Water Production Tracking System
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-300">Status:</span>
              <span className={`text-sm font-medium ${data.isTracking ? 'text-green-600' : 'text-yellow-600'}`}>
                {data.isTracking ? 'Active (Server)' : 'Initializing'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-300">Current Level:</span>
              <span className="text-sm font-medium text-blue-600">
                {currentWaterLevel.toFixed(2)} L
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-300">Last Server Snapshot:</span>
              <span className="text-sm text-gray-500">
                {formatDate(data.lastSnapshot)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-white dark:bg-gray-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-300">
              Total Production
            </CardTitle>
            <Droplets className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {data.totalProduced.toFixed(2)} L
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Server-calculated cumulative total
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-gray-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-300">
              Server Interval
            </CardTitle>
            <Camera className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              15 min
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Automated server snapshots
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-gray-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-300">
              Next Server Check
            </CardTitle>
            <Clock className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold text-orange-600">
              {data.lastSnapshot ? 
                Math.max(0, 15 - Math.floor((Date.now() - data.lastSnapshot.getTime()) / (1000 * 60))) 
                : 15} min
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Until next server snapshot
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Information Card */}
      <Card className="bg-green-50 dark:bg-green-900/20 mt-4">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-green-700 dark:text-green-300">
            How server-side tracking works
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-green-700 dark:text-green-300 space-y-1">
            <p>• Server automatically takes water level snapshots every 15 minutes</p>
            <p>• Calculates positive differences between snapshots</p>
            <p>• Only counts increases greater than 0.1L as production</p>
            <p>• Shows cumulative total of all production events</p>
            <p>• Runs continuously on the server (works even when dashboard is closed)</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SimpleWaterTracking;
