
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Info, TrendingUp, BarChart3, Clock, CheckCircle, AlertCircle, XCircle } from 'lucide-react';
import { ProductionData, MonthlyProductionData, StatusData, MonthlyStatusData } from '@/types/productionAnalytics';

interface ProductionSummaryCardsProps {
  selectedPeriod: string;
  dailyProductionData: ProductionData[];
  monthlyProductionData: MonthlyProductionData[];
}

interface StatusSummaryCardsProps {
  selectedPeriod: string;
  statusData: StatusData[];
  monthlyStatusData: MonthlyStatusData[];
}

const formatNumber = (value: number): string => {
  if (value >= 1000) {
    return (value / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
  }
  return value.toFixed(1).replace(/\.0$/, '');
};

const SummaryCard = ({ 
  title, 
  value, 
  explanation, 
  icon: Icon, 
  colorClass,
  unit = 'L'
}: {
  title: string;
  value: number | string;
  explanation: string;
  icon: any;
  colorClass: string;
  unit?: string;
}) => (
  <TooltipProvider delayDuration={300}>
    <Card className={`${colorClass} border-2 hover:shadow-lg transition-all duration-200`}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <div className="flex items-center gap-2">
            <Icon className="h-4 w-4" />
            {title}
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <button className="p-1 rounded-full hover:bg-black/5 transition-colors">
                <Info className="h-4 w-4 text-gray-400 hover:text-gray-600 cursor-help" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs">
              <p className="text-sm">{explanation}</p>
            </TooltipContent>
          </Tooltip>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">
          {typeof value === 'number' ? formatNumber(value) : value}{unit}
        </div>
      </CardContent>
    </Card>
  </TooltipProvider>
);

export const ProductionSummaryCards = ({
  selectedPeriod,
  dailyProductionData,
  monthlyProductionData
}: ProductionSummaryCardsProps) => {
  const productionData = selectedPeriod === 'monthly' ? monthlyProductionData : dailyProductionData;
  
  const totalProduction = productionData.reduce((sum, item) => sum + item.production, 0);
  const avgProduction = productionData.length > 0 ? totalProduction / productionData.length : 0;
  const peakProduction = Math.max(...productionData.map(item => item.production));

  const periodLabel = selectedPeriod === 'monthly' ? 'month' : 'day';
  const timeframe = selectedPeriod === 'monthly' ? '3 months' : '7 days';

  return (
    <div>
      <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
        Water Production Summary
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <SummaryCard
          title="Total Water Made"
          value={totalProduction}
          explanation={`Total amount of water produced over the last ${timeframe}. This shows the cumulative output of your system.`}
          icon={TrendingUp}
          colorClass="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800"
        />
        
        <SummaryCard
          title={selectedPeriod === 'monthly' ? 'Monthly Average' : 'Daily Average'}
          value={avgProduction}
          explanation={`Average water production per ${periodLabel}. This helps you understand your typical output and identify trends.`}
          icon={BarChart3}
          colorClass="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
        />
        
        <SummaryCard
          title={selectedPeriod === 'monthly' ? 'Best Month' : 'Best Day'}
          value={peakProduction}
          explanation={`Highest single-${periodLabel} production in this period. This represents your system's peak performance.`}
          icon={TrendingUp}
          colorClass="bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800"
        />
      </div>
    </div>
  );
};

export const StatusSummaryCards = ({
  selectedPeriod,
  statusData,
  monthlyStatusData
}: StatusSummaryCardsProps) => {
  const currentStatusData = selectedPeriod === 'monthly' ? monthlyStatusData : statusData;
  
  const avgProducing = currentStatusData.length > 0 ? 
    currentStatusData.reduce((sum, item) => sum + item.producing, 0) / currentStatusData.length : 0;
  const avgIdle = currentStatusData.length > 0 ? 
    currentStatusData.reduce((sum, item) => sum + item.idle, 0) / currentStatusData.length : 0;
  const avgFullWater = currentStatusData.length > 0 ? 
    currentStatusData.reduce((sum, item) => sum + item.fullWater, 0) / currentStatusData.length : 0;
  const avgDisconnected = currentStatusData.length > 0 ? 
    currentStatusData.reduce((sum, item) => sum + item.disconnected, 0) / currentStatusData.length : 0;

  return (
    <div>
      <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
        System Status Summary
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          title="Making Water"
          value={Math.round(avgProducing)}
          explanation="Average time spent actively producing water. Higher values indicate efficient operation."
          icon={CheckCircle}
          colorClass="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800"
          unit="h"
        />
        
        <SummaryCard
          title="Waiting"
          value={Math.round(avgIdle)}
          explanation="Average time spent idle but ready to produce. Some idle time is normal between production cycles."
          icon={Clock}
          colorClass="bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800"
          unit="h"
        />
        
        <SummaryCard
          title="Tank Full"
          value={Math.round(avgFullWater)}
          explanation="Average time with full water tank. High values may indicate need for more frequent collection."
          icon={AlertCircle}
          colorClass="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800"
          unit="h"
        />
        
        <SummaryCard
          title="Offline"
          value={Math.round(avgDisconnected)}
          explanation="Average time disconnected or not responding. Lower values are better for system reliability."
          icon={XCircle}
          colorClass="bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
          unit="h"
        />
      </div>
    </div>
  );
};
