
import React from 'react';
import { WoWClass, CLASS_COLORS } from '../types';

interface ClassBadgeProps {
  className: WoWClass;
  size?: 'sm' | 'md';
}

export const ClassBadge: React.FC<ClassBadgeProps> = ({ className, size = 'md' }) => {
  return (
    <span 
      className={`font-semibold rounded px-2 py-0.5 border ${size === 'sm' ? 'text-xs' : 'text-sm'}`}
      style={{ 
        color: CLASS_COLORS[className], 
        borderColor: `${CLASS_COLORS[className]}44`,
        backgroundColor: `${CLASS_COLORS[className]}11` 
      }}
    >
      {className}
    </span>
  );
};
