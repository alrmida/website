
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw, Droplets, Thermometer, Zap, Activity } from 'lucide-react';

interface MachineInfoProps {
  machineId: string;
  liveData: any;
  loading: boolean;
  onRefresh: () => void;
}

const MachineInfo = ({ machineId, liveData, loading, onRefresh }: MachineInfoProps) => {
  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <Card className="bg-white dark:bg-gray-800 mb-6">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Machine {machineId}</CardTitle>
          <Button
            onClick={onRefresh}
            disabled={loading}
            variant="outline"
            size="sm"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-gray-500">Loading machine data...</p>
        ) : liveData ? (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="flex items-center space-x-2">
              <Droplets className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm text-gray-500">Water Level</p>
                <p className="font-semibold">{liveData.waterLevel?.toFixed(3) || 'N/A'} L</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Thermometer className="h-5 w-5 text-red-500" />
              <div>
                <p className="text-sm text-gray-500">Ambient Temp</p>
                <p className="font-semibold">{liveData.ambient_temp_c?.toFixed(1) || 'N/A'}°C</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Zap className="h-5 w-5 text-yellow-500" />
              <div>
                <p className="text-sm text-gray-500">Current</p>
                <p className="font-semibold">{liveData.current_a?.toFixed(1) || 'N/A'} A</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Activity className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm text-gray-500">Compressor</p>
                <p className="font-semibold">{liveData.compressor_on ? 'ON' : 'OFF'}</p>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-gray-500">No data available</p>
        )}
        {liveData?.lastUpdated && (
          <p className="text-xs text-gray-400 mt-4">
            Last updated: {formatTime(liveData.lastUpdated)}
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default MachineInfo;
