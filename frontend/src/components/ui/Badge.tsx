import type { ReactNode } from 'react';

interface BadgeProps {
  children: ReactNode;
  color?: 'green' | 'orange' | 'blue' | 'red' | 'yellow' | 'gray';
}

const colors = {
  green: 'bg-green-400/15 text-green-400',
  orange: 'bg-orange-400/15 text-orange-400',
  blue: 'bg-blue-400/15 text-blue-400',
  red: 'bg-red-400/15 text-red-400',
  yellow: 'bg-yellow-400/15 text-yellow-400',
  gray: 'bg-gray-400/15 text-gray-400',
};

export function Badge({ children, color = 'gray' }: BadgeProps) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold ${colors[color]}`}>
      {children}
    </span>
  );
}
