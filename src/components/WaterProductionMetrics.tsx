
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Droplets, TrendingUp, Zap, Clock, RefreshCw, RotateCcw } from 'lucide-react';
import { useBatchWaterProductionCalculator } from '@/hooks/useBatchWaterProductionCalculator';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface WaterProductionMetricsProps {
  liveData: any; // Keep for compatibility but not used in batch processing
}

const WaterProductionMetrics = ({ liveData }: WaterProductionMetricsProps) => {
  const { profile } = useAuth();
  const { productionData, isProcessing, processBatchData, resetMachineMetrics } = useBatchWaterProductionCalculator();

  const formatTime = (date: Date | null) => {
    if (!date) return 'Never';
    return date.toLocaleTimeString();
  };

  const formatDate = (date: Date | null) => {
    if (!date) return 'Never';
    return date.toLocaleString();
  };

  const isAdmin = profile?.role === 'admin';

  return (
    <div className="mb-6">
      {/* Control Panel */}
      <Card className="bg-white dark:bg-gray-800 mb-4">
        <CardHeader className="pb-2">
          <div className="flex justify-between items-center">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-300">
              Water Production Control (1-Hour Window)
            </CardTitle>
            <div className="flex gap-2">
              <Button
                onClick={processBatchData}
                disabled={isProcessing}
                variant="outline"
                size="sm"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isProcessing ? 'animate-spin' : ''}`} />
                {isProcessing ? 'Processing...' : 'Process Batch'}
              </Button>
              
              {isAdmin && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Reset Metrics
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Reset Water Production Metrics</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete all water production metrics for this machine. 
                        This action cannot be undone. Are you sure you want to continue?
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction 
                        onClick={resetMachineMetrics}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        Reset Metrics
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-xs text-gray-500">
            Last calculation: {formatDate(productionData.lastCalculationTime)}
          </p>
          <p className="text-xs text-gray-500">
            Batch processing runs automatically every hour to detect collector_ls1 state changes
          </p>
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
              {productionData.currentProductionRate.toFixed(2)} L/h
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Based on 1-hour collector_ls1 analysis
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
              Last hour production
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
              Detected transitions (1→0)
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
              Last detected transition
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default WaterProductionMetrics;
