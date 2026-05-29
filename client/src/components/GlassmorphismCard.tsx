import { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useAdaptiveQuality } from '../hooks/useAdaptiveQuality';

interface GlassmorphismCardProps {
  children: React.ReactNode;
  className?: string;
}

export function GlassmorphismCard({ children, className = '' }: GlassmorphismCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const { reduceMotion, reduceBlur, reduceEffects } = useAdaptiveQuality();

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setMousePosition({ x, y });
  };

  const handleMouseEnter = () => setIsHovered(true);
  const handleMouseLeave = () => {
    setIsHovered(false);
    setMousePosition({ x: 0, y: 0 });
  };

  const calculateRotation = () => {
    if (!ref.current) return { rotateX: 0, rotateY: 0 };
    const rect = ref.current.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateX = ((mousePosition.y - centerY) / centerY) * 7;
    const rotateY = ((mousePosition.x - centerX) / centerX) * -7;
    return { rotateX, rotateY };
  };

  const { rotateX, rotateY } = calculateRotation();

  if (reduceMotion && reduceEffects) {
    return (
      <div
        ref={ref}
        className={`relative overflow-hidden rounded-2xl ${className}`}
      >
        <div className="absolute inset-0 bg-white/10" />
        <div className="relative z-10">{children}</div>
      </div>
    );
  }

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={reduceMotion ? undefined : {
        perspective: '1500px',
      }}
      animate={reduceMotion ? undefined : {
        rotateX: isHovered ? rotateX : 0,
        rotateY: isHovered ? rotateY : 0,
      }}
      transition={{
        type: 'spring',
        stiffness: 300,
        damping: 20,
      }}
      className={`relative overflow-hidden rounded-2xl ${className}`}
    >
      {/* Glassmorphism Background */}
      <div
        className={`absolute inset-0 ${reduceBlur ? 'bg-white/10' : 'bg-white/10 backdrop-blur-3xl saturate-[1.8]'}`}
      />

      {/* Proximity Glow Effect */}
      {!reduceEffects && isHovered && (
        <motion.div
          className="absolute inset-0 rounded-2xl"
          style={{
            background: `radial-gradient(circle 150px at ${mousePosition.x}px ${mousePosition.y}px, rgba(255, 255, 255, 0.3), transparent)`,
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        />
      )}

      {/* Border Gradient Glow */}
      {!reduceEffects && isHovered && (
        <motion.div
          className="absolute inset-0 rounded-2xl border-2 border-white/20"
          style={{
            background: `linear-gradient(135deg, rgba(255, 255, 255, 0.4) 0%, transparent 100%)`,
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        />
      )}

      {/* Content */}
      <div className="relative z-10">{children}</div>
    </motion.div>
  );
}


