
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
          
          {/* Ocean Water Level Container */}
          <div className="relative w-32 h-48">
            <div className="ocean-container" style={{ '--water-level': `${100 - cappedPercentage}%` } as React.CSSProperties}>
              <svg className="ocean-svg" viewBox="0 0 200 300" preserveAspectRatio="xMidYMid meet">
                <defs>
                  <clipPath id="ocean-clip">
                    <rect x="0" y="0" width="200" height="300" rx="100" ry="100" />
                  </clipPath>
                  <linearGradient id="sky-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" style={{ stopColor: '#87CEEB', stopOpacity: 1 }} />
                    <stop offset="30%" style={{ stopColor: '#B0E0E6', stopOpacity: 1 }} />
                    <stop offset="60%" style={{ stopColor: '#F0F8FF', stopOpacity: 1 }} />
                    <stop offset="100%" style={{ stopColor: '#FFFFFF', stopOpacity: 1 }} />
                  </linearGradient>
                  <linearGradient id="ocean-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" style={{ stopColor: '#4FC3F7', stopOpacity: 0.8 }} />
                    <stop offset="50%" style={{ stopColor: '#29B6F6', stopOpacity: 0.9 }} />
                    <stop offset="100%" style={{ stopColor: '#0277BD', stopOpacity: 1 }} />
                  </linearGradient>
                </defs>
                
                <g clipPath="url(#ocean-clip)">
                  {/* Sky Background */}
                  <rect width="200" height="300" fill="url(#sky-gradient)" />
                  
                  {/* Sun */}
                  <circle className="sun" cx="100" cy="80" r="25" fill="#FFE082" opacity="0.9" />
                  
                  {/* Ocean Water - positioned based on fill level */}
                  <g className="ocean-water">
                    <rect x="0" y="150" width="200" height="150" fill="url(#ocean-gradient)" />
                    
                    {/* Wave animations */}
                    <path className="wave wave-1" 
                          d="M0,150 Q50,140 100,150 T200,150 V300 H0 Z" 
                          fill="rgba(79, 195, 247, 0.6)" />
                    <path className="wave wave-2" 
                          d="M0,160 Q50,150 100,160 T200,160 V300 H0 Z" 
                          fill="rgba(41, 182, 246, 0.4)" />
                    
                    {/* Whales */}
                    <g className="whale whale-1">
                      <ellipse cx="60" cy="200" rx="20" ry="12" fill="#263238" />
                      <ellipse cx="52" cy="196" rx="4" ry="3" fill="#37474F" />
                      <path d="M40,200 Q32,192 24,200 Q32,208 40,200" fill="#263238" />
                      <circle cx="64" cy="194" r="2" fill="white" />
                      <path d="M64,185 Q68,180 72,185 Q68,190 64,185" fill="#37474F" />
                    </g>
                    
                    <g className="whale whale-2">
                      <ellipse cx="140" cy="240" rx="16" ry="10" fill="#37474F" />
                      <ellipse cx="134" cy="237" rx="3" ry="2" fill="#455A64" />
                      <path d="M124,240 Q118,234 112,240 Q118,246 124,240" fill="#37474F" />
                      <circle cx="143" cy="236" r="1.5" fill="white" />
                      <path d="M143,228 Q146,224 149,228 Q146,232 143,228" fill="#455A64" />
                    </g>
                    
                    {/* Small fish */}
                    <g className="fish fish-1">
                      <ellipse cx="100" cy="220" rx="8" ry="4" fill="#42A5F5" />
                      <path d="M92,220 L86,217 L86,223 Z" fill="#42A5F5" />
                      <circle cx="103" cy="218" r="1" fill="white" />
                    </g>
                    
                    <g className="fish fish-2">
                      <ellipse cx="170" cy="260" rx="6" ry="3" fill="#66BB6A" />
                      <path d="M164,260 L160,258 L160,262 Z" fill="#66BB6A" />
                      <circle cx="172" cy="259" r="0.8" fill="white" />
                    </g>
                  </g>
                </g>
                
                {/* Percentage overlay */}
                <foreignObject x="75" y="30" width="50" height="30">
                  <div className="percentage-overlay-ocean">
                    <span className="percentage-text-ocean">{Math.round(cappedPercentage)}%</span>
                  </div>
                </foreignObject>
              </svg>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default WaterTankIndicator;
