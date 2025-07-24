
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Leaf, Recycle, TrendingUp } from 'lucide-react';

interface ESGMetricsProps {
  totalWaterProduced: number;
}

const ESGMetrics = ({ totalWaterProduced }: ESGMetricsProps) => {
  // Calculate ESG metrics based on water production
  const co2Saved = Math.round(totalWaterProduced * 0.234); // kg CO2 saved per liter
  const plasticBottlesSaved = Math.round(totalWaterProduced / 0.5); // 500ml bottles
  const moneySaved = Math.round(totalWaterProduced * 0.5); // €0.50 per liter saved

  return (
    <div className="mb-8">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
        Environmental & Social Impact
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-white dark:bg-card border-2 border-kumulus-blue/70 dark:border-kumulus-blue/70 hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-kumulus-blue dark:text-kumulus-blue">
              CO₂ Emissions Saved
            </CardTitle>
            <Leaf className="h-4 w-4 text-kumulus-blue dark:text-kumulus-blue" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-kumulus-blue dark:text-kumulus-blue">
              {co2Saved} kg
            </div>
            <p className="text-xs text-kumulus-blue/70 dark:text-kumulus-blue/70 mt-1">
              vs bottled water production
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-card border-2 border-kumulus-orange/70 dark:border-kumulus-orange/70 hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-kumulus-orange dark:text-kumulus-orange">
              Plastic Bottles Saved
            </CardTitle>
            <Recycle className="h-4 w-4 text-kumulus-orange dark:text-kumulus-orange" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-kumulus-orange dark:text-kumulus-orange">
              {plasticBottlesSaved}
            </div>
            <p className="text-xs text-kumulus-orange/70 dark:text-kumulus-orange/70 mt-1">
              500ml bottles avoided
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-card border-2 border-kumulus-yellow/70 dark:border-kumulus-yellow/70 hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-kumulus-yellow dark:text-kumulus-yellow">
              Cost Savings
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-kumulus-yellow dark:text-kumulus-yellow" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-kumulus-yellow dark:text-kumulus-yellow">
              €{moneySaved}
            </div>
            <p className="text-xs text-kumulus-yellow/70 dark:text-kumulus-yellow/70 mt-1">
              vs purchasing bottled water
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ESGMetrics;
