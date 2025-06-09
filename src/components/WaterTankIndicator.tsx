
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

  // Calculate water level position for the container (inverted for proper fill effect)
  const waterLevelOffset = (100 - cappedPercentage) * 2.35; // Scale for container height

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
          
          {/* CodePen Container Structure */}
          <div className="relative w-32 h-80">
            <div className="codepen-container" style={{ '--water-offset': `${waterLevelOffset}px` } as React.CSSProperties}>
              
              {/* Gradient Container - The main water/ocean area */}
              <div className="gradientContainer">
                
                {/* Sun rays gradient background */}
                <div className="gradient">
                  <div className="ray1"></div>
                  <div className="ray2"></div>
                  <div className="ray3"></div>
                  <div className="ray4"></div>
                  <div className="ray5"></div>
                  <div className="ray6"></div>
                  <div className="ray7"></div>
                  <div className="ray8"></div>
                  <div className="ray9"></div>
                  <div className="ray10"></div>
                  <div className="ray11"></div>
                  <div className="ray12"></div>
                  <div className="ray13"></div>
                  <div className="ray14"></div>
                  <div className="ray15"></div>
                  <div className="ray16"></div>
                  <div className="ray17"></div>
                  <div className="ray18"></div>
                  <div className="ray19"></div>
                  <div className="ray20"></div>
                  <div className="ray21"></div>
                  <div className="ray22"></div>
                  <div className="ray23"></div>
                  <div className="ray24"></div>
                  <div className="ray25"></div>
                  <div className="ray26"></div>
                </div>

                {/* Sun */}
                <div className="cPos">
                  <div className="cc">
                    <div className="circle one"></div>
                    <div className="circle two"></div>
                    <div className="circle three"></div>
                    <div className="circle four"></div>
                  </div>
                </div>

                {/* Wave triangles */}
                <div className="triangleContainer">
                  <div className="triangleBar"></div>
                  {Array.from({ length: 20 }, (_, i) => (
                    <div key={i} className="triangle"></div>
                  ))}
                </div>

                {/* Whales */}
                <div className="whaleContainer">
                  <div className="whalePos size1">
                    <div className="whaleRotate size1">
                      <div className="whale">
                        <div className="fin"></div>
                      </div>
                    </div>
                  </div>
                  <div className="whalePos size2">
                    <div className="whaleRotate size2">
                      <div className="whale">
                        <div className="fin"></div>
                      </div>
                    </div>
                  </div>
                  <div className="whalePos size3">
                    <div className="whaleRotate size3">
                      <div className="whale">
                        <div className="fin"></div>
                      </div>
                    </div>
                  </div>
                  <div className="whalePos size4">
                    <div className="whaleRotate size4">
                      <div className="whale">
                        <div className="fin"></div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bubbles */}
                <div className="bubbleContainer">
                  <div className="bubbleY1"><div className="bubbleX1"></div></div>
                  <div className="bubbleY2"><div className="bubbleX2"></div></div>
                  <div className="bubbleY3"><div className="bubbleX3"></div></div>
                  <div className="bubbleY4"><div className="bubbleX4"></div></div>
                  <div className="bubbleY5"><div className="bubbleX5"></div></div>
                  <div className="bubbleY6"><div className="bubbleX6"></div></div>
                  <div className="bubbleY7"><div className="bubbleX7"></div></div>
                  <div className="bubbleY8"><div className="bubbleX8"></div></div>
                  <div className="bubbleY9"><div className="bubbleX9"></div></div>
                  <div className="bubbleY10"><div className="bubbleX10"></div></div>
                </div>
              </div>

              {/* Overlay */}
              <div className="overlay one"></div>

              {/* Rocks */}
              <div className="rocks">
                <div className="rock one"></div>
                <div className="rock two"></div>
                <div className="rock three"></div>
                <div className="rock four"></div>
              </div>

              {/* Percentage display */}
              <div className="percentage-display">
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
