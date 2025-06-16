
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Leaf, Droplets, Recycle, TreePine } from 'lucide-react';
import { useWaterProductionCalculator } from '@/hooks/useWaterProductionCalculator';

interface ESGMetricsProps {
  liveData: any;
}

const ESGMetrics = ({ liveData }: ESGMetricsProps) => {
  const { productionData } = useWaterProductionCalculator(liveData);
  
  // Use real production data from the calculator
  const totalWaterProduced = productionData.totalProduced;
  
  // Calculate ESG metrics based on actual water production
  const co2Saved = Math.round(totalWaterProduced * 0.234); // kg CO2 saved per liter
  const plasticBottlesSaved = Math.round(totalWaterProduced / 0.5); // 500ml bottles
  const energyUsed = Math.round(totalWaterProduced * 4.2); // kWh per liter
  const waterFromAir = totalWaterProduced;

  const metrics = [
    {
      title: 'CO₂ Emissions Saved',
      value: `${co2Saved} kg`,
      description: 'vs bottled water',
      icon: Leaf,
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-50 dark:bg-green-900/20'
    },
    {
      title: 'Plastic Bottles Avoided',
      value: `${plasticBottlesSaved}`,
      description: '500ml bottles',
      icon: Recycle,
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20'
    },
    {
      title: 'Water from Air',
      value: `${waterFromAir.toFixed(2)}L`,
      description: 'renewable source',
      icon: Droplets,
      color: 'text-cyan-600 dark:text-cyan-400',
      bgColor: 'bg-cyan-50 dark:bg-cyan-900/20'
    },
    {
      title: 'Energy Efficient',
      value: `${energyUsed} kWh`,
      description: 'solar powered',
      icon: TreePine,
      color: 'text-emerald-600 dark:text-emerald-400',
      bgColor: 'bg-emerald-50 dark:bg-emerald-900/20'
    }
  ];

  return (
    <Card className="bg-white dark:bg-gray-800 mb-6">
      <CardHeader>
        <CardTitle className="text-gray-900 dark:text-white flex items-center">
          <Leaf className="w-5 h-5 mr-2 text-green-600 dark:text-green-400" />
          ESG Impact Metrics
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {metrics.map((metric, index) => {
            const Icon = metric.icon;
            return (
              <div key={index} className={`${metric.bgColor} p-4 rounded-lg border`}>
                <div className="flex items-center justify-between mb-2">
                  <Icon className={`w-5 h-5 ${metric.color}`} />
                </div>
                <div className="space-y-1">
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {metric.value}
                  </p>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {metric.title}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {metric.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default ESGMetrics;
