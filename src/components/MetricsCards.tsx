import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Activity, Monitor, Database, Leaf, Recycle } from 'lucide-react';
import WaterTankIndicator from '@/components/WaterTankIndicator';

interface MetricsCardsProps {
  waterTank: {
    currentLevel: number;
    maxCapacity: number;
    percentage: number;
  };
  machineStatus?: string;
  totalWaterProduced: number;
  lastUpdate?: Date | null;
}

const MetricsCards = ({ waterTank, machineStatus = 'Offline', totalWaterProduced, lastUpdate }: MetricsCardsProps) => {
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'producing':
        return 'bg-kumulus-blue/10 text-kumulus-blue border-kumulus-blue/20';
      case 'idle':
        return 'bg-kumulus-yellow/20 text-kumulus-dark-blue border-kumulus-yellow/40';
      case 'full water':
        return 'bg-kumulus-blue/10 text-kumulus-blue border-kumulus-blue/20';
      case 'disconnected':
      case 'offline':
        return 'bg-kumulus-orange/10 text-kumulus-orange border-kumulus-orange/20';
      default:
        return 'bg-muted text-muted-foreground border-border';
    }
  };

  const getStatusIcon = (status: string) => {
    const isOnline = !['disconnected', 'offline', 'loading...'].includes(status.toLowerCase());
    return isOnline ? 'Online' : 'Offline';
  };

  const formatLastUpdate = (date: Date | null) => {
    if (!date) return 'No snapshots yet';
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ${diffMins % 60}m ago`;
    
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Calculate ESG metrics based on water production
  const co2Saved = Math.round(totalWaterProduced * 0.234); // kg CO2 saved per liter
  const plasticBottlesSaved = Math.round(totalWaterProduced / 0.5); // 500ml bottles
  const moneySaved = Math.round(totalWaterProduced * 0.5 * 100) / 100; // €0.50 per liter saved, rounded to 2 decimal places

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
      {/* Left side - larger cards */}
      <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
        <WaterTankIndicator
          currentLevel={waterTank.currentLevel}
          maxCapacity={waterTank.maxCapacity}
          percentage={waterTank.percentage}
        />

        <Card className="bg-white dark:bg-card hover:shadow-lg transition-all duration-200 border-gray-200 dark:border-gray-700 hover:border-kumulus-blue/30">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">⚡ Machine State</CardTitle>
            <Monitor className="h-4 w-4 text-kumulus-blue" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-kumulus-dark-blue dark:text-white mb-3">{machineStatus}</div>
            <Badge variant="secondary" className={`${getStatusColor(machineStatus)}`}>
              {getStatusIcon(machineStatus)}
            </Badge>
          </CardContent>
        </Card>
      </div>

      {/* Right side - 2x2 grid of smaller cards */}
      <div className="lg:col-span-2 grid grid-cols-2 gap-4">
        <Card className="bg-white dark:bg-card hover:shadow-lg transition-all duration-200 border-gray-200 dark:border-gray-700 hover:border-kumulus-blue/30">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">📊 Total Water</CardTitle>
            <Database className="h-3 w-3 text-kumulus-blue" />
          </CardHeader>
          <CardContent className="pb-3">
            <div className="text-lg font-bold text-kumulus-dark-blue dark:text-white">{totalWaterProduced.toFixed(1)} L</div>
            <p className="text-xs text-muted-foreground mt-1">
              Tracked via snapshots
            </p>
            {lastUpdate && (
              <p className="text-xs text-kumulus-blue mt-1">
                Last: {formatLastUpdate(lastUpdate)}
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-card hover:shadow-lg transition-all duration-200 border-kumulus-yellow/30 hover:border-kumulus-yellow/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium text-kumulus-dark-blue">💰 Money Saved</CardTitle>
            <Activity className="h-3 w-3 text-kumulus-orange" />
          </CardHeader>
          <CardContent className="pb-3">
            <div className="text-lg font-bold text-kumulus-orange">€{moneySaved.toFixed(2)}</div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-card hover:shadow-lg transition-all duration-200 border-kumulus-blue/20 hover:border-kumulus-blue/40">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium text-kumulus-blue">🌱 CO₂ Saved</CardTitle>
            <Leaf className="h-3 w-3 text-kumulus-blue" />
          </CardHeader>
          <CardContent className="pb-3">
            <div className="text-lg font-bold text-kumulus-blue">{co2Saved} kg</div>
            <p className="text-xs text-kumulus-blue/70 mt-1">vs bottled water</p>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-card hover:shadow-lg transition-all duration-200 border-kumulus-blue/20 hover:border-kumulus-blue/40">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium text-kumulus-blue">♻️ Bottles Saved</CardTitle>
            <Recycle className="h-3 w-3 text-kumulus-blue" />
          </CardHeader>
          <CardContent className="pb-3">
            <div className="text-lg font-bold text-kumulus-blue">{plasticBottlesSaved}</div>
            <p className="text-xs text-kumulus-blue/70 mt-1">500ml bottles</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default MetricsCards;
