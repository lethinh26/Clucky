"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { authApi, ApiError } from "@/lib/api";

const OTP_LENGTH = 6;

function VerifyOtpForm() {
  const router = useRouter();
  const params = useSearchParams();
  const email = params.get("email") ?? "";
  const [digits, setDigits] = React.useState<string[]>(
    Array(OTP_LENGTH).fill(""),
  );
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [resending, setResending] = React.useState(false);
  const [cooldown, setCooldown] = React.useState(0);
  const inputsRef = React.useRef<Array<HTMLInputElement | null>>([]);

  React.useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((c) => c - 1), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  const setDigit = (i: number, val: string) => {
    const v = val.replace(/\D/g, "").slice(-1);
    setDigits((d) => {
      const next = [...d];
      next[i] = v;
      return next;
    });
    if (v && i < OTP_LENGTH - 1) inputsRef.current[i + 1]?.focus();
  };

  const onKeyDown = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[i] && i > 0)
      inputsRef.current[i - 1]?.focus();
  };

  const otp = digits.join("");

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (otp.length !== OTP_LENGTH) {
      setError(`Vui lòng nhập đủ ${OTP_LENGTH} số của mã OTP.`);
      return;
    }
    setLoading(true);
    try {
      const tokens = await authApi.verifyOtp({ email, otp });
      if (typeof window !== "undefined") {
        localStorage.setItem("clucky_access_token", tokens.accessToken);
        localStorage.setItem("clucky_refresh_token", tokens.refreshToken);
      }
      setSuccess("Xác thực thành công! Đang chuyển hướng…");
      setTimeout(() => router.push("/account"), 800);
    } catch (err) {
      const apiErr = err as ApiError;
      setError(apiErr.message || "Mã OTP không đúng hoặc đã hết hạn.");
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    if (!email || cooldown > 0) return;
    setResending(true);
    setError(null);
    try {
      await authApi.register({ fullName: "", email, password: "" });
      setCooldown(60);
      setSuccess("Đã gửi lại mã OTP. Kiểm tra hộp thư của bạn.");
    } catch (err) {
      setError((err as ApiError).message || "Không thể gửi lại mã.");
    } finally {
      setResending(false);
    }
  };

  return (
    <AuthShell
      title="Xác thực OTP"
      subtitle={`Nhập mã ${OTP_LENGTH} số đã gửi đến ${email || "email của bạn"}.`}
    >
      <form className="auth-form" onSubmit={onSubmit} noValidate>
        {error && (
          <div className="form-error" role="alert">
            {error}
          </div>
        )}
        {success && (
          <div className="form-success" role="status">
            {success}
          </div>
        )}
        <div className="otp-input" role="group" aria-label="Mã OTP">
          {digits.map((d, i) => (
            <input
              key={i}
              ref={(el) => {
                inputsRef.current[i] = el;
              }}
              inputMode="numeric"
              maxLength={1}
              onPaste={(event) => {
                const code = event.clipboardData
                  .getData("text")
                  .replace(/\D/g, "")
                  .slice(0, OTP_LENGTH);
                if (!code) return;
                event.preventDefault();
                setDigits(
                  Array.from(
                    { length: OTP_LENGTH },
                    (_, index) => code[index] ?? "",
                  ),
                );
                inputsRef.current[
                  Math.min(code.length, OTP_LENGTH - 1)
                ]?.focus();
              }}
              autoComplete={i === 0 ? "one-time-code" : "off"}
              value={d}
              onChange={(e) => setDigit(i, e.target.value)}
              onKeyDown={(e) => onKeyDown(i, e)}
              aria-label={`Chữ số ${i + 1}`}
            />
          ))}
        </div>
        <button
          type="submit"
          className="btn-primary btn-block"
          disabled={loading}
        >
          {loading ? "Đang xác thực…" : "Xác nhận"}
        </button>
        <span className="auth-footer-link">
          Chưa nhận được mã?{" "}
          <button
            type="button"
            onClick={resend}
            disabled={resending || cooldown > 0}
            style={{
              background: "none",
              border: 0,
              padding: 0,
              color: "var(--wine)",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            {cooldown > 0
              ? `Gửi lại sau ${cooldown}s`
              : resending
                ? "Đang gửi…"
                : "Gửi lại mã"}
          </button>
        </span>
        <span className="auth-footer-link">
          <Link href="/login">← Quay lại đăng nhập</Link>
        </span>
      </form>
    </AuthShell>
  );
}

export default function VerifyOtpPage() {
  return (
    <React.Suspense
      fallback={
        <AuthShell title="Xác thực OTP">
          <div />
        </AuthShell>
      }
    >
      <VerifyOtpForm />
    </React.Suspense>
  );
}
