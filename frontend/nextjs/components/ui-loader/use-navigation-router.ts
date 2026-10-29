"use client";

import { useLayoutEffect, useMemo, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useNavigationTask } from "./navigation-loader-context";
import { navigationKey } from "./navigation-key";

export function useNavigationRouter() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const mounted = useRef(true);
  useLayoutEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  useNavigationTask(pending);
  return useMemo(() => {
    const navigate = (
      method: "push" | "replace",
      href: string,
      options?: { scroll?: boolean },
    ) => {
      if (!mounted.current) return;
      const target = new URL(href, location.href);
      if (
        target.origin !== location.origin ||
        navigationKey(target) === navigationKey(location)
      ) {
        router[method](href, options);
        return;
      }
      window.dispatchEvent(new Event("clucky:navigation"));
      startTransition(() => router[method](href, options));
    };
    return {
      ...router,
      push: (href: string, options?: { scroll?: boolean }) =>
        navigate("push", href, options),
      replace: (href: string, options?: { scroll?: boolean }) =>
        navigate("replace", href, options),
    };
  }, [router, startTransition]);
}
