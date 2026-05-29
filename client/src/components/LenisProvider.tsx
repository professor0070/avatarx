import { createContext, useContext, useEffect, type ReactNode } from 'react';
import Lenis, { type ScrollCallback } from 'lenis';
import { useMotionValue, type MotionValue } from 'framer-motion';

interface LenisContextValue {
  scrollY: MotionValue<number>;
}

const LenisCtx = createContext<LenisContextValue | null>(null);

export function useLenisScrollY(): MotionValue<number> | null {
  const ctx = useContext(LenisCtx);
  return ctx?.scrollY ?? null;
}

export function LenisProvider({ children }: { children: ReactNode }) {
  const scrollY = useMotionValue(0);

  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    });

    const onScroll: ScrollCallback = (instance) => {
      scrollY.set(instance.scroll);
    };

    lenis.on('scroll', onScroll);

    let rafId: number;
    function raf(time: number) {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    }

    rafId = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(rafId);
      lenis.off('scroll', onScroll);
      lenis.destroy();
    };
  }, [scrollY]);

  return (
    <LenisCtx.Provider value={{ scrollY }}>
      {children}
    </LenisCtx.Provider>
  );
}
