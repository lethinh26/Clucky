"use client";

import { Fragment, useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useSession } from "./use-session";
import { loadSession } from "@/lib/session";
import { getErrorMessage } from "@/lib/api";

export function SessionBoundary({ children }: { children: ReactNode }) {
  const session = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations();
  const protectedPage = ["/account", "/orders", "/notifications", "/checkout"].some(
    path => pathname === path || pathname.startsWith(`${path}/`),
  );
  useEffect(() => {
    if (protectedPage && session.ready && !session.user && !session.error) {
      router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
    }
  }, [protectedPage, session.ready, session.user, session.error, pathname, router]);
  if (protectedPage && session.error) return <div role="alert">
    <p>{getErrorMessage(session.error)}</p>
    <button onClick={() => { void loadSession(true).catch(() => {}); }}>{t("common.retry")}</button>
  </div>;
  if (protectedPage && (!session.ready || !session.user)) return <div role="status" aria-busy="true">{t("business.loadingsurface.loading")}</div>;
  return <Fragment key={protectedPage ? session.user?.userId ?? "guest" : "public"}>{children}</Fragment>;
}
