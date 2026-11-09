import { message } from "../../../components/feedback";
import { useTranslation } from "react-i18next";
import React, { useState, useMemo } from 'react';
import { Alert, Tag, Button, Space, Modal, Typography, Select, Tooltip } from "antd";
import { TableColumnsType } from "antd";
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  ShopOutlined,
  InfoCircleOutlined,
  BulbOutlined,
  CopyOutlined,
  ReloadOutlined,
  UserOutlined,
  CalendarOutlined,
} from '@ant-design/icons';
import { AdminTable } from '../../../components/ui/AdminTable';
import { MOCK_PROPOSALS } from '../../../mocks/promotionData';
import type { VoucherProposal } from '../../../types/promotion';

const { Text, Title, Paragraph } = Typography;

export const ProposalBacklogSection: React.FC = () => {
  const { t } = useTranslation();
  const [proposals, setProposals] = useState<VoucherProposal[]>(MOCK_PROPOSALS);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [storeFilter, setStoreFilter] = useState<number | 'ALL'>('ALL');

  const [modalInfo, setModalInfo] = useState<{
    open: boolean;
    title: string;
    content: string;
  }>({
    open: false,
    title: '',
    content: '',
  });

  const handleAction = (proposal: VoucherProposal, action: 'APPROVE' | 'REJECT') => {
    setModalInfo({
      open: true,
      title: action === 'APPROVE' ? 'Minh họa duyệt đề xuất' : 'Minh họa từ chối đề xuất',
      content: 'Yêu cầu ' + (action === 'APPROVE' ? 'phê duyệt' : 'từ chối') + ' mã [' + proposal.code + '] của chi nhánh "' + proposal.storeName + '". Chức năng này thuộc lộ trình Phase 2 (Backlog BE-35/36), chưa tích hợp API duyệt thật. Giao diện ghi nhận trạng thái tạm thời trên bản demo.',
    });

    // Update local state for interactive demo experience
    setProposals((prev) =>
      prev.map((item) =>
        item.id === proposal.id
          ? { ...item, status: action === 'APPROVE' ? 'APPROVED' : 'REJECTED' }
          : item
      )
    );
  };

  const handleCopyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      message.success('Đã sao chép mã đề xuất "' + code + '"');
    } catch {
      message.error(t("common:feedback.copyFailed"));
    }
  };

  // Status counts for KPI cards
  const pendingCount = proposals.filter((p) => p.status === 'PENDING_APPROVAL').length;
  const approvedCount = proposals.filter((p) => p.status === 'APPROVED').length;
  const rejectedCount = proposals.filter((p) => p.status === 'REJECTED').length;

  // Extract unique stores for store filter dropdown
  const storeOptions = useMemo(() => {
    const map = new Map<number, string>();
    proposals.forEach((p) => {
      map.set(p.storeId, p.storeName);
    });
    return Array.from(map.entries()).map(([id, name]) => ({
      value: id,
      label: `🏪 ${name}`,
    }));
  }, [proposals]);

  // Filtered proposals
  const filteredProposals = useMemo(() => {
    return proposals.filter((p) => {
      // 1. Status filter
      if (statusFilter !== 'ALL' && p.status !== statusFilter) {
        return false;
      }

      // 2. Store filter
      if (storeFilter !== 'ALL' && p.storeId !== storeFilter) {
        return false;
      }

      // 3. Keyword search
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const codeMatch = p.code.toLowerCase().includes(term);
        const titleMatch = p.title.toLowerCase().includes(term);
        const storeMatch = p.storeName.toLowerCase().includes(term);
        const reasonMatch = p.proposalReason.toLowerCase().includes(term);
        const proposerMatch = p.proposedBy.toLowerCase().includes(term);
        if (!codeMatch && !titleMatch && !storeMatch && !reasonMatch && !proposerMatch) {
          return false;
        }
      }

      return true;
    });
  }, [proposals, statusFilter, storeFilter, searchTerm]);

  const hasActiveFilters =
    searchTerm.trim() !== '' || statusFilter !== 'ALL' || storeFilter !== 'ALL';

  const handleResetFilters = () => {
    setSearchTerm('');
    setStatusFilter('ALL');
    setStoreFilter('ALL');
  };

  const columns: TableColumnsType<VoucherProposal> = [
    {
      title: 'Mã đề xuất & Tên chương trình',
      key: 'code',
      width: 310,
      render: (_, record) => (
        <div style={{ maxWidth: 300 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <span
              style={{
                fontFamily: 'Quicksand, sans-serif',
                fontWeight: 800,
                fontSize: 14,
                color: '#8F1216',
                backgroundColor: '#F7E5DF',
                padding: '2px 8px',
                borderRadius: 6,
                letterSpacing: '0.04em',
              }}
            >
              {record.code}
            </span>
            <Tooltip title="Sao chép mã">
              <Button
                type="text"
                size="small"
                icon={<CopyOutlined style={{ color: '#8F1216', fontSize: 12 }} />}
                onClick={() => handleCopyCode(record.code)}
                style={{ width: 22, height: 22, padding: 0 }}
              />
            </Tooltip>
          </div>
          <div
            style={{
              fontFamily: 'Baloo 2, sans-serif',
              fontWeight: 700,
              fontSize: 15,
              color: '#16100D',
              lineHeight: 1.3,
            }}
          >
            {record.title}
          </div>
          <div
            style={{
              fontSize: 12,
              color: '#6B6259',
              marginTop: 4,
              lineHeight: 1.45,
              backgroundColor: '#FFFDF9',
              border: '1px dashed #E8E2D9',
              borderRadius: 8,
              padding: '4px 8px',
            }}
          >
            <span style={{ fontWeight: 600, color: '#C9A227' }}>💡 Lý do:</span>{' '}
            {record.proposalReason}
          </div>
        </div>
      ),
    },
    {
      title: 'Chi nhánh & Người gửi',
      key: 'store',
      width: 250,
      render: (_, record) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          <Tag
            icon={<ShopOutlined />}
            bordered={false}
            style={{
              alignSelf: 'flex-start',
              borderRadius: 999,
              padding: '3px 10px',
              fontWeight: 700,
              fontSize: 12,
              backgroundColor: '#E0F2FE',
              color: '#0369A1',
              border: '1px solid #BAE6FD',
            }}
          >
            {record.storeName}
          </Tag>
          <div style={{ fontSize: 12, color: '#16100D', display: 'flex', alignItems: 'center', gap: 6 }}>
            <UserOutlined style={{ color: '#6B6259', fontSize: 11 }} />
            <span style={{ fontWeight: 600 }}>{record.proposedBy}</span>
          </div>
          <div style={{ fontSize: 11, color: '#6B6259' }}>
            <CalendarOutlined style={{ marginRight: 4 }} />
            {record.proposedAt}
          </div>
        </div>
      ),
    },
    {
      title: 'Mức ưu đãi & Điều kiện',
      key: 'discount',
      width: 190,
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
            <div style={{ fontSize: 11, color: '#6B6259', lineHeight: 1.4 }}>
              <div>Đơn từ: <b>{record.minOrderAmount.toLocaleString('vi-VN')} đ</b></div>
              {record.totalLimit ? (
                <div>Số lượng: <b>{record.totalLimit} suất</b></div>
              ) : null}
            </div>
          </div>
        );
      },
    },
    {
      title: 'Trạng thái',
      key: 'status',
      width: 160,
      render: (_, record) => {
        if (record.status === 'PENDING_APPROVAL') {
          return (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '4px 10px',
                borderRadius: 999,
                backgroundColor: '#FEF3C7',
                color: '#92400E',
                border: '1px solid #FDE68A',
                fontSize: 12,
                fontWeight: 700,
                fontFamily: 'Quicksand, sans-serif',
              }}
            >
              <ClockCircleOutlined style={{ color: '#D97706' }} />
              Chờ Admin duyệt
            </span>
          );
        }
        if (record.status === 'APPROVED') {
          return (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '4px 10px',
                borderRadius: 999,
                backgroundColor: '#ECFDF5',
                color: '#065F46',
                border: '1px solid #A7F3D0',
                fontSize: 12,
                fontWeight: 700,
                fontFamily: 'Quicksand, sans-serif',
              }}
            >
              <CheckCircleOutlined style={{ color: '#10B981' }} />
              Đã phê duyệt
            </span>
          );
        }
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '4px 10px',
              borderRadius: 999,
              backgroundColor: '#FEF2F2',
              color: '#991B1B',
              border: '1px solid #FECACA',
              fontSize: 12,
              fontWeight: 700,
              fontFamily: 'Quicksand, sans-serif',
            }}
          >
            <CloseCircleOutlined style={{ color: '#EF4444' }} />
            Đã từ chối
          </span>
        );
      },
    },
    {
      title: 'Thao tác xem xét',
      key: 'actions',
      width: 175,
      fixed: 'right',
      render: (_, record) => (
        <Space size={8}>
          <Button
            size="small"
            type="primary"
            icon={<CheckCircleOutlined />}
            disabled={record.status !== 'PENDING_APPROVAL'}
            style={{
              backgroundColor: record.status === 'PENDING_APPROVAL' ? '#1E7A46' : undefined,
              borderColor: record.status === 'PENDING_APPROVAL' ? '#1E7A46' : undefined,
              borderRadius: 999,
              fontWeight: 700,
              fontSize: 12,
            }}
            onClick={() => handleAction(record, 'APPROVE')}
          >
            Duyệt
          </Button>
          <Button
            size="small"
            danger
            icon={<CloseCircleOutlined />}
            disabled={record.status !== 'PENDING_APPROVAL'}
            style={{
              borderRadius: 999,
              fontWeight: 700,
              fontSize: 12,
            }}
            onClick={() => handleAction(record, 'REJECT')}
          >
            Từ chối
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Explicit Backlog Status Alert */}
      <Alert
        message={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 800, fontSize: 15, color: '#92400E' }}>
              Quy trình Duyệt đề xuất Khuyến mãi Chi nhánh
            </span>
            <Tag color="orange" style={{ fontWeight: 700, borderRadius: 999, margin: 0 }}>
              BACKLOG / PHASE 2
            </Tag>
            <Tag color="default" style={{ borderRadius: 999, margin: 0 }}>
              Chưa tích hợp backend thật
            </Tag>
          </div>
        }
        description={
          <div style={{ marginTop: 6, fontSize: 13, lineHeight: 1.6, color: '#78350F' }}>
            Khu vực này minh họa nghiệp vụ cho phép Cửa hàng trưởng (Store Manager) gửi đề xuất voucher riêng cho chi nhánh của mình và Quản trị viên (HQ Admin) thẩm định phê duyệt.
            Theo quy hoạch kiến trúc (UI-28 / BE-35/36), tính năng này thuộc lộ trình mở rộng (Phase 2). Các thao tác bên dưới hoạt động dưới dạng mockup tương tác để kiểm thử trải nghiệm giao diện người dùng mà không gửi yêu cầu thực tế lên gateway.
          </div>
        }
        type="warning"
        showIcon
        icon={<BulbOutlined style={{ color: '#D97706', fontSize: 18 }} />}
        style={{
          borderRadius: 16,
          border: '1px solid #FDE68A',
          backgroundColor: '#FFFBEB',
          padding: '16px 20px',
        }}
      />

      {/* Interactive KPI Overview Cards - Styled matching Promotions tab */}
      <div className="promotions-kpi-grid">
        <div
          className={`promotions-kpi-card ${statusFilter === 'PENDING_APPROVAL' ? 'active' : ''}`}
          onClick={() => setStatusFilter(statusFilter === 'PENDING_APPROVAL' ? 'ALL' : 'PENDING_APPROVAL')}
        >
          <div>
            <div className="kpi-label">Chờ Admin duyệt</div>
            <div className="kpi-value" style={{ color: '#D97706' }}>{pendingCount}</div>
          </div>
          <div className="kpi-icon" style={{ background: '#FEF3C7', color: '#D97706' }}>
            <ClockCircleOutlined />
          </div>
        </div>

        <div
          className={`promotions-kpi-card ${statusFilter === 'APPROVED' ? 'active' : ''}`}
          onClick={() => setStatusFilter(statusFilter === 'APPROVED' ? 'ALL' : 'APPROVED')}
        >
          <div>
            <div className="kpi-label">Đã duyệt tháng này</div>
            <div className="kpi-value" style={{ color: '#1E7A46' }}>{approvedCount}</div>
          </div>
          <div className="kpi-icon" style={{ background: '#ECFDF5', color: '#10B981' }}>
            <CheckCircleOutlined />
          </div>
        </div>

        <div
          className={`promotions-kpi-card ${statusFilter === 'REJECTED' ? 'active' : ''}`}
          onClick={() => setStatusFilter(statusFilter === 'REJECTED' ? 'ALL' : 'REJECTED')}
        >
          <div>
            <div className="kpi-label">Đã từ chối</div>
            <div className="kpi-value" style={{ color: '#991B1B' }}>{rejectedCount}</div>
          </div>
          <div className="kpi-icon" style={{ background: '#FEF2F2', color: '#EF4444' }}>
            <CloseCircleOutlined />
          </div>
        </div>

        <div
          className={`promotions-kpi-card ${statusFilter === 'ALL' ? 'active' : ''}`}
          onClick={() => setStatusFilter('ALL')}
        >
          <div>
            <div className="kpi-label">Tổng số đề xuất</div>
            <div className="kpi-value">{proposals.length}</div>
          </div>
          <div className="kpi-icon" style={{ background: '#F7E5DF', color: '#8F1216' }}>
            <ShopOutlined />
          </div>
        </div>
      </div>

      {/* Proposals Table with Search Bar & Filter Nodes */}
      <div className="voucher-admin-table">
        <AdminTable<VoucherProposal>
          columns={columns}
          dataSource={filteredProposals}
          rowKey="id"
          scroll={{ x: 1100 }}
          searchPlaceholder="Tìm mã đề xuất, tên chương trình, chi nhánh..."
          searchValue={searchTerm}
          onSearchChange={setSearchTerm}
          filterNodes={
            <Space wrap size={10}>
              {/* Store Filter */}
              <Select
                value={storeFilter}
                onChange={setStoreFilter}
                style={{ width: 220 }}
                options={[
                  { value: 'ALL', label: 'Tất cả chi nhánh' },
                  ...storeOptions,
                ]}
              />

              {/* Status Filter */}
              <Select
                value={statusFilter}
                onChange={setStatusFilter}
                style={{ width: 180 }}
                options={[
                  { value: 'ALL', label: 'Tất cả trạng thái' },
                  { value: 'PENDING_APPROVAL', label: '⏳ Chờ Admin duyệt' },
                  { value: 'APPROVED', label: '🟢 Đã phê duyệt' },
                  { value: 'REJECTED', label: '🔴 Đã từ chối' },
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

      {/* Notice Modal */}
      <Modal
        open={modalInfo.open}
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <InfoCircleOutlined style={{ color: '#0284C7' }} />
            <span>{modalInfo.title}</span>
          </div>
        }
        onOk={() => setModalInfo({ open: false, title: '', content: '' })}
        onCancel={() => setModalInfo({ open: false, title: '', content: '' })}
        okText="Đã hiểu"
        cancelButtonProps={{ style: { display: 'none' } }}
        styles={{
          body: { background: '#FFFAF3', padding: '16px 0' },
        }}
      >
        <Paragraph style={{ fontSize: 14, color: '#16100D', lineHeight: 1.6 }}>
          {modalInfo.content}
        </Paragraph>
      </Modal>
    </div>
  );
};
