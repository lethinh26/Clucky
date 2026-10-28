import React from "react";
import { useNavigate, Link } from "react-router-dom";
import { Form, Input, Button, Alert } from "antd";
import { AuthLayout } from "./AuthLayout";
import { authApi, getErrorMessage } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { switchRole } = useAuth();
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  const onFinish = async (values: { email: string; password: string }) => {
    setError(null);
    setLoading(true);
    try {
      const tokens = await authApi.login(values);
      localStorage.setItem("clucky_admin_access_token", tokens.accessToken);
      localStorage.setItem("clucky_admin_refresh_token", tokens.refreshToken);
      // Map API role → UI role for mock RBAC
      if (
        tokens.role === "ADMIN" ||
        tokens.role === "STORE_MANAGER" ||
        tokens.role === "STAFF"
      ) {
        switchRole(tokens.role);
      }
      navigate("/admin/dashboard");
    } catch (err) {
      setError(
        getErrorMessage(err, "Đăng nhập thất bại. Kiểm tra lại thông tin."),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Đăng nhập quản trị"
      subtitle="Khu vực dành cho Admin, Store Manager và Staff của Clucky."
    >
      <Form
        layout="vertical"
        onFinish={onFinish}
        requiredMark={false}
        style={{ display: "grid", gap: 0 }}
      >
        {error && (
          <Alert
            type="error"
            message={error}
            showIcon
            style={{ marginBottom: 18, borderRadius: 12 }}
          />
        )}
        <Form.Item
          label="Email"
          name="email"
          rules={[
            { required: true, message: "Vui lòng nhập email." },
            { type: "email", message: "Email không hợp lệ." },
          ]}
        >
          <Input
            size="large"
            placeholder="ban@clucky.local"
            autoComplete="email"
          />
        </Form.Item>
        <Form.Item
          label="Mật khẩu"
          name="password"
          rules={[{ required: true, message: "Vui lòng nhập mật khẩu." }]}
        >
          <Input.Password
            size="large"
            placeholder="••••••••"
            autoComplete="current-password"
          />
        </Form.Item>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: 18,
            fontFamily: "Quicksand, sans-serif",
            fontWeight: 600,
            fontSize: 13,
          }}
        >
          <Link to="/forgot-password" style={{ color: "#8F1216" }}>
            Quên mật khẩu?
          </Link>
        </div>
        <Button
          type="primary"
          htmlType="submit"
          size="large"
          loading={loading}
          block
          style={{ borderRadius: 999, height: 48, fontWeight: 700 }}
        >
          Đăng nhập
        </Button>
        <div
          style={{
            marginTop: 20,
            textAlign: "center",
            color: "#6B6259",
            fontSize: 13,
            fontFamily: "Quicksand, sans-serif",
            fontWeight: 600,
          }}
        >
          Sử dụng tài khoản được cấp. Nếu chưa có tài khoản, vui lòng liên hệ
          quản trị viên.
        </div>
      </Form>
    </AuthLayout>
  );
};

export default LoginPage;
