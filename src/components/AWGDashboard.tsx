import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { Activity, Settings, Monitor, Database } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import WaterTankIndicator from '@/components/WaterTankIndicator';
import MachineInfoHeader from '@/components/MachineInfoHeader';

const AWGDashboard = () => {
  const [selectedPeriod, setSelectedPeriod] = useState('daily');

  // Machine information
  const machineInfo = {
    machineId: 'AWG-001-2024',
    machineName: 'Kumulus AWG Unit #1',
    location: 'Barcelona, Spain',
    status: 'Producing',
    launchDate: 'March 15, 2024'
  };

  // Water tank specifications
  const waterTank = {
    currentLevel: 10.0,
    maxCapacity: 12.0,
    percentage: 83
  };

  // Mock data for daily production
  const dailyProductionData = [
    { date: '01 Jun', production: 15.2 },
    { date: '29 May', production: 31.5 },
    { date: '30 May', production: 47.8 },
    { date: '31 May', production: 19.6 }
  ];

  // Mock data for monthly production
  const monthlyProductionData = [
    { month: 'Apr 2025', production: 2250 },
    { month: 'Mar 2025', production: 1850 },
    { month: 'May 2025', production: 1950 }
  ];

  // Mock data for status tracking
  const statusData = [
    { date: '01 Jun', producing: 18, idle: 2, fullWater: 1, disconnected: 3 },
    { date: '26 May', producing: 19, idle: 1, fullWater: 2, disconnected: 2 },
    { date: '27 May', producing: 22, idle: 1, fullWater: 1, disconnected: 0 },
    { date: '28 May', producing: 19, idle: 2, fullWater: 2, disconnected: 1 },
    { date: '29 May', producing: 21, idle: 1, fullWater: 1, disconnected: 1 },
    { date: '30 May', producing: 12, idle: 6, fullWater: 3, disconnected: 3 },
    { date: '31 May', producing: 10, idle: 6, fullWater: 4, disconnected: 4 }
  ];

  const monthlyStatusData = [
    { month: '2025-03', producing: 68.9, idle: 14.1, fullWater: 5.2, disconnected: 11.8 },
    { month: '2025-04', producing: 85.2, idle: 8.5, fullWater: 3.1, disconnected: 3.2 },
    { month: '2025-05', producing: 72.4, idle: 15.6, fullWater: 6.8, disconnected: 5.2 },
    { month: '2025-06', producing: 78.1, idle: 12.3, fullWater: 4.9, disconnected: 4.7 }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 shadow-sm border-b dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center">
                <span className="text-white text-xl">💧</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Kumulus - AWG Dashboard</h1>
                <p className="text-sm text-gray-600 dark:text-gray-300">Powered by EeKan • Clean water from air • Real-time Monitoring</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <ThemeToggle />
              <Button variant="outline" size="sm">
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Machine Information Header */}
        <MachineInfoHeader
          machineId={machineInfo.machineId}
          machineName={machineInfo.machineName}
          location={machineInfo.location}
          status={machineInfo.status}
          launchDate={machineInfo.launchDate}
        />

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <WaterTankIndicator
            currentLevel={waterTank.currentLevel}
            maxCapacity={waterTank.maxCapacity}
            percentage={waterTank.percentage}
          />

          <Card className="bg-white dark:bg-gray-800 hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-300">⚡ Machine State</CardTitle>
              <Monitor className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">Producing</div>
              <Badge variant="secondary" className="mt-2 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200">Online</Badge>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-gray-800 hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-300">📊 Total Water Produced</CardTitle>
              <Database className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900 dark:text-white">1245.7 L</div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Since {machineInfo.launchDate}</p>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-gray-800 hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-300">💰 Money Saved</CardTitle>
              <Activity className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">€622.85</div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Since {machineInfo.launchDate}</p>
            </CardContent>
          </Card>
        </div>

        {/* Water Production Analytics */}
        <Card className="mb-8 bg-white dark:bg-gray-800">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-lg">📈</span>
                <CardTitle className="dark:text-white">Water Production</CardTitle>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs value={selectedPeriod} onValueChange={setSelectedPeriod} className="w-full">
              <TabsList className="grid w-full grid-cols-4 mb-6">
                <TabsTrigger value="daily" className="text-red-600 data-[state=active]:bg-red-100 dark:data-[state=active]:bg-red-900">Daily Production</TabsTrigger>
                <TabsTrigger value="monthly">Monthly Production</TabsTrigger>
                <TabsTrigger value="status7">Status (7 Days)</TabsTrigger>
                <TabsTrigger value="status4">Status (4 Months)</TabsTrigger>
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

        {/* Footer */}
        <div className="text-center text-sm text-gray-500 dark:text-gray-400">
          © 2025 Kumulus Water • Last updated: 2025-06-01 07:39
        </div>
      </div>
    </div>
  );
};

export default AWGDashboard;
