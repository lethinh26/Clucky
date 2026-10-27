import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider, App as AntApp } from 'antd';
import viVN from 'antd/locale/vi_VN';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { AdminLayout } from './layouts/AdminLayout';
import Dashboard from './pages/Dashboard';
import { CatalogPage } from './pages/Catalog';
import { StoresPage } from './pages/Stores';
import { StaffInventoryPage } from './pages/Staff/Inventory';
import { OrdersPage } from './pages/Orders';
import { ReviewsPage } from './pages/Reviews';
import { ReportsPage } from './pages/Reports';

export const App: React.FC = () => {
  return (
    <ConfigProvider
      locale={viVN}
      theme={{
        token: {
          colorPrimary: '#8F1216',
          colorInfo: '#22577A',
          colorSuccess: '#1E7A46',
          colorWarning: '#D97706',
          colorError: '#B42318',
          colorText: '#16100D',
          colorTextSecondary: '#6B6259',
          colorBorder: '#E8E2D9',
          borderRadius: 14,
          fontFamily: 'Quicksand, system-ui, sans-serif',
          colorBgLayout: '#F5EDE0',
          colorBgContainer: '#FFFAF3',
        },
        components: {
          Menu: {
            darkItemBg: '#16100D',
            darkItemSelectedBg: '#8F1216',
            darkItemHoverBg: '#2A1F1B',
            darkItemColor: 'rgba(245, 237, 224, 0.85)',
          },
          Button: {
            controlHeight: 42,
            borderRadius: 12,
            fontWeight: 700,
          },
          Card: {
            borderRadiusLG: 20,
          },
        },
      }}
    >
      <AntApp message={{ maxCount: 3 }}>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Navigate to="/admin/dashboard" replace />} />
              <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<Navigate to="/admin/dashboard" replace />} />
                <Route path="dashboard" element={<Dashboard />} />
                <Route
                  path="catalog"
                  element={
                    <ProtectedRoute allowedRoles={['ADMIN']}>
                      <CatalogPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="stores"
                  element={
                    <ProtectedRoute allowedRoles={['ADMIN', 'STORE_MANAGER']}>
                      <StoresPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="inventory"
                  element={
                    <ProtectedRoute allowedRoles={['ADMIN', 'STORE_MANAGER', 'STAFF']}>
                      <StaffInventoryPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="reviews"
                  element={
                    <ProtectedRoute allowedRoles={['ADMIN', 'STORE_MANAGER', 'STAFF']}>
                      <ReviewsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="reports"
                  element={
                    <ProtectedRoute allowedRoles={['ADMIN', 'STORE_MANAGER']}>
                      <ReportsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="orders"
                  element={
                    <ProtectedRoute allowedRoles={['ADMIN', 'STORE_MANAGER', 'STAFF']}>
                      <OrdersPage />
                    </ProtectedRoute>
                  }
                />
                <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </AntApp>
    </ConfigProvider>
  );
};

export default App;
