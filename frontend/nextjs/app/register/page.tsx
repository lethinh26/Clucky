"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { Input } from "@/components/ui/input";
import { authApi, ApiError } from "@/lib/api";

export default function RegisterPage() {
  const router = useRouter();
  const [fullName, setFullName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
      router.push(`/verify-otp?email=${encodeURIComponent(email.trim())}`);
    } catch (err) {
      const apiErr = err as ApiError;
      setError(apiErr.message || "Đăng ký không thành công.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Tạo tài khoản Clucky"
      subtitle="Tham gia để tích điểm, lưu địa chỉ và đặt món trong vài chạm."
    >
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
    </AuthShell>
  );
}
