import React, { useEffect } from 'react';
import {
  Form,
  Input,
  InputNumber,
  Radio,
  Select,
  DatePicker,
  Row,
  Col,
  Space,
  Alert,
} from 'antd';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';
import { AdminModal } from '../../../components/ui/AdminModal';
import { useAuth } from '../../../context/AuthContext';
import type { AdminVoucher, VoucherPayload, VoucherScope, VoucherType } from '../../../types/promotion';
import type { Store } from '../../../lib/api';

const { TextArea } = Input;

export interface VoucherModalProps {
  open: boolean;
  editingVoucher: AdminVoucher | null;
  stores: Store[];
  loading?: boolean;
  onCancel: () => void;
  onSubmit: (values: VoucherPayload) => Promise<void> | void;
}

export const VoucherModal: React.FC<VoucherModalProps> = ({
  open,
  editingVoucher,
  stores,
  loading = false,
  onCancel,
  onSubmit,
}) => {
  const { user, isAdmin } = useAuth();
  const [form] = Form.useForm();
  const selectedScope = Form.useWatch('scope', form);
  const selectedType = Form.useWatch('type', form);

  useEffect(() => {
    if (open) {
      if (editingVoucher) {
        form.setFieldsValue({
          code: editingVoucher.code,
          title: editingVoucher.title || '',
          description: editingVoucher.description || '',
          type: editingVoucher.type,
          value: editingVoucher.value,
          minOrderAmount: editingVoucher.minOrderAmount || 0,
          maxDiscount: editingVoucher.maxDiscount ?? undefined,
          totalLimit: editingVoucher.totalLimit ?? undefined,
          dateRange: [
            editingVoucher.startAt ? dayjs(editingVoucher.startAt) : null,
            editingVoucher.endAt ? dayjs(editingVoucher.endAt) : null,
          ],
          scope: editingVoucher.scope || 'ALL',
          storeId: editingVoucher.storeId ? Number(editingVoucher.storeId) : undefined,
          status: editingVoucher.status || 'ACTIVE',
        });
      } else {
        // Defaults for new voucher
        form.resetFields();
        form.setFieldsValue({
          type: 'PERCENT',
          value: 10,
          minOrderAmount: 0,
          scope: isAdmin ? 'ALL' : 'STORE',
          storeId: !isAdmin && user.storeId ? Number(user.storeId) : undefined,
          status: 'ACTIVE',
          dateRange: [dayjs(), dayjs().add(30, 'day')],
        });
      }
    }
  }, [open, editingVoucher, form, isAdmin, user.storeId]);

  const handleFinish = async (values: {
    code: string;
    title?: string;
    description?: string;
    type: VoucherType;
    value: number;
    minOrderAmount?: number;
    maxDiscount?: number;
    totalLimit?: number;
    dateRange: [Dayjs, Dayjs];
    scope: VoucherScope;
    storeId?: number;
    status?: string;
  }) => {
    const [startDay, endDay] = values.dateRange;
    const payload: VoucherPayload = {
      code: values.code.trim().toUpperCase(),
      title: values.title?.trim(),
      description: values.description?.trim(),
      type: values.type,
      value: values.value,
      minOrderAmount: values.minOrderAmount ?? 0,
      maxDiscount: values.maxDiscount ?? null,
      totalLimit: values.totalLimit ?? null,
      startAt: startDay.toISOString(),
      endAt: endDay.toISOString(),
      scope: values.scope,
      storeId: values.scope === 'STORE' ? (values.storeId ?? null) : null,
      status: (values.status as any) || 'ACTIVE',
    };

    await onSubmit(payload);
  };

  return (
    <AdminModal
      open={open}
      title={editingVoucher ? 'Chỉnh sửa mã Voucher' : 'Tạo mới mã Voucher'}
      subtitle={
        editingVoucher
          ? `Cập nhật thông tin voucher #${editingVoucher.code}`
          : 'Thiết lập mã ưu đãi, điều kiện áp dụng và thời gian hiệu lực'
      }
      width={720}
      okText={editingVoucher ? 'Lưu thay đổi' : 'Tạo Voucher'}
      confirmLoading={loading}
      onOk={() => form.submit()}
      onCancel={onCancel}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleFinish}
        initialValues={{
          type: 'PERCENT',
          scope: 'ALL',
          minOrderAmount: 0,
          status: 'ACTIVE',
        }}
      >
        <Row gutter={16}>
          <Col xs={24} sm={12}>
            <Form.Item
              name="code"
              label="Mã Voucher"
              rules={[
                { required: true, message: 'Vui lòng nhập mã voucher' },
                {
                  pattern: /^[A-Za-z0-9_-]+$/,
                  message: 'Mã chỉ được chứa chữ cái, số, gạch dưới (_) hoặc gạch ngang (-)',
                },
                { max: 80, message: 'Mã tối đa 80 ký tự' },
              ]}
              extra="Tự động chuyển thành chữ hoa khi lưu (Ví dụ: CLUCKY20, FREESHIP30K)"
            >
              <Input
                placeholder="VD: CLUCKY20"
                style={{ textTransform: 'uppercase', fontWeight: 700 }}
                maxLength={80}
              />
            </Form.Item>
          </Col>

          <Col xs={24} sm={12}>
            <Form.Item
              name="title"
              label="Tiêu đề hiển thị"
              rules={[{ max: 255, message: 'Tiêu đề tối đa 255 ký tự' }]}
              extra="Tên ngắn gọn cho khách hàng dễ nhận biết"
            >
              <Input placeholder="VD: Giảm 20% cho đơn từ 150k" />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item name="description" label="Mô tả chi tiết / Thể lệ áp dụng">
          <TextArea
            rows={2}
            placeholder="VD: Áp dụng cho mọi đơn giao hàng tận nơi. Không áp dụng đồng thời chương trình khác."
          />
        </Form.Item>

        <Row gutter={16}>
          <Col xs={24} sm={12}>
            <Form.Item
              name="type"
              label="Loại giảm giá"
              rules={[{ required: true, message: 'Vui lòng chọn loại giảm giá' }]}
            >
              <Radio.Group buttonStyle="solid" style={{ width: '100%' }}>
                <Radio.Button value="PERCENT" style={{ width: '50%', textAlign: 'center' }}>
                  Phần trăm (%)
                </Radio.Button>
                <Radio.Button value="AMOUNT" style={{ width: '50%', textAlign: 'center' }}>
                  Tiền mặt (VNĐ)
                </Radio.Button>
              </Radio.Group>
            </Form.Item>
          </Col>

          <Col xs={24} sm={12}>
            <Form.Item
              name="value"
              label={selectedType === 'PERCENT' ? 'Mức giảm (%)' : 'Mức giảm (VNĐ)'}
              rules={[
                { required: true, message: 'Vui lòng nhập giá trị giảm' },
                {
                  validator: async (_, val) => {
                    if (val === undefined || val === null) return;
                    if (val <= 0) {
                      return Promise.reject(new Error('Giá trị giảm phải lớn hơn 0'));
                    }
                    if (selectedType === 'PERCENT' && val > 100) {
                      return Promise.reject(new Error('Mức giảm theo phần trăm không được vượt quá 100%'));
                    }
                  },
                },
              ]}
            >
              <InputNumber
                style={{ width: '100%' }}
                min={1}
                max={selectedType === 'PERCENT' ? 100 : 10000000}
                placeholder={selectedType === 'PERCENT' ? 'VD: 20' : 'VD: 30000'}
                formatter={(val) =>
                  selectedType === 'PERCENT'
                    ? `${val}%`
                    : `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
                }
                parser={(val) => Number(val?.replace(/[%,\s]/g, '') || 0)}
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col xs={24} sm={12}>
            <Form.Item
              name="minOrderAmount"
              label="Đơn hàng tối thiểu (VNĐ)"
              rules={[
                {
                  validator: async (_, val) => {
                    if (val !== undefined && val !== null && val < 0) {
                      return Promise.reject(new Error('Giá trị đơn hàng tối thiểu không được âm'));
                    }
                  },
                },
              ]}
              extra="0 = Không yêu cầu mức đơn tối thiểu"
            >
              <InputNumber
                style={{ width: '100%' }}
                min={0}
                placeholder="VD: 150000"
                formatter={(val) => `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                parser={(val) => Number(val?.replace(/\D/g, '') || 0)}
              />
            </Form.Item>
          </Col>

          <Col xs={24} sm={12}>
            <Form.Item
              name="maxDiscount"
              label="Giảm tối đa (VNĐ)"
              extra={selectedType === 'PERCENT' ? 'Giới hạn mức giảm tối đa cho mã %' : 'Bỏ trống nếu không giới hạn'}
              rules={[
                {
                  validator: async (_, val) => {
                    if (val !== undefined && val !== null && val < 0) {
                      return Promise.reject(new Error('Mức giảm tối đa không được âm'));
                    }
                  },
                },
              ]}
            >
              <InputNumber
                style={{ width: '100%' }}
                min={0}
                placeholder="VD: 50000"
                formatter={(val) => (val ? `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : '')}
                parser={(val) => Number(val?.replace(/\D/g, '') || 0)}
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col xs={24} sm={12}>
            <Form.Item
              name="totalLimit"
              label="Tổng số lượt sử dụng"
              extra="Bỏ trống nếu không giới hạn số lượt"
              rules={[
                {
                  validator: async (_, val) => {
                    if (val !== undefined && val !== null && val < 1) {
                      return Promise.reject(new Error('Giới hạn số lượt dùng tối thiểu là 1'));
                    }
                  },
                },
              ]}
            >
              <InputNumber
                style={{ width: '100%' }}
                min={1}
                placeholder="VD: 500"
              />
            </Form.Item>
          </Col>

          <Col xs={24} sm={12}>
            <Form.Item
              name="status"
              label="Trạng thái kích hoạt"
              rules={[{ required: true, message: 'Vui lòng chọn trạng thái' }]}
            >
              <Select
                options={[
                  { value: 'ACTIVE', label: '🟢 Hoạt động (ACTIVE)' },
                  { value: 'DISABLED', label: '⚪ Tạm vô hiệu hóa (DISABLED)' },
                ]}
              />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item
          name="dateRange"
          label="Thời gian hiệu lực (Bắt đầu — Kết thúc)"
          rules={[
            { required: true, message: 'Vui lòng chọn thời gian hiệu lực' },
            {
              validator: async (_, dates) => {
                if (!dates || !dates[0] || !dates[1]) return;
                const [start, end] = dates;
                if (!end.isAfter(start)) {
                  return Promise.reject(new Error('Thời gian kết thúc phải sau thời gian bắt đầu'));
                }
              },
            },
          ]}
        >
          <DatePicker.RangePicker
            showTime={{ format: 'HH:mm' }}
            format="YYYY-MM-DD HH:mm"
            style={{ width: '100%' }}
            placeholder={['Bắt đầu lúc', 'Kết thúc lúc']}
          />
        </Form.Item>

        {/* Scope and Store selector */}
        <Row gutter={16}>
          <Col xs={24} sm={12}>
            <Form.Item
              name="scope"
              label="Phạm vi áp dụng"
              rules={[{ required: true, message: 'Vui lòng chọn phạm vi áp dụng' }]}
              extra={!isAdmin ? 'Store Manager chỉ được tạo voucher trong phạm vi chi nhánh của mình' : undefined}
            >
              <Radio.Group
                buttonStyle="solid"
                style={{ width: '100%' }}
                disabled={!isAdmin}
              >
                <Radio.Button value="ALL" style={{ width: '50%', textAlign: 'center' }}>
                  Toàn hệ thống
                </Radio.Button>
                <Radio.Button value="STORE" style={{ width: '50%', textAlign: 'center' }}>
                  Chi nhánh
                </Radio.Button>
              </Radio.Group>
            </Form.Item>
          </Col>

          <Col xs={24} sm={12}>
            {selectedScope === 'STORE' ? (
              <Form.Item
                name="storeId"
                label="Chi nhánh áp dụng"
                rules={[
                  {
                    required: true,
                    message: 'Voucher phạm vi chi nhánh (STORE) bắt buộc phải chọn chi nhánh',
                  },
                ]}
                extra="Mã chỉ có hiệu lực cho đơn đặt tại chi nhánh này"
              >
                <Select
                  placeholder="Chọn chi nhánh áp dụng"
                  disabled={!isAdmin}
                  options={stores.map((s) => ({
                    value: s.id,
                    label: `${s.name} (#${s.id})`,
                  }))}
                />
              </Form.Item>
            ) : (
              <div style={{ paddingTop: 30, color: '#6B6259', fontSize: 13 }}>
                Áp dụng cho tất cả chi nhánh và các đơn đặt hàng toàn quốc.
              </div>
            )}
          </Col>
        </Row>
      </Form>
    </AdminModal>
  );
};

