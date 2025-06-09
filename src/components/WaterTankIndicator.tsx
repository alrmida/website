
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, Droplet } from 'lucide-react';

interface WaterTankIndicatorProps {
  currentLevel: number;
  maxCapacity: number;
  percentage: number;
}

const WaterTankIndicator = ({ currentLevel, maxCapacity, percentage }: WaterTankIndicatorProps) => {
  // Cap the values to avoid noise above limits
  const cappedLevel = Math.min(currentLevel, maxCapacity);
  const cappedPercentage = Math.min(percentage, 100);

  return (
    <Card className="bg-white dark:bg-gray-800 hover:shadow-lg transition-shadow border-gray-200 dark:border-gray-700">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-300">💧 Current Water Level</CardTitle>
        <Activity className="h-4 w-4 text-blue-600 dark:text-blue-400" />
      </CardHeader>
      <CardContent>
        <div className="flex items-center space-x-4">
          <div className="flex-1">
            <div className="text-3xl font-bold text-gray-900 dark:text-white">
              {cappedLevel} L <span className="text-xl">({cappedPercentage}%)</span>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Water Tank Fill • Capacity: {maxCapacity}L
            </p>
          </div>
          
          {/* Animated Water Droplet Visual */}
          <div className="relative">
            {/* Droplet shape container */}
            <div className="relative w-16 h-20 overflow-hidden">
              {/* Droplet outline using CSS to create the shape */}
              <div 
                className="absolute inset-0 border-2 border-gray-300 dark:border-gray-500 bg-gray-50 dark:bg-gray-600"
                style={{
                  borderRadius: '50% 50% 50% 50% / 60% 60% 40% 40%',
                  transform: 'rotate(45deg)',
                  transformOrigin: 'center'
                }}
              >
                {/* Water fill animation inside droplet */}
                <div 
                  className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-blue-500 to-blue-300 dark:from-blue-600 dark:to-blue-400 transition-all duration-1000 ease-out"
                  style={{ 
                    height: `${cappedPercentage}%`,
                    borderRadius: '50% 50% 50% 50% / 60% 60% 40% 40%'
                  }}
                >
                  {/* Small animated droplet inside */}
                  <div className="absolute top-1 left-1/2 transform -translate-x-1/2 -rotate-45">
                    <Droplet className="h-2 w-2 text-blue-200 dark:text-blue-100 animate-bounce" />
                  </div>
                </div>
                
                {/* Percentage indicator */}
                <div className="absolute inset-0 flex items-center justify-center transform -rotate-45">
                  <span className="text-xs font-bold text-white drop-shadow-md">
                    {cappedPercentage}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default WaterTankIndicator;
