
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Droplets, TrendingUp, Clock, Activity } from 'lucide-react';
import { usePeriodicWaterProduction } from '@/hooks/usePeriodicWaterProduction';

interface WaterProductionMetricsProps {
  liveData: any;
}

const WaterProductionMetrics = ({ liveData }: WaterProductionMetricsProps) => {
  // Use KU001619000079 as the machine ID for the live data machine
  const { data: productionData, isLoading } = usePeriodicWaterProduction('KU001619000079');

  const formatTime = (dateString: string) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleTimeString();
  };

  const formatDate = (date: Date | null) => {
    if (!date) return 'Never';
    return date.toLocaleString();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'producing': return 'text-green-600';
      case 'tank_full': return 'text-blue-600';
      case 'idle': return 'text-yellow-600';
      case 'transitioning': return 'text-orange-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'producing': return 'Producing';
      case 'tank_full': return 'Tank Full';
      case 'idle': return 'Idle';
      case 'transitioning': return 'Transitioning';
      default: return 'Unknown';
    }
  };

  if (isLoading) {
    return (
      <div className="mb-6">
        <Card className="bg-white dark:bg-gray-800">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-300">
              Water Production Metrics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500">Loading production data...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mb-6">
      {/* Control Panel */}
      <Card className="bg-white dark:bg-gray-800 mb-4">
        <CardHeader className="pb-2">
          <div className="flex justify-between items-center">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-300">
              30-Minute Periodic Production System
            </CardTitle>
            <div className="text-xs text-gray-500">
              Auto-updates every 30 minutes
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-xs text-gray-500">
            Last update: {formatDate(productionData.lastUpdate)}
          </p>
          {productionData.lastPeriod && (
            <p className="text-xs text-gray-500">
              Current period status: 
              <span className={`ml-1 font-medium ${getStatusColor(productionData.lastPeriod.period_status)}`}>
                {getStatusLabel(productionData.lastPeriod.period_status)}
              </span>
            </p>
          )}
        </CardContent>
      </Card>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-white dark:bg-gray-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-300">
              Production Rate
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {productionData.productionRate.toFixed(2)} L/h
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Based on 30-minute periods
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-gray-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-300">
              Daily Total
            </CardTitle>
            <Droplets className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {productionData.totalProduced.toFixed(2)} L
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Last 24 hours
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-gray-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-300">
              Active Periods
            </CardTitle>
            <Activity className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {productionData.recentPeriods.filter(p => p.period_status === 'producing').length}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Of {productionData.recentPeriods.length} total periods
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-gray-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-300">
              Last Period
            </CardTitle>
            <Clock className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            {productionData.lastPeriod ? (
              <>
                <div className="text-lg font-bold text-orange-600">
                  {formatTime(productionData.lastPeriod.period_end)}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {productionData.lastPeriod.production_liters.toFixed(2)}L produced
                </p>
              </>
            ) : (
              <div className="text-lg font-bold text-gray-400">
                No data
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Periods Summary */}
      {productionData.recentPeriods.length > 0 && (
        <Card className="bg-white dark:bg-gray-800 mt-4">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-300">
              Recent Production Periods
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {productionData.recentPeriods.slice(0, 12).map((period) => (
                <div key={period.id} className="flex justify-between items-center py-1 border-b border-gray-100 dark:border-gray-700 last:border-b-0">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-gray-500">
                      {formatTime(period.period_end)}
                    </span>
                    <span className={`text-xs font-medium ${getStatusColor(period.period_status)}`}>
                      {getStatusLabel(period.period_status)}
                    </span>
                  </div>
                  <div className="text-xs font-medium">
                    {period.production_liters.toFixed(2)}L
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default WaterProductionMetrics;
