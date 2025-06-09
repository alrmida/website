
import React, { useEffect, useState } from 'react';
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
  
  // State for animated percentage counter
  const [animatedPercentage, setAnimatedPercentage] = useState(0);

  // Animate the percentage counter
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (animatedPercentage < cappedPercentage) {
      interval = setInterval(() => {
        setAnimatedPercentage(prev => {
          const next = prev + 1;
          return next >= cappedPercentage ? cappedPercentage : next;
        });
      }, 30);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [cappedPercentage, animatedPercentage]);

  // Reset animation when percentage changes significantly
  useEffect(() => {
    if (Math.abs(animatedPercentage - cappedPercentage) > 5) {
      setAnimatedPercentage(0);
    }
  }, [cappedPercentage]);

  return (
    <>
      <style>{`
        @keyframes wave-front {
          100% {
            transform: translate(-50%, 0);
          }
        }

        @keyframes wave-back {
          100% {
            transform: translate(50%, 0);
          }
        }

        @keyframes gentle-float {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-2px);
          }
        }

        .water-wave-front {
          animation: wave-front 0.8s infinite linear;
        }

        .water-wave-back {
          animation: wave-back 1.6s infinite linear;
        }

        .circle-float {
          animation: gentle-float 3s ease-in-out infinite;
        }
      `}</style>
      
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
            
            {/* Water Circle Animation */}
            <div className="relative circle-float">
              {/* Hidden SVG wave definition */}
              <svg 
                version="1.1" 
                xmlns="http://www.w3.org/2000/svg" 
                xmlnsXlink="http://www.w3.org/1999/xlink" 
                className="absolute w-0 h-0"
                style={{ display: 'none' }}
              >
                <defs>
                  <symbol id="wave">
                    <path d="M420,20c21.5-0.4,38.8-2.5,51.1-4.5c13.4-2.2,26.5-5.2,27.3-5.4C514,6.5,518,4.7,528.5,2.7c7.1-1.3,17.9-2.8,31.5-2.7c0,0,0,0,0,0v20H420z"></path>
                    <path d="M420,20c-21.5-0.4-38.8-2.5-51.1-4.5c-13.4-2.2-26.5-5.2-27.3-5.4C326,6.5,322,4.7,311.5,2.7C304.3,1.4,293.6-0.1,280,0c0,0,0,0,0,0v20H420z"></path>
                    <path d="M140,20c21.5-0.4,38.8-2.5,51.1-4.5c13.4-2.2,26.5-5.2,27.3-5.4C234,6.5,238,4.7,248.5,2.7c7.1-1.3,17.9-2.8,31.5-2.7c0,0,0,0,0,0v20H140z"></path>
                    <path d="M140,20c-21.5-0.4-38.8-2.5-51.1-4.5c-13.4-2.2-26.5-5.2-27.3-5.4C46,6.5,42,4.7,31.5,2.7C24.3,1.4,13.6-0.1,0,0c0,0,0,0,0,0l0,20H140z"></path>
                  </symbol>
                </defs>
              </svg>

              {/* Water Circle Container */}
              <div className="relative w-24 h-24 overflow-hidden">
                {/* Perfect circle shape */}
                <div 
                  className="absolute inset-0 bg-gray-900 dark:bg-gray-800 border-2 border-gray-700 dark:border-gray-600 rounded-full"
                >
                  {/* Percentage display */}
                  <div className="absolute inset-0 flex items-center justify-center z-10">
                    <div className="text-center">
                      <div className="text-lg font-bold text-white">
                        {animatedPercentage}
                      </div>
                      <div className="text-xs text-white opacity-80">%</div>
                    </div>
                  </div>
                  
                  {/* Water fill */}
                  <div 
                    className="absolute inset-0 bg-blue-500 transition-transform duration-500 ease-out rounded-full"
                    style={{ 
                      transform: `translate(0, ${100 - animatedPercentage}%)`,
                    }}
                  >
                    {/* Back wave */}
                    <svg 
                      viewBox="0 0 560 20" 
                      className="absolute bottom-full right-0 w-full h-4 water-wave-back"
                      style={{ width: '200%' }}
                    >
                      <use xlinkHref="#wave" fill="#C7EEFF" />
                    </svg>
                    
                    {/* Front wave */}
                    <svg 
                      viewBox="0 0 560 20" 
                      className="absolute bottom-full left-0 w-full h-4 water-wave-front -mb-px"
                      style={{ width: '200%' }}
                    >
                      <use xlinkHref="#wave" fill="#4D6DE3" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
};

export default WaterTankIndicator;
