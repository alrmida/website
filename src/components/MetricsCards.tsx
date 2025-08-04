import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, Clock, Zap, Leaf, Recycle, TrendingUp } from 'lucide-react';
import { useLocalization } from '@/contexts/LocalizationContext';
import WaterTankIndicator from './WaterTankIndicator';
import StatusTooltip from './StatusTooltip';

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

const formatDate = (dateString: string | null, t: (key: string) => string): string => {
  if (!dateString) return t('metrics.unknown');
  
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

const getLocalizedStatus = (status: string, t: (key: string) => string): string => {
  switch (status.toLowerCase()) {
    case 'producing': return t('metrics.producing');
    case 'idle': return t('metrics.idle');
    case 'full water': return t('metrics.full.water');
    case 'disconnected': return t('metrics.disconnected');
    default: return status;
  }
};

const MetricsCards = ({ waterTank, machineStatus, totalWaterProduced, lastUpdate }: MetricsCardsProps) => {
  const { t, formatCurrency } = useLocalization();
  const currentYear = new Date().getFullYear();
  const trackingStartDate = `${t('metrics.since.date')} Jan ${currentYear}`;

  // Calculate ESG metrics based on water production
  const co2Saved = Math.round(totalWaterProduced * 0.234); // kg CO2 saved per liter
  const plasticBottlesSaved = Math.round(totalWaterProduced / 0.5); // 500ml bottles
  const moneySaved = totalWaterProduced * 0.5; // €0.50 per liter saved

  return (
    <div className="space-y-6">
      {/* Main metrics row - 4 equal columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Water Level Card */}
        <WaterTankIndicator
          currentLevel={waterTank.currentLevel}
          maxCapacity={waterTank.maxCapacity}
          percentage={waterTank.percentage}
        />

        {/* Machine Status Card */}
        <Card className="bg-white dark:bg-gray-800 border-2 hover:border-gray-300 transition-all duration-200 hover:shadow-lg">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-3 text-lg font-semibold">
              <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                {getStatusIcon(machineStatus)}
              </div>
              <div className="flex items-center">
                {t('metrics.status')}
                <StatusTooltip status={machineStatus} />
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className={`text-3xl font-bold ${getStatusColor(machineStatus)}`}>
                {getLocalizedStatus(machineStatus, t)}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {t('metrics.last.update')} {lastUpdate ? formatDate(lastUpdate, t) : t('metrics.unknown')}
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
              {t('metrics.total.production')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-3xl font-bold text-kumulus-green">
                {formatNumber(totalWaterProduced, 1)}L
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {trackingStartDate}
              </div>
              {totalWaterProduced > 0 && (
                <div className="text-xs text-kumulus-green/70">
                  ≈ {formatNumber(totalWaterProduced * 0.264172, 0)} {t('metrics.gallons')}
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
              {t('metrics.money.saved')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-3xl font-bold text-kumulus-yellow">
                {formatCurrency(moneySaved)}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {t('metrics.vs.bottled.water')}
              </div>
              {totalWaterProduced > 0 && (
                <div className="text-xs text-kumulus-yellow/70">
                  {t('metrics.savings.rate')}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ESG metrics row - 2 equal columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* CO₂ Saved Card */}
        <Card className="bg-white dark:bg-gray-800 border-2 hover:border-kumulus-blue/30 transition-all duration-200 hover:shadow-lg">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-3 text-lg font-semibold">
              <div className="p-2 bg-kumulus-blue/10 rounded-lg">
                <Leaf className="h-5 w-5 text-kumulus-blue" />
              </div>
              {t('metrics.co2.saved')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-3xl font-bold text-kumulus-blue">
                {formatNumber(co2Saved, 0)} kg
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {t('metrics.vs.bottled.production')}
              </div>
              {totalWaterProduced > 0 && (
                <div className="text-xs text-kumulus-blue/70">
                  {t('metrics.environmental.impact')}
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
              {t('metrics.bottles.saved')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-3xl font-bold text-kumulus-orange">
                {formatNumber(plasticBottlesSaved, 0)}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {t('metrics.bottles.avoided')}
              </div>
              {totalWaterProduced > 0 && (
                <div className="text-xs text-kumulus-orange/70">
                  {t('metrics.plastic.waste')}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default MetricsCards;
