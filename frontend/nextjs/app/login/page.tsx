'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AuthShell } from '@/components/auth/auth-shell';
import { Input } from '@/components/ui/input';
import { authApi, ApiError } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email || !password) {
      setError('Vui lòng nhập email và mật khẩu.');
      return;
    }
    setLoading(true);
    try {
      const tokens = await authApi.login({ email, password });
      if (typeof window !== 'undefined') {
        localStorage.setItem('clucky_access_token', tokens.accessToken);
        localStorage.setItem('clucky_refresh_token', tokens.refreshToken);
      }
      router.push('/account');
    } catch (err) {
      const apiErr = err as ApiError;
      setError(apiErr.message || 'Đăng nhập thất bại. Kiểm tra lại thông tin.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell title="Chào mừng trở lại" subtitle="Đăng nhập để đặt món nhanh hơn và theo dõi đơn hàng của bạn.">
      <form className="auth-form" onSubmit={onSubmit} noValidate>
        {error && <div className="form-error" role="alert">{error}</div>}
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="ban@clucky.vn"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <Input
          label="Mật khẩu"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <div className="auth-links">
          <Link href="/forgot-password">Quên mật khẩu?</Link>
          <Link href="/register">Tạo tài khoản</Link>
        </div>
        <button type="submit" className="btn-primary btn-block" disabled={loading}>
          {loading ? 'Đang đăng nhập…' : 'Đăng nhập'}
        </button>
        <span className="auth-footer-link">
          Chưa có tài khoản? <Link href="/register">Đăng ký ngay</Link>
        </span>
      </form>
    </AuthShell>
  );
}

