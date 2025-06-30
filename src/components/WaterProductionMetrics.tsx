
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Droplets, TrendingUp, Clock, Activity, AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePeriodicWaterProduction } from '@/hooks/usePeriodicWaterProduction';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface WaterProductionMetricsProps {
  liveData: any;
}

const WaterProductionMetrics = ({ liveData }: WaterProductionMetricsProps) => {
  const { data: productionData, isLoading, error, refetch } = usePeriodicWaterProduction('KU001619000079');
  const { toast } = useToast();

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
      case 'consumption': return 'text-purple-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'producing': return 'Producing';
      case 'tank_full': return 'Tank Full';
      case 'idle': return 'Idle';
      case 'transitioning': return 'Transitioning';
      case 'consumption': return 'Consumption';
      default: return 'Unknown';
    }
  };

  const triggerManualCalculation = async () => {
    try {
      console.log('🚀 Triggering manual calculation from UI...');
      
      const { data, error } = await supabase.functions.invoke('calculate-water-production', {
        body: { manual: true }
      });

      if (error) {
        console.error('❌ Error:', error);
        toast({
          title: "Error",
          description: `Failed to trigger calculation: ${error.message}`,
          variant: "destructive",
        });
        return;
      }

      console.log('✅ Success:', data);
      toast({
        title: "Success",
        description: "Calculation triggered successfully. Refreshing data...",
      });
      
      // Refresh the data after a short delay
      setTimeout(() => {
        refetch();
      }, 2000);
      
    } catch (error) {
      console.error('💥 Exception:', error);
      toast({
        title: "Error",
        description: "Failed to trigger calculation",
        variant: "destructive",
      });
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
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin text-blue-600 mr-2" />
              <p className="text-sm text-gray-500">Loading production data...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mb-6">
        <Card className="bg-white dark:bg-gray-800">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-300 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              Water Production Metrics - Error
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-red-500 mb-4">Error loading production data: {error}</p>
            <Button onClick={refetch} size="sm">
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check if we have no data
  const hasNoData = productionData.recentPeriods.length === 0;

  return (
    <div className="mb-6">
      {/* Control Panel */}
      <Card className="bg-white dark:bg-gray-800 mb-4">
        <CardHeader className="pb-2">
          <div className="flex justify-between items-center">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-300 flex items-center gap-2">
              {hasNoData && <AlertTriangle className="h-4 w-4 text-yellow-500" />}
              30-Minute Periodic Production System
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button 
                onClick={triggerManualCalculation}
                size="sm"
                variant="outline"
                className="text-xs"
              >
                Trigger Now
              </Button>
              <div className="text-xs text-gray-500">
                Auto-updates every 30 minutes
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-1">
            <p className="text-xs text-gray-500">
              Last update: {formatDate(productionData.lastUpdate)}
            </p>
            {hasNoData ? (
              <div className="flex items-center gap-2 text-yellow-600">
                <AlertTriangle className="h-3 w-3" />
                <p className="text-xs font-medium">
                  No production data available. The system may be starting up or there could be a data collection issue.
                </p>
              </div>
            ) : (
              productionData.lastPeriod && (
                <p className="text-xs text-gray-500">
                  Current period status: 
                  <span className={`ml-1 font-medium ${getStatusColor(productionData.lastPeriod.period_status)}`}>
                    {getStatusLabel(productionData.lastPeriod.period_status)}
                  </span>
                </p>
              )
            )}
          </div>
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
              Based on {hasNoData ? 'no' : 'recent'} periods
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

      {/* Recent Periods Summary or No Data Message */}
      {hasNoData ? (
        <Card className="bg-white dark:bg-gray-800 mt-4">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-300 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
              No Production Data Available
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <p className="text-sm text-gray-600 dark:text-gray-300">
                The water production calculation system hasn't generated any data yet. This could be because:
              </p>
              <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-1 ml-4">
                <li>• The system is still collecting initial data points</li>
                <li>• The InfluxDB connection needs to be configured</li>
                <li>• The scheduled calculation job isn't running</li>
              </ul>
              <Button 
                onClick={triggerManualCalculation}
                className="mt-4"
                size="sm"
              >
                Try Manual Calculation
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        productionData.recentPeriods.length > 0 && (
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
        )
      )}
    </div>
  );
};

export default WaterProductionMetrics;
