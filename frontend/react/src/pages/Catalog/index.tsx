import { useTranslation } from "react-i18next";
import { useLocaleTools } from "../../i18n/hooks";
import React, { useState, useMemo, useEffect, useCallback } from 'react';
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
} from '@ant-design/icons';
import { AdminTable } from '../../components/ui/AdminTable';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { ConfirmModal } from '../../components/ui/AdminModal';
import { CategoryIcon } from '../../components/ui/CategoryIcon';
import { ProductForm } from './ProductForm';
import { CatalogCategory, catalogApi, getErrorMessage, type Product, type Combo } from '../../lib/api';

export const CatalogPage: React.FC = () => {
  const { t } = useTranslation();

  const { money: formatVND } = useLocaleTools();
  const [products, setProducts] = useState<Product[]>([]);
  const [combos, setCombos] = useState<Combo[]>([]);
  const [categories, setCategories] = useState<CatalogCategory[]>([]);
  const [pendingProductUpload, setPendingProductUpload] = useState<Product | null>(null);
  const [pendingComboUpload, setPendingComboUpload] = useState<Combo | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'products' | 'combos'>('products');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);

  const fetchCatalogData = useCallback(async () => {
    try {
      setLoading(true);
      const [prods, cmbs, categoryList] = await Promise.all([
        catalogApi.listProducts({ activeOnly: false }),
        catalogApi.listCombos(false),
        catalogApi.listCategories(),
      ]);
      setProducts(prods);
      setCombos(cmbs);
      setCategories(categoryList);
    } catch (err) {
      message.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCatalogData();
  }, [fetchCatalogData]);

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

  // Filtered Combos
  const filteredCombos = useMemo(() => {
    return combos.filter(
      (c) =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [combos, searchTerm]);

  // Toggle active status
  const handleToggleStatus = async (product: Product, checked: boolean) => {
    try {
      await catalogApi.updateProductStatus(product.id, checked);
      setProducts((prev) =>
        prev.map((p) => (p.id === product.id ? { ...p, isActive: checked } : p))
      );
      const statusText = checked ? t("business:catalog.available") : t("business:catalog.salesPaused");
      message.success(t("business:catalog.changedTo", { value1: product.name, value2: statusText }));
    } catch (err) {
      message.error(getErrorMessage(err));
    }
  };

  // Toggle combo status
  const handleToggleComboStatus = async (combo: Combo, checked: boolean) => {
    try {
      await catalogApi.updateComboStatus(combo.id, checked);
      setCombos((prev) =>
        prev.map((c) => (c.id === combo.id ? { ...c, isActive: checked } : c))
      );
      const statusText = checked ? t("business:catalog.active") : t("business:catalog.paused");
      message.success(t("business:catalog.changedComboTo", { value1: combo.name, value2: statusText }));
    } catch (err) {
      message.error(getErrorMessage(err));
    }
  };

  // Delete combo
  const handleDeleteCombo = async (combo: Combo) => {
    try {
      await catalogApi.deleteCombo(combo.id);
      setCombos((prev) => prev.filter((c) => c.id !== combo.id));
      message.success(t("business:catalog.deletedCombo", { value1: combo.name }));
    } catch (err) {
      message.error(getErrorMessage(err));
    }
  };

  // Save product from ProductForm
  const handleSaveProduct = async (
    data: Partial<Product>,
    imageFile?: File,
    onUploadProgress?: (percent: number) => void
  ) => {
    let savedProduct: Product;
    if (editingProduct) {
      savedProduct = await catalogApi.updateProduct(editingProduct.id, data);
      setProducts((prev) =>
        prev.map((p) => (p.id === editingProduct.id ? savedProduct : p))
      );
    } else if (pendingProductUpload) {
      savedProduct = await catalogApi.updateProduct(pendingProductUpload.id, data);
      setProducts((prev) =>
        prev.map((p) => (p.id === savedProduct.id ? savedProduct : p))
      );
    } else {
      savedProduct = await catalogApi.createProduct(data);
      setProducts((prev) => [savedProduct, ...prev]);
      setPendingProductUpload(savedProduct);
    }

    if (imageFile) {
      savedProduct = await catalogApi.uploadProductImage(
        savedProduct.id,
        imageFile,
        onUploadProgress
      );
      setProducts((prev) =>
        prev.map((product) => product.id === savedProduct.id ? savedProduct : product)
      );
    }
    setPendingProductUpload(null);
  };

  // Save combo from ProductForm
  const handleSaveCombo = async (
    data: Partial<Combo>,
    imageFile?: File,
    onUploadProgress?: (percent: number) => void
  ) => {
    let savedCombo = pendingComboUpload
      ? await catalogApi.updateCombo(pendingComboUpload.id, data)
      : await catalogApi.createCombo(data);
    setCombos((prev) => pendingComboUpload
      ? prev.map((combo) => combo.id === savedCombo.id ? savedCombo : combo)
      : [savedCombo, ...prev]);
    if (!pendingComboUpload) setPendingComboUpload(savedCombo);
    if (imageFile) {
      savedCombo = await catalogApi.uploadComboImage(
        savedCombo.id,
        imageFile,
        onUploadProgress
      );
      setCombos((prev) =>
        prev.map((combo) => combo.id === savedCombo.id ? savedCombo : combo)
      );
    }
    setPendingComboUpload(null);
    setViewMode('combos');
  };

  // Confirm delete
  const handleDeleteConfirm = async () => {
    if (productToDelete) {
      try {
        await catalogApi.deleteProduct(productToDelete.id);
        setProducts((prev) => prev.filter((p) => p.id !== productToDelete.id));
        message.success(t("business:catalog.removedFromTheMenu", { value1: productToDelete.name }));
      } catch (err) {
        message.error(getErrorMessage(err));
      } finally {
        setDeleteModalOpen(false);
        setProductToDelete(null);
      }
    }
  };

  const spicyBadges = (level?: number | null) => {
    if (level == null) return null;
    if (level === 0) return <Tag style={{ borderRadius: 6 }}>{t("business:catalog.notSpicy")}</Tag>;
    if (level === 1)
      return (
        <Tag color="orange" style={{ borderRadius: 6 }}>
          <FireOutlined /> {t("business:catalog.medium")} </Tag>
      );
    return (
      <Tag color="red" style={{ borderRadius: 6 }}>
        <FireOutlined /> {t("business:catalog.extraSpicy")} </Tag>
    );
  };

  const columns: TableColumnsType<Product> = [
    {
      title: t("business:catalog.dish"),
      dataIndex: 'name',
      key: 'name',
      render: (_, record) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <Image
            src={record.imageUrl ?? undefined}
            alt={record.name}
            width={58}
            height={58}
            style={{ borderRadius: 12, objectFit: 'cover', border: '1px solid #E8E2D9' }}
          />
          <div>
            <div
              style={{
                fontFamily: 'Baloo 2, sans-serif',
                fontWeight: 600,
                fontSize: 15,
                color: '#16100D',
              }}
            >
              {record.name}
            </div>
            <div style={{ fontSize: 12, color: '#6B6259', marginTop: 2 }}>
              <code>/{record.slug}</code>
            </div>
          </div>
        </div>
      ),
    },
    {
      title: t("business:catalog.category"),
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
      title: t("business:catalog.listPrice"),
      dataIndex: 'basePrice',
      key: 'basePrice',
      width: 140,
      render: (price) => (
        <span
          style={{
            fontFamily: 'Baloo 2, sans-serif',
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
      title: t("business:catalog.spiceLevelCalories"),
      key: 'meta',
      width: 180,
      render: (_, record) => (
        <div>
          {spicyBadges(record.spicyLevel)}
          <span style={{ fontSize: 12, color: '#6B6259', marginLeft: 8 }}>
            {record.kcal != null && `${record.kcal} kcal`}
          </span>
        </div>
      ),
    },
    {
      title: t("business:party.custom"),
      key: 'options',
      width: 150,
      render: (_, record) => (
        <div style={{ fontSize: 12, color: '#6B6259' }}>
          <div>{record.options?.length || 0} {t("business:catalog.optionGroups")}</div>
          <div>{record.toppings?.length || 0} toppings</div>
        </div>
      ),
    },
    {
      title: t("business:catalog.status"),
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
            text={isActive ? t("business:catalog.onSale") : t("business:catalog.suspended")}
            size="small"
          />
        </div>
      ),
    },
    {
      title: t("business:catalog.actions"),
      key: 'action',
      width: 110,
      align: 'right',
      render: (_, record) => (
        <Space size={6}>
          <Tooltip title={t("business:catalog.editDish")}>
            <Button
              type="text"
              icon={<EditOutlined style={{ color: '#22577A' }} />}
              onClick={() => {
                setEditingProduct(record);
                setFormOpen(true);
              }}
            />
          </Tooltip>
          <Tooltip title={t("business:cart.removeItem")}>
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

  const comboColumns: TableColumnsType<Combo> = [
    {
      title: t("business:catalog.comboPackage"),
      key: 'name',
      render: (_, record) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <Image
            src={record.imageUrl ?? undefined}
            alt={record.name}
            width={58}
            height={58}
            style={{ borderRadius: 12, objectFit: 'cover', border: '1px solid #E8E2D9' }}
          />
          <div>
            <div
              style={{
                fontFamily: 'Baloo 2, sans-serif',
                fontWeight: 600,
                fontSize: 15,
                color: '#16100D',
              }}
            >
              {record.name}
              <Tag
                color="#8F1216"
                style={{
                  marginLeft: 8,
                  borderRadius: 999,
                  color: '#FFFFFF',
                  fontWeight: 700,
                  fontSize: 10,
                }}
              >
                COMBO
              </Tag>
            </div>
            <div style={{ fontSize: 12, color: '#6B6259', marginTop: 2 }}>
              <code>/{record.slug}</code>
            </div>
          </div>
        </div>
      ),
    },
    {
      title: t("business:catalog.includedDishes"),
      key: 'items',
      render: (_, record) => (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {record.items && record.items.length > 0 ? (
            record.items.map((item) => (
              <Tag
                key={item.productId}
                style={{
                  borderRadius: 6,
                  backgroundColor: '#F5EDE0',
                  borderColor: '#E8E2D9',
                  color: '#16100D',
                  fontWeight: 600,
                }}
              >
                {item.productName} (x{item.quantity})
              </Tag>
            ))
          ) : (
            <span style={{ fontSize: 12, color: '#6B6259' }}>{record.description}</span>
          )}
        </div>
      ),
    },
    {
      title: t("business:catalog.comboPrice"),
      dataIndex: 'comboPrice',
      key: 'comboPrice',
      width: 140,
      render: (price) => (
        <span
          style={{
            fontFamily: 'Baloo 2, sans-serif',
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
      title: t("business:catalog.status"),
      dataIndex: 'isActive',
      key: 'isActive',
      width: 170,
      render: (isActive, record) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Switch
            checked={isActive}
            onChange={(checked) => handleToggleComboStatus(record, checked)}
            size="small"
          />
          <StatusBadge
            status={isActive ? 'success' : 'error'}
            text={isActive ? t("business:catalog.onSale") : t("business:catalog.suspended")}
            size="small"
          />
        </div>
      ),
    },
    {
      title: t("business:catalog.actions"),
      key: 'action',
      width: 90,
      align: 'right',
      render: (_, record) => (
        <Tooltip title={t("business:catalog.deleteCombo")}>
          <Button
            type="text"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDeleteCombo(record)}
          />
        </Tooltip>
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
          > {t("business:catalog.menuProductManagement")} </h1>
          <p
            style={{
              fontFamily: 'Quicksand, sans-serif',
              color: '#6B6259',
              fontSize: 14,
              margin: '6px 0 0',
            }}
          > {t("business:catalog.manageChickenBurgersToppingsAndPromotionalCombosAcrossAllStores")} </p>
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
          > {t("business:catalog.addANewDish")} </Button>
        </Space>
      </div>

      {/* View Mode Switcher */}
      <Segmented
        value={viewMode}
        onChange={(val) => setViewMode(val as 'products' | 'combos')}
        options={[
          {
            label: (
              <span style={{ fontWeight: 700, padding: '4px 8px' }}>
                {t("business:catalog.individualDishes")} ({products.length})
              </span>
            ),
            value: 'products',
          },
          {
            label: (
              <span style={{ fontWeight: 700, padding: '4px 8px' }}>
                {t("business:catalog.promotionalCombos")} ({combos.length})
              </span>
            ),
            value: 'combos',
          },
        ]}
        style={{
          marginBottom: 20,
          background: '#FFFAF3',
          border: '1px solid #E8E2D9',
          padding: 4,
          borderRadius: 14,
          fontFamily: 'Quicksand, sans-serif',
        }}
      />

      {/* Admin Table for Products or Combos */}
      {viewMode === 'products' ? (
        <AdminTable<Product>
          columns={columns}
          dataSource={filteredProducts}
          rowKey="id"
          searchPlaceholder={t("business:catalog.searchDishNamesSlugsCategories")}
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
                      <CategoryIcon id={0} size={15} active={categoryFilter === 'ALL'} activeTheme="on-light" /> {t("business:catalog.all")} </span>
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
                      <CategoryIcon id={1} size={15} active={categoryFilter === '1'} activeTheme="on-light" /> {t("business:catalog.friedChicken")} </span>
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
                      <CategoryIcon id={4} size={15} active={categoryFilter === '4'} activeTheme="on-light" /> {t("business:catalog.sides")} </span>
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
                      <CategoryIcon id={5} size={15} active={categoryFilter === '5'} activeTheme="on-light" /> {t("business:catalog.drinks")} </span>
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
          emptyTitle={t("business:catalog.noDishesInThisCategory")}
          emptyDescription={t("business:catalog.tryAnotherCategoryOrADifferentSearchTerm")}
        />
      ) : (
        <AdminTable<Combo>
          columns={comboColumns}
          dataSource={filteredCombos}
          rowKey="id"
          searchPlaceholder={t("business:catalog.searchPromotionalComboNames")}
          searchValue={searchTerm}
          onSearchChange={setSearchTerm}
          emptyTitle={t("business:catalog.noCombosFound")}
          emptyDescription={t("business:catalog.tryAnotherSearchTermOrCreateAComboUsingTheButtonAbove")}
        />
      )}

      {/* Product Form Drawer */}
      <ProductForm
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditingProduct(null);
          setPendingProductUpload(null);
          setPendingComboUpload(null);
        }}
        initialProduct={editingProduct}
        products={products}
        categories={categories}
        onSaveProduct={handleSaveProduct}
        onSaveCombo={handleSaveCombo}
      />

      {/* Confirm Delete Modal */}
      <ConfirmModal
        open={deleteModalOpen}
        title={t("business:catalog.removeThisDishFromTheMenu")}
        content={
          <span> {t("business:catalog.areYouSureYouWantToDelete")}{' '}
            <strong>"{productToDelete?.name}"</strong>{t("business:catalog.thisWillRemoveTheDishFromTheCustomerAppAndStoreCatalog")} </span>
        }
        onConfirm={handleDeleteConfirm}
        onCancel={() => {
          setDeleteModalOpen(false);
          setProductToDelete(null);
        }}
        confirmText={t("business:catalog.deletePermanently")}
        danger
      />
    </div>
  );
};

export default CatalogPage;
