import React, { useEffect, useState, useRef } from 'react';

interface AnimatedVoteCounterProps {
  value: number;
  duration?: number; // Animation duration in ms (default: 800)
  className?: string;
}

/**
 * Animates number changes with smooth cubic ease-out interpolation
 * using requestAnimationFrame for 60fps performance
 */
export const AnimatedVoteCounter: React.FC<AnimatedVoteCounterProps> = ({
  value,
  duration = 800,
  className = '',
}) => {
  const [displayValue, setDisplayValue] = useState(value);
  const previousValueRef = useRef(value);
  const animationFrameRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);

  useEffect(() => {
    const startValue = previousValueRef.current;
    const endValue = value;
    
    // No animation needed if values are the same
    if (startValue === endValue) {
      return;
    }

    // Cancel any ongoing animation
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    startTimeRef.current = null;

    const animate = (currentTime: number) => {
      if (startTimeRef.current === null) {
        startTimeRef.current = currentTime;
      }

      const elapsed = currentTime - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);

      // Cubic ease-out function: 1 - (1-t)^3
      const easeOutCubic = 1 - Math.pow(1 - progress, 3);

      const interpolatedValue = startValue + (endValue - startValue) * easeOutCubic;
      setDisplayValue(Math.round(interpolatedValue));

      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(animate);
      } else {
        // Animation complete
        setDisplayValue(endValue);
        previousValueRef.current = endValue;
        animationFrameRef.current = null;
      }
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [value, duration]);

  // Format large numbers with thousand separators (e.g., 1000 → 1,000)
  const formattedValue = displayValue >= 1000 
    ? displayValue.toLocaleString('en-US')
    : displayValue.toString();

  return <span className={className}>{formattedValue}</span>;
};
