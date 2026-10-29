"use client";

import NextLink, { useLinkStatus } from "next/link";
import {
  forwardRef,
  useImperativeHandle,
  useRef,
  type ComponentProps,
  type RefObject,
} from "react";
import { useNavigationTask } from "./navigation-loader-context";
import { navigationKey } from "./navigation-key";

function PendingLink({ eligible }: { eligible: RefObject<boolean> }) {
  const { pending } = useLinkStatus();
  useNavigationTask(pending && eligible.current);
  return null;
}

// Native Link still owns prefetch, URL formatting, cancellation, targets and scrolling.
const NavigationLink = forwardRef<
  HTMLAnchorElement,
  ComponentProps<typeof NextLink>
>(function NavigationLink({ children, onNavigate, ...props }, forwardedRef) {
  const anchor = useRef<HTMLAnchorElement>(null);
  const eligible = useRef(false);
  useImperativeHandle(forwardedRef, () => anchor.current!, []);
  return (
    <NextLink
      {...props}
      ref={anchor}
      onNavigate={(event) => {
        let cancelled = false;
        onNavigate?.({
          preventDefault: () => {
            cancelled = true;
            event.preventDefault();
          },
        });
        if (cancelled) return;
        const target = new URL(anchor.current!.href, location.href);
        eligible.current =
          target.origin === location.origin &&
          navigationKey(target) !== navigationKey(location);
        if (eligible.current)
          window.dispatchEvent(new Event("clucky:navigation"));
      }}
    >
      {children}
      <PendingLink eligible={eligible} />
    </NextLink>
  );
});
export default NavigationLink;
