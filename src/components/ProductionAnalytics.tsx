
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Calendar, TrendingUp, BarChart3 } from 'lucide-react';
import { 
  ProductionData, 
  WeeklyProductionData,
  MonthlyProductionData, 
  YearlyProductionData,
  StatusData, 
  WeeklyStatusData,
  MonthlyStatusData,
  YearlyStatusData
} from '@/types/productionAnalytics';
import { ProductionSummaryCards, StatusSummaryCards } from './AnalyticsSummaryCards';
import { useLocalization } from '@/contexts/LocalizationContext';

interface ProductionAnalyticsProps {
  selectedPeriod: string;
  onPeriodChange: (period: string) => void;
  dailyProductionData: ProductionData[];
  weeklyProductionData?: WeeklyProductionData[];
  monthlyProductionData: MonthlyProductionData[];
  yearlyProductionData?: YearlyProductionData[];
  statusData: StatusData[];
  weeklyStatusData?: WeeklyStatusData[];
  monthlyStatusData: MonthlyStatusData[];
  yearlyStatusData?: YearlyStatusData[];
}

const ProductionAnalytics = ({
  selectedPeriod,
  onPeriodChange,
  dailyProductionData,
  weeklyProductionData = [],
  monthlyProductionData,
  yearlyProductionData = [],
  statusData,
  weeklyStatusData = [],
  monthlyStatusData,
  yearlyStatusData = []
}: ProductionAnalyticsProps) => {
  const { t, formatNumber } = useLocalization();

  const formatNumberShort = (value: number): string => {
    if (value >= 1000) {
      return (value / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
    }
    return value.toFixed(1).replace(/\.0$/, '');
  };

  // Determine which data to show based on selected period
  const getProductionData = () => {
    switch (selectedPeriod) {
      case 'daily':
        return dailyProductionData;
      case 'weekly':
        return weeklyProductionData.map(item => ({ 
          date: item.week, 
          production: item.production 
        }));
      case 'monthly':
        return monthlyProductionData.map(item => ({ 
          date: item.month, 
          production: item.production 
        }));
      case 'yearly':
        return yearlyProductionData.map(item => ({ 
          date: item.year, 
          production: item.production 
        }));
      default:
        return dailyProductionData;
    }
  };

  const getStatusData = () => {
    switch (selectedPeriod) {
      case 'daily':
        return statusData;
      case 'weekly':
        return weeklyStatusData.map(item => ({ 
          date: item.week, 
          producing: item.producing,
          idle: item.idle,
          fullWater: item.fullWater,
          disconnected: item.disconnected
        }));
      case 'monthly':
        return monthlyStatusData.map(item => ({ 
          date: item.month, 
          producing: item.producing,
          idle: item.idle,
          fullWater: item.fullWater,
          disconnected: item.disconnected
        }));
      case 'yearly':
        return yearlyStatusData.map(item => ({ 
          date: item.year, 
          producing: item.producing,
          idle: item.idle,
          fullWater: item.fullWater,
          disconnected: item.disconnected
        }));
      default:
        return statusData;
    }
  };

  const productionData = getProductionData();
  const currentStatusData = getStatusData();

  // Get period labels
  const getPeriodLabel = () => {
    switch (selectedPeriod) {
      case 'daily': return t('analytics.last.7.days');
      case 'weekly': return t('analytics.last.4.weeks');
      case 'monthly': return t('analytics.last.3.months');
      case 'yearly': return t('analytics.last.2.years');
      default: return t('analytics.last.7.days');
    }
  };

  const getTimeframe = () => {
    const now = new Date();
    switch (selectedPeriod) {
      case 'daily': {
        const week = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return `${week.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
      }
      case 'weekly': {
        const month = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        return `${month.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
      }
      case 'monthly': {
        const threeMonths = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        return `${threeMonths.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })} - ${now.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`;
      }
      case 'yearly': {
        const twoYears = new Date(now.getTime() - 730 * 24 * 60 * 60 * 1000);
        return `${twoYears.getFullYear()} - ${now.getFullYear()}`;
      }
      default: return '';
    }
  };

  return (
    <div className="space-y-8">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-kumulus-dark-blue dark:text-white mb-2">
            {t('analytics.title')}
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            {t('analytics.subtitle')}
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Calendar className="h-5 w-5 text-kumulus-blue" />
          <Select value={selectedPeriod} onValueChange={onPeriodChange}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select time period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">{t('analytics.period.daily')}</SelectItem>
              <SelectItem value="weekly">{t('analytics.period.weekly')}</SelectItem>
              <SelectItem value="monthly">{t('analytics.period.monthly')}</SelectItem>
              <SelectItem value="yearly">{t('analytics.period.yearly')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Production Chart */}
      <Card className="bg-white dark:bg-gray-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-xl">
            <div className="p-2 bg-kumulus-blue/10 rounded-lg">
              <TrendingUp className="h-5 w-5 text-kumulus-blue" />
            </div>
            <div>
              <div>{t('analytics.production.title')} - {getPeriodLabel()}</div>
              <div className="text-sm font-normal text-gray-600 dark:text-gray-400 mt-1">
                {getTimeframe()}
              </div>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={productionData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis 
                dataKey="date"
                className="text-sm"
                tick={{ fontSize: 12 }}
              />
              <YAxis 
                className="text-sm"
                tick={{ fontSize: 12 }}
                tickFormatter={formatNumberShort}
              />
              <Tooltip 
                formatter={(value: number) => [`${formatNumberShort(value)}L`, t('analytics.production.title')]}
                labelStyle={{ color: '#374151' }}
                contentStyle={{ 
                  backgroundColor: 'white', 
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}
              />
              <Bar dataKey="production" fill="hsl(var(--kumulus-blue))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Production Summary Cards */}
      <ProductionSummaryCards
        selectedPeriod={selectedPeriod}
        dailyProductionData={dailyProductionData}
        monthlyProductionData={monthlyProductionData}
      />

      {/* Status Analytics Chart */}
      <Card className="bg-white dark:bg-gray-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-xl">
            <div className="p-2 bg-kumulus-green/10 rounded-lg">
              <BarChart3 className="h-5 w-5 text-kumulus-green" />
            </div>
            <div>
              <div>{t('analytics.status.title')} - {getPeriodLabel()}</div>
              <div className="text-sm font-normal text-gray-600 dark:text-gray-400 mt-1">
                {t('analytics.status.subtitle')}
              </div>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={currentStatusData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis 
                dataKey="date"
                className="text-sm"
                tick={{ fontSize: 12 }}
              />
              <YAxis 
                className="text-sm"
                tick={{ fontSize: 12 }}
                label={{ value: 'Hours', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip 
                formatter={(value: number, name: string) => [`${value.toFixed(1)}h`, t(`metrics.${name.toLowerCase().replace(' ', '.')}`) || name]}
                labelStyle={{ color: '#374151' }}
                contentStyle={{ 
                  backgroundColor: 'white', 
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}
              />
              <Legend />
              <Bar dataKey="producing" stackId="a" fill="hsl(var(--status-producing-blue))" name={t('metrics.producing')} radius={[0, 0, 0, 0]} />
              <Bar dataKey="idle" stackId="a" fill="hsl(var(--kumulus-orange))" name={t('metrics.idle')} radius={[0, 0, 0, 0]} />
              <Bar dataKey="fullWater" stackId="a" fill="hsl(var(--kumulus-chambray))" name={t('metrics.full.water')} radius={[0, 0, 0, 0]} />
              <Bar dataKey="disconnected" stackId="a" fill="hsl(var(--status-disconnected-yellow))" name={t('metrics.disconnected')} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Status Summary Cards */}
      <StatusSummaryCards
        selectedPeriod={selectedPeriod}
        statusData={statusData}
        monthlyStatusData={monthlyStatusData}
      />
    </div>
  );
};

export default ProductionAnalytics;
