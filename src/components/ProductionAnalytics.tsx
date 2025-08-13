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
import { ProductionSummaryCards } from './AnalyticsSummaryCards';
import { useLocalization } from '@/contexts/LocalizationContext';
import StatusTooltip from './StatusTooltip';

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

// Status Summary Cards Component with percentages
const StatusSummaryCards = ({
  selectedPeriod,
  statusData,
  weeklyStatusData = [],
  monthlyStatusData,
  yearlyStatusData = []
}: {
  selectedPeriod: string;
  statusData: StatusData[];
  weeklyStatusData?: WeeklyStatusData[];
  monthlyStatusData: MonthlyStatusData[];
  yearlyStatusData?: YearlyStatusData[];
}) => {
  const { t } = useLocalization();

  const getCurrentStatusData = () => {
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

  const calculateAveragePercentages = () => {
    const currentData = getCurrentStatusData();
    
    console.log('🧮 [STATUS SUMMARY] Calculating averages for period:', selectedPeriod, {
      dataPoints: currentData.length,
      sampleData: currentData[0] || 'No data'
    });
    
    if (currentData.length === 0) {
      console.log('⚠️ [STATUS SUMMARY] No data for averages calculation');
      return { producing: 0, idle: 0, fullWater: 0, disconnected: 0 };
    }

    const totals = currentData.reduce((acc, item) => ({
      producing: acc.producing + item.producing,
      idle: acc.idle + item.idle,
      fullWater: acc.fullWater + item.fullWater,
      disconnected: acc.disconnected + item.disconnected
    }), { producing: 0, idle: 0, fullWater: 0, disconnected: 0 });

    const grandTotal = totals.producing + totals.idle + totals.fullWater + totals.disconnected;
    
    console.log('📊 [STATUS SUMMARY] Totals calculation:', {
      rawTotals: totals,
      grandTotal,
      dataPointCount: currentData.length
    });
    
    if (grandTotal === 0) {
      console.warn('⚠️ [STATUS SUMMARY] Grand total is 0, returning zero percentages');
      return { producing: 0, idle: 0, fullWater: 0, disconnected: 0 };
    }

    const result = {
      producing: Math.round((totals.producing / grandTotal) * 100),
      idle: Math.round((totals.idle / grandTotal) * 100),
      fullWater: Math.round((totals.fullWater / grandTotal) * 100),
      disconnected: Math.round((totals.disconnected / grandTotal) * 100)
    };

    console.log('✅ [STATUS SUMMARY] Final averages:', result);
    return result;
  };

  const averages = calculateAveragePercentages();

  const getPeriodText = () => {
    const safeT = (key: string, fallback: string) => {
      const translation = t(key);
      return translation === key ? fallback : translation;
    };

    switch (selectedPeriod) {
      case 'daily': return safeT('analytics.period.daily.text', 'the last 7 days');
      case 'weekly': return safeT('analytics.period.weekly.text', 'the last 4 weeks');
      case 'monthly': return safeT('analytics.period.monthly.text', 'the last 3 months');
      case 'yearly': return safeT('analytics.period.yearly.text', 'the last 2 years');
      default: return 'this period';
    }
  };

  const getTooltipText = (status: string) => {
    const period = getPeriodText();
    switch (status) {
      case 'producing':
        return `Average percentage of time spent producing water during ${period}`;
      case 'idle':
        return `Average percentage of time spent idle (not producing) during ${period}`;
      case 'fullWater':
        return `Average percentage of time with full water tank during ${period}`;
      case 'disconnected':
        return `Average percentage of time disconnected from monitoring during ${period}`;
      default:
        return '';
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card className="bg-white dark:bg-gray-800">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Producing
                </p>
                <StatusTooltip status="producing" />
              </div>
              <p className="text-2xl font-bold text-status-producing-blue">{averages.producing}%</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {getTooltipText('producing')}
              </p>
            </div>
            <div className="h-8 w-8 rounded-full bg-status-producing-blue/10 flex items-center justify-center">
              <div className="h-3 w-3 rounded-full bg-status-producing-blue"></div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white dark:bg-gray-800">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Idle
                </p>
                <StatusTooltip status="idle" />
              </div>
              <p className="text-2xl font-bold text-kumulus-orange">{averages.idle}%</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {getTooltipText('idle')}
              </p>
            </div>
            <div className="h-8 w-8 rounded-full bg-kumulus-orange/10 flex items-center justify-center">
              <div className="h-3 w-3 rounded-full bg-kumulus-orange"></div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white dark:bg-gray-800">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Full Water
                </p>
                <StatusTooltip status="full water" />
              </div>
              <p className="text-2xl font-bold text-kumulus-chambray">{averages.fullWater}%</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {getTooltipText('fullWater')}
              </p>
            </div>
            <div className="h-8 w-8 rounded-full bg-kumulus-chambray/10 flex items-center justify-center">
              <div className="h-3 w-3 rounded-full bg-kumulus-chambray"></div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white dark:bg-gray-800">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Disconnected
                </p>
                <StatusTooltip status="disconnected" />
              </div>
              <p className="text-2xl font-bold text-status-disconnected-yellow">{averages.disconnected}%</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {getTooltipText('disconnected')}
              </p>
            </div>
            <div className="h-8 w-8 rounded-full bg-status-disconnected-yellow/10 flex items-center justify-center">
              <div className="h-3 w-3 rounded-full bg-status-disconnected-yellow"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Utility function to calculate nice tick values and domain
const getNiceTicks = (dataMax: number, targetTickCount: number = 5): { domain: [number, number], ticks: number[] } => {
  if (dataMax === 0) {
    return { domain: [0, 10], ticks: [0, 2, 4, 6, 8, 10] };
  }

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

  console.log('🎨 [PRODUCTION ANALYTICS] Rendering with hierarchical data:', {
    selectedPeriod,
    statusDataPoints: statusData.length,
    sampleStatusData: statusData[0] || 'No status data',
    weeklyStatusDataPoints: weeklyStatusData.length,
    monthlyStatusDataPoints: monthlyStatusData.length,
    yearlyStatusDataPoints: yearlyStatusData.length,
    sampleWeeklyData: weeklyStatusData[0] || 'No weekly data',
    sampleMonthlyData: monthlyStatusData[0] || 'No monthly data'
  });

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

  const convertToPercentages = (data: any[]) => {
    return data.map(item => {
      const total = item.producing + item.idle + item.fullWater + item.disconnected;
      if (total === 0) {
        return {
          ...item,
          producing: 0,
          idle: 0,
          fullWater: 0,
          disconnected: 100
        };
      }
      return {
        ...item,
        producing: Math.round((item.producing / total) * 100),
        idle: Math.round((item.idle / total) * 100),
        fullWater: Math.round((item.fullWater / total) * 100),
        disconnected: Math.round((item.disconnected / total) * 100)
      };
    });
  };

  const getStatusData = () => {
    let rawData;
    switch (selectedPeriod) {
      case 'daily':
        rawData = statusData;
        break;
      case 'weekly':
        rawData = weeklyStatusData.map(item => ({ 
          date: item.week, 
          producing: item.producing,
          idle: item.idle,
          fullWater: item.fullWater,
          disconnected: item.disconnected
        }));
        break;
      case 'monthly':
        rawData = monthlyStatusData.map(item => ({ 
          date: item.month, 
          producing: item.producing,
          idle: item.idle,
          fullWater: item.fullWater,
          disconnected: item.disconnected
        }));
        break;
      case 'yearly':
        rawData = yearlyStatusData.map(item => ({ 
          date: item.year, 
          producing: item.producing,
          idle: item.idle,
          fullWater: item.fullWater,
          disconnected: item.disconnected
        }));
        break;
      default:
        rawData = statusData;
    }
    
    console.log('📊 [PRODUCTION ANALYTICS] Hierarchical status data for period', selectedPeriod, ':', {
      rawDataPoints: rawData.length,
      sampleRawData: rawData[0] || 'No raw data'
    });
    
    return convertToPercentages(rawData);
  };

  const productionData = getProductionData();
  const currentStatusData = getStatusData();

  const productionMax = Math.max(...productionData.map(item => item.production));
  const productionTickData = getNiceTicks(productionMax);
  const statusTickData = { domain: [0, 100] as [number, number], ticks: [0, 20, 40, 60, 80, 100] };

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
        <CardContent className="pt-3 pb-2 px-3">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={productionData} margin={{ top: 15, right: 25, left: 60, bottom: 30 }}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis 
                dataKey="date"
                className="text-sm"
                tick={{ fontSize: 12 }}
                tickMargin={3}
                height={30}
              >
                <Label value={axisLabels.x} position="insideBottom" offset={-20} style={{ textAnchor: 'middle' }} />
              </XAxis>
              <YAxis 
                className="text-sm"
                tick={{ fontSize: 12 }}
                tickFormatter={formatNumberShort}
                tickMargin={8}
                domain={productionTickData.domain}
                ticks={productionTickData.ticks}
              >
                <Label 
                  value={axisLabels.y} 
                  angle={-90} 
                  position="insideLeft" 
                  style={{ textAnchor: 'middle' }}
                />
              </YAxis>
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
        <CardContent className="pt-3 pb-2 px-3">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart 
              data={currentStatusData} 
              margin={{ top: 42, right: 25, left: 60, bottom: 30 }}
              barCategoryGap="20%"
              barGap={2}
            >
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis 
                dataKey="date"
                className="text-sm"
                tick={{ fontSize: 12 }}
                tickMargin={3}
                height={30}
              >
                <Label value={axisLabels.x} position="insideBottom" offset={-20} style={{ textAnchor: 'middle' }} />
              </XAxis>
              <YAxis 
                className="text-sm"
                tick={{ fontSize: 12 }}
                tickMargin={8}
                domain={statusTickData.domain}
                ticks={statusTickData.ticks}
              >
                <Label 
                  value={t('analytics.status.yaxis')} 
                  angle={-90} 
                  position="insideLeft" 
                  style={{ textAnchor: 'middle' }}
                />
              </YAxis>
              <Tooltip 
                formatter={(value: number, name: string) => [`${value}%`, t(`metrics.${name.toLowerCase().replace(' ', '.')}`) || name]}
                labelStyle={{ color: '#374151' }}
                contentStyle={{ 
                  backgroundColor: 'white', 
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}
              />
              <Legend 
                verticalAlign="top" 
                height={36}
                wrapperStyle={{ paddingBottom: '10px' }}
              />
              <Bar dataKey="producing" stackId="a" fill="hsl(var(--status-producing-blue))" name="Producing" radius={[0, 0, 0, 0]} />
              <Bar dataKey="idle" stackId="a" fill="hsl(var(--kumulus-orange))" name="Idle" radius={[0, 0, 0, 0]} />
              <Bar dataKey="fullWater" stackId="a" fill="hsl(var(--kumulus-chambray))" name="Full Water" radius={[0, 0, 0, 0]} />
              <Bar dataKey="disconnected" stackId="a" fill="hsl(var(--status-disconnected-yellow))" name="Disconnected" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
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
