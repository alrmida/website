
import React from 'react';

interface AmphoreIconProps {
  className?: string;
}

const AmphoreIcon = ({ className = "h-6 w-6 text-blue-500" }: AmphoreIconProps) => {
  return (
    <img 
      src="/lovable-uploads/amphore.svg" 
      alt="Amphore Machine" 
      className={className}
    />
  );
};

export default AmphoreIcon;
