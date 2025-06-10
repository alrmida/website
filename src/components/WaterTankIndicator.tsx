
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
          
          {/* Water Fill Animation Container */}
          <div className="water-tank-container">
            {/* Hidden SVG definitions for smooth waves */}
            <svg className="hidden">
              <defs>
                <g id="wave">
                  <path d="M420,20c21.5-0.4,38.8-2.5,51.1-4.5c13.4-2.2,26.5-5.2,27.3-5.4C514,6.5,518,4.7,528.5,2.7c7.1-1.3,17.9-2.8,31.5-2.7c0,0,0,0,0,0v20H420z"></path>
                  <path d="M420,20c-21.5-0.4-38.8-2.5-51.1-4.5c-13.4-2.2-26.5-5.2-27.3-5.4C326,6.5,322,4.7,311.5,2.7C304.3,1.4,293.6-0.1,280,0c0,0,0,0,0,0v20H420z"></path>
                  <path d="M140,20c21.5-0.4,38.8-2.5,51.1-4.5c13.4-2.2,26.5-5.2,27.3-5.4C234,6.5,238,4.7,248.5,2.7c7.1-1.3,17.9-2.8,31.5-2.7c0,0,0,0,0,0v20H140z"></path>
                  <path d="M140,20c-21.5-0.4-38.8-2.5-51.1-4.5c-13.4-2.2-26.5-5.2-27.3-5.4C46,6.5,42,4.7,31.5,2.7C24.3,1.4,13.6-0.1,0,0c0,0,0,0,0,0l0,20H140z"></path>
                </g>
              </defs>
            </svg>
            
            <div className="water-fill-box">
              {/* Background text (dark) - always visible */}
              <div className="water-percent-bg">
                <span className="water-percent-num">{Math.round(cappedPercentage)}</span>
                <span className="water-percent-symbol">%</span>
              </div>
              
              {/* Water fill with overflow hidden for clipping */}
              <div 
                className="water-fill" 
                style={{ 
                  transform: `translateY(${100 - cappedPercentage}%)`,
                }}
              >
                {/* Foreground text (white) - only visible where water is present */}
                <div className="water-percent-fg">
                  <span className="water-percent-num">{Math.round(cappedPercentage)}</span>
                  <span className="water-percent-symbol">%</span>
                </div>
                
                {/* Animated waves with smooth edges */}
                <svg viewBox="0 0 560 20" className="water-wave water-wave-back">
                  <use href="#wave"></use>
                </svg>
                <svg viewBox="0 0 560 20" className="water-wave water-wave-front">
                  <use href="#wave"></use>
                </svg>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default WaterTankIndicator;
