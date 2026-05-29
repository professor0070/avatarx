import { type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { useAdaptiveQuality } from '../hooks/useAdaptiveQuality';

interface BentoGridProps {
  children: ReactNode;
  className?: string;
}

interface BentoItemProps {
  children: ReactNode;
  className?: string;
  span?: '1' | '2' | '3' | '4';
  aspect?: 'video' | 'square';
  index?: number;
}

export function BentoGrid({ children, className = '' }: BentoGridProps) {
  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 ${className}`}>
      {children}
    </div>
  );
}

export function BentoItem({
  children,
  className = '',
  span = '1',
  aspect = 'square',
  index = 0,
}: BentoItemProps) {
  const { reduceMotion } = useAdaptiveQuality();

  const spanClasses = {
    '1': 'col-span-1',
    '2': 'col-span-1 md:col-span-2',
    '3': 'col-span-1 md:col-span-2 lg:col-span-3',
    '4': 'col-span-1 md:col-span-2 lg:col-span-4',
  };

  const aspectClasses = {
    video: 'aspect-video',
    square: 'aspect-square',
  };

  if (reduceMotion) {
    return (
      <div className={`${spanClasses[span]} ${aspectClasses[aspect]} ${className}`}>
        {children}
      </div>
    );
  }

  return (
    <motion.div
      initial={{ y: 30, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{
        duration: 0.6,
        delay: index * 0.05,
        ease: [0.16, 1, 0.3, 1],
      }}
      className={`${spanClasses[span]} ${aspectClasses[aspect]} ${className}`}
    >
      {children}
    </motion.div>
  );
}
