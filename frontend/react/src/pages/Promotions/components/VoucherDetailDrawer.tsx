import { useTranslation } from "react-i18next";
import React, { useEffect, useState } from 'react';
import {
  Drawer,
  Alert,
  Form,
  Input,
  Popconfirm,
  Descriptions,
  Tag,
  Progress,
  Space,
  Button,
  Typography,
  Divider,
} from 'antd';
import dayjs from 'dayjs';
import {
  EditOutlined,
  DeleteOutlined,
  StopOutlined,
  CheckCircleOutlined,
  ShopOutlined,
  GlobalOutlined,
  CalendarOutlined,
  PercentageOutlined,
} from '@ant-design/icons';
import { VoucherBadge } from '../../../components/ui/VoucherBadge';
import type { AdminVoucher } from '../../../types/promotion';
import { voucherState } from '../presentation';

const { Text, Title, Paragraph } = Typography;

export interface VoucherDetailDrawerProps {
  open: boolean;
  voucher: AdminVoucher | null;
  storeName?: string;
  isAdmin: boolean;
  loading: boolean;
  error: string;
  onApprove: (voucher: AdminVoucher) => Promise<void>;
  onReject: (voucher: AdminVoucher, reason: string) => Promise<void>;
  onClose: () => void;
  onEdit: (voucher: AdminVoucher) => void;
  onToggleStatus: (voucher: AdminVoucher) => void;
  onDelete: (voucher: AdminVoucher) => void;
}

export const VoucherDetailDrawer: React.FC<VoucherDetailDrawerProps> = ({
  open,
  voucher,
  storeName,
  isAdmin,
  loading,
  error,
  onApprove,
  onReject,
  onClose,
  onEdit,
  onToggleStatus,
  onDelete,
}) => {
  const { t } = useTranslation();
  const [rejecting, setRejecting] = useState(false);
  const [rejectForm] = Form.useForm<{ reason: string }>();
  useEffect(() => {
    setRejecting(false);
    rejectForm.resetFields();
  }, [open, voucher?.id, voucher?.status, rejectForm]);
  if (!voucher) return null;

  const usagePercent =
    voucher.totalLimit && voucher.totalLimit > 0
      ? Math.min(100, Math.round((voucher.usedCount / voucher.totalLimit) * 100))
      : null;

  const isPercent = voucher.type === 'PERCENT';
  const isActive = voucher.status === 'ACTIVE';
  const state = voucherState(voucher);
  const expiredProposal = dayjs(voucher.endAt).valueOf() <= Date.now();

  return (
    <Drawer
      title="Chi tiết mã ưu đãi (Voucher)"
      placement="right"
      width={typeof window !== 'undefined' && window.innerWidth < 560 ? '100%' : 520}
      open={open}
      onClose={onClose}
      closable={!loading}
      maskClosable={!loading}
      keyboard={!loading}
      styles={{
        header: { borderBottom: '1px solid #E8E2D9', padding: '16px 24px' },
        body: { padding: '24px', background: '#FFFFFF' },
      }}
    >
      <div style={{ marginBottom: 24, textAlign: 'center' }}>
        <div style={{ marginBottom: 12 }}>
          <VoucherBadge
            code={voucher.code}
            type={voucher.type}
            value={voucher.value}
            status={state.status}
          />
        </div>
        <Title level={4} style={{ margin: 0, fontFamily: 'Fredoka, Quicksand, sans-serif' }}>
          {voucher.title || voucher.code}
        </Title>
        {voucher.description && (
          <Paragraph type="secondary" style={{ marginTop: 8, fontSize: 13 }}>
            {voucher.description}
          </Paragraph>
        )}
      </div>

      <Divider style={{ margin: '16px 0' }} />

      <Descriptions column={1} bordered size="small" style={{ borderRadius: 12, overflow: 'hidden' }}>
        <Descriptions.Item label="Mã voucher">
          <Text strong copyable style={{ wordBreak: 'break-all' }}>{voucher.code}</Text>
        </Descriptions.Item>

        <Descriptions.Item label="Loại giảm giá">
          <Tag color={isPercent ? 'volcano' : 'gold'} style={{ fontWeight: 700 }}>
            {isPercent ? `${voucher.value}%` : voucher.value.toLocaleString('vi-VN') + ' đ'}
          </Tag>
        </Descriptions.Item>

        <Descriptions.Item label="Đơn hàng tối thiểu">
          <Text strong>
            {voucher.minOrderAmount && voucher.minOrderAmount > 0
              ? voucher.minOrderAmount.toLocaleString('vi-VN') + ' đ'
              : '0 đ (Không giới hạn)'}
          </Text>
        </Descriptions.Item>

        {isPercent && (
          <Descriptions.Item label="Giảm tối đa">
            <Text>
              {voucher.maxDiscount
                ? voucher.maxDiscount.toLocaleString('vi-VN') + ' đ'
                : t("admin:ui.unlimited")}
            </Text>
          </Descriptions.Item>
        )}

        <Descriptions.Item label="Phạm vi áp dụng">
          {voucher.scope === 'STORE' ? (
            <Tag icon={<ShopOutlined />} color="cyan" style={{ fontWeight: 600, whiteSpace: 'normal' }}>
              {storeName || t('admin:voucherUi.storeUnavailable')}
            </Tag>
          ) : (
            <Tag icon={<GlobalOutlined />} color="purple" style={{ fontWeight: 600 }}>
              Toàn hệ thống (ALL)
            </Tag>
          )}
        </Descriptions.Item>

        <Descriptions.Item label="Thời gian hiệu lực">
          <div className="voucher-validity-detail">
            <span>{t('admin:voucherUi.starts')} <b>{dayjs(voucher.startAt).format('DD/MM/YYYY HH:mm')}</b></span>
            <span>{t('admin:voucherUi.ends')} <b>{dayjs(voucher.endAt).format('DD/MM/YYYY HH:mm')}</b></span>
          </div>
        </Descriptions.Item>

        <Descriptions.Item label={t("accounts:status")}>
          <Tag color={state.color} style={{ fontWeight: 700 }}>
            {t(`admin:voucherUi.states.${state.status}`)}
          </Tag>
        </Descriptions.Item>
      </Descriptions>

      <section className="voucher-usage-detail" aria-label={t('admin:voucherUi.usage')}>
        <Title level={5}>{t('admin:voucherUi.usage')}</Title>
        <dl className="voucher-usage-grid">
          <div><dt>{t('admin:voucherUi.used')}</dt><dd>{voucher.usedCount.toLocaleString()}</dd></div>
          <div><dt>{t('admin:voucherUi.reserved')}</dt><dd>{(voucher.reservedCount ?? 0).toLocaleString()}</dd></div>
          <div><dt>{t('admin:voucherUi.limit')}</dt><dd>{voucher.totalLimit ? voucher.totalLimit.toLocaleString() : t('admin:ui.unlimited')}</dd></div>
        </dl>
        {usagePercent !== null && <Progress percent={usagePercent} size="small" strokeColor="#8F1216" />}
        <Text type="secondary">{t('admin:voucherUi.usageHint')}</Text>
      </section>
      {voucher.status === 'PENDING_APPROVAL' && expiredProposal && <Alert type="warning" showIcon title={t('admin:voucherUi.expiredProposal')} />}
      {voucher.status === 'REJECTED' && <section className="voucher-rejection" aria-label={t('admin:voucherUi.rejectionReason')}>
        <Title level={5}>{t('admin:voucherUi.rejectionReason')}</Title>
        <Paragraph className="voucher-review-reason">{voucher.rejectionReason || t('admin:voucherUi.reasonUnavailable')}</Paragraph>
        {voucher.rejectedAt && <Text type="secondary">{t('admin:voucherUi.rejectedAt')} {dayjs(voucher.rejectedAt).format('DD/MM/YYYY HH:mm')}</Text>}
      </section>}
      {error && <Alert type="error" showIcon title={error} style={{ marginTop: 16 }} />}
      <div style={{ marginTop: 32, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        {isAdmin && state.canApprove && !rejecting && <Popconfirm title={t('admin:voucherUi.confirmApprove', { code: voucher.code })}
          description={t('admin:voucherUi.approveHint')} onConfirm={() => onApprove(voucher)}
          okText={t('admin:voucherUi.approve')} cancelText={t('business:account.cancel')}
          disabled={loading || expiredProposal} okButtonProps={{ loading }}>
          <Button type="primary" icon={<CheckCircleOutlined />} loading={loading} disabled={expiredProposal}>{t('admin:voucherUi.approve')}</Button>
        </Popconfirm>}
        {isAdmin && state.canApprove && !rejecting && <Button danger icon={<StopOutlined />} disabled={loading}
          onClick={() => setRejecting(true)}>{t('admin:voucherUi.reject')}</Button>}
        {isAdmin && state.canToggle && <Button
          type="primary"
          disabled={loading}
          icon={<EditOutlined />}
          style={{ backgroundColor: '#8F1216', borderColor: '#8F1216', borderRadius: 999 }}
          onClick={() => {
            onClose();
            onEdit(voucher);
          }}
        >
          Chỉnh sửa Voucher
        </Button>}

        {isAdmin && state.canToggle && <Button
          loading={loading}
          icon={isActive ? <StopOutlined /> : <CheckCircleOutlined />}
          style={{ borderRadius: 999 }}
          onClick={() => onToggleStatus(voucher)}
        >
          {isActive ? 'Vô hiệu hóa' : 'Kích hoạt lại'}
        </Button>}

        {isAdmin && !state.isProposal && <Popconfirm title={t('admin:voucherUi.confirmDelete', { code: voucher.code })}
          description={t('admin:ui.vouchersAlreadyUsedOrReservedForOrdersWill')} onConfirm={() => onDelete(voucher)}
          okText={t('admin:ui.delete')} cancelText={t('business:account.cancel')} disabled={loading}>
        <Button
          danger
          disabled={loading}
          icon={<DeleteOutlined />}
          style={{ borderRadius: 999 }}
        >{t("admin:ui.delete")} </Button>
        </Popconfirm>}
      </div>
      {isAdmin && state.canApprove && rejecting && <Form className="voucher-rejection" form={rejectForm} layout="vertical"
        disabled={loading} onFinish={({ reason }) => onReject(voucher, reason.trim())}>
        <Form.Item name="reason" label={t('admin:voucherUi.rejectionReason')}
          rules={[{ required: true, whitespace: true, message: t('admin:voucherUi.reasonRequired') }, { max: 500, message: t('admin:voucherUi.reasonLength') }]}>
          <Input.TextArea autoFocus rows={4} maxLength={500} showCount placeholder={t('admin:voucherUi.reasonPlaceholder')} />
        </Form.Item>
        <Space wrap>
          <Button type="primary" danger htmlType="submit" loading={loading}>{t('admin:voucherUi.confirmReject')}</Button>
          <Button disabled={loading} onClick={() => setRejecting(false)}>{t('business:account.cancel')}</Button>
        </Space>
      </Form>}
    </Drawer>
  );
};

