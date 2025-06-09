
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
          
          {/* Water Gauge Container */}
          <div className="relative w-32 h-32">
            <div className="water-gauge" style={{ '--fill-level': `${cappedPercentage}%` } as React.CSSProperties}>
              <svg className="wave-svg" viewBox="0 0 200 200">
                <defs>
                  <clipPath id="water-clip">
                    <rect x="0" y="0" width="200" height="200" />
                  </clipPath>
                  <linearGradient id="sunset" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" style={{ stopColor: '#ff6b6b', stopOpacity: 1 }} />
                    <stop offset="50%" style={{ stopColor: '#feca57', stopOpacity: 1 }} />
                    <stop offset="100%" style={{ stopColor: '#48dbfb', stopOpacity: 1 }} />
                  </linearGradient>
                </defs>
                
                {/* Sky/Sunset Background */}
                <rect width="200" height="200" fill="url(#sunset)" />
                
                {/* Sun */}
                <circle className="sun" cx="100" cy="60" r="20" fill="#fff3cd" opacity="0.8" />
                
                {/* Water */}
                <g clipPath="url(#water-clip)">
                  <path className="wave-front" d="M0,100 Q50,80 100,100 T200,100 V200 H0 Z" />
                  <path className="wave-back" d="M0,110 Q50,90 100,110 T200,110 V200 H0 Z" />
                </g>
                
                {/* Whales */}
                <g className="whale whale-1">
                  <ellipse cx="40" cy="120" rx="15" ry="8" fill="#2c3e50" />
                  <ellipse cx="35" cy="118" rx="3" ry="2" fill="#34495e" />
                  <path d="M25,120 Q20,115 15,120 Q20,125 25,120" fill="#2c3e50" />
                  <circle cx="42" cy="117" r="1" fill="white" />
                </g>
                
                <g className="whale whale-2">
                  <ellipse cx="150" cy="140" rx="12" ry="6" fill="#34495e" />
                  <ellipse cx="146" cy="138" rx="2" ry="1.5" fill="#2c3e50" />
                  <path d="M138,140 Q134,136 130,140 Q134,144 138,140" fill="#34495e" />
                  <circle cx="151" cy="138" r="0.8" fill="white" />
                </g>
                
                {/* Fish */}
                <g className="fish fish-1">
                  <ellipse cx="70" cy="150" rx="6" ry="3" fill="#3498db" />
                  <path d="M64,150 L60,148 L60,152 Z" fill="#3498db" />
                  <circle cx="72" cy="149" r="0.5" fill="white" />
                </g>
                
                <g className="fish fish-2">
                  <ellipse cx="120" cy="160" rx="5" ry="2.5" fill="#e74c3c" />
                  <path d="M115,160 L112,158 L112,162 Z" fill="#e74c3c" />
                  <circle cx="121" cy="159" r="0.4" fill="white" />
                </g>
              </svg>
              
              {/* Percentage overlay */}
              <div className="percentage-overlay">
                <span className="percentage-text">{Math.round(cappedPercentage)}%</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default WaterTankIndicator;
