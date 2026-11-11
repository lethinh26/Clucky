import { useEffect, useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  Button,
  Card,
  Col,
  Empty,
  Flex,
  Result,
  Row,
  Segmented,
  Select,
  Skeleton,
  Space,
  Statistic,
  Table,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import type { TableColumnsType } from 'antd';
import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  BarChartOutlined,
  ClockCircleOutlined,
  CoffeeOutlined,
  DollarOutlined,
  FileTextOutlined,
  InfoCircleOutlined,
  MoreOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { useOrders } from '../../context/OrderContext';
import { useAuth } from '../../context/AuthContext';
import { useLocaleTools } from '../../i18n/hooks';
import { getBrowserLocale, getErrorMessage } from '../../i18n/core';
import {
  reportsApi,
  storesApi,
  type DailyStoreStatsItem,
  type DashboardReportResponse,
  type RevenueReportResponse,
  type Store,
} from '../../lib/api';
import { getStoreStatusMeta, normalizeStoreStatus } from '../../types/store';

export type OrderSummary = {
  key: string;
  code: string;
  customer: string;
  items: number;
  status:
    | 'PREPARING'
    | 'COMPLETED'
    | 'SHIPPING'
    | 'PENDING'
    | 'READY'
    | 'PENDING_PAYMENT'
    | 'CONFIRMED'
    | 'CANCELLED';
  total: number;
  time: string;
  storeName?: string;
};

const statusTagStyleMap: Record<string, { color: string; bg: string; border: string }> = {
  PREPARING: { color: '#D97706', bg: '#FEF3C7', border: '#FDE68A' },
  PENDING: { color: '#B45309', bg: '#FFFBEB', border: '#FCD34D' },
  PENDING_PAYMENT: { color: '#B45309', bg: '#FFFBEB', border: '#FCD34D' },
  CONFIRMED: { color: '#B45309', bg: '#FFFBEB', border: '#FCD34D' },
  READY: { color: '#735A00', bg: '#FEF9C3', border: '#FDE047' },
  COMPLETED: { color: '#1E7A46', bg: '#D1FAE5', border: '#A7F3D0' },
  SHIPPING: { color: '#22577A', bg: '#E0F2FE', border: '#BAE6FD' },
  CANCELLED: { color: '#B42318', bg: '#FEE2E2', border: '#FECACA' },
};

export function StatusTag({ status }: { status: OrderSummary['status'] | string }) {
  const { t } = useTranslation();
  const labels: Record<string, string> = {
    PREPARING: t('business:orderprogress.preparing'),
    COMPLETED: t('business:orders.completed'),
    SHIPPING: t('business:orderprogress.delivering'),
    PENDING: t('business:dashboard.awaitingConfirmation'),
    CONFIRMED: t('business:orderprogress.confirm'),
    READY: t('business:orderprogress.ready'),
    PENDING_PAYMENT: t('business:checkout.awaitingPayment'),
    CANCELLED: t('business:orders.cancelled'),
  };
  const custom = statusTagStyleMap[status];
  if (custom) {
    return (
      <Tag
        variant="filled"
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

export function OrdersTable({
  compact = false,
  orders = [],
  loading = false,
  onViewOrder,
}: {
  compact?: boolean;
  orders?: OrderSummary[];
  loading?: boolean;
  onViewOrder?: () => void;
}) {
  const { money, date } = useLocaleTools();
  const { t } = useTranslation();

  const columns: TableColumnsType<OrderSummary> = [
    {
      title: t('business:dashboard.orderCode'),
      dataIndex: 'code',
      key: 'code',
      render: (value: string) => (
        <Typography.Text strong style={{ color: '#16100D', fontFamily: 'Fredoka, Quicksand, sans-serif' }}>
          {value}
        </Typography.Text>
      ),
    },
    {
      title: t('business:dashboard.customer'),
      dataIndex: 'customer',
      key: 'customer',
      render: (value: string, row: OrderSummary) => (
        <div>
          <Typography.Text strong style={{ color: '#16100D' }}>
            {value}
          </Typography.Text>
          <Typography.Text type="secondary" className="table-subtext">
            {row.items} {t('business:dashboard.items')} {date(row.time)}
            {row.storeName ? ` · ${row.storeName}` : ''}
          </Typography.Text>
        </div>
      ),
    },
    {
      title: t('business:catalog.status'),
      dataIndex: 'status',
      key: 'status',
      render: (value: string) => <StatusTag status={value} />,
    },
    {
      title: t('business:id.total'),
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
      render: () => (
        <Button
          type="text"
          icon={<MoreOutlined style={{ color: '#6B6259' }} />}
          aria-label={t('business:catalog.actions')}
          onClick={onViewOrder}
        />
      ),
    },
  ];

  return (
    <Table
      className="orders-table"
      columns={columns}
      dataSource={compact ? orders.slice(0, 5) : orders}
      loading={loading}
      locale={{ emptyText: t('business:dashboard.noRecentOrders') }}
      pagination={!compact ? { pageSize: 8, showSizeChanger: false } : false}
      scroll={{ x: 620 }}
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
        variant="filled"
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

function getVietnamTodayIso(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

function shiftIsoDate(isoDate: string, deltaDays: number): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  const utc = Date.UTC(y, m - 1, d + deltaDays);
  return new Date(utc).toISOString().slice(0, 10);
}

function formatShortDayMonth(isoDate: string): string {
  const parts = isoDate.split('-');
  if (parts.length !== 3) return isoDate;
  return `${parts[2]}/${parts[1]}`;
}

export interface DashboardProps {
  onNavigate?: (key: string) => void;
  storeFilter?: string;
  onStoreChange?: (storeId: string) => void;
}

type DashboardPeriodKey = '7d' | '30d' | 'month';

export default function Dashboard({
  onNavigate,
  storeFilter,
  onStoreChange,
}: DashboardProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { money, number, date } = useLocaleTools();
  const { orders: contextOrders, loading: ordersLoading } = useOrders();

  const isStaff = user.role === 'STAFF';
  const isManager = user.role === 'STORE_MANAGER';
  const managerStoreId = isManager && user.storeId && user.storeId > 0 ? user.storeId : null;
  const managerMissingStore = isManager && !managerStoreId;

  const [periodKey, setPeriodKey] = useState<DashboardPeriodKey>('7d');
  const [selectedStore, setSelectedStore] = useState<string>(() => {
    if (isManager && managerStoreId) return String(managerStoreId);
    return storeFilter && storeFilter !== 'all' ? storeFilter : 'all';
  });

  const [dashboard, setDashboard] = useState<DashboardReportResponse | null>(null);
  const [revenueReport, setRevenueReport] = useState<RevenueReportResponse | null>(null);
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [reloadNonce, setReloadNonce] = useState(0);

  useEffect(() => {
    if (isManager && managerStoreId) {
      setSelectedStore(String(managerStoreId));
    }
  }, [isManager, managerStoreId]);

  const effectiveStoreId = useMemo<number | undefined>(() => {
    if (isManager) return managerStoreId ?? undefined;
    if (selectedStore === 'all') return undefined;
    const parsed = Number(selectedStore);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
  }, [isManager, managerStoreId, selectedStore]);

  const { fromIso, toIso } = useMemo(() => {
    const today = getVietnamTodayIso();
    if (periodKey === '30d') {
      return { fromIso: shiftIsoDate(today, -29), toIso: today };
    }
    if (periodKey === 'month') {
      return { fromIso: `${today.slice(0, 8)}01`, toIso: today };
    }
    return { fromIso: shiftIsoDate(today, -6), toIso: today };
  }, [periodKey]);

  const go = useCallback(
    (target: string) => {
      if (onNavigate) {
        onNavigate(target);
        return;
      }
      navigate(`/admin/${target}`);
    },
    [navigate, onNavigate]
  );

  useEffect(() => {
    if (isStaff || managerMissingStore) {
      setDashboard(null);
      setRevenueReport(null);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setLoadError('');

    const reportParams = {
      storeId: effectiveStoreId,
      from: fromIso,
      to: toIso,
    };

    Promise.all([
      reportsApi.getDashboard(reportParams, controller.signal),
      reportsApi.getRevenue(reportParams, controller.signal),
      storesApi.list(undefined, controller.signal).catch(() => [] as Store[]),
    ])
      .then(([dashData, revData, storeList]) => {
        if (controller.signal.aborted) return;
        setDashboard(dashData);
        setRevenueReport(revData);
        if (Array.isArray(storeList)) {
          setStores(storeList);
        }
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setLoadError(getErrorMessage(error, getBrowserLocale()));
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [effectiveStoreId, fromIso, toIso, isStaff, managerMissingStore, reloadNonce]);

  const storeMap = useMemo(() => {
    const map = new Map<number, Store>();
    for (const store of stores) {
      map.set(store.id, store);
    }
    return map;
  }, [stores]);

  const scopedOrders = useMemo(() => {
    return contextOrders.filter((order) => {
      if (effectiveStoreId != null) {
        return Number(order.storeId) === effectiveStoreId;
      }
      return true;
    });
  }, [contextOrders, effectiveStoreId]);

  const recentOrdersData: OrderSummary[] = useMemo(() => {
    return scopedOrders.slice(0, 5).map((o) => ({
      key: o.id,
      code: '#' + o.orderCode,
      customer: o.customerName,
      items: o.items.reduce((sum, it) => sum + it.quantity, 0),
      status: o.status,
      total: o.total,
      time: o.time || o.createdAt,
      storeName: storeMap.get(Number(o.storeId))?.name ?? o.storeName,
    }));
  }, [scopedOrders, storeMap]);

  const activeKitchenCount = useMemo(
    () =>
      scopedOrders.filter(
        (order) =>
          order.status === 'CONFIRMED' ||
          order.status === 'PREPARING' ||
          order.status === 'READY'
      ).length,
    [scopedOrders]
  );

  const chartSeries = useMemo(() => {
    const items: DailyStoreStatsItem[] = revenueReport?.items ?? [];
    const byDate = new Map<string, { revenue: number; orders: number }>();
    for (const item of items) {
      const existing = byDate.get(item.statDate) ?? { revenue: 0, orders: 0 };
      byDate.set(item.statDate, {
        revenue: existing.revenue + Number(item.revenue || 0),
        orders: existing.orders + Number(item.orderCount || 0),
      });
    }
    const sortedDates = [...byDate.keys()].sort();
    const visibleDates = sortedDates.slice(-10);
    const maxRevenue = Math.max(1, ...visibleDates.map((d) => byDate.get(d)?.revenue ?? 0));
    return visibleDates.map((iso) => {
      const point = byDate.get(iso)!;
      const heightPct =
        point.revenue > 0 ? Math.max(10, Math.round((point.revenue / maxRevenue) * 100)) : 4;
      return {
        iso,
        label: formatShortDayMonth(iso),
        revenue: point.revenue,
        orders: point.orders,
        heightPct,
      };
    });
  }, [revenueReport]);

  const storeStatsByStore = useMemo(() => {
    const grouped = new Map<number, { orders: number; revenue: number }>();
    for (const item of revenueReport?.items ?? []) {
      const prev = grouped.get(item.storeId) ?? { orders: 0, revenue: 0 };
      grouped.set(item.storeId, {
        orders: prev.orders + Number(item.orderCount || 0),
        revenue: prev.revenue + Number(item.revenue || 0),
      });
    }
    return grouped;
  }, [revenueReport]);

  const visibleStores = useMemo(() => {
    const list = effectiveStoreId != null
      ? stores.filter((s) => s.id === effectiveStoreId)
      : stores;
    return list.slice(0, 6);
  }, [stores, effectiveStoreId]);

  const storeSelectOptions = useMemo<Array<{ value: string; label: string }>>(() => {
    if (isManager && managerStoreId) {
      const label =
        storeMap.get(managerStoreId)?.name ||
        user.storeName ||
        t('business:dashboard.scopeStoreLabel', { value1: managerStoreId });
      return [{ value: String(managerStoreId), label }];
    }
    const opts = [{ value: 'all', label: t('business:dashboard.scopeChain') }];
    for (const store of stores) {
      opts.push({ value: String(store.id), label: store.name });
    }
    return opts;
  }, [isManager, managerStoreId, storeMap, stores, t, user.storeName]);

  const handleStoreChange = (val: string) => {
    if (isManager) return;
    setSelectedStore(val);
    onStoreChange?.(val);
  };

  if (isStaff || managerMissingStore) {
    return (
      <Result
        status="403"
        title={t('errors:FORBIDDEN')}
        subTitle={
          isStaff
            ? t('business:dashboard.staffForbiddenTitle')
            : t('business:dashboard.noStoreAssignedError')
        }
        extra={
          <Button type="primary" onClick={() => go(isStaff ? 'orders' : 'stores')}>
            {isStaff ? t('admin:nav.orders') : t('business:dashboard.stores')}
          </Button>
        }
      />
    );
  }

  const periodTotalRevenue = Number(dashboard?.periodRevenue ?? 0);
  const periodCodAmount = Number(dashboard?.periodCodAmount ?? revenueReport?.totalCodAmount ?? 0);
  const periodReconciled = Number(
    dashboard?.periodReconciledTransferAmount ?? revenueReport?.totalReconciledTransferAmount ?? 0
  );
  const periodPending = Number(
    dashboard?.periodPendingReconciliationAmount ?? revenueReport?.totalPendingReconciliationAmount ?? 0
  );
  const periodExcess = Number(dashboard?.periodExcessAmount ?? revenueReport?.totalExcessAmount ?? 0);
  const periodExpired = Number(
    dashboard?.periodExpiredReceiptAmount ?? revenueReport?.totalExpiredReceiptAmount ?? 0
  );

  const lastUpdatedLabel = dashboard?.lastUpdatedAt
    ? t('business:dashboard.lastUpdatedAt', {
        value1: date(dashboard.lastUpdatedAt, {
          hour: '2-digit',
          minute: '2-digit',
        }),
      })
    : t('business:dashboard.notUpdatedYet');

  return (
    <div className="dashboard-page">
      <PageIntro
        eyebrow={t('business:dashboard.eyebrowOverview')}
        title={t('business:dashboard.goodMorningClucky')}
        description={t('business:dashboard.monitorOperationsBusinessPerformanceAndOrdersThatNeedAttentionToday')}
        action={
          <Flex gap={8} align="center" wrap="wrap">
            <Select
              value={selectedStore}
              onChange={handleStoreChange}
              disabled={isManager}
              aria-label={t('business:reports.store')}
              style={{ minWidth: 200 }}
              options={storeSelectOptions}
            />
            <Button
              icon={<ReloadOutlined />}
              onClick={() => setReloadNonce((n) => n + 1)}
              loading={loading}
            >
              {t('business:dashboard.refresh')}
            </Button>
            <Button
              type="primary"
              icon={<BarChartOutlined />}
              onClick={() => go('reports')}
            >
              {t('business:dashboard.openReports')}
            </Button>
          </Flex>
        }
      />

      {loadError && (
        <Alert
          type="error"
          showIcon
          style={{ marginBottom: 16, borderRadius: 14 }}
          message={loadError}
          action={
            <Button size="small" onClick={() => setReloadNonce((n) => n + 1)}>
              {t('common:retry')}
            </Button>
          }
        />
      )}

      {dashboard && !dashboard.projectionActive && (
        <Alert
          type="info"
          showIcon
          style={{
            marginBottom: 16,
            borderRadius: 14,
            background: '#FFFAF3',
            borderColor: '#E8E2D9',
          }}
          message={t('business:dashboard.projectionInactiveTitle')}
          description={t('business:dashboard.projectionInactiveDesc', {
            value1: dashboard.revenueEventPolicy ?? 'false',
          })}
        />
      )}

      {loading && !dashboard ? (
        <Card style={{ marginBottom: 16 }}>
          <Skeleton active paragraph={{ rows: 4 }} />
        </Card>
      ) : (
        <Row gutter={[16, 16]} className="stats-row">
          <Col xs={24} sm={12} xl={6}>
            <MetricCard
              title={t('business:dashboard.todaySOrders')}
              value={number(Number(dashboard?.todayOrderCount ?? 0))}
              suffix={t('business:dashboard.orders')}
              trend={t('business:dashboard.periodOrdersSummary', {
                value1: number(Number(dashboard?.periodOrderCount ?? 0)),
                value2: money(Number(dashboard?.todayCodAmount ?? 0)),
              })}
              icon={<FileTextOutlined />}
              trendUp
              tooltip={t('business:dashboard.totalOrdersPlacedTodayAtTheSelectedStore')}
            />
          </Col>
          <Col xs={24} sm={12} xl={6}>
            <MetricCard
              title={t('business:dashboard.todayRecognizedRevenue')}
              value={money(Number(dashboard?.todayRevenue ?? 0))}
              trend={t('business:dashboard.periodRecognizedSummary', {
                value1: money(periodTotalRevenue),
              })}
              icon={<DollarOutlined />}
              trendUp
              tooltip={t('business:dashboard.estimatedRevenueFromSuccessfulOrders')}
            />
          </Col>
          <Col xs={24} sm={12} xl={6}>
            <MetricCard
              title={t('business:dashboard.pendingReconciliationKpi')}
              value={money(periodPending)}
              trend={t('business:dashboard.pendingReconciliationSub', {
                value1: money(periodExcess),
                value2: money(periodExpired),
              })}
              icon={<ClockCircleOutlined />}
              warning={periodPending > 0 || periodExcess > 0 || periodExpired > 0}
              tooltip={t('business:dashboard.pendingReconciliationTooltip')}
            />
          </Col>
          <Col xs={24} sm={12} xl={6}>
            <MetricCard
              title={t('business:orderprogress.preparing')}
              value={number(activeKitchenCount)}
              suffix={t('business:dashboard.orders')}
              trend={t('business:dashboard.activeKitchenOrdersSub')}
              icon={<CoffeeOutlined />}
              warning={activeKitchenCount > 0}
              tooltip={t('business:dashboard.paidOrConfirmedOrdersBeingPrepared')}
            />
          </Col>
        </Row>
      )}

      <Row gutter={[16, 16]} className="dashboard-grid">
        <Col xs={24} xl={15}>
          <Card
            title={t('business:dashboard.recentOrders')}
            extra={
              <Button
                type="link"
                onClick={() => go('orders')}
                style={{ color: '#8F1216', fontWeight: 600 }}
              >
                {t('business:dashboard.viewAll')}
              </Button>
            }
          >
            <OrdersTable
              compact
              orders={recentOrdersData}
              loading={ordersLoading}
              onViewOrder={() => go('orders')}
            />
          </Card>
        </Col>
        <Col xs={24} xl={9}>
          <Card
            title={t('business:dashboard.revenueOverTime')}
            extra={
              <Segmented
                size="small"
                options={[
                  { value: '7d', label: t('business:dashboard.days') },
                  { value: '30d', label: t('business:dashboard.daysLabel') },
                  { value: 'month', label: t('business:dashboard.monthToDate') },
                ]}
                value={periodKey}
                onChange={(value) => setPeriodKey(value as DashboardPeriodKey)}
              />
            }
          >
            {chartSeries.length === 0 ? (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={t('business:dashboard.noChartData')}
                style={{ padding: '42px 0' }}
              />
            ) : (
              <div className="revenue-chart">
                <div className="chart-bars">
                  {chartSeries.map((item) => (
                    <Tooltip
                      key={item.iso}
                      title={`${date(item.iso)}: ${money(item.revenue)} (${t('business:reports.ordersUnit', { value1: number(item.orders) })})`}
                    >
                      <div
                        className="bar-group"
                        tabIndex={0}
                        aria-label={`${date(item.iso)}: ${money(item.revenue)}`}
                      >
                        <div className="chart-bar" style={{ height: `${item.heightPct}%` }} />
                        <span>{item.label}</span>
                      </div>
                    </Tooltip>
                  ))}
                </div>
                <Flex justify="space-between" className="chart-caption" align="center" wrap="wrap" gap={8}>
                  <Typography.Text type="secondary" style={{ color: '#6B6259', fontSize: 12 }}>
                    {lastUpdatedLabel}
                  </Typography.Text>
                  <Typography.Text
                    strong
                    style={{ color: '#8F1216', fontFamily: 'Fredoka, Quicksand, sans-serif', fontSize: 18 }}
                  >
                    {money(periodTotalRevenue)}
                  </Typography.Text>
                </Flex>
              </div>
            )}
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} md={12}>
          <Card
            title={t('business:dashboard.reconciliationLedgerTitle')}
            extra={
              <Button
                type="link"
                onClick={() => go('reports')}
                style={{ color: '#8F1216', fontWeight: 600 }}
              >
                {t('business:dashboard.reconciliationLedgerLink')}
              </Button>
            }
          >
            <Space orientation="vertical" size={12} style={{ width: '100%' }}>
              <Flex justify="space-between" align="center" style={{ paddingBottom: 8, borderBottom: '1px solid #E8E2D9' }}>
                <Typography.Text strong>{t('business:dashboard.cashCodLabel')}</Typography.Text>
                <Typography.Text strong className="money">
                  {money(periodCodAmount)}
                </Typography.Text>
              </Flex>

              <Flex justify="space-between" align="center" wrap="wrap" gap={8} style={{ paddingBottom: 8, borderBottom: '1px solid #E8E2D9' }}>
                <Space size={8}>
                  <Typography.Text strong>{t('business:dashboard.reconciledTransferLabel')}</Typography.Text>
                  <Tag color="green" variant="filled" style={{ borderRadius: 6, fontWeight: 600 }}>
                    {t('business:dashboard.reconciledBadge')}
                  </Tag>
                </Space>
                <Typography.Text strong style={{ color: '#1E7A46', fontFamily: 'Fredoka, Quicksand, sans-serif' }}>
                  {money(periodReconciled)}
                </Typography.Text>
              </Flex>

              <Flex justify="space-between" align="center" wrap="wrap" gap={8} style={{ paddingBottom: 8, borderBottom: '1px solid #E8E2D9' }}>
                <Space size={8}>
                  <Typography.Text strong>{t('business:dashboard.pendingReconciliationLabel')}</Typography.Text>
                  <Tag color="orange" variant="filled" style={{ borderRadius: 6, fontWeight: 600 }}>
                    {t('business:dashboard.pendingBadge')}
                  </Tag>
                </Space>
                <Typography.Text strong style={{ color: '#D97706', fontFamily: 'Fredoka, Quicksand, sans-serif' }}>
                  {money(periodPending)}
                </Typography.Text>
              </Flex>

              <Flex justify="space-between" align="center" wrap="wrap" gap={8} style={{ paddingBottom: 8, borderBottom: '1px solid #E8E2D9' }}>
                <Space size={8}>
                  <Typography.Text>{t('business:dashboard.excessAmountLabel')}</Typography.Text>
                  <Tag variant="filled" style={{ borderRadius: 6 }}>
                    {t('business:dashboard.excludedFromRevenueBadge')}
                  </Tag>
                </Space>
                <Typography.Text style={{ color: '#6B6259', fontWeight: 700 }}>
                  {money(periodExcess)}
                </Typography.Text>
              </Flex>

              <Flex justify="space-between" align="center" wrap="wrap" gap={8}>
                <Space size={8}>
                  <Typography.Text>{t('business:dashboard.expiredReceiptLabel')}</Typography.Text>
                  <Tag variant="filled" style={{ borderRadius: 6 }}>
                    {t('business:dashboard.excludedFromRevenueBadge')}
                  </Tag>
                </Space>
                <Typography.Text style={{ color: '#6B6259', fontWeight: 700 }}>
                  {money(periodExpired)}
                </Typography.Text>
              </Flex>
            </Space>
          </Card>
        </Col>

        <Col xs={24} md={12}>
          <Card
            title={t('business:dashboard.storeStatus')}
            extra={
              <Button
                type="link"
                onClick={() => go('stores')}
                style={{ color: '#8F1216', fontWeight: 600 }}
              >
                {t('business:dashboard.stores')}
              </Button>
            }
          >
            {visibleStores.length === 0 ? (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={t('business:dashboard.noStoreData')}
              />
            ) : (
              visibleStores.map((store) => {
                const normalized = normalizeStoreStatus(store.status);
                const meta = getStoreStatusMeta(store.status);
                const stats = storeStatsByStore.get(store.id);
                const statusLabel =
                  normalized === 'OPEN'
                    ? t('business:stores.open')
                    : normalized === 'CLOSED_TEMP'
                      ? t('business:stores.temporarilyClosed')
                      : t('business:stores.inactive');
                return (
                  <StoreHealth
                    key={store.id}
                    name={store.name}
                    status={statusLabel}
                    warning={!meta.isOpen}
                    orders={`${t('business:dashboard.periodOrdersCount', { value1: number(stats?.orders ?? 0) })} · ${money(stats?.revenue ?? 0)}`}
                  />
                );
              })
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
}
