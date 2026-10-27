import React, { useState, useMemo } from 'react';
import {
  Button,
  Space,
  Tag,
  Switch,
  Segmented,
  Tooltip,
  Image,
  Typography,
  message,
} from 'antd';
import type { TableColumnsType } from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  FireOutlined,
  CoffeeOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import { AdminTable } from '../../components/ui/AdminTable';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { ConfirmModal } from '../../components/ui/AdminModal';
import { CategoryIcon } from '../../components/ui/CategoryIcon';
import { ProductForm } from './ProductForm';
import { Product, Combo, mockProducts, mockCombos, formatVND } from '../../mocks/catalogData';

export const CatalogPage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>(mockProducts);
  const [combos, setCombos] = useState<Combo[]>(mockCombos);
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchCategory =
        categoryFilter === 'ALL' ? true : p.categoryId.toString() === categoryFilter;
      const matchSearch =
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.slug.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.categoryName.toLowerCase().includes(searchTerm.toLowerCase());
      return matchCategory && matchSearch;
    });
  }, [products, categoryFilter, searchTerm]);

  // Toggle active status
  const handleToggleStatus = (product: Product, checked: boolean) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === product.id ? { ...p, isActive: checked } : p))
    );
    message.success(
      `Đã chuyển "${product.name}" sang ${checked ? 'Đang phục vụ' : 'Tạm dừng bán'}.`
    );
  };

  // Save product from ProductForm
  const handleSaveProduct = (data: Partial<Product>) => {
    if (editingProduct) {
      setProducts((prev) =>
        prev.map((p) => (p.id === editingProduct.id ? ({ ...p, ...data } as Product) : p))
      );
    } else {
      setProducts((prev) => [data as Product, ...prev]);
    }
  };

  // Confirm delete
  const handleDeleteConfirm = () => {
    if (productToDelete) {
      setProducts((prev) => prev.filter((p) => p.id !== productToDelete.id));
      message.success(`Đã xóa món "${productToDelete.name}" khỏi thực đơn.`);
      setDeleteModalOpen(false);
      setProductToDelete(null);
    }
  };

  const spicyBadges = (level: number) => {
    if (level === 0) return <Tag style={{ borderRadius: 6 }}>Không cay</Tag>;
    if (level === 1)
      return (
        <Tag color="orange" style={{ borderRadius: 6 }}>
          <FireOutlined /> Cay vừa
        </Tag>
      );
    return (
      <Tag color="red" style={{ borderRadius: 6 }}>
        <FireOutlined /> Siêu cay
      </Tag>
    );
  };

  const columns: TableColumnsType<Product> = [
    {
      title: 'Món ăn',
      dataIndex: 'name',
      key: 'name',
      render: (_, record) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <Image
            src={record.imageUrl}
            alt={record.name}
            width={58}
            height={58}
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
              {record.name}
              {record.isBestSeller && (
                <Tag
                  color="#C9A227"
                  style={{
                    marginLeft: 8,
                    borderRadius: 999,
                    color: '#16100D',
                    fontWeight: 700,
                    fontSize: 10,
                  }}
                >
                  BEST SELLER
                </Tag>
              )}
            </div>
            <div style={{ fontSize: 12, color: '#6B6259', marginTop: 2 }}>
              <code>/{record.slug}</code>
            </div>
          </div>
        </div>
      ),
    },
    {
      title: 'Danh mục',
      dataIndex: 'categoryName',
      key: 'categoryName',
      width: 130,
      render: (cat) => (
        <Tag
          style={{
            borderRadius: 8,
            backgroundColor: '#F5EDE0',
            borderColor: '#E8E2D9',
            color: '#16100D',
            fontWeight: 600,
            padding: '2px 8px',
          }}
        >
          {cat}
        </Tag>
      ),
    },
    {
      title: 'Giá niêm yết',
      dataIndex: 'basePrice',
      key: 'basePrice',
      width: 140,
      render: (price) => (
        <span
          style={{
            fontFamily: 'Fredoka, sans-serif',
            color: '#8F1216',
            fontWeight: 700,
            fontSize: 16,
          }}
        >
          {formatVND(price)}
        </span>
      ),
    },
    {
      title: 'Mức cay & Kcal',
      key: 'meta',
      width: 180,
      render: (_, record) => (
        <div>
          {spicyBadges(record.spicyLevel)}
          <span style={{ fontSize: 12, color: '#6B6259', marginLeft: 8 }}>
            {record.kcal} kcal
          </span>
        </div>
      ),
    },
    {
      title: 'Tùy chọn',
      key: 'options',
      width: 150,
      render: (_, record) => (
        <div style={{ fontSize: 12, color: '#6B6259' }}>
          <div>{record.options?.length || 0} nhóm options</div>
          <div>{record.toppings?.length || 0} toppings</div>
        </div>
      ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'isActive',
      key: 'isActive',
      width: 170,
      render: (isActive, record) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Switch
            checked={isActive}
            onChange={(checked) => handleToggleStatus(record, checked)}
            size="small"
          />
          <StatusBadge
            status={isActive ? 'success' : 'error'}
            text={isActive ? 'Đang bán' : 'Tạm ngưng'}
            size="small"
          />
        </div>
      ),
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 110,
      align: 'right',
      render: (_, record) => (
        <Space size={6}>
          <Tooltip title="Chỉnh sửa món">
            <Button
              type="text"
              icon={<EditOutlined style={{ color: '#22577A' }} />}
              onClick={() => {
                setEditingProduct(record);
                setFormOpen(true);
              }}
            />
          </Tooltip>
          <Tooltip title="Xóa món">
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
              onClick={() => {
                setProductToDelete(record);
                setDeleteModalOpen(true);
              }}
            />
          </Tooltip>
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
              fontFamily: 'Fredoka, sans-serif',
              fontWeight: 700,
              fontSize: 28,
              color: '#16100D',
              margin: 0,
            }}
          >
            Quản lý Thực đơn & Sản phẩm
          </h1>
          <p
            style={{
              fontFamily: 'Quicksand, sans-serif',
              color: '#6B6259',
              fontSize: 14,
              margin: '6px 0 0',
            }}
          >
            Quản lý toàn bộ danh mục gà giòn, burger, toppings và các gói combo khuyến mãi toàn chuỗi.
          </p>
        </div>

        <Space size={12}>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              setEditingProduct(null);
              setFormOpen(true);
            }}
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
            Thêm món ăn mới
          </Button>
        </Space>
      </div>

      {/* Admin Table */}
      <AdminTable<Product>
        columns={columns}
        dataSource={filteredProducts}
        rowKey="id"
        searchPlaceholder="Tìm kiếm tên món, slug, danh mục..."
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        filterNodes={
          <Segmented
            value={categoryFilter}
            onChange={(val) => setCategoryFilter(val as string)}
            options={[
              {
                label: (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      color: categoryFilter === 'ALL' ? '#8F1216' : '#5C554E',
                      fontWeight: categoryFilter === 'ALL' ? 700 : 500,
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <CategoryIcon id={0} size={15} active={categoryFilter === 'ALL'} activeTheme="on-light" /> Tất cả (6)
                  </span>
                ),
                value: 'ALL',
              },
              {
                label: (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      color: categoryFilter === '1' ? '#8F1216' : '#5C554E',
                      fontWeight: categoryFilter === '1' ? 700 : 500,
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <CategoryIcon id={1} size={15} active={categoryFilter === '1'} activeTheme="on-light" /> Gà rán
                  </span>
                ),
                value: '1',
              },
              {
                label: (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      color: categoryFilter === '2' ? '#8F1216' : '#5C554E',
                      fontWeight: categoryFilter === '2' ? 700 : 500,
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <CategoryIcon id={2} size={15} active={categoryFilter === '2'} activeTheme="on-light" /> Burger
                  </span>
                ),
                value: '2',
              },
              {
                label: (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      color: categoryFilter === '4' ? '#8F1216' : '#5C554E',
                      fontWeight: categoryFilter === '4' ? 700 : 500,
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <CategoryIcon id={4} size={15} active={categoryFilter === '4'} activeTheme="on-light" /> Món phụ
                  </span>
                ),
                value: '4',
              },
              {
                label: (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      color: categoryFilter === '5' ? '#8F1216' : '#5C554E',
                      fontWeight: categoryFilter === '5' ? 700 : 500,
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <CategoryIcon id={5} size={15} active={categoryFilter === '5'} activeTheme="on-light" /> Đồ uống
                  </span>
                ),
                value: '5',
              },
            ]}
            style={{
              background: '#F5EDE0',
              padding: 3,
              borderRadius: 999,
              fontFamily: 'Quicksand, sans-serif',
              fontWeight: 600,
            }}
          />
        }
        emptyTitle="Không có món ăn nào trong danh mục"
        emptyDescription="Thử chuyển sang danh mục khác hoặc tìm kiếm với từ khóa mới."
      />

      {/* Product Form Drawer */}
      <ProductForm
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditingProduct(null);
        }}
        initialProduct={editingProduct}
        onSaveProduct={handleSaveProduct}
      />

      {/* Confirm Delete Modal */}
      <ConfirmModal
        open={deleteModalOpen}
        title="Xóa món ăn khỏi thực đơn?"
        content={
          <span>
            Bạn có chắc chắn muốn xóa món{' '}
            <strong>"{productToDelete?.name}"</strong>? Thao tác này sẽ gỡ món ăn khỏi ứng dụng
            khách hàng và danh mục chi nhánh.
          </span>
        }
        onConfirm={handleDeleteConfirm}
        onCancel={() => {
          setDeleteModalOpen(false);
          setProductToDelete(null);
        }}
        confirmText="Xóa vĩnh viễn"
        danger
      />
    </div>
  );
};

export default CatalogPage;
