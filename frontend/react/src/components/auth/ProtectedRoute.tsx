import { useTranslation } from "react-i18next";
import { useFeedback } from "../feedback";
import React from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Result, Button, Spin, Alert } from 'antd';
import { useAuthState } from '../../context/AuthContext';
import { loadSession } from '../../lib/session';
import { getErrorMessage } from '../../lib/api';
import { roleHome } from '../../lib/role-home';

export interface ProtectedRouteProps {
  allowedRoles: Array<'ADMIN' | 'STORE_MANAGER' | 'STAFF'>;
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles, children }) => {
  const { t } = useTranslation();
  const { user, ready, error } = useAuthState();
  useFeedback(error ? getErrorMessage(error) : null);
  const navigate = useNavigate();

  if (!ready) return <Spin />;
  if (error) return <Alert type="error" message={getErrorMessage(error)} action={<Button onClick={() => { void loadSession(true).catch(() => {}); }}>{t('common:retry')}</Button>} />;
  if (!user) return <Navigate to="/login" replace />;

  if (!allowedRoles.includes(user.role)) {
    return (
      <div style={{ padding: '60px 24px', textAlign: 'center' }}>
        <Result
          status="403"
          title={
            <span style={{ fontFamily: 'Baloo 2, sans-serif', fontSize: 32, color: '#16100D' }}>
              {t("admin:forbidden.title")}{" "}</span>
          }
          subTitle={
            <span style={{ fontFamily: 'Quicksand, sans-serif', fontSize: 16, color: '#6B6259' }}>
              {t("admin:forbidden.accountPrefix")}{user.fullName} · {user.role}{t("admin:forbidden.description")}{" "}</span>
          }
          extra={
            <Button
              type="primary"
              onClick={() => navigate(roleHome(user.role))}
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
              {t("admin:forbidden.back")}{" "}</Button>
          }
        />
      </div>
    );
  }

  return <React.Fragment key={`${user.id}:${user.role}:${user.storeId ?? ""}`}>{children}</React.Fragment>;
};

export default ProtectedRoute;
