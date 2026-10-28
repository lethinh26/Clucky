import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Result, Button } from 'antd';
import { useAuth } from '../../context/AuthContext';

export interface ProtectedRouteProps {
  allowedRoles: Array<'ADMIN' | 'STORE_MANAGER' | 'STAFF'>;
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles, children }) => {
  const { user } = useAuth();
  const navigate = useNavigate();

  if (!allowedRoles.includes(user.role)) {
    return (
      <div style={{ padding: '60px 24px', textAlign: 'center' }}>
        <Result
          status="403"
          title={
            <span style={{ fontFamily: 'Baloo 2, sans-serif', fontSize: 32, color: '#16100D' }}>
              403 — Không có quyền truy cập
            </span>
          }
          subTitle={
            <span style={{ fontFamily: 'Quicksand, sans-serif', fontSize: 16, color: '#6B6259' }}>
              Tài khoản của bạn ({user.fullName} · {user.role}) không được phân quyền truy cập vào phân hệ này.
            </span>
          }
          extra={
            <Button
              type="primary"
              onClick={() => navigate('/admin/dashboard')}
              style={{
                backgroundColor: '#8F1216',
                borderColor: '#8F1216',
                borderRadius: 999,
                fontWeight: 700,
                fontFamily: 'Quicksand, sans-serif',
                height: 42,
                padding: '0 24px',
              }}
            >
              Quay lại Bảng điều khiển
            </Button>
          }
        />
      </div>
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;
