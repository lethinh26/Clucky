import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Form, Input, Button, Alert } from 'antd';
import { AuthLayout } from './AuthLayout';
import { authApi, getErrorMessage } from '../../lib/api';

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  const onFinish = async (values: { fullName: string; email: string; phone?: string; password: string }) => {
    setError(null);
    setLoading(true);
    try {
      await authApi.register(values);
      navigate(`/verify-otp?email=${encodeURIComponent(values.email)}`);
    } catch (err) {
      setError(getErrorMessage(err, 'Đăng ký không thành công.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="Tạo tài khoản" subtitle="Đăng ký tài khoản Clucky cho nhân sự nội bộ.">
      <Form layout="vertical" onFinish={onFinish} requiredMark={false}>
        {error && <Alert type="error" message={error} showIcon style={{ marginBottom: 18, borderRadius: 12 }} />}
        <Form.Item label="Họ và tên" name="fullName" rules={[{ required: true, message: 'Vui lòng nhập họ tên.' }]}>
          <Input size="large" autoComplete="name" />
        </Form.Item>
        <Form.Item label="Email" name="email" rules={[{ required: true, message: 'Vui lòng nhập email.' }, { type: 'email', message: 'Email không hợp lệ.' }]}>
          <Input size="large" autoComplete="email" placeholder="ban@clucky.local" />
        </Form.Item>
        <Form.Item label="Số điện thoại (tuỳ chọn)" name="phone">
          <Input size="large" autoComplete="tel" placeholder="0901 234 567" />
        </Form.Item>
        <Form.Item label="Mật khẩu" name="password" rules={[{ required: true, message: 'Vui lòng nhập mật khẩu.' }, { min: 8, message: 'Tối thiểu 8 ký tự.' }]}>
          <Input.Password size="large" autoComplete="new-password" />
        </Form.Item>
        <Button type="primary" htmlType="submit" size="large" loading={loading} block style={{ borderRadius: 999, height: 48, fontWeight: 700 }}>
          Đăng ký
        </Button>
        <div style={{ marginTop: 20, textAlign: 'center', color: '#6B6259', fontSize: 13, fontFamily: 'Quicksand, sans-serif', fontWeight: 600 }}>
          Đã có tài khoản? <Link to="/login" style={{ color: '#8F1216' }}>Đăng nhập</Link>
        </div>
      </Form>
    </AuthLayout>
  );
};

export default RegisterPage;

