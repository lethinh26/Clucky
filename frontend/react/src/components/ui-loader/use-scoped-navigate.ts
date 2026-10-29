import { useCallback, useLayoutEffect, useRef } from "react";
import { useNavigate, type NavigateOptions, type To } from "react-router-dom";

// Async auth responses must not redirect a user who already left the form.
export function useScopedNavigate() {
  const navigate = useNavigate();
  const mounted = useRef(true);
  useLayoutEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  return useCallback(
    (to: To, options?: NavigateOptions) => {
      if (mounted.current) return navigate(to, options);
    },
    [navigate],
  );
}
