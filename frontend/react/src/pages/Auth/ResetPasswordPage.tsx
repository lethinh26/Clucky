import React from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Form, Input, Button, Alert } from 'antd';
import { AuthLayout } from './AuthLayout';
import { authApi, getErrorMessage } from '../../lib/api';

export const ResetPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const email = params.get('email') ?? '';
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  const onFinish = async (values: { otp: string; password: string; confirm: string }) => {
    setError(null);
    setSuccess(null);
    if (values.password !== values.confirm) {
      setError('Mật khẩu xác nhận không khớp.');
      return;
    }
    setLoading(true);
    try {
      await authApi.resetPassword({ email, otp: values.otp, newPassword: values.password });
      setSuccess('Đặt lại mật khẩu thành công. Đang chuyển đến đăng nhập…');
      setTimeout(() => navigate('/login'), 1200);
    } catch (err) {
      setError(getErrorMessage(err, 'Không thể đặt lại mật khẩu.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="Đặt lại mật khẩu" subtitle={`Nhập mã OTP gửi tới ${email || 'email của bạn'} và mật khẩu mới.`}>
      <Form layout="vertical" onFinish={onFinish} requiredMark={false}>
        {error && <Alert type="error" message={error} showIcon style={{ marginBottom: 18, borderRadius: 12 }} />}
        {success && <Alert type="success" message={success} showIcon style={{ marginBottom: 18, borderRadius: 12 }} />}
        <Form.Item label="Mã OTP" name="otp" rules={[{ required: true, message: 'Vui lòng nhập mã OTP.' }]}>
          <Input size="large" inputMode="numeric" placeholder="Mã 6 số" autoComplete="one-time-code" />
        </Form.Item>
        <Form.Item label="Mật khẩu mới" name="password" rules={[{ required: true, message: 'Vui lòng nhập mật khẩu mới.' }, { min: 8, message: 'Tối thiểu 8 ký tự.' }]}>
          <Input.Password size="large" autoComplete="new-password" />
        </Form.Item>
        <Form.Item
          label="Xác nhận mật khẩu"
          name="confirm"
          dependencies={['password']}
          rules={[
            { required: true, message: 'Vui lòng xác nhận mật khẩu.' },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue('password') === value) return Promise.resolve();
                return Promise.reject(new Error('Mật khẩu xác nhận không khớp.'));
              },
            }),
          ]}
        >
          <Input.Password size="large" autoComplete="new-password" />
        </Form.Item>
        <Button type="primary" htmlType="submit" size="large" loading={loading} block style={{ borderRadius: 999, height: 48, fontWeight: 700 }}>
          Đặt lại mật khẩu
        </Button>
        <div style={{ marginTop: 20, textAlign: 'center', fontFamily: 'Quicksand, sans-serif', fontWeight: 600, fontSize: 13 }}>
          <Link to="/login" style={{ color: '#8F1216' }}>← Quay lại đăng nhập</Link>
        </div>
      </Form>
    </AuthLayout>
  );
};

export default ResetPasswordPage;

