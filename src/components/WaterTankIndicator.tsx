
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
    <Card className="bg-white dark:bg-kumulus-dark-blue hover:shadow-lg transition-shadow border-kumulus-blue/20 dark:border-kumulus-yellow/30">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-sm font-medium text-kumulus-dark-blue dark:text-kumulus-cream">💧 Current Water Level</CardTitle>
        <Activity className="h-4 w-4 text-kumulus-blue dark:text-kumulus-yellow" />
      </CardHeader>
      <CardContent className="pb-6">
        <div className="flex items-center justify-between space-x-6">
          <div className="flex-1 min-w-0">
            <div className="text-3xl font-bold text-kumulus-dark-blue dark:text-white mb-1">
              {roundedLevel} L
            </div>
            <div className="text-lg text-kumulus-blue dark:text-kumulus-yellow mb-2">
              ({cappedPercentage}%)
            </div>
            <p className="text-sm text-kumulus-dark-blue/70 dark:text-kumulus-cream/70">
              Water Tank Fill • Capacity: {maxCapacity}L
            </p>
          </div>
          
          {/* Water Fill Animation Container */}
          <div className="water-tank-container">
            <svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink" x="0px" y="0px" style={{ display: 'none' }}>
              <defs>
                <clipPath id="circle-clip">
                  <circle cx="70" cy="70" r="70" />
                </clipPath>
                <mask id="water-mask">
                  <rect width="100%" height="100%" fill="black"/>
                  <div 
                    style={{ 
                      position: 'absolute',
                      width: '100%',
                      height: `${cappedPercentage}%`,
                      bottom: 0,
                      background: 'white'
                    }}
                  />
                </mask>
              </defs>
              <symbol id="wave">
                <path d="M420,20c21.5-0.4,38.8-2.5,51.1-4.5c13.4-2.2,26.5-5.2,27.3-5.4C514,6.5,518,4.7,528.5,2.7c7.1-1.3,17.9-2.8,31.5-2.7c0,0,0,0,0,0v20H420z"></path>
                <path d="M420,20c-21.5-0.4-38.8-2.5-51.1-4.5c-13.4-2.2-26.5-5.2-27.3-5.4C326,6.5,322,4.7,311.5,2.7C304.3,1.4,293.6-0.1,280,0c0,0,0,0,0,0v20H420z"></path>
                <path d="M140,20c21.5-0.4,38.8-2.5,51.1-4.5c13.4-2.2,26.5-5.2,27.3-5.4C234,6.5,238,4.7,248.5,2.7c7.1-1.3,17.9-2.8,31.5-2.7c0,0,0,0,0,0v20H140z"></path>
                <path d="M140,20c-21.5-0.4-38.8-2.5-51.1-4.5c-13.4-2.2-26.5-5.2-27.3-5.4C46,6.5,42,4.7,31.5,2.7C24.3,1.4,13.6-0.1,0,0c0,0,0,0,0,0l0,20H140z"></path>
              </symbol>
            </svg>
            
            <div className="water-fill-box">
              {/* Background text (dark) */}
              <div className="water-percent water-percent-bg">
                <div className="water-percent-num">{Math.round(cappedPercentage)}</div>
                <div className="water-percent-symbol">%</div>
              </div>
              
              {/* Foreground text (white, clipped by water) */}
              <div className="water-percent water-percent-fg">
                <div className="water-percent-num">{Math.round(cappedPercentage)}</div>
                <div className="water-percent-symbol">%</div>
              </div>
              
              <div 
                className="water-fill" 
                style={{ 
                  transform: `translate(0, ${100 - cappedPercentage}%)`,
                  transition: 'transform 1s ease-out'
                }}
              >
                <svg viewBox="0 0 560 20" className="water-wave water-wave-back">
                  <use xlinkHref="#wave"></use>
                </svg>
                <svg viewBox="0 0 560 20" className="water-wave water-wave-front">
                  <use xlinkHref="#wave"></use>
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
