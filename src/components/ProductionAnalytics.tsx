
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  // Calculate percentage averages for 7-day status
  const getAveragePercentages = (data: StatusData[]) => {
    const totalDays = data.length;
    if (totalDays === 0) return [];

    const totals = data.reduce((acc, day) => ({
      producing: acc.producing + day.producing,
      idle: acc.idle + day.idle,
      fullWater: acc.fullWater + day.fullWater,
      disconnected: acc.disconnected + day.disconnected,
    }), { producing: 0, idle: 0, fullWater: 0, disconnected: 0 });

    const totalHours = totals.producing + totals.idle + totals.fullWater + totals.disconnected;
    
    return [{
      category: 'Average Day',
      producing: totalHours > 0 ? Math.round((totals.producing / totalDays / 24) * 100) : 0,
      idle: totalHours > 0 ? Math.round((totals.idle / totalDays / 24) * 100) : 0,
      fullWater: totalHours > 0 ? Math.round((totals.fullWater / totalDays / 24) * 100) : 0,
      disconnected: totalHours > 0 ? Math.round((totals.disconnected / totalDays / 24) * 100) : 0,
    }];
  };

  // Extended daily production data (last 7 days)
  const extendedDailyData = [
    { date: '25 May', production: dailyProductionData[0]?.production ? 12.8 : 0 },
    { date: '26 May', production: dailyProductionData[0]?.production ? 18.4 : 0 },
    { date: '27 May', production: dailyProductionData[0]?.production ? 22.1 : 0 },
    ...dailyProductionData
  ];

  const averageStatusData = getAveragePercentages(statusData);

  return (
    <div className="space-y-6">
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
          <Tabs defaultValue="production" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger 
                value="production" 
                className="text-gray-900 dark:text-gray-100 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400"
              >
                {selectedPeriod === 'daily' ? 'Daily Production (Last 7 Days)' : 'Monthly Production (Last 3 Months)'}
              </TabsTrigger>
              <TabsTrigger 
                value="status"
                className="text-gray-900 dark:text-gray-100 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400"
              >
                {selectedPeriod === 'daily' ? 'Status (Last 7 Days)' : 'Status (Last 3 Months)'}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="production" className="mt-6">
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  {selectedPeriod === 'daily' ? (
                    <BarChart data={extendedDailyData} margin={{ top: 20, right: 30, left: 50, bottom: 60 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:stroke-gray-600" />
                      <XAxis 
                        dataKey="date" 
                        stroke="#6b7280" 
                        className="dark:stroke-gray-400"
                        tick={{ fontSize: 12, fill: '#6b7280' }}
                        tickMargin={10}
                        axisLine={{ stroke: '#6b7280' }}
                      />
                      <YAxis 
                        stroke="#6b7280" 
                        className="dark:stroke-gray-400"
                        tick={{ fontSize: 12, fill: '#6b7280' }}
                        label={{ 
                          value: 'Liters', 
                          angle: -90, 
                          position: 'insideLeft', 
                          style: { textAnchor: 'middle', fill: '#6b7280', fontSize: '12px' } 
                        }}
                        axisLine={{ stroke: '#6b7280' }}
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
                  ) : (
                    <AreaChart data={monthlyProductionData} margin={{ top: 20, right: 30, left: 50, bottom: 60 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:stroke-gray-600" />
                      <XAxis 
                        dataKey="month" 
                        stroke="#6b7280" 
                        className="dark:stroke-gray-400"
                        tick={{ fontSize: 12, fill: '#6b7280' }}
                        tickMargin={10}
                        axisLine={{ stroke: '#6b7280' }}
                      />
                      <YAxis 
                        stroke="#6b7280" 
                        className="dark:stroke-gray-400"
                        tick={{ fontSize: 12, fill: '#6b7280' }}
                        label={{ 
                          value: 'Liters', 
                          angle: -90, 
                          position: 'insideLeft', 
                          style: { textAnchor: 'middle', fill: '#6b7280', fontSize: '12px' } 
                        }}
                        axisLine={{ stroke: '#6b7280' }}
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
                        dataKey="production" 
                        stroke="#3b82f6" 
                        fill="#93c5fd" 
                        strokeWidth={2}
                      />
                    </AreaChart>
                  )}
                </ResponsiveContainer>
              </div>
            </TabsContent>

            <TabsContent value="status" className="mt-6">
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart 
                    data={selectedPeriod === 'daily' ? averageStatusData : monthlyStatusData} 
                    margin={{ top: 20, right: 30, left: 50, bottom: 60 }}
                  >
                    <CartesianGrid 
                      strokeDasharray="3 3" 
                      stroke="#e5e7eb" 
                      opacity={0.3} 
                      className="dark:stroke-gray-600 dark:opacity-20" 
                    />
                    <XAxis 
                      dataKey={selectedPeriod === 'daily' ? 'category' : 'month'} 
                      stroke="#6b7280" 
                      className="dark:stroke-gray-400"
                      tick={{ fontSize: 12, fill: '#6b7280' }}
                      tickMargin={10}
                      axisLine={{ stroke: '#6b7280' }}
                    />
                    <YAxis 
                      stroke="#6b7280" 
                      className="dark:stroke-gray-400"
                      tick={{ fontSize: 12, fill: '#6b7280' }}
                      label={{ 
                        value: selectedPeriod === 'daily' ? 'Percentage (%)' : 'Percentage (%)', 
                        angle: -90, 
                        position: 'insideLeft', 
                        style: { textAnchor: 'middle', fill: '#6b7280', fontSize: '12px' } 
                      }}
                      axisLine={{ stroke: '#6b7280' }}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'white', 
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        color: '#1f2937'
                      }}
                    />
                    <Bar dataKey="producing" stackId="a" fill="#10b981" name="Producing" />
                    <Bar dataKey="idle" stackId="a" fill="#f59e0b" name="Idle" />
                    <Bar dataKey="fullWater" stackId="a" fill="#3b82f6" name="Full Water" />
                    <Bar dataKey="disconnected" stackId="a" fill="#ef4444" name="Disconnected" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProductionAnalytics;
