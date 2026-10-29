"use client";

import * as React from "react";
import { useDeferredAction } from "@/components/ui-loader/use-deferred-action";
import { useNavigationRouter as useRouter } from "@/components/ui-loader/use-navigation-router";
import Link from "@/components/ui-loader/navigation-link";
import { AuthShell } from "@/components/auth/auth-shell";
import { Input } from "@/components/ui/input";
import { authApi, ApiError } from "@/lib/api";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const startDeferred = useDeferredAction();
  const [email, setEmail] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    const task = startDeferred();
    setError(null);
    setSuccess(null);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Vui lòng nhập đúng email đã đăng ký.");
      return;
    }
    setLoading(true);
    try {
      await authApi.forgotPassword({ email: email.trim() });
      if (!task.isCurrent()) return;
      setSuccess("Nếu email tồn tại, mã đặt lại mật khẩu đã được gửi.");
      task.schedule(
        () => router.push(`/reset-password?email=${encodeURIComponent(email)}`),
        1200,
      );
    } catch (err) {
      if (!task.isCurrent()) return;
      setError((err as ApiError).message || "Không thể gửi yêu cầu.");
    } finally {
      if (task.isCurrent()) setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Quên mật khẩu"
      subtitle="Nhập email của bạn, chúng tôi sẽ gửi mã để đặt lại mật khẩu."
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
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="ban@clucky.vn"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <button
          type="submit"
          className="btn-primary btn-block"
          disabled={loading}
        >
          {loading ? "Đang gửi…" : "Gửi mã đặt lại"}
        </button>
        <span className="auth-footer-link">
          <Link href="/login">← Quay lại đăng nhập</Link>
        </span>
      </form>
    </AuthShell>
  );
}
