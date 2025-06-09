
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity } from 'lucide-react';

interface WaterTankIndicatorProps {
  currentLevel: number;
  maxCapacity: number;
  percentage: number;
}

const WaterTankIndicator = ({ currentLevel, maxCapacity, percentage }: WaterTankIndicatorProps) => {
  // Cap the values to avoid noise above limits
  const cappedLevel = Math.min(currentLevel, maxCapacity);
  const cappedPercentage = Math.min(percentage, 100);
  
  // Round the water level to 1 decimal place
  const roundedLevel = Math.round(cappedLevel * 10) / 10;

  return (
    <Card className="bg-white dark:bg-gray-800 hover:shadow-lg transition-shadow border-gray-200 dark:border-gray-700">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-300">💧 Current Water Level</CardTitle>
        <Activity className="h-4 w-4 text-blue-600 dark:text-blue-400" />
      </CardHeader>
      <CardContent className="pb-6">
        <div className="flex items-center justify-between space-x-6">
          <div className="flex-1 min-w-0">
            <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
              {roundedLevel} L
            </div>
            <div className="text-lg text-gray-600 dark:text-gray-400 mb-2">
              ({cappedPercentage}%)
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Water Tank Fill • Capacity: {maxCapacity}L
            </p>
          </div>
          
          {/* Water Cup Container */}
          <div className="relative w-24 h-24">
            {/* Glass/Cup Container */}
            <div className="water-cup" style={{ '--fill-level': `${cappedPercentage}%` } as React.CSSProperties}>
              <div className="water-fill">
                <div className="wave"></div>
              </div>
              
              {/* Percentage label overlay */}
              <div className="absolute inset-0 z-10 flex items-center justify-center text-white mix-blend-difference">
                <span className="text-lg font-bold">{Math.round(cappedPercentage)}</span>
                <span className="text-xs opacity-80 ml-[2px]">%</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default WaterTankIndicator;
