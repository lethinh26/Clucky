import React, { useState, useMemo } from 'react';
import {
  Button,
  Space,
  Tag,
  Switch,
  Image,
  Form,
  InputNumber,
  Card,
  Row,
  Col,
  Statistic,
  Tooltip,
  Typography,
  message,
} from 'antd';
import type { TableColumnsType } from 'antd';
import {
  ShopOutlined,
  WarningOutlined,
  EditOutlined,
  CheckCircleOutlined,
  StopOutlined,
  SyncOutlined,
  InboxOutlined,
} from '@ant-design/icons';
import { AdminTable } from '../../../components/ui/AdminTable';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import { AdminModal } from '../../../components/ui/AdminModal';
import { useAuth } from '../../../context/AuthContext';
import { InventoryItem, mockInventory } from '../../../mocks/catalogData';

export const StaffInventoryPage: React.FC = () => {
  const { user } = useAuth();
  const [inventory, setInventory] = useState<InventoryItem[]>(mockInventory);
  const [searchTerm, setSearchTerm] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [form] = Form.useForm();

  // Filter items for current store or all if admin
  const filteredItems = useMemo(() => {
    return inventory.filter((item) => {
      const matchSearch =
        item.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.categoryName.toLowerCase().includes(searchTerm.toLowerCase());
      return matchSearch;
    });
  }, [inventory, searchTerm]);

  // Statistics
  const totalItems = inventory.length;
  const lowStockCount = inventory.filter(
    (i) => i.quantityAvailable <= i.lowStockThreshold && !i.isSoldOut
  ).length;
  const soldOutCount = inventory.filter((i) => i.isSoldOut || i.quantityAvailable === 0).length;
  const availableCount = totalItems - soldOutCount;

  // Toggle "Hết món trong ca" (Local branch switch)
  const handleToggleSoldOut = (item: InventoryItem, checked: boolean) => {
    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
    setInventory((prev) =>
      prev.map((i) =>
        i.productId === item.productId
          ? {
              ...i,
              isSoldOut: checked,
              updatedAt: now,
              updatedBy: `${user.fullName} (${user.role})`,
            }
          : i
      )
    );
    if (checked) {
      message.warning(
        `Đã đánh dấu "Hết món trong ca" cho "${item.productName}". Khách tại chi nhánh sẽ không thể đặt món này.`
      );
    } else {
      message.success(`Đã mở bán lại món "${item.productName}" tại chi nhánh.`);
    }
  };

  const handleOpenUpdateModal = (item: InventoryItem) => {
    setEditingItem(item);
    form.setFieldsValue({
      quantityAvailable: item.quantityAvailable,
      lowStockThreshold: item.lowStockThreshold,
    });
    setModalOpen(true);
  };

  const handleUpdateStockSubmit = async () => {
    try {
      const values = await form.validateFields();
      const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
      setInventory((prev) =>
        prev.map((i) =>
          i.productId === editingItem?.productId
            ? {
                ...i,
                quantityAvailable: values.quantityAvailable,
                lowStockThreshold: values.lowStockThreshold,
                isSoldOut: values.quantityAvailable === 0 ? true : i.isSoldOut,
                updatedAt: now,
                updatedBy: `${user.fullName} (${user.role})`,
              }
            : i
        )
      );
      message.success(`Đã cập nhật số lượng tồn kho cho "${editingItem?.productName}".`);
      setModalOpen(false);
    } catch {
      message.error('Vui lòng nhập số lượng hợp lệ.');
    }
  };

  const columns: TableColumnsType<InventoryItem> = [
    {
      title: 'Món ăn',
      key: 'product',
      render: (_, record) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <Image
            src={record.imageUrl}
            alt={record.productName}
            width={52}
            height={52}
            style={{ borderRadius: 12, objectFit: 'cover', border: '1px solid #E8E2D9' }}
            fallback="https://images.unsplash.com/photo-1562967916-eb82221dfb92?w=100"
          />
          <div>
            <div
              style={{
                fontFamily: 'Fredoka, sans-serif',
                fontWeight: 600,
                fontSize: 15,
                color: '#16100D',
              }}
            >
              {record.productName}
            </div>
            <Tag
              style={{
                borderRadius: 6,
                backgroundColor: '#F5EDE0',
                borderColor: '#E8E2D9',
                color: '#6B6259',
                fontSize: 11,
                marginTop: 2,
              }}
            >
              {record.categoryName}
            </Tag>
          </div>
        </div>
      ),
    },
    {
      title: 'Tồn kho hiện tại',
      dataIndex: 'quantityAvailable',
      key: 'quantityAvailable',
      width: 170,
      render: (qty: number, record) => {
        const isLow = qty <= record.lowStockThreshold && !record.isSoldOut;
        return (
          <div>
            <span
              style={{
                fontFamily: 'Fredoka, sans-serif',
                fontSize: 20,
                fontWeight: 700,
                color: isLow ? '#D97706' : qty === 0 ? '#B42318' : '#1E7A46',
              }}
            >
              {qty} phần
            </span>
            {isLow && (
              <div style={{ marginTop: 2 }}>
                <Tag
                  color="#D97706"
                  style={{
                    borderRadius: 999,
                    fontWeight: 700,
                    fontSize: 11,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <WarningOutlined /> Sắp hết hàng
                </Tag>
              </div>
            )}
          </div>
        );
      },
    },
    {
      title: 'Ngưỡng cảnh báo',
      dataIndex: 'lowStockThreshold',
      key: 'lowStockThreshold',
      width: 150,
      render: (threshold: number) => (
        <span style={{ fontFamily: 'Quicksand, sans-serif', fontWeight: 600, color: '#6B6259' }}>
          ≤ {threshold} phần
        </span>
      ),
    },
    {
      title: 'Hết món trong ca',
      key: 'soldOut',
      width: 170,
      render: (_, record) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Switch
            checked={record.isSoldOut}
            onChange={(checked) => handleToggleSoldOut(record, checked)}
            style={{
              backgroundColor: record.isSoldOut ? '#B42318' : undefined,
            }}
          />
          <StatusBadge
            status={record.isSoldOut ? 'error' : 'success'}
            text={record.isSoldOut ? 'Đã tắt bán' : 'Đang phục vụ'}
            size="small"
          />
        </div>
      ),
    },
    {
      title: 'Cập nhật lần cuối',
      key: 'updated',
      render: (_, record) => (
        <div style={{ fontSize: 12, color: '#6B6259' }}>
          <div>{record.updatedAt}</div>
          <div style={{ color: '#16100D', fontWeight: 600 }}>{record.updatedBy}</div>
        </div>
      ),
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 120,
      align: 'right',
      render: (_, record) => (
        <Button
          size="small"
          icon={<EditOutlined />}
          onClick={() => handleOpenUpdateModal(record)}
          style={{
            borderRadius: 999,
            fontFamily: 'Quicksand, sans-serif',
            fontWeight: 600,
            borderColor: '#E8E2D9',
          }}
        >
          Kiểm kê
        </Button>
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h1
              style={{
                fontFamily: 'Fredoka, sans-serif',
                fontWeight: 700,
                fontSize: 28,
                color: '#16100D',
                margin: 0,
              }}
            >
              Kiểm kê Tồn kho Chi nhánh
            </h1>
            <Tag
              color="gold"
              style={{
                borderRadius: 999,
                fontWeight: 700,
                fontSize: 13,
                padding: '3px 12px',
                color: '#946C00',
              }}
            >
              <ShopOutlined /> {user.storeName || 'Chi nhánh Clucky Lê Lợi (Q.1)'}
            </Tag>
          </div>
          <p
            style={{
              fontFamily: 'Quicksand, sans-serif',
              color: '#6B6259',
              fontSize: 14,
              margin: '6px 0 0',
            }}
          >
            Quản lý số lượng có sẵn trong ca làm việc, kích hoạt cảnh báo hết hàng và tắt bán tức thì tại quán.
          </p>
        </div>
      </div>

      {/* KPI Stats */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={6}>
          <Card
            styles={{ body: { padding: '16px 20px' } }}
            style={{
              background: '#FFFAF3',
              borderRadius: 16,
              border: '1px solid #E8E2D9',
            }}
          >
            <Statistic
              title={<span style={{ fontFamily: 'Quicksand', fontWeight: 600 }}>Tổng mặt hàng</span>}
              value={totalItems}
              suffix="món"
              valueStyle={{ fontFamily: 'Fredoka', color: '#16100D', fontWeight: 700 }}
              prefix={<InboxOutlined style={{ color: '#22577A' }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card
            styles={{ body: { padding: '16px 20px' } }}
            style={{
              background: '#FFFAF3',
              borderRadius: 16,
              border: '1px solid #E8E2D9',
            }}
          >
            <Statistic
              title={<span style={{ fontFamily: 'Quicksand', fontWeight: 600 }}>Đang phục vụ</span>}
              value={availableCount}
              suffix="món"
              valueStyle={{ fontFamily: 'Fredoka', color: '#1E7A46', fontWeight: 700 }}
              prefix={<CheckCircleOutlined style={{ color: '#1E7A46' }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card
            styles={{ body: { padding: '16px 20px' } }}
            style={{
              background: '#FFFAF3',
              borderRadius: 16,
              border: lowStockCount > 0 ? '1px solid #FDE68A' : '1px solid #E8E2D9',
              backgroundColor: lowStockCount > 0 ? '#FEFDF0' : '#FFFAF3',
            }}
          >
            <Statistic
              title={<span style={{ fontFamily: 'Quicksand', fontWeight: 600 }}>Sắp hết hàng</span>}
              value={lowStockCount}
              suffix="món"
              valueStyle={{ fontFamily: 'Fredoka', color: '#D97706', fontWeight: 700 }}
              prefix={<WarningOutlined style={{ color: '#D97706' }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card
            styles={{ body: { padding: '16px 20px' } }}
            style={{
              background: '#FFFAF3',
              borderRadius: 16,
              border: soldOutCount > 0 ? '1px solid #FECDCA' : '1px solid #E8E2D9',
              backgroundColor: soldOutCount > 0 ? '#FFF8F7' : '#FFFAF3',
            }}
          >
            <Statistic
              title={<span style={{ fontFamily: 'Quicksand', fontWeight: 600 }}>Tắt bán trong ca</span>}
              value={soldOutCount}
              suffix="món"
              valueStyle={{ fontFamily: 'Fredoka', color: '#B42318', fontWeight: 700 }}
              prefix={<StopOutlined style={{ color: '#B42318' }} />}
            />
          </Card>
        </Col>
      </Row>

      {/* Admin Table */}
      <AdminTable<InventoryItem>
        columns={columns}
        dataSource={filteredItems}
        rowKey="productId"
        searchPlaceholder="Tìm món ăn kiểm kê..."
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        emptyTitle="Không tìm thấy món ăn trong kho"
      />

      {/* Quick Stock Update Modal */}
      <AdminModal
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={handleUpdateStockSubmit}
        title={`Cập nhật tồn kho: ${editingItem?.productName}`}
        subtitle="Ghi nhận số lượng thực tế sau kiểm kê ca"
        width={480}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="quantityAvailable"
            label="Số lượng thực tế còn lại (Phần/Khẩu phần)"
            rules={[{ required: true, message: 'Vui lòng nhập số lượng tồn kho' }]}
          >
            <InputNumber min={0} max={9999} style={{ width: '100%', height: 40 }} />
          </Form.Item>

          <Form.Item
            name="lowStockThreshold"
            label="Ngưỡng cảnh báo sắp hết (Phần)"
            rules={[{ required: true, message: 'Vui lòng nhập ngưỡng cảnh báo' }]}
          >
            <InputNumber min={1} max={500} style={{ width: '100%', height: 40 }} />
          </Form.Item>

          <div
            style={{
              background: '#F5EDE0',
              padding: 12,
              borderRadius: 12,
              fontSize: 12,
              color: '#6B6259',
              fontFamily: 'Quicksand, sans-serif',
            }}
          >
            ℹ️ Nhân viên kiểm kê: <strong>{user.fullName}</strong> ({user.role})<br />
            Thời gian ghi nhận: thời gian thực hiện tại.
          </div>
        </Form>
      </AdminModal>
    </div>
  );
};

export default StaffInventoryPage;
