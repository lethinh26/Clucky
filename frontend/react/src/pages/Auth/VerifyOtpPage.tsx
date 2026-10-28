import React from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Button, Alert, InputNumber } from 'antd';
import { AuthLayout } from './AuthLayout';
import { authApi, getErrorMessage } from '../../lib/api';

export const VerifyOtpPage: React.FC = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const email = params.get('email') ?? '';
  const [otp, setOtp] = React.useState<number | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [cooldown, setCooldown] = React.useState(0);

  React.useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((c) => c - 1), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  const onSubmit = async () => {
    setError(null);
    setSuccess(null);
    if (!otp || String(otp).length !== 6) {
      setError('Vui lòng nhập đủ mã OTP 6 số.');
      return;
    }
    setLoading(true);
    try {
      const tokens = await authApi.verifyOtp({ email, otp: String(otp) });
      localStorage.setItem('clucky_admin_access_token', tokens.accessToken);
      localStorage.setItem('clucky_admin_refresh_token', tokens.refreshToken);
      setSuccess('Xác thực thành công! Đang chuyển hướng…');
      setTimeout(() => navigate('/admin/dashboard'), 800);
    } catch (err) {
      setError(getErrorMessage(err, 'Mã OTP không đúng hoặc đã hết hạn.'));
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    if (!email || cooldown > 0) return;
    try {
      await authApi.register({ fullName: '', email, password: '' });
      setCooldown(60);
      setSuccess('Đã gửi lại mã OTP.');
    } catch (err) {
      setError(getErrorMessage(err, 'Không thể gửi lại mã.'));
    }
  };

  return (
    <AuthLayout title="Xác thực OTP" subtitle={`Nhập mã 6 số đã gửi đến ${email || 'email của bạn'}.`}>
      <div style={{ display: 'grid', gap: 16 }}>
        {error && <Alert type="error" message={error} showIcon style={{ borderRadius: 12 }} />}
        {success && <Alert type="success" message={success} showIcon style={{ borderRadius: 12 }} />}
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <InputNumber
            value={otp}
            onChange={(v) => setOtp(v ?? null)}
            max={999999}
            controls={false}
            placeholder="••••••"
            style={{
              width: 220,
              height: 64,
              textAlign: 'center',
              fontFamily: 'Baloo 2, sans-serif',
              fontSize: 30,
              fontWeight: 700,
              letterSpacing: '0.3em',
              borderRadius: 16,
            }}
            inputMode="numeric"
            autoComplete="one-time-code"
          />
        </div>
        <Button type="primary" size="large" loading={loading} onClick={onSubmit} block style={{ borderRadius: 999, height: 48, fontWeight: 700 }}>
          Xác nhận
        </Button>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'Quicksand, sans-serif', fontSize: 13, fontWeight: 600 }}>
          <Button type="link" onClick={resend} disabled={cooldown > 0} style={{ padding: 0, color: '#8F1216', fontWeight: 700 }}>
            {cooldown > 0 ? `Gửi lại sau ${cooldown}s` : 'Gửi lại mã'}
          </Button>
          <Link to="/login" style={{ color: '#8F1216' }}>← Quay lại đăng nhập</Link>
        </div>
      </div>
    </AuthLayout>
  );
};

export default VerifyOtpPage;

