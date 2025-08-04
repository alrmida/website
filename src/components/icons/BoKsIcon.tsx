
import React from 'react';

interface BoKsIconProps {
  className?: string;
}

const BoKsIcon = ({ className = "h-6 w-6 text-green-500" }: BoKsIconProps) => {
  return (
    <img 
      src="/lovable-uploads/boks.svg" 
      alt="BoKs Machine" 
      className={className}
    />
  );
};

export default BoKsIcon;
