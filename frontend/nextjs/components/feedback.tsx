"use client";

import { useEffect, type ReactNode } from "react";
import { Toaster as Sonner, toast } from "sonner";
import { getBrowserLocale } from "../lib/i18n/locale";
import "./feedback.css";

type Kind = "success" | "error" | "warning" | "info" | "loading";
type Content = string | { content: ReactNode; key?: string | number; duration?: number };
const titles = {
  vi: { success: "Thành công", error: "Không thể hoàn tất", warning: "Cần chú ý", info: "Thông báo", loading: "Đang xử lý" },
  en: { success: "Success", error: "Unable to complete", warning: "Attention needed", info: "Notice", loading: "Working" },
};

function show(kind: Kind, input: Content, seconds?: number) {
  const options: Exclude<Content, string> = typeof input === "string" ? { content: input } : input;
  const duration = options.duration ?? seconds;
  return toast[kind](titles[getBrowserLocale()][kind], {
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
  return <Sonner theme="light" position="top-right" expand closeButton visibleToasts={3}
    offset={{ top: 24, right: 24 }} mobileOffset={{ top: 16, right: 16, left: 16 }} gap={12}
    containerAriaLabel={locale === "en" ? "Notifications" : "Thông báo"}
    toastOptions={{ className: "clucky-toast", closeButtonAriaLabel: locale === "en" ? "Dismiss notification" : "Đóng thông báo" }} />;
}
