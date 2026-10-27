import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  App as AntApp,
  Avatar,
  Badge,
  Breadcrumb,
  Button,
  Card,
  Col,
  ConfigProvider,
  Dropdown,
  Empty,
  Flex,
  Layout,
  Menu,
  Progress,
  Row,
  Segmented,
  Space,
  Statistic,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import type { MenuProps, TableColumnsType } from 'antd';
import viVN from 'antd/locale/vi_VN';
import {
  BarChartOutlined,
  BellOutlined,
  CheckCircleOutlined,
  CoffeeOutlined,
  DashboardOutlined,
  EnvironmentOutlined,
  FileTextOutlined,
  LogoutOutlined,
  MoreOutlined,
  PlusOutlined,
  RiseOutlined,
  ShopOutlined,
  TeamOutlined,
  UserOutlined,
} from '@ant-design/icons';
import './style.css';

type Order = { key: string; code: string; customer: string; items: number; status: string; total: string; time: string };

const orders: Order[] = [
  { key: '1', code: '#CLU-240826', customer: 'Nguyễn Minh Anh', items: 3, status: 'Đang chuẩn bị', total: '257.000đ', time: '10:42' },
  { key: '2', code: '#CLU-240825', customer: 'Trần Gia Huy', items: 2, status: 'Hoàn thành', total: '158.000đ', time: '10:36' },
  { key: '3', code: '#CLU-240824', customer: 'Lê Hoàng Nam', items: 5, status: 'Đang giao', total: '429.000đ', time: '10:21' },
  { key: '4', code: '#CLU-240823', customer: 'Phạm Thuỳ Linh', items: 1, status: 'Chờ xác nhận', total: '89.000đ', time: '10:05' },
];

const navItems: MenuProps['items'] = [
  { key: 'dashboard', icon: <DashboardOutlined />, label: 'Tổng quan' },
  { key: 'orders', icon: <FileTextOutlined />, label: 'Đơn hàng', children: [{ key: 'orders-all', label: 'Tất cả đơn hàng' }, { key: 'orders-refund', label: 'Yêu cầu hoàn tiền' }] },
  { key: 'catalog', icon: <CoffeeOutlined />, label: 'Thực đơn' },
  { key: 'stores', icon: <ShopOutlined />, label: 'Chi nhánh' },
  { key: 'customers', icon: <TeamOutlined />, label: 'Khách hàng' },
  { key: 'reports', icon: <BarChartOutlined />, label: 'Báo cáo' },
];

const statusColor: Record<string, string> = { 'Đang chuẩn bị': 'orange', 'Hoàn thành': 'green', 'Đang giao': 'blue', 'Chờ xác nhận': 'gold' };

function StatusTag({ status }: { status: string }) { return <Tag color={statusColor[status] ?? 'default'}>{status}</Tag>; }

function OrdersTable({ compact = false }: { compact?: boolean }) {
  const columns: TableColumnsType<Order> = [
    { title: 'Mã đơn', dataIndex: 'code', key: 'code', render: (value) => <Typography.Text strong>{value}</Typography.Text> },
    { title: 'Khách hàng', dataIndex: 'customer', key: 'customer', render: (value, row) => <div><Typography.Text>{value}</Typography.Text><Typography.Text type="secondary" className="table-subtext">{row.items} món · {row.time}</Typography.Text></div> },
    { title: 'Trạng thái', dataIndex: 'status', key: 'status', render: (value) => <StatusTag status={value} /> },
    { title: 'Tổng tiền', dataIndex: 'total', key: 'total', align: 'right', render: (value) => <Typography.Text strong className="money">{value}</Typography.Text> },
    { title: '', key: 'actions', width: 48, render: () => <Button type="text" icon={<MoreOutlined />} aria-label="Thao tác" /> },
  ];
  return <Table className="orders-table" columns={columns} dataSource={compact ? orders.slice(0, 3) : orders} pagination={!compact ? { pageSize: 8, showSizeChanger: false } : false} scroll={{ x: 650 }} />;
}

function Dashboard({ onNavigate }: { onNavigate: (key: string) => void }) {
  const [range, setRange] = useState('7 ngày');
  return <>
    <PageIntro eyebrow="Overview" title="Chào buổi sáng, Clucky." description="Theo dõi vận hành và những gì đang diễn ra hôm nay." action={<Button type="primary" icon={<PlusOutlined />} onClick={() => message.success('Đã mở luồng tạo khuyến mãi.')}>Tạo khuyến mãi</Button>} />
    <Row gutter={[16, 16]} className="stats-row">
      <Col xs={24} sm={12} xl={6}><MetricCard title="Đơn hôm nay" value="128" suffix="đơn" trend="+12,5%" icon={<FileTextOutlined />} /></Col>
      <Col xs={24} sm={12} xl={6}><MetricCard title="Doanh thu" value="18,65" suffix="triệu" trend="+8,2%" icon={<RiseOutlined />} /></Col>
      <Col xs={24} sm={12} xl={6}><MetricCard title="Đang chuẩn bị" value="16" suffix="đơn" trend="Cần xử lý" icon={<CoffeeOutlined />} warning /></Col>
      <Col xs={24} sm={12} xl={6}><MetricCard title="Khách mới" value="42" suffix="người" trend="+18,4%" icon={<TeamOutlined />} /></Col>
    </Row>
    <Row gutter={[16, 16]} className="dashboard-grid">
      <Col xs={24} xl={16}><Card title="Đơn hàng gần đây" extra={<Button type="link" onClick={() => onNavigate('orders')}>Xem tất cả →</Button>}><OrdersTable compact /></Card></Col>
      <Col xs={24} xl={8}><Card title="Doanh thu theo ngày" extra={<Segmented size="small" options={['7 ngày', '30 ngày']} value={range} onChange={(value) => setRange(String(value))} />}><RevenueChart /></Card></Col>
    </Row>
    <Row gutter={[16, 16]}><Col xs={24} md={12}><Card title="Món bán chạy"><BestSeller name="Gà rán truyền thống" value="86 phần" percent={82} color="#8f1216" /><BestSeller name="Burger gà giòn" value="64 phần" percent={64} color="#c9a227" /><BestSeller name="Combo Clucky" value="51 phần" percent={51} color="#4f7770" /></Card></Col><Col xs={24} md={12}><Card title="Tình trạng cửa hàng"><StoreHealth name="Nguyễn Trãi" status="Đang hoạt động" orders="48 đơn hôm nay" /><StoreHealth name="Phan Văn Trị" status="Đang hoạt động" orders="41 đơn hôm nay" /><StoreHealth name="Lê Văn Việt" status="Cần chú ý" orders="39 đơn · 2 phản hồi" warning /></Card></Col></Row>
  </>;
}

function MetricCard({ title, value, suffix, trend, icon, warning = false }: { title: string; value: string; suffix: string; trend: string; icon: React.ReactNode; warning?: boolean }) {
  return <Card className="metric-card"><Flex justify="space-between" align="start"><Statistic title={title} value={value} suffix={<small>{suffix}</small>} /><span className={`metric-icon ${warning ? 'warning' : ''}`}>{icon}</span></Flex><Typography.Text className={`metric-trend ${warning ? 'warning-text' : ''}`}>{warning ? '● ' : '↗ '}{trend}</Typography.Text></Card>;
}
function RevenueChart() { return <div className="revenue-chart"><div className="chart-bars">{[54, 68, 44, 78, 62, 88, 74].map((height, index) => <div className="bar-group" key={index}><div className="chart-bar" style={{ height: `${height}%` }} /><span>{['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'][index]}</span></div>)}</div><Flex justify="space-between" className="chart-caption"><Typography.Text type="secondary">Tổng doanh thu</Typography.Text><Typography.Text strong>18,65 triệu</Typography.Text></Flex></div>; }
function BestSeller({ name, value, percent, color }: { name: string; value: string; percent: number; color: string }) { return <div className="progress-row"><Flex justify="space-between"><Typography.Text strong>{name}</Typography.Text><Typography.Text type="secondary">{value}</Typography.Text></Flex><Progress percent={percent} showInfo={false} strokeColor={color} trailColor="#f0e7dc" size="small" /></div>; }
function StoreHealth({ name, status, orders, warning = false }: { name: string; status: string; orders: string; warning?: boolean }) { return <div className="store-health"><span className={`health-dot ${warning ? 'warning' : ''}`} /><div><Typography.Text strong>{name}</Typography.Text><Typography.Text type="secondary">{orders}</Typography.Text></div><Tag color={warning ? 'gold' : 'green'}>{status}</Tag></div>; }
function PageIntro({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: React.ReactNode }) { return <div className="page-intro"><div><Typography.Text className="eyebrow">{eyebrow}</Typography.Text><Typography.Title>{title}</Typography.Title><Typography.Paragraph>{description}</Typography.Paragraph></div>{action}</div>; }

function SectionPage({ page }: { page: string }) {
  const config: Record<string, { eyebrow: string; title: string; description: string; icon: React.ReactNode }> = { orders: { eyebrow: 'Operations', title: 'Đơn hàng', description: 'Quản lý trạng thái và xử lý các đơn hàng trong hệ thống.', icon: <FileTextOutlined /> }, catalog: { eyebrow: 'Catalog', title: 'Thực đơn', description: 'Quản lý món ăn, combo và trạng thái hiển thị.', icon: <CoffeeOutlined /> }, stores: { eyebrow: 'Network', title: 'Chi nhánh', description: 'Theo dõi hiệu suất và tình trạng vận hành từng cửa hàng.', icon: <ShopOutlined /> }, customers: { eyebrow: 'Relationship', title: 'Khách hàng', description: 'Xem hồ sơ, lịch sử mua hàng và điểm thành viên.', icon: <TeamOutlined /> }, reports: { eyebrow: 'Insights', title: 'Báo cáo', description: 'Phân tích doanh thu và các chỉ số vận hành của Clucky.', icon: <BarChartOutlined /> } };
  const current = config[page] ?? config.orders;
  return <><PageIntro eyebrow={current.eyebrow} title={current.title} description={current.description} action={<Button type="primary" icon={<PlusOutlined />} onClick={() => message.success('Đã mở biểu mẫu tạo mới.')}>Tạo mới</Button>} />{page === 'orders' ? <Card><OrdersTable /></Card> : <Card className="placeholder-card"><Empty image={current.icon} description={<><Typography.Title level={4}>Khu vực {current.title.toLowerCase()}</Typography.Title><Typography.Text type="secondary">Khung giao diện đã sẵn sàng để nối dữ liệu backend.</Typography.Text></>}><Button type="primary" onClick={() => message.info('Tính năng đang được nối API.')}>Xem bản demo</Button></Empty></Card>}</>;
}

function App() {
  const [page, setPage] = useState('dashboard');
  const [collapsed, setCollapsed] = useState(false);
  const [messageApi, contextHolder] = message.useMessage();
  const pageLabels: Record<string, string> = { dashboard: 'Tổng quan', orders: 'Đơn hàng', catalog: 'Thực đơn', stores: 'Chi nhánh', customers: 'Khách hàng', reports: 'Báo cáo' };
  const pageTitle = pageLabels[page] ?? 'Tổng quan';
  const profileItems: MenuProps['items'] = [{ key: 'profile', icon: <UserOutlined />, label: 'Hồ sơ cá nhân' }, { type: 'divider' }, { key: 'logout', icon: <LogoutOutlined />, label: 'Đăng xuất' }];
  const navigate = (key: string) => setPage(key.startsWith('orders-') ? 'orders' : key);
  return <ConfigProvider locale={viVN} theme={{ token: { colorPrimary: '#8f1216', colorInfo: '#8f1216', colorSuccess: '#4f7770', borderRadius: 14, fontFamily: 'Quicksand, system-ui, sans-serif', colorBgLayout: '#f5ede0', colorBgContainer: '#fffaf3' }, components: { Menu: { darkItemBg: '#16100d', darkItemSelectedBg: '#8f1216', darkItemHoverBg: '#34211c' }, Button: { controlHeight: 42 } } }}><AntApp message={{ maxCount: 3 }}>{contextHolder}<Layout className="admin-layout"><Layout.Sider collapsible collapsed={collapsed} onCollapse={setCollapsed} width={252} className="admin-sider"><div className="sider-brand"><img src="/logo_primary.png" alt="Clucky" /><span>CLUCKY</span></div><div className="sider-section-label">WORKSPACE</div><Menu theme="dark" mode="inline" selectedKeys={[page]} items={navItems} onClick={({ key }) => navigate(key)} /></Layout.Sider><Layout><Layout.Header className="admin-header"><Button className="mobile-menu" type="text" icon={<DashboardOutlined />} onClick={() => setCollapsed(!collapsed)} /><Breadcrumb items={[{ title: 'Clucky' }, { title: pageTitle }]} /><Flex align="center" gap={20}><Badge dot color="#8f1216"><Button type="text" icon={<BellOutlined />} aria-label="Thông báo" /></Badge><Dropdown menu={{ items: profileItems, onClick: ({ key }) => key === 'logout' && messageApi.info('Tính năng đăng xuất sẽ nối cùng Auth Service.') }} trigger={['click']}><Button type="text" className="profile-button"><Avatar size={32} style={{ background: '#8f1216' }}>LT</Avatar><span className="profile-name">Lê Phú Thịnh</span></Button></Dropdown></Flex></Layout.Header><Layout.Content className="admin-content"><div className="content-inner">{page === 'dashboard' ? <Dashboard onNavigate={navigate} /> : <SectionPage page={page} />}</div></Layout.Content><Layout.Footer className="admin-footer">Clucky Operations · Internal workspace <span>v0.1.0</span></Layout.Footer></Layout></Layout></AntApp></ConfigProvider>;
}

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);
