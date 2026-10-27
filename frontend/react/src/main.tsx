import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  App as AntApp,
  Avatar,
  Badge,
  Breadcrumb,
  Button,
  Card,
  ConfigProvider,
  Dropdown,
  Empty,
  Flex,
  Layout,
  Menu,
  Typography,
  message,
} from 'antd';
import type { MenuProps } from 'antd';
import viVN from 'antd/locale/vi_VN';
import {
  BarChartOutlined,
  BellOutlined,
  CoffeeOutlined,
  DashboardOutlined,
  FileTextOutlined,
  LogoutOutlined,
  PlusOutlined,
  ShopOutlined,
  TeamOutlined,
  UserOutlined,
} from '@ant-design/icons';
import './style.css';
import Dashboard, { OrdersTable, PageIntro } from './pages/Dashboard';

const navItems: MenuProps['items'] = [
  { key: 'dashboard', icon: <DashboardOutlined />, label: 'Tổng quan' },
  {
    key: 'orders',
    icon: <FileTextOutlined />,
    label: 'Đơn hàng',
    children: [
      { key: 'orders-all', label: 'Tất cả đơn hàng' },
      { key: 'orders-refund', label: 'Yêu cầu hoàn tiền' },
    ],
  },
  { key: 'catalog', icon: <CoffeeOutlined />, label: 'Thực đơn' },
  { key: 'stores', icon: <ShopOutlined />, label: 'Chi nhánh' },
  { key: 'customers', icon: <TeamOutlined />, label: 'Khách hàng' },
  { key: 'reports', icon: <BarChartOutlined />, label: 'Báo cáo' },
];

function SectionPage({ page }: { page: string }) {
  const config: Record<string, { eyebrow: string; title: string; description: string; icon: React.ReactNode }> = {
    orders: {
      eyebrow: 'Operations',
      title: 'Đơn hàng',
      description: 'Quản lý trạng thái và xử lý các đơn hàng trong hệ thống.',
      icon: <FileTextOutlined />,
    },
    catalog: {
      eyebrow: 'Catalog',
      title: 'Thực đơn',
      description: 'Quản lý món ăn, combo và trạng thái hiển thị.',
      icon: <CoffeeOutlined />,
    },
    stores: {
      eyebrow: 'Network',
      title: 'Chi nhánh',
      description: 'Theo dõi hiệu suất và tình trạng vận hành từng cửa hàng.',
      icon: <ShopOutlined />,
    },
    customers: {
      eyebrow: 'Relationship',
      title: 'Khách hàng',
      description: 'Xem hồ sơ, lịch sử mua hàng và điểm thành viên.',
      icon: <TeamOutlined />,
    },
    reports: {
      eyebrow: 'Insights',
      title: 'Báo cáo',
      description: 'Phân tích doanh thu và các chỉ số vận hành của Clucky.',
      icon: <BarChartOutlined />,
    },
  };
  const current = config[page] ?? config.orders;
  return (
    <>
      <PageIntro
        eyebrow={current.eyebrow}
        title={current.title}
        description={current.description}
        action={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => message.success('Đã mở biểu mẫu tạo mới.')}
          >
            Tạo mới
          </Button>
        }
      />
      {page === 'orders' ? (
        <Card>
          <OrdersTable />
        </Card>
      ) : (
        <Card className="placeholder-card">
          <Empty
            image={current.icon}
            description={
              <>
                <Typography.Title level={4}>Khu vực {current.title.toLowerCase()}</Typography.Title>
                <Typography.Text type="secondary">Khung giao diện đã sẵn sàng để nối dữ liệu backend.</Typography.Text>
              </>
            }
          >
            <Button type="primary" onClick={() => message.info('Tính năng đang được nối API.')}>
              Xem bản demo
            </Button>
          </Empty>
        </Card>
      )}
    </>
  );
}

function App() {
  const [page, setPage] = useState('dashboard');
  const [collapsed, setCollapsed] = useState(false);
  const [messageApi, contextHolder] = message.useMessage();
  const pageLabels: Record<string, string> = {
    dashboard: 'Tổng quan',
    orders: 'Đơn hàng',
    catalog: 'Thực đơn',
    stores: 'Chi nhánh',
    customers: 'Khách hàng',
    reports: 'Báo cáo',
  };
  const pageTitle = pageLabels[page] ?? 'Tổng quan';
  const profileItems: MenuProps['items'] = [
    { key: 'profile', icon: <UserOutlined />, label: 'Hồ sơ cá nhân' },
    { type: 'divider' },
    { key: 'logout', icon: <LogoutOutlined />, label: 'Đăng xuất' },
  ];
  const navigate = (key: string) => setPage(key.startsWith('orders-') ? 'orders' : key);

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
          },
        },
      }}
    >
      <AntApp message={{ maxCount: 3 }}>
        {contextHolder}
        <Layout className="admin-layout">
          <Layout.Sider collapsible collapsed={collapsed} onCollapse={setCollapsed} width={252} className="admin-sider">
            <div className="sider-brand">
              <img src="/logo_primary.png" alt="Clucky" />
              <span>CLUCKY</span>
            </div>
            <div className="sider-section-label">WORKSPACE</div>
            <Menu
              theme="dark"
              mode="inline"
              selectedKeys={[page]}
              items={navItems}
              onClick={({ key }) => navigate(key)}
            />
          </Layout.Sider>
          <Layout>
            <Layout.Header className="admin-header">
              <Button
                className="mobile-menu"
                type="text"
                icon={<DashboardOutlined />}
                onClick={() => setCollapsed(!collapsed)}
              />
              <Breadcrumb items={[{ title: 'Clucky' }, { title: pageTitle }]} />
              <Flex align="center" gap={20}>
                <Badge dot color="#8F1216">
                  <Button type="text" icon={<BellOutlined />} aria-label="Thông báo" />
                </Badge>
                <Dropdown
                  menu={{
                    items: profileItems,
                    onClick: ({ key }) =>
                      key === 'logout' && messageApi.info('Tính năng đăng xuất sẽ nối cùng Auth Service.'),
                  }}
                  trigger={['click']}
                >
                  <Button type="text" className="profile-button">
                    <Avatar size={32} style={{ background: '#8F1216', fontFamily: 'Fredoka, sans-serif', fontWeight: 600 }}>
                      LT
                    </Avatar>
                    <span className="profile-name">Lê Phú Thịnh</span>
                  </Button>
                </Dropdown>
              </Flex>
            </Layout.Header>
            <Layout.Content className="admin-content">
              <div className="content-inner">
                {page === 'dashboard' ? <Dashboard onNavigate={navigate} /> : <SectionPage page={page} />}
              </div>
            </Layout.Content>
            <Layout.Footer className="admin-footer">
              Clucky Operations · Internal workspace <span>v0.1.0</span>
            </Layout.Footer>
          </Layout>
        </Layout>
      </AntApp>
    </ConfigProvider>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
