import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  Button,
  Card,
  Col,
  DatePicker,
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
  BarChartOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  DollarOutlined,
  FileExcelOutlined,
  FilePdfOutlined,
  InfoCircleOutlined,
  PieChartOutlined,
  ReloadOutlined,
  RiseOutlined,
  ShopOutlined,
  ShoppingOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';
import { message } from '../../components/feedback';
import { PageIntro } from '../Dashboard';
import { useAuth } from '../../context/AuthContext';
import { useLocaleTools } from '../../i18n/hooks';
import { getBrowserLocale, getErrorMessage } from '../../i18n/core';
import {
  reportsApi,
  storesApi,
  type DailyStoreStatsItem,
  type RevenueReportResponse,
  type Store,
} from '../../lib/api';

const { RangePicker } = DatePicker;
const { Text } = Typography;

const MAX_REPORT_DAYS = 366;

function getVietnamTodayDayjs(): Dayjs {
  const iso = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
  return dayjs(iso);
}

function triggerFileDownload(blob: Blob, filename: string) {
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = filename;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}

export const ReportsPage: React.FC = () => {
  const { t } = useTranslation();
  const { money, number, date } = useLocaleTools();
  const { user, isAdmin } = useAuth();

  const isStaff = user.role === 'STAFF';
  const isManager = user.role === 'STORE_MANAGER';
  const managerStoreId = isManager && user.storeId && user.storeId > 0 ? user.storeId : null;
  const managerMissingStore = isManager && !managerStoreId;

  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs]>(() => {
    const today = getVietnamTodayDayjs();
    return [today.startOf('month'), today];
  });

  const [selectedStore, setSelectedStore] = useState<number | 'ALL'>(() => {
    if (isManager && managerStoreId) return managerStoreId;
    return 'ALL';
  });

  const [chartView, setChartView] = useState<'revenue' | 'orders'>('revenue');
  const [report, setReport] = useState<RevenueReportResponse | null>(null);
  const [stores, setStores] = useState<Store[]>([]);
  const [storeError, setStoreError] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [exportingFormat, setExportingFormat] = useState<'xlsx' | 'pdf' | null>(null);
  const [reloadNonce, setReloadNonce] = useState(0);

  const exportAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      exportAbortRef.current?.abort();
      message.destroy('exportMsg');
    };
  }, []);

  useEffect(() => {
    if (isManager && managerStoreId) {
      setSelectedStore(managerStoreId);
    }
  }, [isManager, managerStoreId]);

  const effectiveStoreId = useMemo<number | undefined>(() => {
    if (isManager) return managerStoreId ?? undefined;
    return selectedStore === 'ALL' ? undefined : selectedStore;
  }, [isManager, managerStoreId, selectedStore]);

  const fromIso = dateRange[0].format('YYYY-MM-DD');
  const toIso = dateRange[1].format('YYYY-MM-DD');
  const rangeDaysCount = dateRange[1].diff(dateRange[0], 'day') + 1;
  const isRangeTooLarge = rangeDaysCount > MAX_REPORT_DAYS;

  useEffect(() => {
    exportAbortRef.current?.abort();
    setExportingFormat(null);
    message.destroy('exportMsg');
  }, [effectiveStoreId, fromIso, toIso, user.id, user.role]);

  useEffect(() => {
    if (isStaff || managerMissingStore) {
      setReport(null);
      setLoading(false);
      return;
    }

    if (isRangeTooLarge) {
      setLoadError(t('business:reports.maxRange366Days'));
      setReport(null);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setLoadError('');
    setReport(null);

    Promise.all([
      reportsApi.getRevenue(
        {
          storeId: effectiveStoreId,
          from: fromIso,
          to: toIso,
        },
        controller.signal
      ),
      storesApi.list(isAdmin ? false : undefined, controller.signal).then(result => {
        if (!controller.signal.aborted) setStoreError('');
        return result;
      }).catch(failure => {
        if (!controller.signal.aborted) setStoreError(getErrorMessage(failure, getBrowserLocale()));
        return [] as Store[];
      }),
    ])
      .then(([revData, storeList]) => {
        if (controller.signal.aborted) return;
        setReport(revData);
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
  }, [effectiveStoreId, fromIso, isRangeTooLarge, isStaff, managerMissingStore, reloadNonce, t, toIso, user.id, user.role]);

  const storeNameMap = useMemo(() => {
    const map = new Map<number, string>();
    for (const store of stores) {
      map.set(store.id, store.name);
    }
    return map;
  }, [stores]);

  const resolveStoreName = useCallback(
    (storeId: number) =>
      storeNameMap.get(storeId) ||
      (isManager && storeId === managerStoreId && user.storeName
        ? user.storeName
        : t('business:reports.storeFallback', { value1: storeId })),
    [isManager, managerStoreId, storeNameMap, t, user.storeName]
  );

  const storeOptions = useMemo<Array<{ value: number | 'ALL'; label: string }>>(() => {
    if (isManager && managerStoreId) {
      return [{ value: managerStoreId, label: resolveStoreName(managerStoreId) }];
    }
    const opts: Array<{ value: number | 'ALL'; label: string }> = [
      { value: 'ALL', label: t('business:stores.allStores') },
    ];
    for (const store of stores) {
      opts.push({ value: store.id, label: store.name });
    }
    return opts;
  }, [isManager, managerStoreId, resolveStoreName, stores, t]);

  const handleExport = async (format: 'xlsx' | 'pdf') => {
    if (isStaff || managerMissingStore || isRangeTooLarge || loading || !report || exportingFormat) {
      return;
    }

    exportAbortRef.current?.abort();
    const controller = new AbortController();
    exportAbortRef.current = controller;

    setExportingFormat(format);
    message.loading({
      content: t('business:reports.exportingReport', { value1: format.toUpperCase() }),
      key: 'exportMsg',
    });

    try {
      const result = await reportsApi.exportReport(
        {
          format,
          storeId: effectiveStoreId,
          from: fromIso,
          to: toIso,
        },
        controller.signal
      );
      if (controller.signal.aborted) return;
      triggerFileDownload(result.blob, result.filename);
      message.success({
        content: t('business:reports.reportExportedSuccessfully', { value1: result.filename }),
        key: 'exportMsg',
        duration: 3,
      });
    } catch (error: unknown) {
      if (controller.signal.aborted) return;
      message.error({
        content: getErrorMessage(error, getBrowserLocale()) || t('business:reports.exportFailed'),
        key: 'exportMsg',
        duration: 4,
      });
    } finally {
      if (exportAbortRef.current === controller) {
        exportAbortRef.current = null;
        setExportingFormat(null);
      }
    }
  };

  const items = report?.items ?? [];
  const totalRevenue = Number(report?.totalRevenue ?? 0);
  const totalOrders = Number(report?.totalOrderCount ?? 0);
  const totalCod = Number(report?.totalCodAmount ?? 0);
  const totalTransfer = Number(report?.totalTransferAmount ?? 0);
  const totalReconciled = Number(report?.totalReconciledTransferAmount ?? 0);
  const totalPending = Number(report?.totalPendingReconciliationAmount ?? 0);
  const totalExcess = Number(report?.totalExcessAmount ?? 0);
  const totalExpired = Number(report?.totalExpiredReceiptAmount ?? 0);
  const averageOrderValue = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;

  const dailySeries = useMemo(() => {
    const grouped = new Map<string, { revenue: number; orders: number }>();
    for (const item of items) {
      const prev = grouped.get(item.statDate) ?? { revenue: 0, orders: 0 };
      grouped.set(item.statDate, {
        revenue: prev.revenue + Number(item.revenue || 0),
        orders: prev.orders + Number(item.orderCount || 0),
      });
    }
    const dates = [...grouped.keys()].sort().slice(-14);
    const maxVal = Math.max(
      1,
      ...dates.map((d) => {
        const entry = grouped.get(d)!;
        return chartView === 'revenue' ? entry.revenue : entry.orders;
      })
    );
    return dates.map((iso) => {
      const entry = grouped.get(iso)!;
      const metricValue = chartView === 'revenue' ? entry.revenue : entry.orders;
      return {
        iso,
        shortDate: dayjs(iso).format('DD/MM'),
        revenue: entry.revenue,
        orders: entry.orders,
        heightPct: metricValue > 0 ? Math.max(8, Math.round((metricValue / maxVal) * 100)) : 4,
      };
    });
  }, [chartView, items]);

  const storeBreakdown = useMemo(() => {
    const grouped = new Map<
      number,
      {
        storeId: number;
        orderCount: number;
        revenue: number;
        pendingReconciliation: number;
        excessAmount: number;
      }
    >();
    for (const row of items) {
      const prev = grouped.get(row.storeId) ?? {
        storeId: row.storeId,
        orderCount: 0,
        revenue: 0,
        pendingReconciliation: 0,
        excessAmount: 0,
      };
      grouped.set(row.storeId, {
        storeId: row.storeId,
        orderCount: prev.orderCount + Number(row.orderCount || 0),
        revenue: prev.revenue + Number(row.revenue || 0),
        pendingReconciliation:
          prev.pendingReconciliation + Number(row.pendingReconciliationAmount || 0),
        excessAmount: prev.excessAmount + Number(row.excessAmount || 0),
      });
    }
    return [...grouped.values()]
      .sort((a, b) => b.revenue - a.revenue)
      .map((entry) => ({
        ...entry,
        storeName: resolveStoreName(entry.storeId),
        sharePct: totalRevenue > 0 ? Number(((entry.revenue / totalRevenue) * 100).toFixed(1)) : 0,
      }));
  }, [items, resolveStoreName, totalRevenue]);

  const columns: TableColumnsType<DailyStoreStatsItem> = [
    {
      title: t('business:reports.date'),
      dataIndex: 'statDate',
      key: 'statDate',
      width: 120,
      render: (val: string) => (
        <Space size={4}>
          <CalendarOutlined style={{ color: '#8F1216' }} />
          <Text strong>{dayjs(val).format('DD/MM/YYYY')}</Text>
        </Space>
      ),
    },
    {
      title: t('business:stores.store'),
      dataIndex: 'storeId',
      key: 'storeId',
      width: 190,
      render: (storeId: number) => (
        <Space size={4}>
          <ShopOutlined style={{ color: '#C9A227' }} />
          <span>{resolveStoreName(storeId)}</span>
        </Space>
      ),
    },
    {
      title: t('business:reports.orderCount'),
      dataIndex: 'orderCount',
      key: 'orderCount',
      width: 110,
      align: 'right',
      render: (val: number) => (
        <Text strong>{t('business:reports.ordersUnit', { value1: number(Number(val || 0)) })}</Text>
      ),
    },
    {
      title: t('business:reports.codAmount'),
      dataIndex: 'codAmount',
      key: 'codAmount',
      width: 135,
      align: 'right',
      render: (val: number) => <span>{money(Number(val || 0))}</span>,
    },
    {
      title: t('business:reports.transferRecognized'),
      dataIndex: 'transferAmount',
      key: 'transferAmount',
      width: 145,
      align: 'right',
      render: (val: number) => <span>{money(Number(val || 0))}</span>,
    },
    {
      title: t('business:reports.reconciledTransferShort'),
      dataIndex: 'reconciledTransferAmount',
      key: 'reconciledTransferAmount',
      width: 155,
      align: 'right',
      render: (val?: number) => {
        const amount = Number(val || 0);
        return (
          <Flex justify="end" align="center" gap={6}>
            <span style={{ color: '#1E7A46', fontWeight: 600 }}>{money(amount)}</span>
            {amount > 0 && (
              <Tag color="green" variant="filled" style={{ margin: 0, borderRadius: 6 }}>
                {t('business:reports.bankConfirmedTag')}
              </Tag>
            )}
          </Flex>
        );
      },
    },
    {
      title: t('business:reports.pendingReconciliationShort'),
      dataIndex: 'pendingReconciliationAmount',
      key: 'pendingReconciliationAmount',
      width: 170,
      align: 'right',
      render: (val?: number) => {
        const amount = Number(val || 0);
        return (
          <Flex justify="end" align="center" gap={6}>
            <span style={{ color: amount > 0 ? '#D97706' : '#6B6259', fontWeight: 600 }}>
              {money(amount)}
            </span>
            {amount > 0 && (
              <Tag color="orange" variant="filled" style={{ margin: 0, borderRadius: 6 }}>
                {t('business:reports.pendingReconcilTag')}
              </Tag>
            )}
          </Flex>
        );
      },
    },
    {
      title: t('business:reports.excessAmountShort'),
      dataIndex: 'excessAmount',
      key: 'excessAmount',
      width: 140,
      align: 'right',
      render: (val?: number) => (
        <Tooltip title={t('business:reports.excludedFromRevenueTag')}>
          <span style={{ color: '#6B6259' }}>{money(Number(val || 0))}</span>
        </Tooltip>
      ),
    },
    {
      title: t('business:reports.expiredReceiptShort'),
      dataIndex: 'expiredReceiptAmount',
      key: 'expiredReceiptAmount',
      width: 145,
      align: 'right',
      render: (val?: number) => (
        <Tooltip title={t('business:reports.excludedFromRevenueTag')}>
          <span style={{ color: '#6B6259' }}>{money(Number(val || 0))}</span>
        </Tooltip>
      ),
    },
    {
      title: t('business:reports.recognizedRevenue'),
      dataIndex: 'revenue',
      key: 'revenue',
      width: 155,
      align: 'right',
      render: (val: number) => (
        <Text strong style={{ color: '#8F1216', fontFamily: 'Baloo 2, sans-serif', fontSize: 15 }}>
          {money(Number(val || 0))}
        </Text>
      ),
    },
  ];

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
      />
    );
  }

  return (
    <div className="reports-page">
      <PageIntro
        eyebrow={t('business:reports.eyebrow')}
        title={t('business:reports.revenuePerformanceReports')}
        description={t('business:reports.subtitle')}
      />

      <Card
        style={{
          borderRadius: 20,
          background: '#FFFAF3',
          border: '1px solid #E8E2D9',
          marginBottom: 20,
        }}
      >
        <Row gutter={[16, 12]} justify="space-between" align="middle">
          <Col xs={24} lg={16}>
            <Flex wrap="wrap" gap={12} align="center">
              <Space>
                <Text strong style={{ color: '#16100D' }}>
                  {t('business:reports.period')}
                </Text>
                <RangePicker
                  value={dateRange}
                  onChange={(dates) => {
                    if (dates?.[0] && dates?.[1]) {
                      setDateRange([dates[0], dates[1]]);
                    }
                  }}
                  format="DD/MM/YYYY"
                  allowClear={false}
                  style={{
                    borderRadius: 10,
                    height: 40,
                    borderColor: '#E8E2D9',
                  }}
                />
              </Space>

              <Space>
                <Text strong style={{ color: '#16100D' }}>
                  {t('business:reports.store')}
                </Text>
                <Select<number | 'ALL'>
                  value={selectedStore}
                  onChange={(val) => setSelectedStore(val)}
                  disabled={isManager}
                  aria-label={t('business:reports.store')}
                  style={{ width: 220, height: 40 }}
                  options={storeOptions}
                />
              </Space>

              {!isAdmin && <Button
                icon={<ReloadOutlined />}
                onClick={() => setReloadNonce((n) => n + 1)}
                loading={loading}
              >
                {t('business:dashboard.refresh')}
              </Button>}
            </Flex>
          </Col>

          <Col xs={24} lg={8}>
            <Flex justify="end" gap={8} wrap="wrap">
              <Button
                icon={<FileExcelOutlined style={{ color: '#1E7A46' }} />}
                onClick={() => void handleExport('xlsx')}
                loading={exportingFormat === 'xlsx'}
                disabled={loading || !report || isRangeTooLarge || exportingFormat !== null}
                style={{
                  height: 40,
                  borderRadius: 10,
                  fontWeight: 600,
                  borderColor: '#1E7A46',
                  color: '#1E7A46',
                }}
              >
                {t('business:reports.exportExcelXlsx')}
              </Button>
              <Button
                icon={<FilePdfOutlined style={{ color: '#8F1216' }} />}
                onClick={() => void handleExport('pdf')}
                loading={exportingFormat === 'pdf'}
                disabled={loading || !report || isRangeTooLarge || exportingFormat !== null}
                style={{
                  height: 40,
                  borderRadius: 10,
                  fontWeight: 600,
                  borderColor: '#8F1216',
                  color: '#8F1216',
                }}
              >
                {t('business:reports.exportPdfPdf')}
              </Button>
            </Flex>
          </Col>
        </Row>
      </Card>

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

      <Alert
        type="info"
        showIcon
        icon={<InfoCircleOutlined style={{ color: '#22577A' }} />}
        style={{
          marginBottom: 16,
          borderRadius: 14,
          background: '#FFFAF3',
          borderColor: '#E8E2D9',
        }}
        message={t('business:reports.honestAccountingNotice')}
        description={
          report?.lastUpdatedAt
            ? t('business:dashboard.lastUpdatedAt', {
                value1: date(report.lastUpdatedAt, { hour: '2-digit', minute: '2-digit' }),
              })
            : t('business:dashboard.notUpdatedYet')
        }
      />

      {storeError && <Alert type="warning" showIcon message={t("admin:ui.unableToLoadTheBranchList")} description={storeError} style={{ marginBottom: 16 }} />}
      {report && (
        <Alert type="warning" showIcon style={{ marginBottom: 16 }}
          message={report.projectionActive ? t("admin:ui.reportsUpdateAsynchronouslyAndMayBeDelayed") : t("admin:ui.newRevenueRecognitionIsPausedOnlyStoredHistorical")}
          description={t("admin:ui.theseFiguresDoNotDeductRefundsReconcileActual")} />
      )}

      {loading ? (
        <Card style={{ marginBottom: 20 }}>
          <Skeleton active paragraph={{ rows: 5 }} />
        </Card>
      ) : !report ? (
        <Empty description={t("admin:ui.noReportDataForTheCurrentFilters")} />
      ) : (
        <>
          <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
            <Col xs={24} sm={12} xl={6}>
              <Card style={{ background: '#FFFAF3', border: '1px solid #E8E2D9', borderRadius: 16 }}>
                <Statistic
                  title={
                    <span style={{ color: '#6B6259', fontWeight: 600 }}>
                      {t('business:reports.recognizedRevenue')}
                    </span>
                  }
                  value={money(totalRevenue)}
                  prefix={<DollarOutlined style={{ color: '#8F1216' }} />}
                  styles={{ content: { color: '#8F1216', fontFamily: 'Baloo 2, sans-serif', fontWeight: 700 } }}
                />
                <div style={{ marginTop: 8, fontSize: 12, color: '#6B6259' }}>
                  {t('business:reports.recognizedRevenueHint')}
                </div>
              </Card>
            </Col>

            <Col xs={24} sm={12} xl={6}>
              <Card style={{ background: '#FFFAF3', border: '1px solid #E8E2D9', borderRadius: 16 }}>
                <Statistic
                  title={
                    <span style={{ color: '#6B6259', fontWeight: 600 }}>
                      {t('business:reports.totalOrders')}
                    </span>
                  }
                  value={number(totalOrders)}
                  suffix={t('business:dashboard.orders')}
                  prefix={<ShoppingOutlined style={{ color: '#C9A227' }} />}
                  styles={{ content: { color: '#16100D', fontFamily: 'Baloo 2, sans-serif', fontWeight: 700 } }}
                />
                <div style={{ marginTop: 8, fontSize: 12, color: '#6B6259' }}>
                  {t('business:reports.totalOrdersHint')}
                </div>
              </Card>
            </Col>

            <Col xs={24} sm={12} xl={6}>
              <Card style={{ background: '#FFFAF3', border: '1px solid #E8E2D9', borderRadius: 16 }}>
                <Statistic
                  title={
                    <span style={{ color: '#6B6259', fontWeight: 600 }}>
                      {t('business:reports.averageOrderValueAov')}
                    </span>
                  }
                  value={money(averageOrderValue)}
                  prefix={<RiseOutlined style={{ color: '#22577A' }} />}
                  styles={{ content: { color: '#22577A', fontFamily: 'Baloo 2, sans-serif', fontWeight: 700 } }}
                />
                <div style={{ marginTop: 8, fontSize: 12, color: '#6B6259' }}>
                  {t('business:reports.averagePerSuccessfulTransaction')}
                </div>
              </Card>
            </Col>

            <Col xs={24} sm={12} xl={6}>
              <Card style={{ background: '#FFFAF3', border: '1px solid #E8E2D9', borderRadius: 16 }}>
                <Statistic
                  title={
                    <span style={{ color: '#6B6259', fontWeight: 600 }}>
                      {t('business:reports.pendingAndNonRevenue')}
                    </span>
                  }
                  value={money(totalPending)}
                  prefix={<ClockCircleOutlined style={{ color: '#D97706' }} />}
                  styles={{ content: { color: '#D97706', fontFamily: 'Baloo 2, sans-serif', fontWeight: 700 } }}
                />
                <div style={{ marginTop: 8, fontSize: 12, color: '#6B6259' }}>
                  {t('business:reports.pendingAndNonRevenueHint', {
                    value1: money(totalExcess),
                    value2: money(totalExpired),
                  })}
                </div>
              </Card>
            </Col>
          </Row>

          {/* Payment & Reconciliation Split Summary */}
          <Card
            style={{
              borderRadius: 16,
              background: '#FFFAF3',
              border: '1px solid #E8E2D9',
              marginBottom: 20,
            }}
          >
            <Row gutter={[16, 12]}>
              <Col xs={12} md={4}>
                <Text type="secondary" style={{ fontSize: 12 }}>{t('business:reports.codAmount')}</Text>
                <div style={{ fontWeight: 700, color: '#16100D', fontSize: 15 }}>{money(totalCod)}</div>
              </Col>
              <Col xs={12} md={5}>
                <Text type="secondary" style={{ fontSize: 12 }}>{t('business:reports.transferRecognized')}</Text>
                <div style={{ fontWeight: 700, color: '#22577A', fontSize: 15 }}>{money(totalTransfer)}</div>
              </Col>
              <Col xs={12} md={5}>
                <Space size={4}>
                  <CheckCircleOutlined style={{ color: '#1E7A46', fontSize: 12 }} />
                  <Text type="secondary" style={{ fontSize: 12 }}>{t('business:reports.reconciledTransferShort')}</Text>
                </Space>
                <div style={{ fontWeight: 700, color: '#1E7A46', fontSize: 15 }}>{money(totalReconciled)}</div>
              </Col>
              <Col xs={12} md={5}>
                <Text type="secondary" style={{ fontSize: 12 }}>{t('business:reports.excessAmountShort')}</Text>
                <div style={{ fontWeight: 700, color: '#6B6259', fontSize: 15 }}>{money(totalExcess)}</div>
              </Col>
              <Col xs={12} md={5}>
                <Text type="secondary" style={{ fontSize: 12 }}>{t('business:reports.expiredReceiptShort')}</Text>
                <div style={{ fontWeight: 700, color: '#6B6259', fontSize: 15 }}>{money(totalExpired)}</div>
              </Col>
            </Row>
          </Card>

          <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
            <Col xs={24} xl={16}>
              <Card
                title={
                  <Space>
                    <BarChartOutlined style={{ color: '#8F1216' }} />
                    <span>{t('business:reports.dailyRevenueTrend')}</span>
                  </Space>
                }
                extra={
                  <Segmented
                    options={[
                      { value: 'revenue', label: t('business:reports.revenueVnd') },
                      { value: 'orders', label: t('business:reports.numberOfOrders') },
                    ]}
                    value={chartView}
                    onChange={(val) => setChartView(val as 'revenue' | 'orders')}
                    size="small"
                  />
                }
                style={{ borderRadius: 20, background: '#FFFAF3', border: '1px solid #E8E2D9' }}
              >
                {dailySeries.length === 0 ? (
                  <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description={t('business:reports.noRecords')}
                    style={{ padding: '48px 0' }}
                  />
                ) : (
                  <div className="revenue-chart" style={{ padding: '10px 0' }}>
                    <div
                      className="chart-bars"
                      style={{
                        height: 240,
                        display: 'flex',
                        alignItems: 'flex-end',
                        justifyContent: 'space-around',
                        padding: '20px 8px 0',
                        borderBottom: '1px solid #E8E2D9',
                        background:
                          'repeating-linear-gradient(to bottom, transparent 0, transparent 43px, #F5EDE0 44px)',
                      }}
                    >
                      {dailySeries.map((day) => {
                        const tooltipLabel =
                          chartView === 'revenue'
                            ? `${day.shortDate}: ${money(day.revenue)}`
                            : `${day.shortDate}: ${t('business:reports.ordersUnit', { value1: number(day.orders) })}`;
                        return (
                          <Tooltip key={day.iso} title={tooltipLabel}>
                            <div
                              tabIndex={0}
                              aria-label={tooltipLabel}
                              style={{
                                height: '100%',
                                display: 'flex',
                                flex: 1,
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'flex-end',
                                gap: 8,
                              }}
                            >
                              <div
                                style={{
                                  width: '100%',
                                  maxWidth: 34,
                                  height: `${day.heightPct}%`,
                                  borderRadius: '8px 8px 0 0',
                                  background: 'linear-gradient(180deg, #C9A227 0%, #8F1216 100%)',
                                  transition: 'height 0.3s ease',
                                }}
                              />
                              <Text style={{ fontSize: 12, color: '#6B6259' }}>{day.shortDate}</Text>
                            </div>
                          </Tooltip>
                        );
                      })}
                    </div>
                    <Flex justify="space-between" align="center" style={{ marginTop: 16 }}>
                      <Text type="secondary" style={{ color: '#6B6259', fontSize: 13 }}>{t("admin:ui.storedProjectionFiguresFollowTheDisplayedPolicyThey")} </Text>
                      <Text
                        strong
                        style={{ color: '#8F1216', fontFamily: 'Baloo 2, sans-serif', fontSize: 16 }}
                      >
                        {t('business:reports.total')} {money(totalRevenue)}
                      </Text>
                    </Flex>
                  </div>
                )}
              </Card>
            </Col>

            <Col xs={24} xl={8}>
              <Card
                title={
                  <Space>
                    <PieChartOutlined style={{ color: '#C9A227' }} />
                    <span>{t('business:reports.storePerformance')}</span>
                  </Space>
                }
                style={{
                  borderRadius: 20,
                  background: '#FFFAF3',
                  border: '1px solid #E8E2D9',
                  height: '100%',
                }}
              >
                {storeBreakdown.length === 0 ? (
                  <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description={t('business:reports.noStoreBreakdown')}
                  />
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 4 }}>
                    {storeBreakdown.map((st) => (
                      <div
                        key={st.storeId}
                        style={{
                          padding: '12px 14px',
                          borderRadius: 12,
                          background: '#F5EDE0',
                          border: '1px solid #E8E2D9',
                        }}
                      >
                        <Flex justify="space-between" align="center" gap={8}>
                          <Text strong style={{ color: '#16100D', fontSize: 14 }}>
                            {st.storeName}
                          </Text>
                          <Tag variant="filled" style={{ fontWeight: 600, borderRadius: 6, margin: 0 }}>
                            {t('business:reports.periodShare', { value1: st.sharePct })}
                          </Tag>
                        </Flex>

                        <Flex justify="space-between" align="baseline" style={{ marginTop: 6 }}>
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            {t('business:reports.ordersUnit', { value1: number(st.orderCount) })}
                          </Text>
                          <Text strong style={{ color: '#8F1216', fontFamily: 'Baloo 2, sans-serif' }}>
                            {money(st.revenue)}
                          </Text>
                        </Flex>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </Col>
          </Row>

          <Card
            title={
              <Flex justify="space-between" align="center" wrap="wrap" gap={8}>
                <span style={{ fontFamily: 'Baloo 2, sans-serif', fontSize: 18, color: '#16100D' }}>
                  {t('business:reports.dailyRevenueTransactionDetails')}
                </span>
                <Text type="secondary" style={{ fontSize: 13, fontWeight: 'normal' }}>
                  {t('business:reports.showing')} {items.length} {t('business:reports.records')}
                </Text>
              </Flex>
            }
            style={{
              borderRadius: 20,
              background: '#FFFAF3',
              border: '1px solid #E8E2D9',
            }}
          >
            <Table
              rowKey={(record) => `${record.id ?? 'row'}-${record.storeId}-${record.statDate}`}
              columns={columns}
              dataSource={items}
              loading={loading}
              locale={{ emptyText: t('business:reports.noRecords') }}
              pagination={{ pageSize: 10 }}
              scroll={{ x: 1320 }}
            />
          </Card>
        </>
      )}
    </div>
  );
};

export default ReportsPage;
