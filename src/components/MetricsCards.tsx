
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, Clock, Zap, Leaf, Recycle, TrendingUp } from 'lucide-react';
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

  // Calculate ESG metrics based on water production
  const co2Saved = Math.round(totalWaterProduced * 0.234); // kg CO2 saved per liter
  const plasticBottlesSaved = Math.round(totalWaterProduced / 0.5); // 500ml bottles
  const moneySaved = Math.round(totalWaterProduced * 0.5); // €0.50 per liter saved

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
        {/* Water Level Card with Animated Tank - spans 2 columns */}
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

        {/* Money Saved Card */}
        <Card className="bg-white dark:bg-gray-800 border-2 hover:border-kumulus-yellow/30 transition-all duration-200 hover:shadow-lg">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-3 text-lg font-semibold">
              <div className="p-2 bg-kumulus-yellow/10 rounded-lg">
                <TrendingUp className="h-5 w-5 text-kumulus-yellow" />
              </div>
              Money Saved
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-3xl font-bold text-kumulus-yellow">
                €{formatNumber(moneySaved, 0)}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                vs bottled water
              </div>
              {totalWaterProduced > 0 && (
                <div className="text-xs text-kumulus-yellow/70">
                  Based on €0.50/L savings
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Second row for ESG metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6 mb-8">
        {/* CO₂ Saved Card */}
        <Card className="bg-white dark:bg-gray-800 border-2 hover:border-kumulus-blue/30 transition-all duration-200 hover:shadow-lg">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-3 text-lg font-semibold">
              <div className="p-2 bg-kumulus-blue/10 rounded-lg">
                <Leaf className="h-5 w-5 text-kumulus-blue" />
              </div>
              CO₂ Saved
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-3xl font-bold text-kumulus-blue">
                {formatNumber(co2Saved, 0)} kg
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                vs bottled water production
              </div>
              {totalWaterProduced > 0 && (
                <div className="text-xs text-kumulus-blue/70">
                  Environmental impact reduction
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Bottles Saved Card */}
        <Card className="bg-white dark:bg-gray-800 border-2 hover:border-kumulus-orange/30 transition-all duration-200 hover:shadow-lg">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-3 text-lg font-semibold">
              <div className="p-2 bg-kumulus-orange/10 rounded-lg">
                <Recycle className="h-5 w-5 text-kumulus-orange" />
              </div>
              Bottles Saved
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-3xl font-bold text-kumulus-orange">
                {formatNumber(plasticBottlesSaved, 0)}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                500ml bottles avoided
              </div>
              {totalWaterProduced > 0 && (
                <div className="text-xs text-kumulus-orange/70">
                  Plastic waste reduction
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
};

export default MetricsCards;
