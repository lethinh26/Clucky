'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { AuthShell } from '@/components/auth/auth-shell';
import { Input } from '@/components/ui/input';
import { authApi, ApiError } from '@/lib/api';

function ResetPasswordForm() {
  const router = useRouter();
  const params = useSearchParams();
  const email = params.get('email') ?? '';
  const [otp, setOtp] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [confirm, setConfirm] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError('Mật khẩu xác nhận không khớp.');
      return;
    }
    if (!otp || !password) {
      setError('Vui lòng nhập mã OTP và mật khẩu mới.');
      return;
    }
    setLoading(true);
    try {
      await authApi.resetPassword({ email, otp, newPassword: password });
      setSuccess('Đặt lại mật khẩu thành công. Đang chuyển đến đăng nhập…');
      setTimeout(() => router.push('/login'), 1200);
    } catch (err) {
      setError((err as ApiError).message || 'Không thể đặt lại mật khẩu.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell title="Đặt lại mật khẩu" subtitle={`Nhập mã OTP gửi tới ${email || 'email của bạn'} và mật khẩu mới.`}>
      <form className="auth-form" onSubmit={onSubmit} noValidate>
        {error && <div className="form-error" role="alert">{error}</div>}
        {success && <div className="form-success" role="status">{success}</div>}
        <Input label="Mã OTP" inputMode="numeric" value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))} required placeholder="Nhập mã 6 số" />
        <Input label="Mật khẩu mới" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        <Input label="Xác nhận mật khẩu" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required error={password !== confirm && confirm ? 'Mật khẩu xác nhận không khớp.' : undefined} />
        <button type="submit" className="btn-primary btn-block" disabled={loading}>
          {loading ? 'Đang cập nhật…' : 'Đặt lại mật khẩu'}
        </button>
        <span className="auth-footer-link"><Link href="/login">← Quay lại đăng nhập</Link></span>
      </form>
    </AuthShell>
  );
}

export default function ResetPasswordPage() {
  return (
    <React.Suspense fallback={<AuthShell title="Đặt lại mật khẩu"><div /></AuthShell>}>
      <ResetPasswordForm />
    </React.Suspense>
  );
}

