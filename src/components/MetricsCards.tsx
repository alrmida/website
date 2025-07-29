
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, Clock, Zap } from 'lucide-react';
import WaterTankIndicator from './WaterTankIndicator';

interface MetricsCardsProps {
  waterTank: {
    currentLevel: number;
    maxCapacity: number;
    percentage: number;
  };
  machineStatus: string;
  totalWaterProduced: number;
  lastUpdate: string | null;
}

const formatNumber = (value: number, decimals: number = 1): string => {
  if (value >= 1000) {
    return (value / 1000).toFixed(decimals).replace(/\.0$/, '') + 'k';
  }
  return value.toFixed(decimals).replace(/\.0$/, '');
};

const formatDate = (dateString: string | null): string => {
  if (!dateString) return 'No data available';
  
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - date.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.ceil(diffDays / 7)} weeks ago`;
  
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
  });
};

const getStatusColor = (status: string): string => {
  switch (status.toLowerCase()) {
    case 'producing': return 'text-status-producing-blue';
    case 'idle': return 'text-kumulus-orange';
    case 'full water': return 'text-kumulus-chambray';
    case 'disconnected': return 'text-status-disconnected-yellow';
    default: return 'text-gray-500';
  }
};

const getStatusIcon = (status: string) => {
  switch (status.toLowerCase()) {
    case 'producing': return <Zap className="h-5 w-5 text-status-producing-blue" />;
    case 'idle': return <Clock className="h-5 w-5 text-kumulus-orange" />;
    case 'full water': return <Activity className="h-5 w-5 text-kumulus-chambray" />;
    case 'disconnected': return <Activity className="h-5 w-5 text-status-disconnected-yellow" />;
    default: return <Activity className="h-5 w-5 text-gray-500" />;
  }
};

const MetricsCards = ({ waterTank, machineStatus, totalWaterProduced, lastUpdate }: MetricsCardsProps) => {
  const currentYear = new Date().getFullYear();
  const trackingStartDate = `Jan ${currentYear}`;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {/* Water Level Card with Animated Tank */}
      <div className="lg:col-span-2">
        <WaterTankIndicator
          currentLevel={waterTank.currentLevel}
          maxCapacity={waterTank.maxCapacity}
          percentage={waterTank.percentage}
        />
      </div>

      {/* Machine Status Card */}
      <Card className="bg-white dark:bg-gray-800 border-2 hover:border-gray-300 transition-all duration-200 hover:shadow-lg">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-3 text-lg font-semibold">
            <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
              {getStatusIcon(machineStatus)}
            </div>
            Machine Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className={`text-3xl font-bold ${getStatusColor(machineStatus)}`}>
              {machineStatus}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Last updated {lastUpdate ? formatDate(lastUpdate) : 'unknown'}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Total Production Card */}
      <Card className="bg-white dark:bg-gray-800 border-2 hover:border-kumulus-green/30 transition-all duration-200 hover:shadow-lg">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-3 text-lg font-semibold">
            <div className="p-2 bg-kumulus-green/10 rounded-lg">
              <Activity className="h-5 w-5 text-kumulus-green" />
            </div>
            Total Water Produced
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="text-3xl font-bold text-kumulus-green">
              {formatNumber(totalWaterProduced, 1)}L
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Since {trackingStartDate}
            </div>
            {totalWaterProduced > 0 && (
              <div className="text-xs text-kumulus-green/70">
                ≈ {formatNumber(totalWaterProduced * 0.264172, 0)} gallons
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* System Performance Card */}
      <Card className="bg-white dark:bg-gray-800 border-2 hover:border-kumulus-orange/30 transition-all duration-200 hover:shadow-lg">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-3 text-lg font-semibold">
            <div className="p-2 bg-kumulus-orange/10 rounded-lg">
              <Activity className="h-5 w-5 text-kumulus-orange" />
            </div>
            System Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="text-3xl font-bold text-kumulus-orange">
              {totalWaterProduced > 0 ? '98%' : '--'}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Average efficiency since {trackingStartDate}
            </div>
            {totalWaterProduced > 0 && (
              <div className="text-xs text-kumulus-orange/70">
                Optimal performance range
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MetricsCards;
