
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

interface ProductionAnalyticsProps {
  selectedPeriod: string;
  onPeriodChange: (period: string) => void;
  dailyProductionData: Array<{ date: string; production: number }>;
  monthlyProductionData: Array<{ month: string; production: number }>;
  statusData: Array<{ date: string; producing: number; idle: number; fullWater: number; disconnected: number }>;
  monthlyStatusData: Array<{ month: string; producing: number; idle: number; fullWater: number; disconnected: number }>;
}

const ProductionAnalytics = ({
  selectedPeriod,
  onPeriodChange,
  dailyProductionData,
  monthlyProductionData,
  statusData,
  monthlyStatusData
}: ProductionAnalyticsProps) => {
  return (
    <Card className="mb-8 bg-white dark:bg-gray-800">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-lg">📊</span>
            <CardTitle className="dark:text-white">Metrics & Visuals</CardTitle>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={selectedPeriod} onValueChange={onPeriodChange} className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-6 bg-gray-100 dark:bg-gray-700">
            <TabsTrigger 
              value="daily" 
              className="data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-md dark:data-[state=active]:bg-blue-500 dark:text-gray-300 text-gray-700 font-medium transition-all duration-200"
            >
              Daily Production
            </TabsTrigger>
            <TabsTrigger 
              value="monthly"
              className="data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-md dark:data-[state=active]:bg-blue-500 dark:text-gray-300 text-gray-700 font-medium transition-all duration-200"
            >
              Monthly Production
            </TabsTrigger>
            <TabsTrigger 
              value="status7"
              className="data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-md dark:data-[state=active]:bg-blue-500 dark:text-gray-300 text-gray-700 font-medium transition-all duration-200"
            >
              Status (7 Days)
            </TabsTrigger>
            <TabsTrigger 
              value="status4"
              className="data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-md dark:data-[state=active]:bg-blue-500 dark:text-gray-300 text-gray-300 font-medium transition-all duration-200"
            >
              Status (4 Months)
            </TabsTrigger>
          </TabsList>

          <TabsContent value="daily" className="mt-6">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dailyProductionData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f9ff" />
                <XAxis dataKey="date" />
                <YAxis label={{ value: 'Water Production (L)', angle: -90, position: 'insideLeft' }} />
                <Tooltip 
                  formatter={(value) => [`${value} L`, 'Production']}
                  labelStyle={{ color: '#374151' }}
                  contentStyle={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}
                />
                <Bar dataKey="production" fill="#2563eb" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
              <Card className="bg-gray-50">
                <CardContent className="p-4">
                  <div className="text-center">
                    <p className="text-sm text-gray-600">Average Daily Production</p>
                    <p className="text-2xl font-bold text-gray-900">28.3 L</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-gray-50">
                <CardContent className="p-4">
                  <div className="text-center">
                    <p className="text-sm text-gray-600">Maximum Daily Production</p>
                    <p className="text-2xl font-bold text-gray-900">47.5 L</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-gray-50">
                <CardContent className="p-4">
                  <div className="text-center">
                    <p className="text-sm text-gray-600">Minimum Daily Production</p>
                    <p className="text-2xl font-bold text-gray-900">15.0 L</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="monthly" className="mt-6">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyProductionData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f9ff" />
                <XAxis dataKey="month" />
                <YAxis label={{ value: 'Water Production (L)', angle: -90, position: 'insideLeft' }} />
                <Tooltip 
                  formatter={(value) => [`${value} L`, 'Production']}
                  labelStyle={{ color: '#374151' }}
                  contentStyle={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}
                />
                <Bar dataKey="production" fill="#2563eb" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <Card className="bg-gray-50 mt-6">
              <CardContent className="p-4">
                <div className="text-center">
                  <p className="text-sm text-gray-600">Total Production</p>
                  <p className="text-3xl font-bold text-gray-900">6185.3 L</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="status7" className="mt-6">
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={statusData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f9ff" />
                <XAxis dataKey="date" />
                <YAxis label={{ value: 'Hours', angle: -90, position: 'insideLeft' }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}
                />
                <Area type="monotone" dataKey="producing" stackId="1" stroke="#22c55e" fill="#22c55e" />
                <Area type="monotone" dataKey="idle" stackId="1" stroke="#3b82f6" fill="#3b82f6" />
                <Area type="monotone" dataKey="fullWater" stackId="1" stroke="#f59e0b" fill="#f59e0b" />
                <Area type="monotone" dataKey="disconnected" stackId="1" stroke="#ef4444" fill="#ef4444" />
              </AreaChart>
            </ResponsiveContainer>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
              <Card className="bg-green-50">
                <CardContent className="p-4">
                  <div className="text-center">
                    <p className="text-sm text-green-700">Producing (hrs)</p>
                    <p className="text-2xl font-bold text-green-800">16.9 hrs</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-blue-50">
                <CardContent className="p-4">
                  <div className="text-center">
                    <p className="text-sm text-blue-700">Idle (hrs)</p>
                    <p className="text-2xl font-bold text-blue-800">4.0 hrs</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-amber-50">
                <CardContent className="p-4">
                  <div className="text-center">
                    <p className="text-sm text-amber-700">Full Water (hrs)</p>
                    <p className="text-2xl font-bold text-amber-800">0.5 hrs</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-red-50">
                <CardContent className="p-4">
                  <div className="text-center">
                    <p className="text-sm text-red-700">Disconnected (hrs)</p>
                    <p className="text-2xl font-bold text-red-800">2.6 hrs</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="status4" className="mt-6">
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={monthlyStatusData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f9ff" />
                <XAxis dataKey="month" />
                <YAxis label={{ value: 'Percentage', angle: -90, position: 'insideLeft' }} />
                <Tooltip 
                  formatter={(value) => [`${value}%`, '']}
                  contentStyle={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}
                />
                <Area type="monotone" dataKey="producing" stackId="1" stroke="#22c55e" fill="#22c55e" />
                <Area type="monotone" dataKey="idle" stackId="1" stroke="#3b82f6" fill="#3b82f6" />
                <Area type="monotone" dataKey="fullWater" stackId="1" stroke="#f59e0b" fill="#f59e0b" />
                <Area type="monotone" dataKey="disconnected" stackId="1" stroke="#ef4444" fill="#ef4444" />
              </AreaChart>
            </ResponsiveContainer>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
              <Card className="bg-green-50">
                <CardContent className="p-4">
                  <div className="text-center">
                    <p className="text-sm text-green-700">Producing</p>
                    <p className="text-2xl font-bold text-green-800">68.9%</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-blue-50">
                <CardContent className="p-4">
                  <div className="text-center">
                    <p className="text-sm text-blue-700">Idle</p>
                    <p className="text-2xl font-bold text-blue-800">14.1%</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-amber-50">
                <CardContent className="p-4">
                  <div className="text-center">
                    <p className="text-sm text-amber-700">Full Water</p>
                    <p className="text-2xl font-bold text-amber-800">5.2%</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-red-50">
                <CardContent className="p-4">
                  <div className="text-center">
                    <p className="text-sm text-red-700">Disconnected</p>
                    <p className="text-2xl font-bold text-red-800">11.8%</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default ProductionAnalytics;
