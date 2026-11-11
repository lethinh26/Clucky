import { message } from "../../../components/feedback";
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useTranslation } from "react-i18next";
import { Button, Space, Tag, Switch, Image, Form, InputNumber, Card, Row, Col, Statistic, Tooltip, Select } from "antd";
import { TableColumnsType } from "antd";
import {
  ShopOutlined,
  WarningOutlined,
  EditOutlined,
  CheckCircleOutlined,
  StopOutlined,
  InboxOutlined,
} from '@ant-design/icons';
import { AdminTable } from '../../../components/ui/AdminTable';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import { AdminModal } from '../../../components/ui/AdminModal';
import { useAuth } from '../../../context/AuthContext';
import { inventoryApi, storesApi, getErrorMessage, type InventoryItem, type Store } from '../../../lib/api';

export const StaffInventoryPage: React.FC = () => {
  const { t } = useTranslation();

  const { user, isAdmin, isStaff } = useAuth();
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [loadError, setLoadError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'AVAILABLE' | 'LOW_STOCK' | 'SOLD_OUT'>('ALL');
  const [adminSelectedStoreId, setAdminSelectedStoreId] = useState<number>(user.storeId ?? 0);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [form] = Form.useForm();

  const activeStoreId = isAdmin ? adminSelectedStoreId || stores[0]?.id : user.storeId;
  const currentStore = stores.find((s) => s.id === activeStoreId);
  const currentStoreName = currentStore?.name || user.storeName;

  const fetchInventory = useCallback(async () => {
    try {
      setLoading(true);
      const storeList = await storesApi.list(false);
      const selectedStoreId = isAdmin
        ? (storeList.some((store) => store.id === adminSelectedStoreId)
          ? adminSelectedStoreId
          : storeList[0]?.id)
        : user.storeId;
      const invList = selectedStoreId
        ? await inventoryApi.getStoreInventory(selectedStoreId)
        : [];
      setStores(storeList);
      setInventory(invList);
      setLoadError('');
      if (isAdmin && selectedStoreId && selectedStoreId !== adminSelectedStoreId) {
        setAdminSelectedStoreId(selectedStoreId);
      }
    } catch (err) {
      setLoadError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [activeStoreId, adminSelectedStoreId, isAdmin, user.storeId]);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  // Store-scoped inventory
  const storeInventory = useMemo(() => {
    return inventory.filter((item) => item.storeId === activeStoreId);
  }, [inventory, activeStoreId]);

  // Filter items for active store
  const filteredItems = useMemo(() => {
    return storeInventory.filter((item) => {
      const matchSearch =
        item.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.categoryName.toLowerCase().includes(searchTerm.toLowerCase());

      const isLowStock = item.quantityAvailable <= item.lowStockThreshold && !item.isSoldOut;
      const isSoldOut = item.isSoldOut || item.quantityAvailable === 0;
      const isAvailable = !isSoldOut && !isLowStock;

      let matchStatus = true;
      if (statusFilter === 'AVAILABLE') matchStatus = isAvailable;
      else if (statusFilter === 'LOW_STOCK') matchStatus = isLowStock;
      else if (statusFilter === 'SOLD_OUT') matchStatus = isSoldOut;

      return matchSearch && matchStatus;
    });
  }, [storeInventory, searchTerm, statusFilter]);

  // Statistics for current store
  const totalItems = storeInventory.length;
  const lowStockCount = storeInventory.filter(
    (i) => i.quantityAvailable <= i.lowStockThreshold && !i.isSoldOut
  ).length;
  const soldOutCount = storeInventory.filter((i) => i.isSoldOut || i.quantityAvailable === 0).length;
  const availableCount = totalItems - soldOutCount;

  // Toggle "Hết món trong ca" (Local branch switch)
  const handleToggleSoldOut = async (item: InventoryItem, checked: boolean) => {
    try {
      if (!activeStoreId) return;
      await inventoryApi.updateAvailability(activeStoreId, item.productId, { isSoldOut: checked });
      await fetchInventory();
      if (checked) {
        message.warning(
          t("business:inventory.markedAsSoldOutForThisShiftCustomersAtThisStoreWill", { value1: item.productName })
        );
      } else {
        message.success(
          t("business:inventory.isBackOnSaleAtThisStore", { value1: item.productName })
        );
      }
    } catch (err) {
      message.error(getErrorMessage(err));
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
      if (editingItem && activeStoreId) {
        const payload: { quantityAvailable?: number; lowStockThreshold?: number } = {
          quantityAvailable: values.quantityAvailable,
        };
        if (!isStaff && values.lowStockThreshold != null) {
          payload.lowStockThreshold = values.lowStockThreshold;
        }

        const updated = await inventoryApi.updateInventory(activeStoreId, editingItem.productId, payload);
        setInventory((prev) =>
          prev.map((i) =>
            i.productId === editingItem.productId ? updated : i
          )
        );
        message.success(
          t("business:inventory.inventoryQuantityUpdatedFor", { value1: editingItem.productName })
        );
      }
      setModalOpen(false);
    } catch (err) {
      message.error(getErrorMessage(err));
    }
  };

  const columns: TableColumnsType<InventoryItem> = [
    {
      title: t("business:catalog.dish"),
      key: 'product',
      render: (_, record) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <Image
            src={record.imageUrl ?? undefined}
            alt={record.productName}
            width={52}
            height={52}
            style={{ borderRadius: 12, objectFit: 'cover', border: '1px solid #E8E2D9' }}
          />
          <div>
            <div
              style={{
                fontFamily: 'Fredoka, Quicksand, sans-serif',
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
      title: t("business:inventory.currentInventory"),
      dataIndex: 'quantityAvailable',
      key: 'quantityAvailable',
      width: 170,
      render: (qty: number, record) => {
        const isLow = qty <= record.lowStockThreshold && !record.isSoldOut;
        return (
          <div>
            <span
              style={{
                fontFamily: 'Fredoka, Quicksand, sans-serif',
                fontSize: 20,
                fontWeight: 700,
                color: isLow ? '#D97706' : qty === 0 ? '#B42318' : '#1E7A46',
              }}
            >
              {qty} {t("business:cart.servings")} </span>
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
                  <WarningOutlined /> {t("business:inventory.lowStock")} </Tag>
              </div>
            )}
          </div>
        );
      },
    },
    {
      title: t("business:inventory.alertThreshold"),
      dataIndex: 'lowStockThreshold',
      key: 'lowStockThreshold',
      width: 150,
      render: (threshold: number) => (
        <span style={{ fontFamily: 'Quicksand, sans-serif', fontWeight: 600, color: '#6B6259' }}>
          ≤ {threshold} {t("business:cart.servings")} </span>
      ),
    },
    {
      title: t("business:inventory.soldOutThisShift"),
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
            text={record.isSoldOut ? t("business:inventory.salesDisabled") : t("business:catalog.available")}
            size="small"
          />
        </div>
      ),
    },
    {
      title: t("business:inventory.lastUpdated"),
      key: 'updated',
      render: (_, record) => (
        <div style={{ fontSize: 12, color: '#6B6259' }}>
          <div>{record.updatedAt}</div>
          <div style={{ color: '#16100D', fontWeight: 600 }}>{record.updatedBy}</div>
        </div>
      ),
    },
    {
      title: t("business:catalog.actions"),
      key: 'action',
      width: 120,
      align: 'right',
      render: (_, record) => (
        <Button
          size="small"
          disabled={isStaff}
          icon={<EditOutlined />}
          onClick={() => handleOpenUpdateModal(record)}
          style={{
            borderRadius: 999,
            fontFamily: 'Quicksand, sans-serif',
            fontWeight: 600,
            borderColor: '#E8E2D9',
          }}
        > {t("business:inventory.stocktake")} </Button>
      ),
    },
  ];

  if (loadError) return <div role="alert"><p>{loadError}</p><Button onClick={fetchInventory}>{t('common:retry')}</Button></div>;
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <h1
              style={{
                fontFamily: 'Fredoka, Quicksand, sans-serif',
                fontWeight: 700,
                fontSize: 28,
                color: '#16100D',
                margin: 0,
              }}
            > {t("business:inventory.storeInventoryStocktake")} </h1>
            {isAdmin ? (
              <Select
                value={adminSelectedStoreId}
                onChange={setAdminSelectedStoreId}
                style={{ width: 280, fontFamily: 'Quicksand, sans-serif' }}
                options={stores.map((s) => ({
                  value: s.id,
                  label: `🏪 ${s.name}`,
                }))}
              />
            ) : (
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
                <ShopOutlined /> {currentStoreName}
              </Tag>
            )}
          </div>
          <p
            style={{
              fontFamily: 'Quicksand, sans-serif',
              color: '#6B6259',
              fontSize: 14,
              margin: '6px 0 0',
            }}
          > {t("business:inventory.manageAvailableQuantitiesDuringTheShiftEnableLowStockAlertsAndInstantly")} </p>
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
              title={<span style={{ fontFamily: 'Quicksand', fontWeight: 600 }}>{t("business:inventory.totalStockItems")}</span>}
              value={totalItems}
              suffix={t("business:orderspage.items")}
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
              title={<span style={{ fontFamily: 'Quicksand', fontWeight: 600 }}>{t("business:catalog.available")}</span>}
              value={availableCount}
              suffix={t("business:orderspage.items")}
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
              title={<span style={{ fontFamily: 'Quicksand', fontWeight: 600 }}>{t("business:inventory.lowStock")}</span>}
              value={lowStockCount}
              suffix={t("business:orderspage.items")}
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
              title={<span style={{ fontFamily: 'Quicksand', fontWeight: 600 }}>{t("business:inventory.salesPausedThisShift")}</span>}
              value={soldOutCount}
              suffix={t("business:orderspage.items")}
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
        searchPlaceholder={t("business:inventory.searchInventoryItems")}
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        filterNodes={
          <Select
            value={statusFilter}
            onChange={setStatusFilter}
            style={{ width: 180, fontFamily: 'Quicksand, sans-serif' }}
            options={[
              { value: 'ALL', label: t("business:paymentspage.allStatuses") },
              { value: 'AVAILABLE', label: t("business:inventory.available") },
              { value: 'LOW_STOCK', label: t("business:inventory.lowStockLabel") },
              { value: 'SOLD_OUT', label: t("business:inventory.salesDisabledLabel") },
            ]}
          />
        }
        emptyTitle={t("business:inventory.noInventoryItemsFound")}
      />

      {/* Quick Stock Update Modal */}
      <AdminModal
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={handleUpdateStockSubmit}
        title={t("business:inventory.updateInventory", { value1: editingItem?.productName })}
        subtitle={t("business:inventory.recordActualQuantitiesAfterShiftStocktake")}
        width={480}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="quantityAvailable"
            label={t("business:inventory.actualRemainingQuantityServings")}
            rules={[{ required: true, message: t("business:inventory.pleaseEnterTheInventoryQuantity") }]}
          >
            <InputNumber disabled={isStaff} min={0} max={9999} style={{ width: '100%', height: 40 }} />
          </Form.Item>

          <Form.Item
            name="lowStockThreshold"
            label={t("business:inventory.lowStockAlertThresholdServings")}
            rules={isStaff ? [] : [{ required: true, message: t("business:inventory.pleaseEnterAnAlertThreshold") }]}
          >
            <InputNumber min={1} max={500} disabled={isStaff} style={{ width: '100%', height: 40 }} />
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
          > {t("business:inventory.stocktakeStaff")} <strong>{user.fullName}</strong> ({user.role})<br /> {t("business:inventory.recordedAtTheCurrentTime")} </div>
        </Form>
      </AdminModal>
    </div>
  );
};

export default StaffInventoryPage;
