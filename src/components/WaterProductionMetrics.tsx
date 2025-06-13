
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Droplets, TrendingUp, Zap, Clock } from 'lucide-react';
import { useWaterProductionCalculator } from '@/hooks/useWaterProductionCalculator';

interface WaterProductionMetricsProps {
  liveData: any;
}

const WaterProductionMetrics = ({ liveData }: WaterProductionMetricsProps) => {
  const { productionData, pumpEvents } = useWaterProductionCalculator(liveData);

  const formatTime = (date: Date | null) => {
    if (!date) return 'Never';
    return date.toLocaleTimeString();
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <Card className="bg-white dark:bg-gray-800">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-300">
            Production Rate
          </CardTitle>
          <TrendingUp className="h-4 w-4 text-blue-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-blue-600">
            {productionData.currentProductionRate.toFixed(2)} L/h
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Based on recent pump cycles
          </p>
        </CardContent>
      </Card>

      <Card className="bg-white dark:bg-gray-800">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-300">
            Total Produced
          </CardTitle>
          <Droplets className="h-4 w-4 text-green-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">
            {productionData.totalProduced.toFixed(2)} L
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Since tracking started
          </p>
        </CardContent>
      </Card>

      <Card className="bg-white dark:bg-gray-800">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-300">
            Pump Cycles
          </CardTitle>
          <Zap className="h-4 w-4 text-purple-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-purple-600">
            {productionData.pumpCycles}
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Avg: {productionData.averageProductionPerCycle.toFixed(2)} L/cycle
          </p>
        </CardContent>
      </Card>

      <Card className="bg-white dark:bg-gray-800">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-300">
            Last Pump Event
          </CardTitle>
          <Clock className="h-4 w-4 text-orange-600" />
        </CardHeader>
        <CardContent>
          <div className="text-lg font-bold text-orange-600">
            {formatTime(productionData.lastPumpEvent)}
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Last production cycle
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default WaterProductionMetrics;
