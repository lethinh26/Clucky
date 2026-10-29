"use client";
import { useCallback, useEffect, useRef } from "react";

// Success-message delays are not navigation loading; invalidate them on retry/leave.
export function useDeferredAction() {
  const generation = useRef(0);
  const mounted = useRef(true);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      generation.current++;
      if (timer.current !== null) clearTimeout(timer.current);
    };
  }, []);
  return useCallback(() => {
    if (timer.current !== null) clearTimeout(timer.current);
    const id = ++generation.current;
    const isCurrent = () => mounted.current && generation.current === id;
    return {
      isCurrent,
      schedule(action: () => void, delay: number) {
        if (isCurrent())
          timer.current = setTimeout(() => {
            if (isCurrent()) action();
          }, delay);
      },
    };
  }, []);
}
