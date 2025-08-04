
import React from 'react';
import { Zap } from 'lucide-react';

interface BoKsIconProps {
  className?: string;
}

const BoKsIcon = ({ className = "h-6 w-6 text-green-500" }: BoKsIconProps) => {
  return <Zap className={className} />;
};

export default BoKsIcon;
