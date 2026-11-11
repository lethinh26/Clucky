import React from 'react';
import {
  Drawer,
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
  CalendarOutlined,
  PercentageOutlined,
} from '@ant-design/icons';
import { VoucherBadge } from '../../../components/ui/VoucherBadge';
import type { AdminVoucher } from '../../../types/promotion';

const { Text, Title, Paragraph } = Typography;

export interface VoucherDetailDrawerProps {
  open: boolean;
  voucher: AdminVoucher | null;
  onClose: () => void;
  onEdit: (voucher: AdminVoucher) => void;
  onToggleStatus: (voucher: AdminVoucher) => void;
  onDelete: (voucher: AdminVoucher) => void;
}

export const VoucherDetailDrawer: React.FC<VoucherDetailDrawerProps> = ({
  open,
  voucher,
  onClose,
  onEdit,
  onToggleStatus,
  onDelete,
}) => {
  if (!voucher) return null;

  const usagePercent =
    voucher.totalLimit && voucher.totalLimit > 0
      ? Math.min(100, Math.round((voucher.usedCount / voucher.totalLimit) * 100))
      : null;

  const isPercent = voucher.type === 'PERCENT';
  const isActive = voucher.status === 'ACTIVE';

  return (
    <Drawer
      title="Chi tiết mã ưu đãi (Voucher)"
      placement="right"
      width={typeof window !== 'undefined' && window.innerWidth < 560 ? '100%' : 520}
      open={open}
      onClose={onClose}
      styles={{
        header: { borderBottom: '1px solid #E8E2D9', padding: '16px 24px' },
        body: { padding: '24px' },
      }}
    >
      <div style={{ marginBottom: 24, textAlign: 'center' }}>
        <div style={{ marginBottom: 12 }}>
          <VoucherBadge
            code={voucher.code}
            type={voucher.type}
            value={voucher.value}
            status={voucher.status}
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
                : 'Không giới hạn'}
            </Text>
          </Descriptions.Item>
        )}

        <Descriptions.Item label="Phạm vi áp dụng">
          {voucher.scope === 'STORE' ? (
            <Tag icon={<ShopOutlined />} color="cyan" style={{ fontWeight: 600 }}>
              {voucher.storeName ? voucher.storeName : 'Chi nhánh #' + voucher.storeId}
            </Tag>
          ) : (
            <Tag color="purple" style={{ fontWeight: 600 }}>
              Toàn hệ thống (ALL)
            </Tag>
          )}
        </Descriptions.Item>

        <Descriptions.Item label="Thời gian hiệu lực">
          <div>
            <CalendarOutlined style={{ marginRight: 6, color: '#8F1216' }} />
            <span>{dayjs(voucher.startAt).format('DD/MM/YYYY HH:mm')}</span>
            <span style={{ margin: '0 6px' }}>→</span>
            <span>{dayjs(voucher.endAt).format('DD/MM/YYYY HH:mm')}</span>
          </div>
        </Descriptions.Item>

        <Descriptions.Item label="Tình trạng sử dụng">
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span>Đã dùng: <b>{voucher.usedCount}</b></span>
              <span>Giới hạn: <b>{voucher.totalLimit ?? 'Không giới hạn'}</b></span>
            </div>
            {usagePercent !== null && (
              <Progress
                percent={usagePercent}
                size="small"
                status={usagePercent >= 100 ? 'exception' : 'active'}
                strokeColor="#8F1216"
              />
            )}
          </div>
        </Descriptions.Item>

        <Descriptions.Item label="Trạng thái">
          <Tag color={isActive ? 'success' : 'default'} style={{ fontWeight: 700 }}>
            {voucher.status}
          </Tag>
        </Descriptions.Item>
      </Descriptions>

      <div style={{ marginTop: 32, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <Button
          type="primary"
          icon={<EditOutlined />}
          style={{ backgroundColor: '#8F1216', borderColor: '#8F1216', borderRadius: 999 }}
          onClick={() => {
            onClose();
            onEdit(voucher);
          }}
        >
          Chỉnh sửa Voucher
        </Button>

        <Button
          icon={isActive ? <StopOutlined /> : <CheckCircleOutlined />}
          style={{ borderRadius: 999 }}
          onClick={() => onToggleStatus(voucher)}
        >
          {isActive ? 'Vô hiệu hóa' : 'Kích hoạt lại'}
        </Button>

        <Button
          danger
          icon={<DeleteOutlined />}
          style={{ borderRadius: 999 }}
          onClick={() => onDelete(voucher)}
        >
          Xóa
        </Button>
      </div>
    </Drawer>
  );
};

