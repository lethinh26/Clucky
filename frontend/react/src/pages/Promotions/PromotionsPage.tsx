import { message } from "../../components/feedback";
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Button, Space, Tag, Select, Popconfirm, Tabs, Badge, Typography, Tooltip, Progress } from "antd";
import { TableColumnsType } from "antd";
import dayjs from 'dayjs';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  ShopOutlined,
  GiftOutlined,
  CalendarOutlined,
  StopOutlined,
  CheckCircleOutlined,
  CopyOutlined,
  ReloadOutlined,
  PercentageOutlined,
  ThunderboltOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import { AdminTable } from '../../components/ui/AdminTable';
import { VoucherBadge } from '../../components/ui/VoucherBadge';
import { VoucherModal } from './components/VoucherModal';
import { VoucherDetailDrawer } from './components/VoucherDetailDrawer';
import { LoyaltySettings } from './components/LoyaltySettings';
import { useAuth } from '../../context/AuthContext';
import {
  promotionsApi,
  storesApi,
  getErrorMessage,
  type Store,
} from '../../lib/api';
import type { AdminVoucher, VoucherPayload, VoucherStatus } from '../../types/promotion';
import './promotions.css';

const { Text, Title } = Typography;

export const PromotionsPage: React.FC = () => {
  const { t } = useTranslation();
  const { user, isAdmin } = useAuth();

  const [activeTab, setActiveTab] = useState<string>('vouchers');
  const [vouchers, setVouchers] = useState<AdminVoucher[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [loadError, setLoadError] = useState('');
  const [actionLoading, setActionLoading] = useState<boolean>(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [scopeFilter, setScopeFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [storeFilter, setStoreFilter] = useState<number | 'ALL'>('ALL');

  // Modals & Drawers
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [editingVoucher, setEditingVoucher] = useState<AdminVoucher | null>(null);
  const [drawerOpen, setDrawerOpen] = useState<boolean>(false);
  const [selectedVoucher, setSelectedVoucher] = useState<AdminVoucher | null>(null);
  const voucherRequest = useRef(0);

  // Fetch stores list
  const fetchStores = useCallback(async () => {
    try {
      const data = await storesApi.list(false);
      setStores(data || []);
    } catch (error) {
      message.error(getErrorMessage(error));
    }
  }, []);

  const fetchVouchers = useCallback(async () => {
    const request = ++voucherRequest.current;
    try {
      setLoading(true);
      setLoadError('');
      const apiScope = scopeFilter === 'SCOPE_ALL' ? 'ALL' : scopeFilter === 'SCOPE_STORE' ? 'STORE' : undefined;
      const data = await promotionsApi.listVouchers({
        scope: apiScope,
        storeId: typeof storeFilter === 'number' ? storeFilter : undefined,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        keyword: searchTerm.trim() || undefined,
      });

      if (request === voucherRequest.current) setVouchers(data);
    } catch (error) {
      if (request !== voucherRequest.current) return;
      setLoadError(getErrorMessage(error));
      setVouchers([]);
    } finally {
      if (request === voucherRequest.current) setLoading(false);
    }
  }, [scopeFilter, storeFilter, statusFilter, searchTerm]);

  useEffect(() => {
    fetchStores();
    fetchVouchers();
    return () => { voucherRequest.current += 1; };
  }, [fetchStores, fetchVouchers]);

  // Quick KPI Statistics
  const kpiStats = useMemo(() => {
    const total = vouchers.length;
    const active = vouchers.filter((v) => (v.effectiveStatus || v.status) === 'ACTIVE').length;
    const upcoming = vouchers.filter((v) => (v.effectiveStatus || v.status) === 'UPCOMING').length;
    const inactive = vouchers.filter((v) => {
      const s = v.effectiveStatus || v.status;
      return s === 'EXPIRED' || s === 'EXHAUSTED' || s === 'DISABLED';
    }).length;
    return { total, active, upcoming, inactive };
  }, [vouchers]);

  // Role isolation & Client-side filtering
  const filteredVouchers = useMemo(() => {
    return vouchers.filter((v) => {
      // 1. Role-based isolation: Store Manager only sees ALL vouchers or vouchers of their store
      if (!isAdmin && user.storeId) {
        if (v.scope === 'STORE' && v.storeId !== null && Number(v.storeId) !== Number(user.storeId)) {
          return false;
        }
      }

      // 2. Scope filter
      if (scopeFilter === 'SCOPE_ALL' && v.scope !== 'ALL') return false;
      if (scopeFilter === 'SCOPE_STORE' && v.scope !== 'STORE') return false;

      // 3. Store filter (for admin)
      if (storeFilter !== 'ALL') {
        if (v.scope !== 'STORE' || Number(v.storeId) !== Number(storeFilter)) {
          return false;
        }
      }

      // 4. Status filter
      if (statusFilter !== 'ALL') {
        const effStatus = v.effectiveStatus || v.status;
        if (effStatus !== statusFilter) {
          return false;
        }
      }

      // 5. Keyword search
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const codeMatch = v.code.toLowerCase().includes(term);
        const titleMatch = v.title?.toLowerCase().includes(term) ?? false;
        const descMatch = v.description?.toLowerCase().includes(term) ?? false;
        if (!codeMatch && !titleMatch && !descMatch) {
          return false;
        }
      }

      return true;
    });
  }, [vouchers, isAdmin, user.storeId, scopeFilter, storeFilter, statusFilter, searchTerm]);

  const hasActiveFilters =
    searchTerm.trim() !== '' ||
    scopeFilter !== 'ALL' ||
    statusFilter !== 'ALL' ||
    storeFilter !== 'ALL';

  const handleResetFilters = () => {
    setSearchTerm('');
    setScopeFilter('ALL');
    setStatusFilter('ALL');
    setStoreFilter('ALL');
  };

  // Open create modal
  const handleOpenCreate = () => {
    setEditingVoucher(null);
    setModalOpen(true);
  };

  // Open edit modal
  const handleOpenEdit = (voucher: AdminVoucher) => {
    setEditingVoucher(voucher);
    setModalOpen(true);
  };

  // Open detail drawer
  const handleOpenDetail = (voucher: AdminVoucher) => {
    setSelectedVoucher(voucher);
    setDrawerOpen(true);
  };

  // Quick copy code
  const handleCopyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      message.success('Đã sao chép mã "' + code + '"');
    } catch {
      message.error(t('common:feedback.copyFailed'));
    }
  };

  // Submit create or update
  const handleSubmitVoucher = async (payload: VoucherPayload) => {
    if (actionLoading) return;
    setActionLoading(true);
    try {
      const saved = editingVoucher
        ? await promotionsApi.updateVoucher(editingVoucher.id, { ...payload, version: editingVoucher.version })
        : await promotionsApi.createVoucher(payload);
      setVouchers(previous => editingVoucher
        ? previous.map(voucher => voucher.id === saved.id ? saved : voucher)
        : [saved, ...previous]);
      if (selectedVoucher?.id === saved.id) setSelectedVoucher(saved);
      await fetchVouchers();
      setModalOpen(false);
      message.success(t('loyalty:saved'));
    } catch (error) {
      message.error(getErrorMessage(error));
      await fetchVouchers();
    } finally {
      setActionLoading(false);
    }
  };

  // Toggle active / disabled status
  const handleToggleStatus = async (voucher: AdminVoucher) => {
    if (actionLoading) return;
    setActionLoading(true);
    const newStatus: VoucherStatus = voucher.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE';
    try {
        const saved = await promotionsApi.updateVoucher(voucher.id, {
          version: voucher.version,
          code: voucher.code,
          title: voucher.title,
          description: voucher.description,
          type: voucher.type,
          value: voucher.value,
          minOrderAmount: voucher.minOrderAmount,
          maxDiscount: voucher.maxDiscount,
          totalLimit: voucher.totalLimit,
          startAt: voucher.startAt,
          endAt: voucher.endAt,
          scope: voucher.scope,
          storeId: voucher.storeId ? Number(voucher.storeId) : null,
          status: newStatus,
        });

      setVouchers((prev) =>
        prev.map((v) =>
          v.id === voucher.id
            ? saved
            : v
        )
      );

      if (selectedVoucher && selectedVoucher.id === voucher.id) {
        setSelectedVoucher((prev) =>
          prev ? saved : null
        );
      }

      message.success(
        newStatus === 'ACTIVE'
          ? 'Đã kích hoạt lại mã "' + voucher.code + '"'
          : 'Đã tạm vô hiệu hóa mã "' + voucher.code + '"'
      );
    } catch (err) {
      message.error(getErrorMessage(err));
      await fetchVouchers();
    } finally {
      setActionLoading(false);
    }
  };

  // Delete voucher
  const handleDeleteVoucher = async (voucher: AdminVoucher) => {
    if (actionLoading) return;
    setActionLoading(true);
    try {
      await promotionsApi.deleteVoucher(voucher.id);

      await fetchVouchers();
      setDrawerOpen(false);
      message.success(t('loyalty:saved'));
    } catch (err) {
      message.error(getErrorMessage(err));
    } finally {
      setActionLoading(false);
    }
  };

  // Harmonious, carefully balanced Table Columns
  const columns: TableColumnsType<AdminVoucher> = [
    {
      title: 'Mã Voucher',
      dataIndex: 'code',
      key: 'code',
      width: 200,
      render: (_, record) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <VoucherBadge
              code={record.code}
              type={record.type}
              value={record.value}
              status={record.effectiveStatus || record.status}
              size="medium"
            />
            <Tooltip title="Sao chép mã">
              <Button
                type="text"
                size="small"
                aria-label={'Sao chép mã ' + record.code}
                icon={<CopyOutlined style={{ color: '#8F1216', fontSize: 13 }} />}
                onClick={() => handleCopyCode(record.code)}
                style={{ width: 24, height: 24, padding: 0 }}
              />
            </Tooltip>
          </div>
          <Button
            type="link"
            size="small"
            style={{
              padding: 0,
              height: 'auto',
              fontSize: 11,
              color: '#8F1216',
              fontWeight: 600,
            }}
            onClick={() => handleOpenDetail(record)}
          >
            Xem chi tiết ↗
          </Button>
        </div>
      ),
    },
    {
      title: 'Chương trình & Thể lệ',
      key: 'title',
      width: 280,
      render: (_, record) => (
        <div style={{ maxWidth: 280 }}>
          <div
            style={{
              fontFamily: 'Baloo 2, sans-serif',
              fontWeight: 700,
              fontSize: 15,
              color: '#16100D',
              lineHeight: 1.3,
            }}
          >
            {record.title || record.code}
          </div>
          {record.description && (
            <div
              style={{
                color: '#6B6259',
                fontSize: 12,
                marginTop: 4,
                lineHeight: 1.45,
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
              title={record.description}
            >
              {record.description}
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Mức giảm giá',
      key: 'discount',
      width: 170,
      render: (_, record) => {
        const isPercent = record.type === 'PERCENT';
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <Tag
              bordered={false}
              style={{
                alignSelf: 'flex-start',
                padding: '3px 10px',
                borderRadius: 8,
                fontWeight: 800,
                fontSize: 13,
                fontFamily: 'Quicksand, sans-serif',
                backgroundColor: isPercent ? '#FFF1F2' : '#FEF3C7',
                color: isPercent ? '#E11D48' : '#B45309',
                border: `1px solid ${isPercent ? '#FECDD3' : '#FDE68A'}`,
              }}
            >
              {isPercent ? 'Giảm ' + record.value + '%' : 'Giảm ' + record.value.toLocaleString('vi-VN') + ' đ'}
            </Tag>
            <div style={{ fontSize: 11, color: '#6B6259', marginTop: 2, lineHeight: 1.3 }}>
              <span>Đơn tối thiểu: <b>{record.minOrderAmount ? record.minOrderAmount.toLocaleString('vi-VN') + ' đ' : '0 đ'}</b></span>
              {isPercent && record.maxDiscount ? (
                <div>Tối đa: <b>{record.maxDiscount.toLocaleString('vi-VN')} đ</b></div>
              ) : null}
            </div>
          </div>
        );
      },
    },
    {
      title: 'Phạm vi áp dụng',
      key: 'scope',
      width: 175,
      render: (_, record) => {
        if (record.scope === 'STORE') {
          return (
            <Tag
              icon={<ShopOutlined />}
              bordered={false}
              style={{
                borderRadius: 999,
                padding: '4px 10px',
                fontWeight: 700,
                fontSize: 12,
                backgroundColor: '#E0F2FE',
                color: '#0369A1',
                border: '1px solid #BAE6FD',
                maxWidth: 165,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
              title={record.storeName || 'Chi nhánh #' + record.storeId}
            >
              {record.storeName || 'Chi nhánh #' + record.storeId}
            </Tag>
          );
        }
        return (
          <Tag
            bordered={false}
            style={{
              borderRadius: 999,
              padding: '4px 10px',
              fontWeight: 700,
              fontSize: 12,
              backgroundColor: '#F3E8FF',
              color: '#6B21A8',
              border: '1px solid #E9D5FF',
            }}
          >
            🌐 Toàn hệ thống (ALL)
          </Tag>
        );
      },
    },
    {
      title: 'Thời gian hiệu lực',
      key: 'validity',
      width: 195,
      render: (_, record) => (
        <div style={{ fontSize: 12, color: '#16100D', lineHeight: 1.5 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <CalendarOutlined style={{ color: '#8F1216', fontSize: 12 }} />
            <span>Từ: <b>{dayjs(record.startAt).format('DD/MM/YYYY')}</b> {dayjs(record.startAt).format('HH:mm')}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#6B6259', marginTop: 2 }}>
            <ClockCircleOutlined style={{ fontSize: 12 }} />
            <span>Đến: <b>{dayjs(record.endAt).format('DD/MM/YYYY')}</b> {dayjs(record.endAt).format('HH:mm')}</span>
          </div>
        </div>
      ),
    },
    {
      title: 'Lượt sử dụng',
      key: 'usage',
      width: 145,
      render: (_, record) => {
        const percent = record.totalLimit
          ? Math.min(100, Math.round((record.usedCount / record.totalLimit) * 100))
          : null;
        return (
          <div style={{ width: '100%', maxWidth: 125 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
              <span style={{ fontWeight: 800, color: '#8F1216', fontFamily: 'Baloo 2, sans-serif', fontSize: 14 }}>
                {record.usedCount}
              </span>
              <span style={{ color: '#6B6259', fontWeight: 600 }}>
                / {record.totalLimit ? record.totalLimit : '∞'}
              </span>
            </div>
            <Text type="secondary" style={{ fontSize: 11 }}>{t("admin:ui.reserved")} {record.reservedCount ?? 0}</Text>
            {percent !== null ? (
              <Progress
                percent={percent}
                size={['100%', 5]}
                showInfo={false}
                strokeColor="#8F1216"
                trailColor="#E8E2D9"
              />
            ) : (
              <div style={{ fontSize: 11, color: '#6B6259', fontStyle: 'italic' }}>{t("admin:ui.unlimited")}</div>
            )}
          </div>
        );
      },
    },
    {
      title: t("accounts:status"),
      key: 'status',
      width: 135,
      render: (_, record) => {
        const current = record.effectiveStatus || record.status;
        let bg = '#F3F4F6';
        let color = '#4B5563';
        let dot = '#9CA3AF';
        let border = '#E5E7EB';
        let label = 'Đã tắt';

        switch (current) {
          case 'ACTIVE':
            bg = '#ECFDF5';
            color = '#065F46';
            dot = '#10B981';
            border = '#A7F3D0';
            label = 'Đang chạy';
            break;
          case 'UPCOMING':
            bg = '#EFF6FF';
            color = '#1E40AF';
            dot = '#3B82F6';
            border = '#BFDBFE';
            label = 'Sắp diễn ra';
            break;
          case 'EXPIRED':
            bg = '#F3F4F6';
            color = '#6B7280';
            dot = '#9CA3AF';
            border = '#E5E7EB';
            label = 'Đã hết hạn';
            break;
          case 'EXHAUSTED':
            bg = '#FEF2F2';
            color = '#991B1B';
            dot = '#EF4444';
            border = '#FECACA';
            label = 'Hết lượt';
            break;
          case 'DISABLED':
            bg = '#F5EDE0';
            color = '#78716C';
            dot = '#A8A29E';
            border = '#E7E5E4';
            label = 'Tạm tắt';
            break;
        }

        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '4px 10px',
              borderRadius: 999,
              backgroundColor: bg,
              color: color,
              border: `1px solid ${border}`,
              fontSize: 12,
              fontWeight: 700,
              fontFamily: 'Quicksand, sans-serif',
              whiteSpace: 'nowrap',
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                backgroundColor: dot,
              }}
            />
            {label}
          </span>
        );
      },
    },
    {
      title: t("accounts:action"),
      key: 'actions',
      width: 120,
      fixed: 'right',
      render: (_, record) => (
        <Space size={4}>
          <Tooltip title={t("business:orderspage.viewDetails")}>
            <Button
              type="text"
              size="small"
              className="voucher-action-btn"
              icon={<EyeOutlined style={{ color: '#0284C7', fontSize: 14 }} />}
              onClick={() => handleOpenDetail(record)}
              aria-label={t("business:orderspage.viewDetails")}
            />
          </Tooltip>
          <Tooltip title="Chỉnh sửa">
            <Button
              type="text"
              size="small"
              className="voucher-action-btn"
              icon={<EditOutlined style={{ color: '#8F1216', fontSize: 14 }} />}
              onClick={() => handleOpenEdit(record)}
              aria-label="Chỉnh sửa"
            />
          </Tooltip>
          <Popconfirm
            title="Xác nhận xóa voucher?"
            description={t("admin:ui.deleteVoucher") + record.code + t("admin:ui.vouchersAlreadyUsedOrReservedForOrdersWill")}
            okText={t("admin:ui.delete")}
            cancelText={t("business:account.cancel")}
            okButtonProps={{ danger: true }}
            onConfirm={() => handleDeleteVoucher(record)}
          >
            <Tooltip title={t("admin:ui.delete")}>
              <Button
                type="text"
                size="small"
                danger
                className="voucher-action-btn"
                icon={<DeleteOutlined style={{ fontSize: 14 }} />}
                aria-label="Xóa voucher"
                disabled={actionLoading}
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className="promotions-wrapper">
      {/* Header section */}
      <div className="promotions-header">
        <div>
          <span className="eyebrow">KHUYẾN MÃI & TIẾP THỊ</span>
          <Title level={2} className="title">
            Quản lý Khuyến mãi & Voucher
          </Title>
          <div className="subtitle">
            Quản trị mã giảm giá, kiểm soát phạm vi chi nhánh và giám sát các chương trình tiếp thị.
          </div>
        </div>

        {activeTab === 'vouchers' && (
          <Button
            type="primary"
            icon={<PlusOutlined />}
            style={{
              backgroundColor: '#8F1216',
              borderColor: '#8F1216',
              borderRadius: 999,
              fontWeight: 700,
              height: 42,
              padding: '0 24px',
              boxShadow: '0 4px 14px rgba(143, 18, 22, 0.2)',
            }}
            onClick={handleOpenCreate}
          >
            Tạo Voucher mới
          </Button>
        )}
      </div>

      {/* Main Tabs */}
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        type="card"
        className="promotions-tabs"
        items={[
          ...(isAdmin ? [{ key: 'loyalty', label: t('loyalty:title'), children: <LoyaltySettings /> }] : []),
          {
            key: 'vouchers',
            label: (
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <GiftOutlined />
                <span>Mã giảm giá (Vouchers)</span>
                <Badge
                  count={vouchers.length}
                  style={{
                    backgroundColor: activeTab === 'vouchers' ? '#FFFAF3' : '#8F1216',
                    color: activeTab === 'vouchers' ? '#8F1216' : '#FFFAF3',
                    fontWeight: 700,
                    boxShadow: 'none',
                  }}
                />
              </span>
            ),
            children: loadError ? <Alert type="error" showIcon title={loadError} action={<Button onClick={fetchVouchers}>{t('common:retry')}</Button>} /> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* Quick KPI Overview Cards */}
                <div className="promotions-kpi-grid">
                  <div
                    className={`promotions-kpi-card ${statusFilter === 'ALL' ? 'active' : ''}`}
                    onClick={() => setStatusFilter('ALL')}
                  >
                    <div>
                      <div className="kpi-label">Tổng số Voucher</div>
                      <div className="kpi-value">{kpiStats.total}</div>
                    </div>
                    <div className="kpi-icon" style={{ background: '#F7E5DF', color: '#8F1216' }}>
                      <GiftOutlined />
                    </div>
                  </div>

                  <div
                    className={`promotions-kpi-card ${statusFilter === 'ACTIVE' ? 'active' : ''}`}
                    onClick={() => setStatusFilter('ACTIVE')}
                  >
                    <div>
                      <div className="kpi-label">{t("admin:ui.active")}</div>
                      <div className="kpi-value" style={{ color: '#1E7A46' }}>{kpiStats.active}</div>
                    </div>
                    <div className="kpi-icon" style={{ background: '#ECFDF5', color: '#10B981' }}>
                      <ThunderboltOutlined />
                    </div>
                  </div>

                  <div
                    className={`promotions-kpi-card ${statusFilter === 'UPCOMING' ? 'active' : ''}`}
                    onClick={() => setStatusFilter('UPCOMING')}
                  >
                    <div>
                      <div className="kpi-label">Sắp diễn ra</div>
                      <div className="kpi-value" style={{ color: '#0369A1' }}>{kpiStats.upcoming}</div>
                    </div>
                    <div className="kpi-icon" style={{ background: '#E0F2FE', color: '#0284C7' }}>
                      <CalendarOutlined />
                    </div>
                  </div>

                  <div
                    className={`promotions-kpi-card ${statusFilter === 'EXPIRED' ? 'active' : ''}`}
                    onClick={() => setStatusFilter('EXPIRED')}
                  >
                    <div>
                      <div className="kpi-label">Hết hạn / Tắt</div>
                      <div className="kpi-value" style={{ color: '#6B6259' }}>{kpiStats.inactive}</div>
                    </div>
                    <div className="kpi-icon" style={{ background: '#F5EDE0', color: '#78716C' }}>
                      <StopOutlined />
                    </div>
                  </div>
                </div>

                {/* Table with balanced columns and horizontal scroll protection */}
                <div className="voucher-admin-table">
                  <AdminTable<AdminVoucher>
                    columns={columns}
                    dataSource={filteredVouchers}
                    rowKey="id"
                    loading={loading}
                    scroll={{ x: 1260 }}
                    searchPlaceholder="Tìm mã voucher, tên chương trình..."
                    searchValue={searchTerm}
                    onSearchChange={setSearchTerm}
                    filterNodes={
                      <Space wrap size={10}>
                        {/* Scope Filter */}
                        <Select
                          value={scopeFilter}
                          onChange={setScopeFilter}
                          style={{ width: 175 }}
                          options={[
                            { value: 'ALL', label: 'Tất cả phạm vi' },
                            { value: 'SCOPE_ALL', label: '🌐 Toàn hệ thống' },
                            { value: 'SCOPE_STORE', label: '🏪 Theo chi nhánh' },
                          ]}
                        />

                        {/* Store Filter (for Admin) */}
                        {isAdmin && (
                          <Select
                            value={storeFilter}
                            onChange={setStoreFilter}
                            style={{ width: 215 }}
                            options={[
                              { value: 'ALL', label: t("business:stores.allStores") },
                              ...stores.map((s) => ({
                                value: s.id,
                                label: `🏪 ${s.name}`,
                              })),
                            ]}
                          />
                        )}

                        {/* Status Filter */}
                        <Select
                          value={statusFilter}
                          onChange={setStatusFilter}
                          style={{ width: 170 }}
                          options={[
                            { value: 'ALL', label: t("business:paymentspage.allStatuses") },
                            { value: 'ACTIVE', label: '🟢 Đang chạy' },
                            { value: 'UPCOMING', label: '🔵 Sắp diễn ra' },
                            { value: 'EXPIRED', label: '⚪ Đã hết hạn' },
                            { value: 'EXHAUSTED', label: '🔴 Đã hết lượt' },
                            { value: 'DISABLED', label: '⚫ Đã tạm tắt' },
                          ]}
                        />

                        {/* Reset Filter Button */}
                        {hasActiveFilters && (
                          <Button
                            icon={<ReloadOutlined />}
                            onClick={handleResetFilters}
                            style={{ borderRadius: 999, fontSize: 13 }}
                          >
                            Đặt lại
                          </Button>
                        )}
                      </Space>
                    }
                  />
                </div>
              </div>
            ),
          },
        ]}
      />

      {/* Create / Edit Modal */}
      <VoucherModal
        open={modalOpen}
        editingVoucher={editingVoucher}
        stores={stores}
        loading={actionLoading}
        onCancel={() => setModalOpen(false)}
        onSubmit={handleSubmitVoucher}
      />

      {/* Voucher Detail Drawer */}
      <VoucherDetailDrawer
        open={drawerOpen}
        voucher={selectedVoucher}
        onClose={() => setDrawerOpen(false)}
        onEdit={(v) => {
          setDrawerOpen(false);
          handleOpenEdit(v);
        }}
        onToggleStatus={handleToggleStatus}
        onDelete={(v) => {
          handleDeleteVoucher(v);
        }}
      />
    </div>
  );
};

export default PromotionsPage;
