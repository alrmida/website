
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

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

  // Custom tooltip for status chart
  const StatusTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-kumulus-dark-blue border border-kumulus-blue/20 dark:border-kumulus-yellow/30 rounded-lg p-3 shadow-lg">
          <p className="font-medium text-kumulus-dark-blue dark:text-white mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-2 text-sm">
              <div 
                className="w-3 h-3 rounded-sm" 
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-kumulus-dark-blue/70 dark:text-kumulus-cream/70">{entry.name}:</span>
              <span className="font-medium text-kumulus-dark-blue dark:text-white">{entry.value}%</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Production Analytics */}
      <Card className="bg-white dark:bg-kumulus-dark-blue border-kumulus-blue/20 dark:border-kumulus-yellow/30">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-kumulus-dark-blue dark:text-white">Production Analytics</CardTitle>
            <div className="flex items-center space-x-2">
              <Label htmlFor="period-select" className="text-sm text-kumulus-dark-blue/70 dark:text-kumulus-cream/70">Period:</Label>
              <Select value={selectedPeriod} onValueChange={onPeriodChange}>
                <SelectTrigger className="w-32 border-kumulus-blue/30">
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
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--kumulus-blue) / 0.2)" />
                <XAxis 
                  dataKey={selectedPeriod === 'daily' ? 'date' : 'month'} 
                  stroke="hsl(var(--kumulus-dark-blue))"
                  tick={{ fontSize: 12, fill: 'hsl(var(--kumulus-dark-blue))' }}
                />
                <YAxis 
                  stroke="hsl(var(--kumulus-dark-blue))"
                  tick={{ fontSize: 12, fill: 'hsl(var(--kumulus-dark-blue))' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'white', 
                    border: '1px solid hsl(var(--kumulus-blue) / 0.2)',
                    borderRadius: '8px',
                    color: 'hsl(var(--kumulus-dark-blue))'
                  }}
                />
                <Bar dataKey="production" fill="hsl(var(--kumulus-blue))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Production Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-kumulus-blue/10 dark:bg-kumulus-blue/20 p-4 rounded-lg border border-kumulus-blue/20">
              <h4 className="text-sm font-medium text-kumulus-blue dark:text-kumulus-yellow">Total Production</h4>
              <p className="text-2xl font-bold text-kumulus-dark-blue dark:text-white">
                {productionMetrics.total.toFixed(1)}L
              </p>
            </div>
            <div className="bg-kumulus-yellow/20 dark:bg-kumulus-yellow/10 p-4 rounded-lg border border-kumulus-yellow/30">
              <h4 className="text-sm font-medium text-kumulus-dark-blue dark:text-kumulus-yellow">Average Daily</h4>
              <p className="text-2xl font-bold text-kumulus-dark-blue dark:text-white">
                {productionMetrics.average.toFixed(1)}L
              </p>
            </div>
            <div className="bg-kumulus-orange/10 dark:bg-kumulus-orange/20 p-4 rounded-lg border border-kumulus-orange/30">
              <h4 className="text-sm font-medium text-kumulus-orange dark:text-kumulus-orange">Peak Day</h4>
              <p className="text-2xl font-bold text-kumulus-dark-blue dark:text-white">
                {productionMetrics.peak.toFixed(1)}L
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Status Analytics - Now with Stacked Bar Chart */}
      <Card className="bg-white dark:bg-kumulus-dark-blue border-kumulus-blue/20 dark:border-kumulus-yellow/30">
        <CardHeader>
          <CardTitle className="text-kumulus-dark-blue dark:text-white">Status Analytics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80 mb-6">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={selectedPeriod === 'daily' ? statusData : monthlyStatusData} 
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--kumulus-blue) / 0.2)" />
                <XAxis 
                  dataKey={selectedPeriod === 'daily' ? 'date' : 'month'} 
                  stroke="hsl(var(--kumulus-dark-blue))"
                  tick={{ fontSize: 12, fill: 'hsl(var(--kumulus-dark-blue))' }}
                />
                <YAxis 
                  stroke="hsl(var(--kumulus-dark-blue))"
                  tick={{ fontSize: 12, fill: 'hsl(var(--kumulus-dark-blue))' }}
                  domain={[0, 100]}
                />
                <Tooltip content={<StatusTooltip />} />
                <Bar 
                  dataKey="producing" 
                  stackId="status" 
                  fill="hsl(var(--kumulus-blue))" 
                  name="Producing"
                  radius={[0, 0, 0, 0]}
                />
                <Bar 
                  dataKey="idle" 
                  stackId="status" 
                  fill="hsl(var(--kumulus-yellow))" 
                  name="Idle"
                  radius={[0, 0, 0, 0]}
                />
                <Bar 
                  dataKey="fullWater" 
                  stackId="status" 
                  fill="hsl(var(--kumulus-blue) / 0.7)" 
                  name="Full Water"
                  radius={[0, 0, 0, 0]}
                />
                <Bar 
                  dataKey="disconnected" 
                  stackId="status" 
                  fill="hsl(var(--kumulus-orange))" 
                  name="Disconnected"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Status Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-kumulus-blue/10 dark:bg-kumulus-blue/20 p-4 rounded-lg border border-kumulus-blue/20">
              <h4 className="text-sm font-medium text-kumulus-blue dark:text-kumulus-yellow">Producing</h4>
              <p className="text-2xl font-bold text-kumulus-dark-blue dark:text-white">
                {statusMetrics.producing}%
              </p>
            </div>
            <div className="bg-kumulus-yellow/20 dark:bg-kumulus-yellow/10 p-4 rounded-lg border border-kumulus-yellow/30">
              <h4 className="text-sm font-medium text-kumulus-dark-blue dark:text-kumulus-yellow">Idle</h4>
              <p className="text-2xl font-bold text-kumulus-dark-blue dark:text-white">
                {statusMetrics.idle}%
              </p>
            </div>
            <div className="bg-kumulus-blue/10 dark:bg-kumulus-blue/20 p-4 rounded-lg border border-kumulus-blue/20">
              <h4 className="text-sm font-medium text-kumulus-blue dark:text-kumulus-yellow">Full Water</h4>
              <p className="text-2xl font-bold text-kumulus-dark-blue dark:text-white">
                {statusMetrics.fullWater}%
              </p>
            </div>
            <div className="bg-kumulus-orange/10 dark:bg-kumulus-orange/20 p-4 rounded-lg border border-kumulus-orange/30">
              <h4 className="text-sm font-medium text-kumulus-orange dark:text-kumulus-orange">Disconnected</h4>
              <p className="text-2xl font-bold text-kumulus-dark-blue dark:text-white">
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
