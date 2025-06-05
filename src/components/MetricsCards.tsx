
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Activity, Monitor, Database, Leaf, Recycle } from 'lucide-react';
import WaterTankIndicator from '@/components/WaterTankIndicator';

interface MetricsCardsProps {
  waterTank: {
    currentLevel: number;
    maxCapacity: number;
    percentage: number;
  };
  machineStatus?: string;
  totalWaterProduced: number;
}

const MetricsCards = ({ waterTank, machineStatus = 'Offline', totalWaterProduced }: MetricsCardsProps) => {
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

  // Calculate ESG metrics based on water production
  const co2Saved = Math.round(totalWaterProduced * 0.234); // kg CO2 saved per liter
  const plasticBottlesSaved = Math.round(totalWaterProduced / 0.5); // 500ml bottles

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
      {/* Left side - larger cards */}
      <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
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
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{machineStatus}</div>
            <Badge variant="secondary" className={`mt-2 ${getStatusColor(machineStatus)}`}>
              {getStatusIcon(machineStatus)}
            </Badge>
          </CardContent>
        </Card>
      </div>

      {/* Right side - 2x2 grid of smaller cards */}
      <div className="lg:col-span-2 grid grid-cols-2 gap-4">
        <Card className="bg-white dark:bg-gray-800 hover:shadow-lg transition-shadow border-gray-200 dark:border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium text-gray-600 dark:text-gray-300">📊 Total Water</CardTitle>
            <Database className="h-3 w-3 text-blue-600 dark:text-blue-400" />
          </CardHeader>
          <CardContent className="pb-3">
            <div className="text-lg font-bold text-gray-900 dark:text-white">{totalWaterProduced.toFixed(1)} L</div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Since activation</p>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-gray-800 hover:shadow-lg transition-shadow border-gray-200 dark:border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium text-gray-600 dark:text-gray-300">💰 Money Saved</CardTitle>
            <Activity className="h-3 w-3 text-green-600 dark:text-green-400" />
          </CardHeader>
          <CardContent className="pb-3">
            <div className="text-lg font-bold text-green-600 dark:text-green-400">€622.85</div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Since activation</p>
          </CardContent>
        </Card>

        <Card className="bg-green-50 dark:bg-green-900/20 hover:shadow-lg transition-shadow border-green-200 dark:border-green-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium text-green-700 dark:text-green-300">🌱 CO₂ Saved</CardTitle>
            <Leaf className="h-3 w-3 text-green-600 dark:text-green-400" />
          </CardHeader>
          <CardContent className="pb-3">
            <div className="text-lg font-bold text-green-600 dark:text-green-400">{co2Saved} kg</div>
            <p className="text-xs text-green-600 dark:text-green-400 mt-1">vs bottled water</p>
          </CardContent>
        </Card>

        <Card className="bg-blue-50 dark:bg-blue-900/20 hover:shadow-lg transition-shadow border-blue-200 dark:border-blue-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium text-blue-700 dark:text-blue-300">♻️ Bottles Saved</CardTitle>
            <Recycle className="h-3 w-3 text-blue-600 dark:text-blue-400" />
          </CardHeader>
          <CardContent className="pb-3">
            <div className="text-lg font-bold text-blue-600 dark:text-blue-400">{plasticBottlesSaved}</div>
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">500ml bottles</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default MetricsCards;
