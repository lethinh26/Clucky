"use client";

import { useEffect, type ReactNode } from "react";
import { Toaster as Sonner, toast } from "sonner";
import { getBrowserLocale } from "../lib/i18n/locale";
import { getTranslator } from "../lib/i18n/translator";
import "./feedback.css";

type Kind = "success" | "error" | "warning" | "info" | "loading";
const titleKeys = {
  success: "common.toast.success", error: "common.toast.error", warning: "common.toast.warning",
  info: "common.toast.info", loading: "common.toast.loading",
} as const;
type Content = string | { content: ReactNode; key?: string | number; duration?: number };

function show(kind: Kind, input: Content, seconds?: number) {
  const options: Exclude<Content, string> = typeof input === "string" ? { content: input } : input;
  const duration = options.duration ?? seconds;
  return toast[kind](getTranslator(getBrowserLocale())(titleKeys[kind]), {
    description: options.content,
    id: options.key ?? (typeof options.content === "string" ? kind + ":" + options.content : undefined),
    duration: kind === "loading" || duration === 0 ? Infinity : duration != null ? duration * 1000 : kind === "error" ? 8000 : 5000,
  });
}

export const notify = {
  success: (content: Content, seconds?: number) => show("success", content, seconds),
  error: (content: Content, seconds?: number) => show("error", content, seconds),
  warning: (content: Content, seconds?: number) => show("warning", content, seconds),
  info: (content: Content, seconds?: number) => show("info", content, seconds),
  loading: (content: Content, seconds?: number) => show("loading", content, seconds),
  destroy: (id?: string | number) => toast.dismiss(id),
};
export const message = notify;

export function useFeedback(content: string | null | undefined | false, kind: Kind = "error") {
  useEffect(() => { if (content) notify[kind](content); }, [content, kind]);
}

export function Toaster({ locale }: { locale: string }) {
  const translate = getTranslator(locale === "en" ? "en" : "vi");
  return <Sonner theme="light" position="top-right" expand closeButton visibleToasts={3}
    offset={{ top: 24, right: 24 }} mobileOffset={{ top: 16, right: 16, left: 16 }} gap={12}
    containerAriaLabel={translate("common.toast.notifications")}
    toastOptions={{ className: "clucky-toast", closeButtonAriaLabel: translate("common.toast.dismiss") }} />;
}
