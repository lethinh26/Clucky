"use client";

import * as React from "react";
import { useDeferredAction } from "@/components/ui-loader/use-deferred-action";
import { useSearchParams } from "next/navigation";
import { useNavigationRouter as useRouter } from "@/components/ui-loader/use-navigation-router";
import Link from "@/components/ui-loader/navigation-link";
import { AuthShell } from "@/components/auth/auth-shell";
import { Input } from "@/components/ui/input";
import { authApi, ApiError } from "@/lib/api";

function ResetPasswordForm() {
  const router = useRouter();
  const startDeferred = useDeferredAction();
  const params = useSearchParams();
  const email = params.get("email") ?? "";
  const [otp, setOtp] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    const task = startDeferred();
    setError(null);
    if (password !== confirm) {
      setError("Mật khẩu xác nhận không khớp.");
      return;
    }
    if (!/^\d{6}$/.test(otp) || password.length < 8) {
      setError("Vui lòng nhập OTP 6 số và mật khẩu mới có ít nhất 8 ký tự.");
      return;
    }
    setLoading(true);
    try {
      await authApi.resetPassword({ email, otp, newPassword: password });
      if (!task.isCurrent()) return;
      setSuccess("Đặt lại mật khẩu thành công. Đang chuyển đến đăng nhập…");
      task.schedule(() => router.push("/login"), 1200);
    } catch (err) {
      if (!task.isCurrent()) return;
      setError((err as ApiError).message || "Không thể đặt lại mật khẩu.");
    } finally {
      if (task.isCurrent()) setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Đặt lại mật khẩu"
      subtitle={`Nhập mã OTP gửi tới ${email || "email của bạn"} và mật khẩu mới.`}
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
        <Input
          label="Mã OTP"
          inputMode="numeric"
          value={otp}
          onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
          required
          placeholder="Nhập mã 6 số"
        />
        <Input
          label="Mật khẩu mới"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <Input
          label="Xác nhận mật khẩu"
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
          error={
            password !== confirm && confirm
              ? "Mật khẩu xác nhận không khớp."
              : undefined
          }
        />
        <button
          type="submit"
          className="btn-primary btn-block"
          disabled={loading}
        >
          {loading ? "Đang cập nhật…" : "Đặt lại mật khẩu"}
        </button>
        <span className="auth-footer-link">
          <Link href="/login">← Quay lại đăng nhập</Link>
        </span>
      </form>
    </AuthShell>
  );
}

export default function ResetPasswordPage() {
  return (
    <React.Suspense
      fallback={
        <AuthShell title="Đặt lại mật khẩu">
          <div />
        </AuthShell>
      }
    >
      <ResetPasswordForm />
    </React.Suspense>
  );
}
