
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
        <Card className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-green-700 dark:text-green-300">
              CO₂ Emissions Saved
            </CardTitle>
            <Leaf className="h-4 w-4 text-green-600 dark:text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {co2Saved} kg
            </div>
            <p className="text-xs text-green-600 dark:text-green-400 mt-1">
              vs bottled water production
            </p>
          </CardContent>
        </Card>

        <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-blue-700 dark:text-blue-300">
              Plastic Bottles Saved
            </CardTitle>
            <Recycle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {plasticBottlesSaved}
            </div>
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
              500ml bottles avoided
            </p>
          </CardContent>
        </Card>

        <Card className="bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-purple-700 dark:text-purple-300">
              Cost Savings
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-purple-600 dark:text-purple-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              €{moneySaved}
            </div>
            <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">
              vs purchasing bottled water
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ESGMetrics;
