import { useEffect, useState } from "react";

/**
 * Returns `value` once it has stopped changing for `delayMs`.
 * Pass primitives or memoized values; a new object every render keeps resetting the timer.
 */
export function useDebouncedValue<T>(value: T, delayMs = 300): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timeoutId = setTimeout(() => setDebouncedValue(value), delayMs);
    return () => clearTimeout(timeoutId);
  }, [value, delayMs]);

  return debouncedValue;
}
