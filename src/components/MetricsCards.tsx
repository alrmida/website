
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Activity, Settings, Monitor, Database } from 'lucide-react';
import WaterTankIndicator from '@/components/WaterTankIndicator';

interface MetricsCardsProps {
  waterTank: {
    currentLevel: number;
    maxCapacity: number;
    percentage: number;
  };
  launchDate: string;
  machineStatus?: string;
}

const MetricsCards = ({ waterTank, launchDate, machineStatus = 'Offline' }: MetricsCardsProps) => {
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'producing':
        return 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200';
      case 'idle':
        return 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200';
      case 'full water':
        return 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200';
      case 'disconnected':
      case 'offline':
        return 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200';
      default:
        return 'bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    const isOnline = !['disconnected', 'offline', 'loading...'].includes(status.toLowerCase());
    return isOnline ? 'Online' : 'Offline';
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <WaterTankIndicator
        currentLevel={waterTank.currentLevel}
        maxCapacity={waterTank.maxCapacity}
        percentage={waterTank.percentage}
      />

      <Card className="bg-white dark:bg-gray-800 hover:shadow-lg transition-shadow border-gray-200 dark:border-gray-700">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-300">⚡ Machine State</CardTitle>
          <Monitor className="h-4 w-4 text-green-600 dark:text-green-400" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-gray-900 dark:text-white">{machineStatus}</div>
          <Badge variant="secondary" className={`mt-2 ${getStatusColor(machineStatus)}`}>
            {getStatusIcon(machineStatus)}
          </Badge>
        </CardContent>
      </Card>

      <Card className="bg-white dark:bg-gray-800 hover:shadow-lg transition-shadow border-gray-200 dark:border-gray-700">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-300">📊 Total Water Produced</CardTitle>
          <Database className="h-4 w-4 text-blue-600 dark:text-blue-400" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-gray-900 dark:text-white">1245.7 L</div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Since {launchDate}</p>
        </CardContent>
      </Card>

      <Card className="bg-white dark:bg-gray-800 hover:shadow-lg transition-shadow border-gray-200 dark:border-gray-700">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-300">💰 Money Saved</CardTitle>
          <Activity className="h-4 w-4 text-green-600 dark:text-green-400" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-green-600 dark:text-green-400">€622.85</div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Since {launchDate}</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default MetricsCards;
