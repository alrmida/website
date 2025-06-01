
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

interface MachineInfoHeaderProps {
  machineId: string;
  machineName: string;
  location: string;
  status: string;
  launchDate: string;
}

const MachineInfoHeader = ({ machineId, machineName, location, status, launchDate }: MachineInfoHeaderProps) => {
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'producing':
        return 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200';
      case 'idle':
        return 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200';
      case 'maintenance':
        return 'bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200';
      case 'offline':
        return 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200';
      default:
        return 'bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200';
    }
  };

  return (
    <Card className="bg-white dark:bg-gray-800 mb-6">
      <CardContent className="p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-2">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{machineName}</h2>
              <Badge className={getStatusColor(status)}>
                {status}
              </Badge>
            </div>
            <div className="space-y-1 text-sm text-gray-600 dark:text-gray-300">
              <p><span className="font-medium">Machine ID:</span> {machineId}</p>
              <p><span className="font-medium">Location:</span> {location}</p>
              <p><span className="font-medium">Active since:</span> {launchDate}</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${status.toLowerCase() === 'producing' ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
            <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
              {status === 'Producing' ? 'Online' : 'Offline'}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default MachineInfoHeader;
