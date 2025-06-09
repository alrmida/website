
import React, { useId } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity } from 'lucide-react';

interface WaterTankIndicatorProps {
  currentLevel: number;
  maxCapacity: number;
  percentage: number;
}

const WaterTankIndicator = ({ currentLevel, maxCapacity, percentage }: WaterTankIndicatorProps) => {
  const waveId = useId();
  
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
          
          {/* Water Circle Container – new wave animation */}
          <div className="relative w-24 h-24 rounded-full overflow-hidden">
            {/* % label */}
            <div className="absolute inset-0 z-10 flex items-center justify-center text-white">
              <span className="text-lg font-bold">{Math.round(cappedPercentage)}</span>
              <span className="text-xs opacity-80 ml-[2px]">%</span>
            </div>

            {/* Waves (two layers, clipped to the circle) */}
            <svg
              viewBox="0 0 560 560"
              className="absolute inset-0"
              style={{ transform: `translateY(${100 - cappedPercentage}%)`, transition: 'transform .3s ease-out' }}
            >
              <defs>
                {/* circle mask */}
                <clipPath id={`clip-${waveId}`}>
                  <circle cx="280" cy="280" r="280" />
                </clipPath>

                {/* reusable wave crest row */}
                <symbol id={`wave-${waveId}`} viewBox="0 0 560 20">
                  <path d="M0 20c21.5-.4 38.8-2.5 51.1-4.5
                           13.4-2.2 26.5-5.2 27.3-5.4
                           12.6-2.1 16.6-3.9 27.1-5.9
                           7.1-1.3 17.9-2.8 31.5-2.7V20z" />
                  <path d="M280 20c-21.5-.4-38.8-2.5-51.1-4.5
                           -13.4-2.2-26.5-5.2-27.3-5.4
                           -12.6-2.1-16.6-3.9-27.1-5.9
                           -7.2-1.3-17.9-2.8-31.5-2.7V20z" />
                </symbol>
              </defs>

              {/* group is clipped to circle */}
              <g clipPath={`url(#clip-${waveId})`}>
                <g className="wave wave-back">
                  <use href={`#wave-${waveId}`} x="0" y="540" />
                </g>
                <g className="wave wave-front">
                  <use href={`#wave-${waveId}`} x="0" y="540" />
                </g>
              </g>
            </svg>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default WaterTankIndicator;
