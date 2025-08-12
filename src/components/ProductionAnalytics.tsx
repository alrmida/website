import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Label } from 'recharts';
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

// Utility function to calculate nice tick values and domain
const getNiceTicks = (dataMax: number, targetTickCount: number = 5): { domain: [number, number], ticks: number[] } => {
  if (dataMax === 0) {
    return { domain: [0, 10], ticks: [0, 2, 4, 6, 8, 10] };
  }

  // Calculate nice step size
  const roughStep = dataMax / (targetTickCount - 1);
  const magnitude = Math.pow(10, Math.floor(Math.log10(roughStep)));
  const normalizedStep = roughStep / magnitude;
  
  let niceStep;
  if (normalizedStep <= 1) niceStep = 1;
  else if (normalizedStep <= 2) niceStep = 2;
  else if (normalizedStep <= 5) niceStep = 5;
  else niceStep = 10;
  
  const step = niceStep * magnitude;
  const niceMax = Math.ceil(dataMax / step) * step;
  
  const ticks = [];
  for (let i = 0; i <= niceMax; i += step) {
    ticks.push(i);
  }
  
  return { domain: [0, niceMax], ticks };
};

// Custom Y-axis label component that centers based on actual chart dimensions
const CenteredYAxisLabel = ({ value, chartHeight = 300, topMargin = 15, bottomMargin = 15 }: { 
  value: string; 
  chartHeight?: number; 
  topMargin?: number; 
  bottomMargin?: number; 
}) => {
  // Calculate the actual chart area height (excluding margins)
  const actualChartHeight = chartHeight - topMargin - bottomMargin;
  // Position the label at the visual center of the chart area
  const yPosition = topMargin + (actualChartHeight / 2);
  
  return (
    <text
      x={20}
      y={yPosition}
      textAnchor="middle"
      style={{
        textAnchor: 'middle',
        fontSize: '12px',
        fill: 'currentColor',
        transform: 'rotate(-90deg)',
        transformOrigin: `20px ${yPosition}px`
      }}
    >
      {value}
    </text>
  );
};

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

  // Calculate nice ticks and domains for both charts
  const productionMax = Math.max(...productionData.map(item => item.production));
  const productionTickData = getNiceTicks(productionMax);

  const statusMax = Math.max(...currentStatusData.flatMap(item => [item.producing, item.idle, item.fullWater, item.disconnected]));
  const statusTickData = getNiceTicks(statusMax);

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

  const getAxisLabels = () => {
    switch (selectedPeriod) {
      case 'daily':
        return { x: 'Date', y: 'Water Production (L)' };
      case 'weekly':
        return { x: 'Week', y: 'Water Production (L)' };
      case 'monthly':
        return { x: 'Month', y: 'Water Production (L)' };
      case 'yearly':
        return { x: 'Year', y: 'Water Production (L)' };
      default:
        return { x: 'Date', y: 'Water Production (L)' };
    }
  };

  const axisLabels = getAxisLabels();

  return (
    <div className="space-y-8">
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
        <CardContent className="relative">
          <CenteredYAxisLabel value={axisLabels.y} chartHeight={300} topMargin={15} bottomMargin={40} />
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={productionData} margin={{ top: 15, right: 25, left: 45, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis 
                dataKey="date"
                className="text-sm"
                tick={{ fontSize: 12 }}
                tickMargin={8}
              />
              <YAxis 
                className="text-sm"
                tick={{ fontSize: 12 }}
                tickFormatter={formatNumberShort}
                tickMargin={8}
                domain={productionTickData.domain}
                ticks={productionTickData.ticks}
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
          <div className="text-center text-sm text-gray-600 dark:text-gray-400 mt-2">
            {axisLabels.x}
          </div>
        </CardContent>
      </Card>

      <ProductionSummaryCards
        selectedPeriod={selectedPeriod}
        dailyProductionData={dailyProductionData}
        weeklyProductionData={weeklyProductionData}
        monthlyProductionData={monthlyProductionData}
        yearlyProductionData={yearlyProductionData}
      />

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
        <CardContent className="relative">
          <CenteredYAxisLabel value="Hours" chartHeight={300} topMargin={15} bottomMargin={70} />
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={currentStatusData} margin={{ top: 15, right: 25, left: 45, bottom: 70 }}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis 
                dataKey="date"
                className="text-sm"
                tick={{ fontSize: 12 }}
                tickMargin={8}
              />
              <YAxis 
                className="text-sm"
                tick={{ fontSize: 12 }}
                tickMargin={8}
                domain={statusTickData.domain}
                ticks={statusTickData.ticks}
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
              <Legend 
                verticalAlign="bottom" 
                height={36}
                wrapperStyle={{ paddingTop: '10px' }}
              />
              <Bar dataKey="producing" stackId="a" fill="hsl(var(--status-producing-blue))" name={t('metrics.producing')} radius={[0, 0, 0, 0]} />
              <Bar dataKey="idle" stackId="a" fill="hsl(var(--kumulus-orange))" name={t('metrics.idle')} radius={[0, 0, 0, 0]} />
              <Bar dataKey="fullWater" stackId="a" fill="hsl(var(--kumulus-chambray))" name={t('metrics.full.water')} radius={[0, 0, 0, 0]} />
              <Bar dataKey="disconnected" stackId="a" fill="hsl(var(--status-disconnected-yellow))" name={t('metrics.disconnected')} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <div className="text-center text-sm text-gray-600 dark:text-gray-400 mt-2">
            {axisLabels.x}
          </div>
        </CardContent>
      </Card>

      <StatusSummaryCards
        selectedPeriod={selectedPeriod}
        statusData={statusData}
        weeklyStatusData={weeklyStatusData}
        monthlyStatusData={monthlyStatusData}
        yearlyStatusData={yearlyStatusData}
      />
    </div>
  );
};

export default ProductionAnalytics;
