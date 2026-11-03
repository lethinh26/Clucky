import { useLocaleTools } from "../../i18n/hooks";
import { useTranslation } from "react-i18next";
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
  status: 'PREPARING' | 'COMPLETED' | 'SHIPPING' | 'PENDING';
  total: number;
  time: string;
  storeName?: string;
};

export const mockOrders: OrderSummary[] = [
  { key: '1', code: '#CLU-240826', customer: 'Nguyễn Minh Anh', items: 3, status: 'PREPARING', total: 257000, time: '10:42', storeName: 'Nguyễn Trãi' },
  { key: '2', code: '#CLU-240825', customer: 'Trần Gia Huy', items: 2, status: 'COMPLETED', total: 158000, time: '10:36', storeName: 'Phan Văn Trị' },
  { key: '3', code: '#CLU-240824', customer: 'Lê Hoàng Nam', items: 5, status: 'SHIPPING', total: 429000, time: '10:21', storeName: 'Nguyễn Trãi' },
  { key: '4', code: '#CLU-240823', customer: 'Phạm Thuỳ Linh', items: 1, status: 'PENDING', total: 89000, time: '10:05', storeName: 'Lê Văn Việt' },
];

/**
 * Status color mapping theo quy chuẩn Brand Guidelines:
 * - Hoàn thành (Thành công): #1E7A46
 * - Đang chuẩn bị / Chờ xác nhận (Cảnh báo): #D97706
 * - Đang giao (Thông tin): #22577A
 */
const statusTagStyleMap: Record<OrderSummary['status'], { color: string; bg: string; border: string }> = {
  'PREPARING': { color: '#D97706', bg: '#FEF3C7', border: '#FDE68A' },
  'PENDING': { color: '#B45309', bg: '#FFFBEB', border: '#FCD34D' },
  'COMPLETED': { color: '#1E7A46', bg: '#D1FAE5', border: '#A7F3D0' },
  'SHIPPING': { color: '#22577A', bg: '#E0F2FE', border: '#BAE6FD' },
};

export function StatusTag({ status }: { status: OrderSummary['status'] | string }) {
  const { t } = useTranslation();
  const labels: Record<string, string> = {
    PREPARING: t("business:orderprogress.preparing"),
    COMPLETED: t("business:orders.completed"),
    SHIPPING: t("business:orderprogress.delivering"),
    PENDING: t("business:dashboard.awaitingConfirmation"),
  };
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
        {labels[status] ?? status}
      </Tag>
    );
  }
  return <Tag>{labels[status] ?? status}</Tag>;
}

export function OrdersTable({ compact = false, orders = mockOrders }: { compact?: boolean; orders?: OrderSummary[] }) {
  const { money } = useLocaleTools();
  const { t } = useTranslation();

  const columns: TableColumnsType<OrderSummary> = [
    {
      title: t("business:dashboard.orderCode"),
      dataIndex: 'code',
      key: 'code',
      render: (value: string) => (
        <Typography.Text strong style={{ color: '#16100D', fontFamily: 'Baloo 2, sans-serif' }}>
          {value}
        </Typography.Text>
      ),
    },
    {
      title: t("business:dashboard.customer"),
      dataIndex: 'customer',
      key: 'customer',
      render: (value: string, row: OrderSummary) => (
        <div>
          <Typography.Text strong style={{ color: '#16100D' }}>
            {value}
          </Typography.Text>
          <Typography.Text type="secondary" className="table-subtext">
            {row.items} {t("business:dashboard.items")} {row.time} {row.storeName ? `· ${row.storeName}` : ''}
          </Typography.Text>
        </div>
      ),
    },
    {
      title: t("business:catalog.status"),
      dataIndex: 'status',
      key: 'status',
      render: (value: string) => <StatusTag status={value} />,
    },
    {
      title: t("business:id.total"),
      dataIndex: 'total',
      key: 'total',
      align: 'right',
      render: (value: number) => (
        <Typography.Text strong className="money" style={{ color: '#8F1216', fontSize: 15 }}>
          {money(value)}
        </Typography.Text>
      ),
    },
    {
      title: '',
      key: 'actions',
      width: 48,
      render: () => <Button type="text" icon={<MoreOutlined style={{ color: '#6B6259' }} />} aria-label={t("business:catalog.actions")} />,
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
  { day: 'T2', height: 54, amount: 12400000 },
  { day: 'T3', height: 68, amount: 15600000 },
  { day: 'T4', height: 44, amount: 10100000 },
  { day: 'T5', height: 78, amount: 18200000 },
  { day: 'T6', height: 62, amount: 14300000 },
  { day: 'T7', height: 88, amount: 22500000 },
  { day: 'CN', height: 74, amount: 18650000 },
];



export function RevenueChart({ range = '7d' }: { range?: string }) {
  const { money, date } = useLocaleTools();
  const { t } = useTranslation();

  const monthlyData = [
  { day: t("business:dashboard.week"), height: 65, amount: 92000000 },
  { day: t("business:dashboard.week2"), height: 82, amount: 118000000 },
  { day: t("business:dashboard.week3"), height: 74, amount: 105000000 },
  { day: t("business:dashboard.week4"), height: 90, amount: 128000000 },
];

  const chartPoints = range === '30d' ? monthlyData : weeklyData.map((item, index) => ({
    ...item,
    day: date(new Date(Date.UTC(2026, 9, 26 + index)), { weekday: "short", year: undefined, month: undefined, day: undefined }),
  }));
  const totalAmount = range === '30d' ? t("business:dashboard.million") : t("business:dashboard.value1865Million");

  return (
    <div className="revenue-chart">
      <div className="chart-bars">
        {chartPoints.map((item, index) => (
          <Tooltip key={index} title={`${item.day}: ${money(item.amount)}`}>
            <div className="bar-group">
              <div className="chart-bar" style={{ height: `${item.height}%` }} />
              <span>{item.day}</span>
            </div>
          </Tooltip>
        ))}
      </div>
      <Flex justify="space-between" className="chart-caption" align="center">
        <Typography.Text type="secondary" style={{ color: '#6B6259' }}>
          {range === '30d' ? t("business:dashboard.totalMonthlyRevenue") : t("business:dashboard.totalRevenueToday")}
        </Typography.Text>
        <Typography.Text strong style={{ color: '#8F1216', fontFamily: 'Baloo 2, sans-serif', fontSize: 18 }}>
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
  const { t } = useTranslation();

  const [range, setRange] = useState('7d');
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
        title={t("business:dashboard.goodMorningClucky")}
        description={t("business:dashboard.monitorOperationsBusinessPerformanceAndOrdersThatNeedAttentionToday")}
        action={
          <Flex gap={8} align="center">
            <Select
              value={selectedStore}
              onChange={handleStoreChange}
              style={{ width: 170 }}
              options={[
                { value: 'all', label: t("business:stores.allStores") },
                { value: 'store-1', label: 'Nguyễn Trãi' },
                { value: 'store-2', label: 'Phan Văn Trị' },
                { value: 'store-3', label: 'Lê Văn Việt' },
              ]}
            />
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => message.success(t("business:dashboard.promotionCreationOpened"))}
            > {t("business:dashboard.createPromotion")} </Button>
          </Flex>
        }
      />

      {/* Metric / Stat cards */}
      <Row gutter={[16, 16]} className="stats-row">
        <Col xs={24} sm={12} xl={6}>
          <MetricCard
            title={t("business:dashboard.todaySOrders")}
            value="128"
            suffix={t("business:dashboard.orders")}
            trend={t("business:dashboard.fromYesterday")}
            icon={<FileTextOutlined />}
            trendUp={true}
            tooltip={t("business:dashboard.totalOrdersPlacedTodayAtTheSelectedStore")}
          />
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <MetricCard
            title="Doanh thu"
            value="18,65"
            suffix={t("business:dashboard.million")}
            trend={t("business:dashboard.fromYesterdayLabel")}
            icon={<DollarOutlined />}
            trendUp={true}
            tooltip={t("business:dashboard.estimatedRevenueFromSuccessfulOrders")}
          />
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <MetricCard
            title={t("business:orderprogress.preparing")}
            value="16"
            suffix={t("business:dashboard.orders")}
            trend={t("business:dashboard.needsKitchenAttention")}
            icon={<CoffeeOutlined />}
            warning
            tooltip={t("business:dashboard.paidOrConfirmedOrdersBeingPrepared")}
          />
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <MetricCard
            title={t("business:dashboard.newCustomers")}
            value="42"
            suffix={t("business:party.people")}
            trend={t("business:dashboard.thisWeek")}
            icon={<TeamOutlined />}
            trendUp={true}
            tooltip={t("business:dashboard.newCustomerRegistrations")}
          />
        </Col>
      </Row>

      {/* Grid: Đơn hàng gần đây & Chart placeholder */}
      <Row gutter={[16, 16]} className="dashboard-grid">
        <Col xs={24} xl={16}>
          <Card
            title={t("business:dashboard.recentOrders")}
            extra={
              <Button type="link" onClick={() => onNavigate('orders')} style={{ color: '#8F1216', fontWeight: 600 }}> {t("business:dashboard.viewAll")} </Button>
            }
          >
            <OrdersTable compact />
          </Card>
        </Col>
        <Col xs={24} xl={8}>
          <Card
            title={t("business:dashboard.revenueOverTime")}
            extra={
              <Segmented
                size="small"
                options={[{value: '7d', label: t("business:dashboard.days")}, {value: '30d', label: t("business:dashboard.daysLabel")}]}
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
            title={t("business:dashboard.todaySBestSellers")}
            extra={
              <Button type="link" onClick={() => onNavigate('catalog')} style={{ color: '#8F1216', fontWeight: 600 }}> {t("business:dashboard.menu")} </Button>
            }
          >
            <BestSeller name="Gà rán sốt cay truyền thống" value={t("business:dashboard.servings")} percent={82} color="#8F1216" />
            <BestSeller name="Burger gà giòn cay Clucky" value={t("business:dashboard.value64Servings")} percent={64} color="#C9A227" />
            <BestSeller name="Combo Clucky Tiết kiệm (2 người)" value={t("business:dashboard.value51Servings")} percent={51} color="#22577A" />
            <BestSeller name="Khoai tây chiên lắc phô mai" value={t("business:dashboard.value38Servings")} percent={38} color="#D97706" />
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card
            title={t("business:dashboard.storeStatus")}
            extra={
              <Button type="link" onClick={() => onNavigate('stores')} style={{ color: '#8F1216', fontWeight: 600 }}> {t("business:dashboard.stores")} </Button>
            }
          >
            <StoreHealth name="Chi nhánh Nguyễn Trãi (Q.5)" status={t("business:catalog.active")} orders={t("business:dashboard.ordersToday")} />
            <StoreHealth name="Chi nhánh Phan Văn Trị (Gò Vấp)" status={t("business:catalog.active")} orders={t("business:dashboard.ordersTodayLabel")} />
            <StoreHealth
              name="Chi nhánh Lê Văn Việt (TP. Thủ Đức)"
              status={t("business:dashboard.needsAttention")}
              orders={t("business:dashboard.ordersLateResponses")}
              warning
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
}
