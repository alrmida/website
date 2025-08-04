
import React from 'react';
import { Droplets } from 'lucide-react';

interface AmphoreIconProps {
  className?: string;
}

const AmphoreIcon = ({ className = "h-6 w-6 text-blue-500" }: AmphoreIconProps) => {
  return <Droplets className={className} />;
};

export default AmphoreIcon;
