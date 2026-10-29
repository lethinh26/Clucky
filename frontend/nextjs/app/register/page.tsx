"use client";

import * as React from "react";
import { useDeferredAction } from "@/components/ui-loader/use-deferred-action";
import { useNavigationRouter as useRouter } from "@/components/ui-loader/use-navigation-router";
import Link from "@/components/ui-loader/navigation-link";
import { AuthShell } from "@/components/auth/auth-shell";
import { GoogleAuthFlow } from "@/components/auth/google-auth-flow";
import { Input } from "@/components/ui/input";
import { authApi, ApiError } from "@/lib/api";

export default function RegisterPage() {
  const router = useRouter();
  const startAction = useDeferredAction();
  const [fullName, setFullName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    const task = startAction();
    setError(null);
    if (!fullName.trim() || !email.trim() || !password) {
      setError("Vui lòng điền đầy đủ họ tên, email và mật khẩu.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Email chưa đúng định dạng. Bạn kiểm tra lại nhé.");
      return;
    }
    if (password.length < 8) {
      setError("Mật khẩu cần có ít nhất 8 ký tự.");
      return;
    }
    setLoading(true);
    try {
      await authApi.register({
        fullName: fullName.trim(),
        email: email.trim(),
        phone: phone || undefined,
        password,
      });
      if (task.isCurrent()) router.push(`/verify-otp?email=${encodeURIComponent(email.trim())}`);
    } catch (err) {
      if (!task.isCurrent()) return;
      const apiErr = err as ApiError;
      setError(apiErr.message || "Đăng ký không thành công.");
    } finally {
      if (task.isCurrent()) setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Tạo tài khoản Clucky"
      subtitle="Tham gia để tích điểm, lưu địa chỉ và đặt món trong vài chạm."
    >
      <GoogleAuthFlow>
        <form className="auth-form" onSubmit={onSubmit} noValidate>
          {error && (
            <div className="form-error" role="alert">
              {error}
            </div>
          )}
          <Input
            label="Họ và tên"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            autoComplete="name"
          />
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            placeholder="ban@clucky.vn"
          />
          <Input
            label="Số điện thoại (tuỳ chọn)"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            autoComplete="tel"
            placeholder="0901 234 567"
          />
          <Input
            label="Mật khẩu"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="new-password"
            placeholder="Tối thiểu 8 ký tự"
          />
          <button
            type="submit"
            className="btn-primary btn-block"
            disabled={loading}
          >
            {loading ? "Đang tạo tài khoản…" : "Đăng ký"}
          </button>
          <span className="auth-footer-link">
            Đã có tài khoản? <Link href="/login">Đăng nhập</Link>
          </span>
        </form>
      </GoogleAuthFlow>
    </AuthShell>
  );
}
