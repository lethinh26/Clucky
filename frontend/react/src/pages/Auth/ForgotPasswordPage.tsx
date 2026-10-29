import React from 'react';
import { Link } from 'react-router-dom';
import { useScopedNavigate as useNavigate } from '../../components/ui-loader/use-scoped-navigate';
import { useDeferredAction } from '../../components/ui-loader/use-deferred-action';
import { Form, Input, Button, Alert } from 'antd';
import { AuthLayout } from './AuthLayout';
import { authApi, getErrorMessage } from '../../lib/api';

export const ForgotPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const startDeferred = useDeferredAction();
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  const onFinish = async (values: { email: string }) => {
    if (loading) return;
    const task = startDeferred();
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      await authApi.forgotPassword(values);
      if (!task.isCurrent()) return;
      setSuccess('Nếu email tồn tại, mã đặt lại mật khẩu đã được gửi.');
      task.schedule(() => navigate(`/reset-password?email=${encodeURIComponent(values.email)}`), 1200);
    } catch (err) {
      if (!task.isCurrent()) return;
      setError(getErrorMessage(err, 'Không thể gửi yêu cầu.'));
    } finally {
      if (task.isCurrent()) setLoading(false);
    }
  };

  return (
    <AuthLayout title="Quên mật khẩu" subtitle="Nhập email của bạn, chúng tôi sẽ gửi mã để đặt lại mật khẩu.">
      <Form layout="vertical" onFinish={onFinish} requiredMark={false}>
        {error && <Alert type="error" message={error} showIcon style={{ marginBottom: 18, borderRadius: 12 }} />}
        {success && <Alert type="success" message={success} showIcon style={{ marginBottom: 18, borderRadius: 12 }} />}
        <Form.Item label="Email" name="email" rules={[{ required: true, message: 'Vui lòng nhập email.' }, { type: 'email', message: 'Email không hợp lệ.' }]}>
          <Input size="large" autoComplete="email" placeholder="ban@clucky.local" />
        </Form.Item>
        <Button type="primary" htmlType="submit" size="large" loading={loading} block style={{ borderRadius: 999, height: 48, fontWeight: 700 }}>
          Gửi mã đặt lại
        </Button>
        <div style={{ marginTop: 20, textAlign: 'center', fontFamily: 'Quicksand, sans-serif', fontWeight: 600, fontSize: 13 }}>
          <Link to="/login" style={{ color: '#8F1216' }}>← Quay lại đăng nhập</Link>
        </div>
      </Form>
    </AuthLayout>
  );
};

export default ForgotPasswordPage;

