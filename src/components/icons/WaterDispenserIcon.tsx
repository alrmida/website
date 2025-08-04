
import React from 'react';
import { FlaskConical } from 'lucide-react';

interface WaterDispenserIconProps {
  className?: string;
}

const WaterDispenserIcon = ({ className = "h-6 w-6 text-purple-500" }: WaterDispenserIconProps) => {
  return <FlaskConical className={className} />;
};

export default WaterDispenserIcon;
