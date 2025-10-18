import { useState, useRef, useCallback } from 'react';
import type { ParticleEffect } from '../types/ellie.types';

export interface Particle {
  id: number;
  x: number;
  y: number;
}

export interface UseEllieAnimationReturn {
  particles: Particle[];
  particleEffect: ParticleEffect;
  setParticleEffect: (effect: ParticleEffect) => void;
  celebrate: (effect?: ParticleEffect) => void;
  clearParticles: () => void;
}

/**
 * Hook for managing Ellie's particle effects and celebrations
 */
export function useEllieAnimation(): UseEllieAnimationReturn {
  const [particles, setParticles] = useState<Particle[]>([]);
  const [particleEffect, setParticleEffect] = useState<ParticleEffect>(null);
  const particleIdRef = useRef(0);

  const celebrate = useCallback((effect: ParticleEffect = 'sparkles') => {
    setParticleEffect(effect);

    // Generate particles
    const particleCount = effect === 'zzz' ? 3 : 8;
    const newParticles = Array.from({ length: particleCount }, () => ({
      id: particleIdRef.current++,
      x: Math.random() * 60 - 30,
      y: Math.random() * -30 - 10,
    }));

    setParticles((prev) => [...prev, ...newParticles]);

    // Clear particles after animation
    setTimeout(() => {
      setParticles([]);
      setParticleEffect(null);
    }, 3000);
  }, []);

  const clearParticles = useCallback(() => {
    setParticles([]);
    setParticleEffect(null);
  }, []);

  return {
    particles,
    particleEffect,
    setParticleEffect,
    celebrate,
    clearParticles,
  };
}
