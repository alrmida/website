
import React from 'react';

interface WaterDispenserIconProps {
  className?: string;
}

const WaterDispenserIcon = ({ className = "h-6 w-6 text-purple-500" }: WaterDispenserIconProps) => {
  return (
    <img 
      src="/lovable-uploads/cooling.svg" 
      alt="Water Dispenser Machine" 
      className={className}
    />
  );
};

export default WaterDispenserIcon;
