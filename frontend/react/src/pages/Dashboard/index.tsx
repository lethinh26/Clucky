import { useState } from 'react';
import {
  Button,
  Card,
  Col,
  Flex,
  Progress,
  Row,
  Segmented,
  Select,
  Space,
  Statistic,
  Table,
  Tag,
  Tooltip,
  Typography,
  message,
} from 'antd';
import type { TableColumnsType } from 'antd';
import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  CoffeeOutlined,
  DollarOutlined,
  FileTextOutlined,
  InfoCircleOutlined,
  MoreOutlined,
  PlusOutlined,
  TeamOutlined,
} from '@ant-design/icons';

export type OrderSummary = {
  key: string;
  code: string;
  customer: string;
  items: number;
  status: 'Đang chuẩn bị' | 'Hoàn thành' | 'Đang giao' | 'Chờ xác nhận';
  total: string;
  time: string;
  storeName?: string;
};

export const mockOrders: OrderSummary[] = [
  { key: '1', code: '#CLU-240826', customer: 'Nguyễn Minh Anh', items: 3, status: 'Đang chuẩn bị', total: '257.000đ', time: '10:42', storeName: 'Nguyễn Trãi' },
  { key: '2', code: '#CLU-240825', customer: 'Trần Gia Huy', items: 2, status: 'Hoàn thành', total: '158.000đ', time: '10:36', storeName: 'Phan Văn Trị' },
  { key: '3', code: '#CLU-240824', customer: 'Lê Hoàng Nam', items: 5, status: 'Đang giao', total: '429.000đ', time: '10:21', storeName: 'Nguyễn Trãi' },
  { key: '4', code: '#CLU-240823', customer: 'Phạm Thuỳ Linh', items: 1, status: 'Chờ xác nhận', total: '89.000đ', time: '10:05', storeName: 'Lê Văn Việt' },
];

/**
 * Status color mapping theo quy chuẩn Brand Guidelines:
 * - Hoàn thành (Thành công): #1E7A46
 * - Đang chuẩn bị / Chờ xác nhận (Cảnh báo): #D97706
 * - Đang giao (Thông tin): #22577A
 */
const statusTagStyleMap: Record<OrderSummary['status'], { color: string; bg: string; border: string }> = {
  'Đang chuẩn bị': { color: '#D97706', bg: '#FEF3C7', border: '#FDE68A' },
  'Chờ xác nhận': { color: '#B45309', bg: '#FFFBEB', border: '#FCD34D' },
  'Hoàn thành': { color: '#1E7A46', bg: '#D1FAE5', border: '#A7F3D0' },
  'Đang giao': { color: '#22577A', bg: '#E0F2FE', border: '#BAE6FD' },
};

export function StatusTag({ status }: { status: OrderSummary['status'] | string }) {
  const custom = statusTagStyleMap[status as OrderSummary['status']];
  if (custom) {
    return (
      <Tag
        bordered={false}
        style={{
          color: custom.color,
          backgroundColor: custom.bg,
          border: `1px solid ${custom.border}`,
          borderRadius: 8,
          fontWeight: 600,
          fontFamily: 'Quicksand, sans-serif',
          padding: '2px 8px',
        }}
      >
        {status}
      </Tag>
    );
  }
  return <Tag>{status}</Tag>;
}

export function OrdersTable({ compact = false, orders = mockOrders }: { compact?: boolean; orders?: OrderSummary[] }) {
  const columns: TableColumnsType<OrderSummary> = [
    {
      title: 'Mã đơn',
      dataIndex: 'code',
      key: 'code',
      render: (value: string) => (
        <Typography.Text strong style={{ color: '#16100D', fontFamily: 'Fredoka, sans-serif' }}>
          {value}
        </Typography.Text>
      ),
    },
    {
      title: 'Khách hàng',
      dataIndex: 'customer',
      key: 'customer',
      render: (value: string, row: OrderSummary) => (
        <div>
          <Typography.Text strong style={{ color: '#16100D' }}>
            {value}
          </Typography.Text>
          <Typography.Text type="secondary" className="table-subtext">
            {row.items} món · {row.time} {row.storeName ? `· ${row.storeName}` : ''}
          </Typography.Text>
        </div>
      ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      render: (value: string) => <StatusTag status={value} />,
    },
    {
      title: 'Tổng tiền',
      dataIndex: 'total',
      key: 'total',
      align: 'right',
      render: (value: string) => (
        <Typography.Text strong className="money" style={{ color: '#8F1216', fontSize: 15 }}>
          {value}
        </Typography.Text>
      ),
    },
    {
      title: '',
      key: 'actions',
      width: 48,
      render: () => <Button type="text" icon={<MoreOutlined style={{ color: '#6B6259' }} />} aria-label="Thao tác" />,
    },
  ];

  return (
    <Table
      className="orders-table"
      columns={columns}
      dataSource={compact ? orders.slice(0, 3) : orders}
      pagination={!compact ? { pageSize: 8, showSizeChanger: false } : false}
      scroll={{ x: 650 }}
    />
  );
}

export interface MetricCardProps {
  title: string;
  value: string;
  suffix?: string;
  trend: string;
  icon: React.ReactNode;
  warning?: boolean;
  trendUp?: boolean;
  tooltip?: string;
}

export function MetricCard({
  title,
  value,
  suffix,
  trend,
  icon,
  warning = false,
  trendUp = true,
  tooltip,
}: MetricCardProps) {
  return (
    <Card className="metric-card" hoverable>
      <Flex justify="space-between" align="start">
        <Statistic
          title={
            <Space size={4}>
              <span>{title}</span>
              {tooltip && (
                <Tooltip title={tooltip}>
                  <InfoCircleOutlined style={{ fontSize: 12, color: '#6B6259' }} />
                </Tooltip>
              )}
            </Space>
          }
          value={value}
          suffix={suffix ? <small style={{ fontSize: '0.65em', marginLeft: 4 }}>{suffix}</small> : undefined}
        />
        <span className={`metric-icon ${warning ? 'warning' : ''}`}>{icon}</span>
      </Flex>
      <Typography.Text className={`metric-trend ${warning ? 'warning-text' : ''}`}>
        {warning ? '● ' : trendUp ? <ArrowUpOutlined /> : <ArrowDownOutlined />} {trend}
      </Typography.Text>
    </Card>
  );
}

const weeklyData = [
  { day: 'T2', height: 54, amount: '12,4 tr' },
  { day: 'T3', height: 68, amount: '15,6 tr' },
  { day: 'T4', height: 44, amount: '10,1 tr' },
  { day: 'T5', height: 78, amount: '18,2 tr' },
  { day: 'T6', height: 62, amount: '14,3 tr' },
  { day: 'T7', height: 88, amount: '22,5 tr' },
  { day: 'CN', height: 74, amount: '18,65 tr' },
];

const monthlyData = [
  { day: 'Tuần 1', height: 65, amount: '92 tr' },
  { day: 'Tuần 2', height: 82, amount: '118 tr' },
  { day: 'Tuần 3', height: 74, amount: '105 tr' },
  { day: 'Tuần 4', height: 90, amount: '128 tr' },
];

export function RevenueChart({ range = '7 ngày' }: { range?: string }) {
  const chartPoints = range === '30 ngày' ? monthlyData : weeklyData;
  const totalAmount = range === '30 ngày' ? '443,0 triệu' : '18,65 triệu';

  return (
    <div className="revenue-chart">
      <div className="chart-bars">
        {chartPoints.map((item, index) => (
          <Tooltip key={index} title={`${item.day}: ${item.amount}`}>
            <div className="bar-group">
              <div className="chart-bar" style={{ height: `${item.height}%` }} />
              <span>{item.day}</span>
            </div>
          </Tooltip>
        ))}
      </div>
      <Flex justify="space-between" className="chart-caption" align="center">
        <Typography.Text type="secondary" style={{ color: '#6B6259' }}>
          {range === '30 ngày' ? 'Tổng doanh thu tháng' : 'Tổng doanh thu (hôm nay)'}
        </Typography.Text>
        <Typography.Text strong style={{ color: '#8F1216', fontFamily: 'Fredoka, sans-serif', fontSize: 18 }}>
          {totalAmount}
        </Typography.Text>
      </Flex>
    </div>
  );
}

export function BestSeller({
  name,
  value,
  percent,
  color,
}: {
  name: string;
  value: string;
  percent: number;
  color: string;
}) {
  return (
    <div className="progress-row">
      <Flex justify="space-between">
        <Typography.Text strong style={{ color: '#16100D' }}>
          {name}
        </Typography.Text>
        <Typography.Text type="secondary" style={{ color: '#6B6259' }}>
          {value}
        </Typography.Text>
      </Flex>
      <Progress percent={percent} showInfo={false} strokeColor={color} trailColor="#E8E2D9" size="small" />
    </div>
  );
}

export function StoreHealth({
  name,
  status,
  orders,
  warning = false,
}: {
  name: string;
  status: string;
  orders: string;
  warning?: boolean;
}) {
  return (
    <div className="store-health">
      <span className={`health-dot ${warning ? 'warning' : ''}`} />
      <div>
        <Typography.Text strong style={{ color: '#16100D' }}>
          {name}
        </Typography.Text>
        <Typography.Text type="secondary" style={{ color: '#6B6259' }}>
          {orders}
        </Typography.Text>
      </div>
      <Tag
        bordered={false}
        style={{
          borderRadius: 8,
          fontWeight: 600,
          fontFamily: 'Quicksand, sans-serif',
          color: warning ? '#D97706' : '#1E7A46',
          backgroundColor: warning ? '#FEF3C7' : '#D1FAE5',
          border: `1px solid ${warning ? '#FDE68A' : '#A7F3D0'}`,
        }}
      >
        {status}
      </Tag>
    </div>
  );
}

export function PageIntro({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="page-intro">
      <div>
        <Typography.Text className="eyebrow">{eyebrow}</Typography.Text>
        <Typography.Title level={2} style={{ marginTop: 4, marginBottom: 4 }}>
          {title}
        </Typography.Title>
        <Typography.Paragraph type="secondary" style={{ marginBottom: 0, color: '#6B6259' }}>
          {description}
        </Typography.Paragraph>
      </div>
      {action}
    </div>
  );
}

export interface DashboardProps {
  onNavigate?: (key: string) => void;
  storeFilter?: string;
  onStoreChange?: (storeId: string) => void;
}

export default function Dashboard({ onNavigate = () => {}, storeFilter = 'all', onStoreChange }: DashboardProps) {
  const [range, setRange] = useState('7 ngày');
  const [selectedStore, setSelectedStore] = useState(storeFilter);

  const handleStoreChange = (val: string) => {
    setSelectedStore(val);
    if (onStoreChange) {
      onStoreChange(val);
    }
  };

  return (
    <div className="dashboard-page">
      <PageIntro
        eyebrow="Overview"
        title="Chào buổi sáng, Clucky."
        description="Theo dõi vận hành, hiệu suất kinh doanh và các đơn hàng cần xử lý hôm nay."
        action={
          <Flex gap={8} align="center">
            <Select
              value={selectedStore}
              onChange={handleStoreChange}
              style={{ width: 170 }}
              options={[
                { value: 'all', label: 'Tất cả chi nhánh' },
                { value: 'store-1', label: 'Nguyễn Trãi' },
                { value: 'store-2', label: 'Phan Văn Trị' },
                { value: 'store-3', label: 'Lê Văn Việt' },
              ]}
            />
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => message.success('Đã mở luồng tạo khuyến mãi.')}
            >
              Tạo khuyến mãi
            </Button>
          </Flex>
        }
      />

      {/* Metric / Stat cards */}
      <Row gutter={[16, 16]} className="stats-row">
        <Col xs={24} sm={12} xl={6}>
          <MetricCard
            title="Đơn hôm nay"
            value="128"
            suffix="đơn"
            trend="+12,5% so với hôm qua"
            icon={<FileTextOutlined />}
            trendUp={true}
            tooltip="Tổng đơn hàng phát sinh trong ngày tại chi nhánh được chọn"
          />
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <MetricCard
            title="Doanh thu"
            value="18,65"
            suffix="triệu"
            trend="+8,2% so với hôm qua"
            icon={<DollarOutlined />}
            trendUp={true}
            tooltip="Doanh thu tạm tính từ các đơn đặt hàng thành công"
          />
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <MetricCard
            title="Đang chuẩn bị"
            value="16"
            suffix="đơn"
            trend="Cần bếp xử lý ngay"
            icon={<CoffeeOutlined />}
            warning
            tooltip="Số đơn hàng đã thanh toán/xác nhận đang được chuẩn bị"
          />
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <MetricCard
            title="Khách mới"
            value="42"
            suffix="người"
            trend="+18,4% tuần này"
            icon={<TeamOutlined />}
            trendUp={true}
            tooltip="Tài khoản khách hàng đăng ký mới"
          />
        </Col>
      </Row>

      {/* Grid: Đơn hàng gần đây & Chart placeholder */}
      <Row gutter={[16, 16]} className="dashboard-grid">
        <Col xs={24} xl={16}>
          <Card
            title="Đơn hàng gần đây"
            extra={
              <Button type="link" onClick={() => onNavigate('orders')} style={{ color: '#8F1216', fontWeight: 600 }}>
                Xem tất cả →
              </Button>
            }
          >
            <OrdersTable compact />
          </Card>
        </Col>
        <Col xs={24} xl={8}>
          <Card
            title="Doanh thu theo thời gian"
            extra={
              <Segmented
                size="small"
                options={['7 ngày', '30 ngày']}
                value={range}
                onChange={(value) => setRange(String(value))}
              />
            }
          >
            <RevenueChart range={range} />
          </Card>
        </Col>
      </Row>

      {/* Món bán chạy & Tình trạng chi nhánh */}
      <Row gutter={[16, 16]}>
        <Col xs={24} md={12}>
          <Card
            title="Món bán chạy hôm nay"
            extra={
              <Button type="link" onClick={() => onNavigate('catalog')} style={{ color: '#8F1216', fontWeight: 600 }}>
                Thực đơn →
              </Button>
            }
          >
            <BestSeller name="Gà rán sốt cay truyền thống" value="86 phần" percent={82} color="#8F1216" />
            <BestSeller name="Burger gà giòn cay Clucky" value="64 phần" percent={64} color="#C9A227" />
            <BestSeller name="Combo Clucky Tiết kiệm (2 người)" value="51 phần" percent={51} color="#22577A" />
            <BestSeller name="Khoai tây chiên lắc phô mai" value="38 phần" percent={38} color="#D97706" />
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card
            title="Tình trạng chi nhánh"
            extra={
              <Button type="link" onClick={() => onNavigate('stores')} style={{ color: '#8F1216', fontWeight: 600 }}>
                Chi nhánh →
              </Button>
            }
          >
            <StoreHealth name="Chi nhánh Nguyễn Trãi (Q.5)" status="Đang hoạt động" orders="48 đơn hôm nay" />
            <StoreHealth name="Chi nhánh Phan Văn Trị (Gò Vấp)" status="Đang hoạt động" orders="41 đơn hôm nay" />
            <StoreHealth
              name="Chi nhánh Lê Văn Việt (TP. Thủ Đức)"
              status="Cần chú ý"
              orders="39 đơn · 2 phản hồi trễ"
              warning
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
}
