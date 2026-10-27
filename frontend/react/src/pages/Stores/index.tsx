import React, { useState, useMemo } from 'react';
import {
  Button,
  Space,
  Tag,
  Tooltip,
  Form,
  Input,
  Select,
  TimePicker,
  Radio,
  message,
} from 'antd';
import type { TableColumnsType } from 'antd';
import dayjs from 'dayjs';
import {
  PlusOutlined,
  EditOutlined,
  ShopOutlined,
  PhoneOutlined,
  ClockCircleOutlined,
  CompassOutlined,
  UserOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import { AdminTable } from '../../components/ui/AdminTable';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { AdminModal } from '../../components/ui/AdminModal';
import { useAuth } from '../../context/AuthContext';
import { Store, mockStores, mockManagers } from '../../mocks/catalogData';

export const StoresPage: React.FC = () => {
  const { user, isAdmin } = useAuth();
  const [stores, setStores] = useState<Store[]>(mockStores);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingStore, setEditingStore] = useState<Store | null>(null);
  const [form] = Form.useForm();

  // Role-based store isolation: Store Manager only sees their assigned branch
  const scopedStores = useMemo(() => {
    if (isAdmin) return stores;
    return stores.filter(
      (s) => s.id === user.storeId || s.name.toLowerCase().includes(user.storeName?.toLowerCase() || 'lê lợi')
    );
  }, [stores, isAdmin, user.storeId, user.storeName]);

  const filteredStores = useMemo(() => {
    return scopedStores.filter((s) => {
      const matchStatus = statusFilter === 'ALL' ? true : s.status === statusFilter;
      const matchSearch =
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.district.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.phone.includes(searchTerm);
      return matchStatus && matchSearch;
    });
  }, [scopedStores, statusFilter, searchTerm]);

  const handleOpenCreateModal = () => {
    setEditingStore(null);
    form.resetFields();
    form.setFieldsValue({
      status: 'OPEN',
      openTime: dayjs('09:00', 'HH:mm'),
      closeTime: dayjs('22:00', 'HH:mm'),
      city: 'TP. Hồ Chí Minh',
    });
    setModalOpen(true);
  };

  const handleOpenEditModal = (store: Store) => {
    setEditingStore(store);
    form.setFieldsValue({
      name: store.name,
      address: store.address,
      district: store.district,
      city: store.city,
      phone: store.phone,
      openTime: dayjs(store.openTime, 'HH:mm'),
      closeTime: dayjs(store.closeTime, 'HH:mm'),
      deliveryArea: store.deliveryArea,
      status: store.status,
      managerId: store.managerId,
    });
    setModalOpen(true);
  };

  const handleFormSubmit = async () => {
    try {
      const values = await form.validateFields();
      const manager = mockManagers.find((m) => m.id === values.managerId);
      const storePayload: Store = {
        id: editingStore ? editingStore.id : Date.now(),
        name: values.name,
        address: values.address,
        district: values.district,
        city: values.city,
        phone: values.phone,
        openTime: values.openTime ? values.openTime.format('HH:mm') : '09:00',
        closeTime: values.closeTime ? values.closeTime.format('HH:mm') : '22:00',
        deliveryArea: values.deliveryArea,
        status: values.status,
        managerId: values.managerId,
        managerName: manager?.fullName || values.managerName,
      };

      if (editingStore) {
        setStores((prev) =>
          prev.map((s) => (s.id === editingStore.id ? storePayload : s))
        );
        message.success(`Đã cập nhật thông tin chi nhánh "${storePayload.name}".`);
      } else {
        setStores((prev) => [storePayload, ...prev]);
        message.success(`Đã tạo mới chi nhánh "${storePayload.name}" thành công.`);
      }

      setModalOpen(false);
    } catch {
      message.error('Vui lòng kiểm tra lại các trường thông tin chi nhánh.');
    }
  };

  const handleQuickStatusChange = (store: Store, newStatus: Store['status']) => {
    setStores((prev) =>
      prev.map((s) => (s.id === store.id ? { ...s, status: newStatus } : s))
    );
    const label =
      newStatus === 'OPEN'
        ? 'Đang mở cửa'
        : newStatus === 'CLOSED_TEMP'
        ? 'Tạm đóng cửa'
        : 'Ngừng hoạt động';
    message.success(`Đã chuyển trạng thái chi nhánh "${store.name}" sang ${label}.`);
  };

  const columns: TableColumnsType<Store> = [
    {
      title: 'Tên Chi nhánh & Hotline',
      key: 'name',
      render: (_, record) => (
        <div>
          <div
            style={{
              fontFamily: 'Baloo 2, sans-serif',
              fontWeight: 600,
              fontSize: 16,
              color: '#16100D',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <ShopOutlined style={{ color: '#8F1216' }} />
            <span>{record.name}</span>
          </div>
          <div style={{ fontSize: 13, color: '#6B6259', marginTop: 3 }}>
            <PhoneOutlined /> {record.phone}
          </div>
        </div>
      ),
    },
    {
      title: 'Địa chỉ & Khu vực',
      key: 'address',
      render: (_, record) => (
        <div>
          <div style={{ color: '#16100D', fontWeight: 600 }}>{record.address}</div>
          <div style={{ fontSize: 12, color: '#6B6259', marginTop: 2 }}>
            <CompassOutlined /> Giao hàng: {record.deliveryArea}
          </div>
        </div>
      ),
    },
    {
      title: 'Giờ mở cửa',
      key: 'hours',
      width: 150,
      render: (_, record) => (
        <Tag
          style={{
            borderRadius: 8,
            backgroundColor: '#FFFAF3',
            borderColor: '#E8E2D9',
            fontFamily: 'Quicksand, sans-serif',
            fontWeight: 600,
          }}
        >
          <ClockCircleOutlined /> {record.openTime} – {record.closeTime}
        </Tag>
      ),
    },
    {
      title: 'Trưởng chi nhánh',
      dataIndex: 'managerName',
      key: 'managerName',
      width: 170,
      render: (manager) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
          <UserOutlined style={{ color: '#C9A227' }} />
          <span style={{ fontWeight: 600, color: '#16100D' }}>{manager || 'Chưa phân công'}</span>
        </div>
      ),
    },
    {
      title: 'Trạng thái vận hành',
      dataIndex: 'status',
      key: 'status',
      width: 160,
      render: (status: Store['status']) => {
        if (status === 'OPEN') return <StatusBadge status="success" text="Đang mở cửa" />;
        if (status === 'CLOSED_TEMP') return <StatusBadge status="warning" text="Tạm đóng" />;
        return <StatusBadge status="error" text="Ngừng hoạt động" />;
      },
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 140,
      align: 'right',
      render: (_, record) => (
        <Space size={6}>
          <Tooltip title="Chỉnh sửa chi nhánh">
            <Button
              type="text"
              icon={<EditOutlined style={{ color: '#22577A' }} />}
              onClick={() => handleOpenEditModal(record)}
            />
          </Tooltip>
          {record.status === 'OPEN' ? (
            <Tooltip title="Chuyển tạm đóng">
              <Button
                type="text"
                danger
                icon={<ExclamationCircleOutlined />}
                onClick={() => handleQuickStatusChange(record, 'CLOSED_TEMP')}
              />
            </Tooltip>
          ) : (
            <Tooltip title="Mở cửa trở lại">
              <Button
                type="text"
                style={{ color: '#1E7A46' }}
                icon={<CheckCircleOutlined />}
                onClick={() => handleQuickStatusChange(record, 'OPEN')}
              />
            </Tooltip>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      {/* Header Info */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: 24,
          flexWrap: 'wrap',
          gap: 16,
        }}
      >
        <div>
          <h1
            style={{
              fontFamily: 'Baloo 2, sans-serif',
              fontWeight: 700,
              fontSize: 28,
              color: '#16100D',
              margin: 0,
            }}
          >
            Quản lý Hệ thống Chi nhánh
          </h1>
          <p
            style={{
              fontFamily: 'Quicksand, sans-serif',
              color: '#6B6259',
              fontSize: 14,
              margin: '6px 0 0',
            }}
          >
            Cấu hình thời gian vận hành, bán kính giao hàng và người quản lý cho từng cơ sở Clucky.
          </p>
        </div>

        {isAdmin && (
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleOpenCreateModal}
            style={{
              backgroundColor: '#8F1216',
              borderColor: '#8F1216',
              borderRadius: 999,
              height: 42,
              padding: '0 24px',
              fontWeight: 700,
              fontFamily: 'Quicksand, sans-serif',
            }}
          >
            Thêm chi nhánh mới
          </Button>
        )}
      </div>

      {/* Admin Table */}
      <AdminTable<Store>
        columns={columns}
        dataSource={filteredStores}
        rowKey="id"
        searchPlaceholder="Tìm theo tên chi nhánh, đường, quận..."
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        filterNodes={
          <Select
            value={statusFilter}
            onChange={setStatusFilter}
            style={{ width: 180, fontFamily: 'Quicksand, sans-serif' }}
            options={[
              { value: 'ALL', label: 'Tất cả trạng thái' },
              { value: 'OPEN', label: '🟢 Đang mở cửa' },
              { value: 'CLOSED_TEMP', label: '🟡 Tạm đóng' },
              { value: 'INACTIVE', label: '🔴 Ngừng hoạt động' },
            ]}
          />
        }
        emptyTitle="Không tìm thấy chi nhánh nào"
        emptyDescription="Thử nhập từ khóa tìm kiếm quận huyện hoặc trạng thái khác."
      />

      {/* Create / Edit Store Modal */}
      <AdminModal
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={handleFormSubmit}
        title={editingStore ? 'Chỉnh sửa thông tin Chi nhánh' : 'Thiết lập Chi nhánh mới'}
        subtitle="Thông tin hiển thị trên ứng dụng khách hàng và điều phối đơn hàng"
        width={680}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label="Tên chi nhánh"
            rules={[{ required: true, message: 'Vui lòng nhập tên chi nhánh' }]}
          >
            <Input placeholder="Ví dụ: Clucky Lê Lợi (Flagship Store)" style={{ height: 40 }} />
          </Form.Item>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
            <Form.Item
              name="address"
              label="Địa chỉ chi tiết (Số nhà, tên đường, phường)"
              rules={[{ required: true, message: 'Nhập địa chỉ chi tiết' }]}
            >
              <Input placeholder="128 Lê Lợi, Phường Bến Nghé" style={{ height: 40 }} />
            </Form.Item>

            <Form.Item
              name="district"
              label="Quận / Huyện"
              rules={[{ required: true, message: 'Nhập Quận/Huyện' }]}
            >
              <Input placeholder="Quận 1" style={{ height: 40 }} />
            </Form.Item>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
            <Form.Item
              name="phone"
              label="Số hotline chi nhánh"
              rules={[{ required: true, message: 'Nhập hotline' }]}
            >
              <Input placeholder="028 7300 1234" style={{ height: 40 }} />
            </Form.Item>

            <Form.Item
              name="openTime"
              label="Giờ mở cửa"
              rules={[{ required: true, message: 'Chọn giờ mở cửa' }]}
            >
              <TimePicker format="HH:mm" style={{ width: '100%', height: 40 }} />
            </Form.Item>

            <Form.Item
              name="closeTime"
              label="Giờ đóng cửa"
              rules={[{ required: true, message: 'Chọn giờ đóng cửa' }]}
            >
              <TimePicker format="HH:mm" style={{ width: '100%', height: 40 }} />
            </Form.Item>
          </div>

          <Form.Item
            name="deliveryArea"
            label="Khu vực giao hàng hỗ trợ (Bán kính / Các quận lân cận)"
            rules={[{ required: true, message: 'Vui lòng mô tả khu vực giao' }]}
          >
            <Input.TextArea
              rows={2}
              placeholder="Ví dụ: Quận 1, Quận 3, Quận 4, Bình Thạnh (bán kính 5km)"
            />
          </Form.Item>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Form.Item name="managerId" label="Phân công Quản lý Chi nhánh (Store Manager)">
              <Select
                placeholder="Chọn quản lý phụ trách"
                style={{ height: 40 }}
                options={mockManagers.map((m) => ({
                  value: m.id,
                  label: `${m.fullName} (${m.phone})`,
                }))}
              />
            </Form.Item>

            <Form.Item name="status" label="Trạng thái hoạt động">
              <Radio.Group style={{ marginTop: 6 }}>
                <Radio value="OPEN">Mở cửa</Radio>
                <Radio value="CLOSED_TEMP">Tạm đóng</Radio>
                <Radio value="INACTIVE">Ngừng bán</Radio>
              </Radio.Group>
            </Form.Item>
          </div>
        </Form>
      </AdminModal>
    </div>
  );
};

export default StoresPage;
