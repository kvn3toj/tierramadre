import { useRef, useEffect } from 'react';

/**
 * Hook to track previous value of a variable across renders
 * Useful for comparing values before/after updates
 *
 * @param value - The current value to track
 * @returns The previous value (from last render)
 *
 * @example
 * const [count, setCount] = useState(0);
 * const prevCount = usePrevious(count);
 * // prevCount will be undefined on first render, then track previous values
 */
export function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T>();

  useEffect(() => {
    ref.current = value;
  }, [value]);

  return ref.current;
}
