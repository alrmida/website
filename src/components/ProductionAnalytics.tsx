
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

interface ProductionData {
  date: string;
  production: number;
}

interface MonthlyProductionData {
  month: string;
  production: number;
}

interface StatusData {
  date: string;
  producing: number;
  idle: number;
  fullWater: number;
  disconnected: number;
}

interface MonthlyStatusData {
  month: string;
  producing: number;
  idle: number;
  fullWater: number;
  disconnected: number;
}

interface ProductionAnalyticsProps {
  selectedPeriod: string;
  onPeriodChange: (period: string) => void;
  dailyProductionData: ProductionData[];
  monthlyProductionData: MonthlyProductionData[];
  statusData: StatusData[];
  monthlyStatusData: MonthlyStatusData[];
}

const ProductionAnalytics = ({
  selectedPeriod,
  onPeriodChange,
  dailyProductionData,
  monthlyProductionData,
  statusData,
  monthlyStatusData,
}: ProductionAnalyticsProps) => {
  // Calculate metrics for production data
  const getProductionMetrics = (data: ProductionData[] | MonthlyProductionData[]) => {
    if (data.length === 0) return { total: 0, average: 0, peak: 0 };
    
    const total = data.reduce((sum, item) => sum + item.production, 0);
    const average = total / data.length;
    const peak = Math.max(...data.map(item => item.production));
    
    return { total, average, peak };
  };

  // Calculate status metrics as percentages
  const getStatusMetrics = (data: StatusData[] | MonthlyStatusData[]) => {
    if (data.length === 0) return { producing: 0, idle: 0, fullWater: 0, disconnected: 0 };
    
    const totals = data.reduce((acc, item) => ({
      producing: acc.producing + item.producing,
      idle: acc.idle + item.idle,
      fullWater: acc.fullWater + item.fullWater,
      disconnected: acc.disconnected + item.disconnected,
    }), { producing: 0, idle: 0, fullWater: 0, disconnected: 0 });

    const totalHours = totals.producing + totals.idle + totals.fullWater + totals.disconnected;
    
    if (totalHours === 0) return { producing: 0, idle: 0, fullWater: 0, disconnected: 0 };
    
    return {
      producing: Math.round((totals.producing / totalHours) * 100),
      idle: Math.round((totals.idle / totalHours) * 100),
      fullWater: Math.round((totals.fullWater / totalHours) * 100),
      disconnected: Math.round((totals.disconnected / totalHours) * 100),
    };
  };

  // Use only real data - no fake historical data
  const productionMetrics = selectedPeriod === 'daily' 
    ? getProductionMetrics(dailyProductionData)
    : getProductionMetrics(monthlyProductionData);

  const statusMetrics = selectedPeriod === 'daily'
    ? getStatusMetrics(statusData)
    : getStatusMetrics(monthlyStatusData);

  return (
    <div className="space-y-6">
      {/* Production Analytics */}
      <Card className="bg-white dark:bg-gray-800">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-gray-900 dark:text-white">Production Analytics</CardTitle>
            <div className="flex items-center space-x-2">
              <Label htmlFor="period-select" className="text-sm text-gray-600 dark:text-gray-300">Period:</Label>
              <Select value={selectedPeriod} onValueChange={onPeriodChange}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-80 mb-6">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={selectedPeriod === 'daily' ? dailyProductionData : monthlyProductionData} 
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:stroke-gray-600" />
                <XAxis 
                  dataKey={selectedPeriod === 'daily' ? 'date' : 'month'} 
                  stroke="#6b7280" 
                  className="dark:stroke-gray-400"
                  tick={{ fontSize: 12, fill: '#6b7280' }}
                />
                <YAxis 
                  stroke="#6b7280" 
                  className="dark:stroke-gray-400"
                  tick={{ fontSize: 12, fill: '#6b7280' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'white', 
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    color: '#1f2937'
                  }}
                />
                <Bar dataKey="production" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Production Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 p-4 rounded-lg">
              <h4 className="text-sm font-medium text-blue-700 dark:text-blue-300">Total Production</h4>
              <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                {productionMetrics.total.toFixed(1)}L
              </p>
            </div>
            <div className="bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 p-4 rounded-lg">
              <h4 className="text-sm font-medium text-green-700 dark:text-green-300">Average Daily</h4>
              <p className="text-2xl font-bold text-green-900 dark:text-green-100">
                {productionMetrics.average.toFixed(1)}L
              </p>
            </div>
            <div className="bg-gradient-to-r from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 p-4 rounded-lg">
              <h4 className="text-sm font-medium text-purple-700 dark:text-purple-300">Peak Day</h4>
              <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                {productionMetrics.peak.toFixed(1)}L
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Status Analytics */}
      <Card className="bg-white dark:bg-gray-800">
        <CardHeader>
          <CardTitle className="text-gray-900 dark:text-white">Status Analytics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80 mb-6">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart 
                data={selectedPeriod === 'daily' ? statusData : monthlyStatusData} 
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:stroke-gray-600" />
                <XAxis 
                  dataKey={selectedPeriod === 'daily' ? 'date' : 'month'} 
                  stroke="#6b7280" 
                  className="dark:stroke-gray-400"
                  tick={{ fontSize: 12, fill: '#6b7280' }}
                />
                <YAxis 
                  stroke="#6b7280" 
                  className="dark:stroke-gray-400"
                  tick={{ fontSize: 12, fill: '#6b7280' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'white', 
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    color: '#1f2937'
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="producing" 
                  stackId="1" 
                  stroke="#10b981" 
                  fill="#10b981" 
                  fillOpacity={0.6}
                />
                <Area 
                  type="monotone" 
                  dataKey="idle" 
                  stackId="1" 
                  stroke="#f59e0b" 
                  fill="#f59e0b" 
                  fillOpacity={0.6}
                />
                <Area 
                  type="monotone" 
                  dataKey="fullWater" 
                  stackId="1" 
                  stroke="#3b82f6" 
                  fill="#3b82f6" 
                  fillOpacity={0.6}
                />
                <Area 
                  type="monotone" 
                  dataKey="disconnected" 
                  stackId="1" 
                  stroke="#ef4444" 
                  fill="#ef4444" 
                  fillOpacity={0.6}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Status Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 p-4 rounded-lg">
              <h4 className="text-sm font-medium text-green-700 dark:text-green-300">Producing</h4>
              <p className="text-2xl font-bold text-green-900 dark:text-green-100">
                {statusMetrics.producing}%
              </p>
            </div>
            <div className="bg-gradient-to-r from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/20 p-4 rounded-lg">
              <h4 className="text-sm font-medium text-yellow-700 dark:text-yellow-300">Idle</h4>
              <p className="text-2xl font-bold text-yellow-900 dark:text-yellow-100">
                {statusMetrics.idle}%
              </p>
            </div>
            <div className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 p-4 rounded-lg">
              <h4 className="text-sm font-medium text-blue-700 dark:text-blue-300">Full Water</h4>
              <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                {statusMetrics.fullWater}%
              </p>
            </div>
            <div className="bg-gradient-to-r from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 p-4 rounded-lg">
              <h4 className="text-sm font-medium text-red-700 dark:text-red-300">Disconnected</h4>
              <p className="text-2xl font-bold text-red-900 dark:text-red-100">
                {statusMetrics.disconnected}%
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProductionAnalytics;
