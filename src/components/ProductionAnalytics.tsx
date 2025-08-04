
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Calendar, TrendingUp, BarChart3 } from 'lucide-react';
import { ProductionData, MonthlyProductionData, StatusData, MonthlyStatusData } from '@/types/productionAnalytics';
import { ProductionSummaryCards, StatusSummaryCards } from './AnalyticsSummaryCards';

interface ProductionAnalyticsProps {
  selectedPeriod: string;
  onPeriodChange: (period: string) => void;
  dailyProductionData: ProductionData[];
  monthlyProductionData: MonthlyProductionData[];
  statusData: StatusData[];
  monthlyStatusData: MonthlyStatusData[];
}

const formatNumber = (value: number): string => {
  if (value >= 1000) {
    return (value / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
  }
  return value.toFixed(1).replace(/\.0$/, '');
};

const ProductionAnalytics = ({
  selectedPeriod,
  onPeriodChange,
  dailyProductionData,
  monthlyProductionData,
  statusData,
  monthlyStatusData
}: ProductionAnalyticsProps) => {
  // Determine which data to show based on selected period
  const productionData = selectedPeriod === 'monthly' ? monthlyProductionData : dailyProductionData;
  const currentStatusData = selectedPeriod === 'monthly' ? monthlyStatusData : statusData;

  // Get period labels
  const getPeriodLabel = () => {
    switch (selectedPeriod) {
      case 'daily': return 'Last 7 Days';
      case 'weekly': return 'Last 4 Weeks';
      case 'monthly': return 'Last 3 Months';
      case 'yearly': return 'Last 2 Years';
      default: return 'Daily';
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
            Production Analytics
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Water production and system status over time
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Calendar className="h-5 w-5 text-kumulus-blue" />
          <Select value={selectedPeriod} onValueChange={onPeriodChange}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select time period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Daily View</SelectItem>
              <SelectItem value="weekly">Weekly View</SelectItem>
              <SelectItem value="monthly">Monthly View</SelectItem>
              <SelectItem value="yearly">Yearly View</SelectItem>
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
              <div>Water Production - {getPeriodLabel()}</div>
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
                dataKey={selectedPeriod === 'monthly' ? 'month' : 'date'} 
                className="text-sm"
                tick={{ fontSize: 12 }}
              />
              <YAxis 
                className="text-sm"
                tick={{ fontSize: 12 }}
                tickFormatter={formatNumber}
              />
              <Tooltip 
                formatter={(value: number) => [`${formatNumber(value)}L`, 'Production']}
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
              <div>System Status Distribution - {getPeriodLabel()}</div>
              <div className="text-sm font-normal text-gray-600 dark:text-gray-400 mt-1">
                Time spent in each operational state
              </div>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={currentStatusData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis 
                dataKey={selectedPeriod === 'monthly' ? 'month' : 'date'} 
                className="text-sm"
                tick={{ fontSize: 12 }}
              />
              <YAxis 
                className="text-sm"
                tick={{ fontSize: 12 }}
                label={{ value: 'Hours', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip 
                formatter={(value: number, name: string) => [`${value.toFixed(1)}h`, name]}
                labelStyle={{ color: '#374151' }}
                contentStyle={{ 
                  backgroundColor: 'white', 
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}
              />
              <Legend />
              <Bar dataKey="producing" stackId="a" fill="hsl(var(--status-producing-blue))" name="Producing" radius={[0, 0, 0, 0]} />
              <Bar dataKey="idle" stackId="a" fill="hsl(var(--kumulus-orange))" name="Idle" radius={[0, 0, 0, 0]} />
              <Bar dataKey="fullWater" stackId="a" fill="hsl(var(--kumulus-chambray))" name="Full Water" radius={[0, 0, 0, 0]} />
              <Bar dataKey="disconnected" stackId="a" fill="hsl(var(--status-disconnected-yellow))" name="Disconnected" radius={[4, 4, 0, 0]} />
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
