import { useState, useEffect } from 'react';

interface AdaptiveQualityState {
  isMobile: boolean;
  isLowPower: boolean;
  reduceMotion: boolean;
  reduceBlur: boolean;
  reduceEffects: boolean;
}

export function useAdaptiveQuality(): AdaptiveQualityState {
  const [state, setState] = useState<AdaptiveQualityState>({
    isMobile: false,
    isLowPower: false,
    reduceMotion: false,
    reduceBlur: false,
    reduceEffects: false,
  });

  useEffect(() => {
    // Check if mobile device
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    ) || window.innerWidth < 768;

    // Check for reduced motion preference
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Check for low-power mode (Network Information API)
    const isLowPower = (navigator as any).connection?.saveData || false;

    // Determine quality settings
    const reduceMotion = prefersReducedMotion || isMobile;
    const reduceBlur = isMobile || isLowPower;
    const reduceEffects = isMobile || isLowPower || prefersReducedMotion;

    setState({
      isMobile,
      isLowPower,
      reduceMotion,
      reduceBlur,
      reduceEffects,
    });

    // Listen for changes in network conditions
    const connection = (navigator as any).connection;
    if (connection) {
      const handleConnectionChange = () => {
        const newIsLowPower = connection.saveData || false;
        setState((prev) => ({
          ...prev,
          isLowPower: newIsLowPower,
          reduceBlur: prev.isMobile || newIsLowPower,
          reduceEffects: prev.isMobile || newIsLowPower || prev.reduceMotion,
        }));
      };

      connection.addEventListener('change', handleConnectionChange);
      return () => connection.removeEventListener('change', handleConnectionChange);
    }
    return undefined;
  }, []);

  return state;
}
