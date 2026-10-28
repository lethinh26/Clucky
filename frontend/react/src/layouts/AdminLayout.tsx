import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation, Link } from 'react-router-dom';
import {
  Layout,
  Menu,
  Breadcrumb,
  Button,
  Badge,
  Dropdown,
  Avatar,
  Tag,
  Flex,
  Select,
  Typography,
  message,
} from 'antd';
import type { MenuProps } from 'antd';
import {
  DashboardOutlined,
  CoffeeOutlined,
  ShopOutlined,
  InboxOutlined,
  FileTextOutlined,
  CommentOutlined,
  BarChartOutlined,
  BellOutlined,
  UserOutlined,
  LogoutOutlined,
  SwapOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
} from '@ant-design/icons';
import { useAuth } from '../context/AuthContext';

const routeBreadcrumbMap: Record<string, string> = {
  '/admin': 'Tổng quan',
  '/admin/dashboard': 'Tổng quan',
  '/admin/catalog': 'Quản lý Thực đơn & Sản phẩm',
  '/admin/stores': 'Quản lý Chi nhánh',
  '/admin/inventory': 'Tồn kho Chi nhánh',
  '/admin/orders': 'Quản lý Đơn hàng',
  '/admin/staff/orders': 'Đơn hàng Ca trực',
  '/admin/reviews': 'Quản lý Đánh giá',
  '/admin/reports': 'Báo cáo & Thống kê',
};

export const AdminLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const { user, switchRole, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Determine current active menu key
  const pathname = location.pathname;
  let selectedKey = 'dashboard';
  if (pathname.includes('/catalog')) selectedKey = 'catalog';
  else if (pathname.includes('/stores')) selectedKey = 'stores';
  else if (pathname.includes('/inventory')) selectedKey = 'inventory';
  else if (pathname.includes('/staff/orders')) selectedKey = 'staff-orders';
  else if (pathname.includes('/orders')) selectedKey = 'orders';
  else if (pathname.includes('/reviews')) selectedKey = 'reviews';
  else if (pathname.includes('/reports')) selectedKey = 'reports';

  const roleNavPermissions: Record<'ADMIN' | 'STORE_MANAGER' | 'STAFF', string[]> = {
    ADMIN: ['dashboard', 'catalog', 'stores', 'inventory', 'orders', 'reviews', 'reports'],
    STORE_MANAGER: ['dashboard', 'stores', 'inventory', 'orders', 'reviews', 'reports'],
    STAFF: ['dashboard', 'inventory', 'staff-orders', 'orders', 'reviews'],
  };

  const navItems: MenuProps['items'] = [
    {
      key: 'dashboard',
      icon: <DashboardOutlined />,
      label: 'Tổng quan',
      onClick: () => navigate('/admin/dashboard'),
    },
    {
      key: 'catalog',
      icon: <CoffeeOutlined />,
      label: 'Thực đơn & Combo',
      onClick: () => navigate('/admin/catalog'),
    },
    {
      key: 'stores',
      icon: <ShopOutlined />,
      label: 'Hệ thống Chi nhánh',
      onClick: () => navigate('/admin/stores'),
    },
    {
      key: 'inventory',
      icon: <InboxOutlined />,
      label: 'Tồn kho Chi nhánh',
      onClick: () => navigate('/admin/inventory'),
    },
    {
      key: 'orders',
      icon: <FileTextOutlined />,
      label: 'Quản lý Đơn hàng',
      onClick: () => navigate('/admin/orders'),
    },
    {
      key: 'staff-orders',
      icon: <ShopOutlined />,
      label: 'Đơn hàng Ca trực',
      onClick: () => navigate('/admin/staff/orders'),
    },
    {
      key: 'reviews',
      icon: <CommentOutlined />,
      label: 'Đánh giá & Phản hồi',
      onClick: () => navigate('/admin/reviews'),
    },
    {
      key: 'reports',
      icon: <BarChartOutlined />,
      label: 'Báo cáo & Thống kê',
      onClick: () => navigate('/admin/reports'),
    },
  ];

  const allowedNavKeys = roleNavPermissions[user.role] || ['dashboard'];
  const visibleNavItems = navItems.filter((item) => item && allowedNavKeys.includes(String(item.key)));

  const roleLabelMap: Record<string, { label: string; color: string }> = {
    ADMIN: { label: 'Quản trị viên HQ', color: '#8F1216' },
    STORE_MANAGER: { label: 'Quản lý Chi nhánh', color: '#C9A227' },
    STAFF: { label: 'Nhân viên Ca', color: '#1E7A46' },
  };

  const profileMenuItems: MenuProps['items'] = [
    {
      key: 'user-info',
      disabled: true,
      label: (
        <div style={{ padding: '4px 0' }}>
          <div style={{ fontWeight: 700, color: '#16100D' }}>{user.fullName}</div>
          <div style={{ fontSize: 12, color: '#6B6259' }}>{user.email}</div>
          <Tag color={roleLabelMap[user.role]?.color} style={{ marginTop: 6, borderRadius: 6 }}>
            {roleLabelMap[user.role]?.label}
          </Tag>
        </div>
      ),
    },
    { type: 'divider' },
    {
      key: 'switch-role-admin',
      label: 'Chuyển sang: Quản trị viên (HQ)',
      icon: <SwapOutlined />,
      onClick: () => {
        switchRole('ADMIN');
        message.success('Đã chuyển vai trò: Quản trị viên HQ');
      },
    },
    {
      key: 'switch-role-manager',
      label: 'Chuyển sang: Quản lý Chi nhánh',
      icon: <SwapOutlined />,
      onClick: () => {
        switchRole('STORE_MANAGER');
        message.success('Đã chuyển vai trò: Quản lý Chi nhánh Lê Lợi');
      },
    },
    {
      key: 'switch-role-staff',
      label: 'Chuyển sang: Nhân viên Chi nhánh',
      icon: <SwapOutlined />,
      onClick: () => {
        switchRole('STAFF');
        message.success('Đã chuyển vai trò: Nhân viên Chi nhánh Lê Lợi');
      },
    },
    { type: 'divider' },
    {
      key: 'logout',
      label: 'Đăng xuất',
      icon: <LogoutOutlined />,
      onClick: () => {
        logout();
        message.info('Đã đăng xuất.');
      },
    },
  ];

  const currentTitle = routeBreadcrumbMap[pathname] || 'Trang quản trị';

  return (
    <Layout className="admin-layout" style={{ minHeight: '100vh', background: '#F5EDE0' }}>
      <Layout.Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        width={260}
        trigger={null}
        className="admin-sider"
        style={{
          background: '#16100D',
          boxShadow: '4px 0 24px rgba(22, 16, 13, 0.08)',
          zIndex: 10,
        }}
      >
        <div
          className="sider-brand"
          style={{
            height: 76,
            display: 'flex',
            alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'flex-start',
            padding: collapsed ? '0' : '0 24px',
            gap: 12,
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          <img
            src="/logo_primary.png"
            alt="Clucky"
            style={{ width: 38, height: 38, objectFit: 'contain' }}
          />
          {!collapsed && (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span
                style={{
                  fontFamily: 'Baloo 2, sans-serif',
                  fontWeight: 700,
                  fontSize: 22,
                  color: '#FFFAF3',
                  letterSpacing: '0.04em',
                  lineHeight: 1.1,
                }}
              >
                CLUCKY
              </span>
              <span
                style={{
                  fontFamily: 'Quicksand, sans-serif',
                  fontWeight: 600,
                  fontSize: 10,
                  color: '#C9A227',
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                }}
              >
                Management System
              </span>
            </div>
          )}
        </div>

        {!collapsed && (
          <div
            style={{
              padding: '16px 24px 6px',
              color: 'rgba(245, 237, 224, 0.45)',
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.14em',
              fontFamily: 'Quicksand, sans-serif',
            }}
          >
            DANH MỤC NGHIỆP VỤ
          </div>
        )}

        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[selectedKey]}
          items={visibleNavItems}
          style={{
            background: 'transparent',
            borderRight: 'none',
            fontFamily: 'Quicksand, sans-serif',
            fontWeight: 600,
            fontSize: 14,
          }}
        />

        {!collapsed && (
          <div
            style={{
              position: 'absolute',
              bottom: 24,
              left: 20,
              right: 20,
              padding: 14,
              background: 'rgba(255, 250, 243, 0.05)',
              borderRadius: 14,
              border: '1px solid rgba(255, 250, 243, 0.1)',
            }}
          >
            <div
              style={{
                fontSize: 11,
                color: 'rgba(245, 237, 224, 0.6)',
                fontFamily: 'Quicksand, sans-serif',
              }}
            >
              Quyền hiện tại:
            </div>
            <div
              style={{
                fontFamily: 'Baloo 2, sans-serif',
                color: '#C9A227',
                fontWeight: 600,
                fontSize: 13,
                marginTop: 2,
              }}
            >
              {roleLabelMap[user.role]?.label}
            </div>
            {user.storeName && (
              <div
                style={{
                  fontSize: 11,
                  color: '#FFFAF3',
                  marginTop: 2,
                  fontFamily: 'Quicksand, sans-serif',
                }}
              >
                📍 {user.storeName}
              </div>
            )}
          </div>
        )}
      </Layout.Sider>

      <Layout>
        <Layout.Header
          className="admin-header"
          style={{
            height: 72,
            background: '#FFFAF3',
            borderBottom: '1px solid #E8E2D9',
            padding: '0 28px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
            position: 'sticky',
            top: 0,
            zIndex: 9,
          }}
        >
          <Flex align="center" gap={16}>
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed(!collapsed)}
              style={{ fontSize: 16, color: '#16100D' }}
            />
            <Breadcrumb
              items={[
                { title: <Link to="/admin/dashboard">Clucky HQ</Link> },
                { title: currentTitle },
              ]}
              style={{ fontFamily: 'Quicksand, sans-serif', fontWeight: 600 }}
            />
          </Flex>

          <Flex align="center" gap={16}>
            {/* Store Chip for Staff / Store Manager */}
            {(user.role === 'STAFF' || user.role === 'STORE_MANAGER') && (
              <Tag
                style={{
                  backgroundColor: '#FEF9C3',
                  border: '1px solid #FDE047',
                  color: '#946C00',
                  borderRadius: 999,
                  padding: '4px 12px',
                  fontFamily: 'Quicksand, sans-serif',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <ShopOutlined />
                <span>Chi nhánh: {user.storeName || 'Clucky Lê Lợi (Q.1)'}</span>
              </Tag>
            )}

            {/* Quick role selector for testing and demo */}
            <Select
              size="small"
              value={user.role}
              onChange={(val) => switchRole(val)}
              style={{ width: 170, fontFamily: 'Quicksand, sans-serif' }}
              options={[
                { value: 'ADMIN', label: '🛡️ Role: Admin HQ' },
                { value: 'STORE_MANAGER', label: '🏪 Role: Store Manager' },
                { value: 'STAFF', label: '👨‍🍳 Role: Staff Chi nhánh' },
              ]}
            />

            {/* Notification Bell */}
            <Badge dot color="#8F1216">
              <Button
                type="text"
                shape="circle"
                icon={<BellOutlined style={{ fontSize: 18, color: '#16100D' }} />}
                aria-label="Thông báo hệ thống"
                onClick={() => message.info('Không có thông báo khẩn mới.')}
              />
            </Badge>

            {/* Profile Dropdown */}
            <Dropdown menu={{ items: profileMenuItems }} trigger={['click']}>
              <Button
                type="text"
                style={{
                  height: 44,
                  padding: '4px 10px',
                  borderRadius: 12,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                }}
              >
                <Avatar
                  size={34}
                  style={{
                    backgroundColor: '#8F1216',
                    fontFamily: 'Baloo 2, sans-serif',
                    fontWeight: 700,
                    color: '#FFFAF3',
                  }}
                >
                  {user.fullName.split(' ').pop()?.[0] || 'C'}
                </Avatar>
                <div style={{ textAlign: 'left', lineHeight: 1.2 }}>
                  <div
                    style={{
                      fontFamily: 'Quicksand, sans-serif',
                      fontWeight: 700,
                      fontSize: 13,
                      color: '#16100D',
                    }}
                  >
                    {user.fullName}
                  </div>
                  <div
                    style={{
                      fontFamily: 'Quicksand, sans-serif',
                      fontSize: 11,
                      color: '#6B6259',
                    }}
                  >
                    {roleLabelMap[user.role]?.label}
                  </div>
                </div>
              </Button>
            </Dropdown>
          </Flex>
        </Layout.Header>

        <Layout.Content
          style={{
            padding: '28px 32px 48px',
            background: '#F5EDE0',
            minHeight: 'calc(100vh - 72px - 56px)',
          }}
        >
          <div style={{ maxWidth: 1400, margin: '0 auto' }}>
            <Outlet />
          </div>
        </Layout.Content>

        <Layout.Footer
          style={{
            textAlign: 'center',
            background: '#F5EDE0',
            borderTop: '1px solid #E8E2D9',
            padding: '16px 24px',
            color: '#6B6259',
            fontFamily: 'Quicksand, sans-serif',
            fontSize: 13,
          }}
        >
          Clucky Food Delivery Platform · Domain Catalog & Store (Sprint 1) ·{' '}
          <span style={{ color: '#8F1216', fontWeight: 700 }}>Crispy Outside, Happy Inside</span>
        </Layout.Footer>
      </Layout>
    </Layout>
  );
};

export default AdminLayout;
