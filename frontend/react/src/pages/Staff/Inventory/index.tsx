import { message } from "../../../components/feedback";
import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from "react-i18next";
import { Alert, Button, Space, Tag, Switch, Image, Form, InputNumber, Card, Row, Col, Statistic, Select } from "antd";
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
import { CatalogImage } from '../../Catalog/ImageField';
import { stockState } from './stock-state';
import './inventory.css';

export const StaffInventoryPage: React.FC = () => {
  const { t } = useTranslation();

  const { user, isAdmin, isStaff } = useAuth();
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'AVAILABLE' | 'LOW_STOCK' | 'SOLD_OUT'>('ALL');
  const [adminSelectedStoreId, setAdminSelectedStoreId] = useState<number>(user.storeId ?? 0);
  const [modalOpen, setModalOpen] = useState(false);
  const [thresholdModalOpen, setThresholdModalOpen] = useState(false);
  const [thresholdStore, setThresholdStore] = useState<Store | null>(null);
  const [savingStock, setSavingStock] = useState(false);
  const [savingProductId, setSavingProductId] = useState<number | null>(null);
  const inventoryRequest = useRef(0);
  const [thresholdInput, setThresholdInput] = useState<number | null>(20);
  const thresholdValid = typeof thresholdInput === 'number' && Number.isInteger(thresholdInput) && thresholdInput >= 0 && thresholdInput <= 9999;
  const [savingThreshold, setSavingThreshold] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [stockError, setStockError] = useState('');
  const [thresholdError, setThresholdError] = useState('');
  const mutationLock = useRef(false);
  const [form] = Form.useForm();
  const quantityInput = Form.useWatch<number | null>('quantityAvailable', form);
  const quantityValid = typeof quantityInput === 'number' && Number.isInteger(quantityInput) && quantityInput >= 0 && quantityInput <= 9999;
  const quantityDifference = editingItem && quantityValid ? quantityInput! - editingItem.quantityAvailable : null;
  const editingStore = stores.find(store => store.id === editingItem?.storeId);
  const busy = savingStock || savingThreshold || savingProductId !== null;

  const activeStoreId = isAdmin ? adminSelectedStoreId || stores[0]?.id : user.storeId;
  const currentStore = stores.find((s) => s.id === activeStoreId);
  const currentStoreName = currentStore?.name || user.storeName;
  const storeThreshold = currentStore?.lowStockThreshold ?? 20;

  const fetchInventory = useCallback(async () => {
    const requestId = ++inventoryRequest.current;
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
      if (requestId !== inventoryRequest.current) return;
      setStores(storeList);
      setInventory(invList);
      setLoadError('');
      if (isAdmin && selectedStoreId && selectedStoreId !== adminSelectedStoreId) {
        setAdminSelectedStoreId(selectedStoreId);
      }
    } catch (err) {
      if (requestId === inventoryRequest.current) setLoadError(getErrorMessage(err));
    } finally {
      if (requestId === inventoryRequest.current) setLoading(false);
    }
  }, [adminSelectedStoreId, isAdmin, user.storeId]);

  useEffect(() => {
    fetchInventory();
    return () => { inventoryRequest.current += 1; };
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

      const isLowStock = item.quantityAvailable <= storeThreshold && !item.isSoldOut;
      const isSoldOut = item.isSoldOut || item.quantityAvailable === 0;
      const isAvailable = !isSoldOut && !isLowStock;

      let matchStatus = true;
      const state = isAdmin ? stockState(item, storeThreshold) : { available: isAvailable, lowStock: isLowStock, soldOut: isSoldOut };
      if (statusFilter === 'AVAILABLE') matchStatus = state.available;
      else if (statusFilter === 'LOW_STOCK') matchStatus = state.lowStock;
      else if (statusFilter === 'SOLD_OUT') matchStatus = state.soldOut;

      return matchSearch && matchStatus;
    });
  }, [storeInventory, searchTerm, statusFilter, storeThreshold, isAdmin]);

  // Statistics for current store
  const totalItems = storeInventory.length;
  const lowStockCount = storeInventory.filter(
    (i) => isAdmin ? stockState(i, storeThreshold).lowStock : i.quantityAvailable <= storeThreshold && !i.isSoldOut
  ).length;
  const soldOutCount = storeInventory.filter((i) => i.isSoldOut || i.quantityAvailable === 0).length;
  const availableCount = totalItems - soldOutCount;

  // Toggle "Hết món trong ca" (Local branch switch)
  const handleToggleSoldOut = async (item: InventoryItem, checked: boolean) => {
    if (savingProductId !== null || mutationLock.current) return;
    mutationLock.current = true;
    try {
      if (!activeStoreId) return;
      if (!checked && item.quantityAvailable <= 0) {
        message.error(t("business:inventory.outOfStockCannotEnable"));
        return;
      }
      setSavingProductId(item.productId);
      await inventoryApi.updateAvailability(isAdmin ? item.storeId : activeStoreId, item.productId, {
        isSoldOut: checked, ...(isAdmin ? { expectedVersion: item.availabilityVersion } : {}),
      });
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
    } finally {
      mutationLock.current = false;
      setSavingProductId(null);
    }
  };

  const handleOpenUpdateModal = (item: InventoryItem) => {
    setStockError('');
    form.resetFields();
    setEditingItem(item);
    form.setFieldsValue({
      quantityAvailable: item.quantityAvailable,
    });
    setModalOpen(true);
  };

  const handleUpdateStockSubmit = async () => {
    if (savingStock || mutationLock.current) return;
    mutationLock.current = true;
    setStockError('');
    try {
      const values = await form.validateFields();
      setSavingStock(true);
      if (editingItem && activeStoreId) {
        const payload = {
          quantityAvailable: values.quantityAvailable,
          ...(isAdmin ? { expectedVersion: editingItem.version } : {}),
        };

        const updated = await inventoryApi.updateInventory(isAdmin ? editingItem.storeId : activeStoreId, editingItem.productId, payload);
        setInventory((prev) =>
          prev.map((i) =>
            i.productId === editingItem.productId && i.storeId === updated.storeId ? updated : i
          )
        );
        message.success(
          t("business:inventory.inventoryQuantityUpdatedFor", { value1: editingItem.productName })
        );
      }
      setModalOpen(false);
    } catch (err) {
      if (err && typeof err === 'object' && 'errorFields' in err) {
        form.scrollToField('quantityAvailable', { focus: true });
      } else if (isAdmin) setStockError(getErrorMessage(err));
      else message.error(getErrorMessage(err));
    } finally {
      mutationLock.current = false;
      setSavingStock(false);
    }
  };

  const columns: TableColumnsType<InventoryItem> = [
    {
      title: t("business:catalog.dish"),
      key: 'product',
      width: isAdmin ? 330 : undefined,
      render: (_, record) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {isAdmin ? <div className="inventory-thumb"><CatalogImage url={record.imageUrl} name={record.productName} /></div> : <Image
            src={record.imageUrl ?? undefined}
            alt={record.productName}
            width={52}
            height={52}
            style={{ borderRadius: 12, objectFit: 'cover', border: '1px solid #E8E2D9' }}
          />}
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
        const isLow = isAdmin ? stockState(record, storeThreshold).lowStock : qty <= storeThreshold && !record.isSoldOut;
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
      key: 'storeThreshold',
      width: 150,
      render: () => (
        <span style={{ fontFamily: 'Quicksand, sans-serif', fontWeight: 600, color: '#6B6259' }}>
          ≤ {storeThreshold} {t("business:cart.servings")} </span>
      ),
    },
    {
      title: t("business:inventory.soldOutThisShift"),
      key: 'soldOut',
      width: isAdmin ? 205 : 170,
      render: (_, record) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Switch
            checked={isAdmin ? stockState(record, storeThreshold).soldOut : record.isSoldOut}
            loading={savingProductId === record.productId}
            disabled={savingProductId !== null || loading || (isAdmin && (busy || record.quantityAvailable <= 0))}
            aria-label={`${t("business:inventory.soldOutThisShift")}: ${record.productName}`}
            onChange={(checked) => handleToggleSoldOut(record, checked)}
            style={{
              backgroundColor: record.isSoldOut ? '#B42318' : undefined,
            }}
          />
          <StatusBadge
            status={(isAdmin ? stockState(record, storeThreshold).soldOut : record.isSoldOut) ? 'error' : 'success'}
            text={isAdmin && record.quantityAvailable <= 0 ? t("admin:ui.outOfStock") : record.isSoldOut ? t("business:inventory.salesDisabled") : t("business:catalog.available")}
            size="small"
          />
        </div>
      ),
    },
    {
      title: t("business:inventory.lastUpdated"),
      key: 'updated',
      width: isAdmin ? 195 : undefined,
      render: (_, record) => (
        <div style={{ fontSize: 12, color: '#6B6259' }}>
          <div>{record.updatedAt || '—'}</div>
          <div style={{ color: '#16100D', fontWeight: 600 }}>{record.updatedBy || '—'}</div>
        </div>
      ),
    },
    {
      title: t("business:catalog.actions"),
      key: 'action',
      width: 120,
      fixed: isAdmin ? 'right' : undefined,
      align: 'right',
      render: (_, record) => (
        <Button
          size="small"
          disabled={isStaff || (isAdmin && (busy || loading))}
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

  if (loadError) return <Alert type="error" showIcon message={loadError} action={<Button loading={loading} onClick={fetchInventory}>{t('common:retry')}</Button>} />;
  return (
    <div className={isAdmin ? 'inventory-admin' : undefined}>
      {isAdmin ? <header className="inventory-header"><div><span className="inventory-eyebrow">{t("admin:ui.branchInventory")}</span><h1>{t("admin:ui.stockCountAvailability")}</h1><p>{t("admin:ui.recordActualQuantitiesAndManageDishesAvailableAt")}</p></div>
        <div className="inventory-store-select"><label htmlFor="inventory-store">{t("admin:ui.managedBranch")}</label><Select id="inventory-store" aria-label={t("admin:ui.managedBranch")} size="large" showSearch optionFilterProp="label" value={activeStoreId} disabled={busy || loading} loading={loading} placeholder={t("accounts:store")} onChange={value => { setAdminSelectedStoreId(value); setSearchTerm(''); setStatusFilter('ALL'); }} options={stores.map(store => ({ value: store.id, label: store.name }))} /></div>
        <div className="inventory-threshold-banner"><div><WarningOutlined /><span>{t("admin:ui.branchWarningThreshold")} <strong>{loading ? '—' : currentStore ? t("admin:ui.portions579", { value1: storeThreshold }) : t("admin:ui.noBranchAvailable")}</strong></span></div>
          <Button icon={<EditOutlined />} disabled={!currentStore || busy || loading} onClick={() => { setThresholdInput(storeThreshold); setThresholdStore(currentStore ?? null); setThresholdError(''); setThresholdModalOpen(true); }}>{t("admin:ui.editThreshold")}</Button>
        </div>
      </header> : <>
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
            <Tag
              color="orange"
              style={{
                borderRadius: 999,
                fontWeight: 600,
                fontSize: 13,
                padding: '3px 12px',
              }}
            >
              {t("business:inventory.storeLowStockThreshold")}: ≤ {storeThreshold} {t("business:cart.servings")}
            </Tag>
            {!isStaff && activeStoreId && (
              <Button
                size="small"
                icon={<EditOutlined />}
                onClick={() => {
                  setThresholdInput(storeThreshold);
                  setThresholdStore(currentStore ?? null);
                  setThresholdModalOpen(true);
                }}
                style={{ borderRadius: 999, fontWeight: 600 }}
              >
                {t("business:inventory.editStoreThreshold")}
              </Button>
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

      </>}
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
              value={isAdmin && loading ? '—' : totalItems}
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
              value={isAdmin && loading ? '—' : availableCount}
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
              value={isAdmin && loading ? '—' : lowStockCount}
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
              value={isAdmin && loading ? '—' : soldOutCount}
              suffix={t("business:orderspage.items")}
              valueStyle={{ fontFamily: 'Fredoka', color: '#B42318', fontWeight: 700 }}
              prefix={<StopOutlined style={{ color: '#B42318' }} />}
            />
          </Card>
        </Col>
      </Row>

      {/* Admin Table */}
      <AdminTable<InventoryItem>
        key={isAdmin ? activeStoreId : 'branch-inventory'}
        columns={isAdmin ? columns.filter(column => column.key !== 'storeThreshold') : columns}
        loading={loading}
        tableLayout={isAdmin ? 'fixed' : undefined}
        scroll={isAdmin ? { x: 1020 } : undefined}
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
        className={isAdmin ? 'inventory-modal' : undefined}
        centered={isAdmin}
        styles={isAdmin ? {} : undefined}
        maskClosable={isAdmin ? false : undefined}
        open={modalOpen}
        onCancel={() => { if (!savingStock) { setModalOpen(false); void fetchInventory(); } }}
        onOk={handleUpdateStockSubmit}
        confirmLoading={savingStock}
        title={isAdmin ? t("admin:ui.updateStock") : t("business:inventory.updateInventory", { value1: editingItem?.productName })}
        subtitle={isAdmin ? editingStore?.name : t("business:inventory.recordActualQuantitiesAfterShiftStocktake")}
        width={isAdmin ? 560 : 480}
        okText={isAdmin ? t("admin:ui.saveStockCount") : undefined}
        okButtonProps={{ disabled: isAdmin && (!quantityValid || quantityDifference === 0) }}
      >
        {isAdmin && editingItem && <div className="inventory-product-summary"><div className="inventory-thumb"><CatalogImage url={editingItem.imageUrl} name={editingItem.productName} /></div><div><strong>{editingItem.productName}</strong><span>{editingItem.categoryName} {t("admin:ui.dishId")}{editingItem.productId}</span></div></div>}
        {isAdmin && stockError && <Alert type="error" showIcon message={stockError} description={t("admin:ui.yourInputIsPreservedIfThereIsA")} />}
        <Form name="inventory-stock" form={form} layout="vertical" disabled={savingStock} onFinish={handleUpdateStockSubmit}>
          {isAdmin && <div className="inventory-recorded"><span>{t("admin:ui.recordedQuantity")}</span><strong>{editingItem?.quantityAvailable ?? '—'} <small>{t("business:cart.servings")}</small></strong></div>}
          <Form.Item
            name="quantityAvailable"
            label={isAdmin ? t("admin:ui.actualQuantityAfterCounting") : t("business:inventory.actualRemainingQuantityServings")}
            rules={[{ required: true, message: t("business:inventory.pleaseEnterTheInventoryQuantity") }, { type: 'integer', min: 0, max: 9999, message: t("admin:ui.enterAWholeNumberFrom0To9") }]}
            extra={isAdmin ? t("admin:ui.enterTheTotalPortionsRemainingNotTheQuantity") : undefined}
          >
            <InputNumber disabled={isStaff || savingStock} min={0} max={9999} precision={0} size={isAdmin ? 'large' : undefined} style={{ width: '100%', height: isAdmin ? undefined : 40 }} />
          </Form.Item>
          {isAdmin ? <>
            {quantityDifference !== null && <div className={`inventory-difference ${quantityDifference < 0 ? 'is-decrease' : ''}`}><span>{t("admin:ui.differenceFromCurrentStock")}</span><strong>{quantityDifference > 0 ? '+' : ''}{quantityDifference} {t("business:cart.servings")}</strong></div>}
            {quantityValid && quantityInput === 0 && <Alert type="warning" showIcon message={t("admin:ui.thisDishWillBeOutOfStock")} description={t("admin:ui.savingAQuantityOf0DisablesSalesOf")} />}
            {quantityValid && quantityInput! > 0 && editingItem?.isSoldOut && <Alert type="info" showIcon message={t("admin:ui.salesOfThisDishAreDisabledAtThe")} description={t("admin:ui.updatingStockDoesNotReEnableSalesAutomatically")} />}
            <div className="inventory-audit-note"><span>{t("admin:ui.updatedBy")}</span><strong>{user.fullName}</strong><p>{t("admin:ui.theTimeAndActingAccountAreRecordedWhen")}</p></div>
          </> : <>
          <div style={{ marginBottom: 16 }}>
            <span style={{ color: '#6B6259', fontSize: 13 }}>
              {t("business:inventory.storeLowStockThreshold")}: <strong>≤ {storeThreshold} {t("business:cart.servings")}</strong>
            </span>
          </div>

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
          </>}
        </Form>
      </AdminModal>

      {/* Store Threshold Modal */}
      <AdminModal
        className={isAdmin ? 'inventory-modal' : undefined}
        centered={isAdmin}
        styles={isAdmin ? {} : undefined}
        maskClosable={isAdmin ? false : undefined}
        open={thresholdModalOpen}
        onCancel={() => { if (!savingThreshold) { setThresholdModalOpen(false); void fetchInventory(); } }}
        onOk={async () => {
          const targetStoreId = isAdmin ? thresholdStore?.id : activeStoreId;
          if (!targetStoreId || savingThreshold || mutationLock.current || !thresholdValid) return;
          mutationLock.current = true; setThresholdError('');
          try {
            setSavingThreshold(true);
            await inventoryApi.updateStoreThreshold(targetStoreId, thresholdInput!, isAdmin ? thresholdStore?.version : undefined);
            message.success(t("business:inventory.storeThresholdUpdated", { value1: thresholdInput }));
            await fetchInventory();
            setThresholdModalOpen(false);
          } catch (err) {
            if (isAdmin) setThresholdError(getErrorMessage(err));
            else message.error(getErrorMessage(err));
          } finally {
            mutationLock.current = false;
            setSavingThreshold(false);
          }
        }}
        confirmLoading={savingThreshold}
        title={t("business:inventory.editStoreThreshold")}
        subtitle={isAdmin ? thresholdStore?.name : t("business:inventory.storeThresholdSubtitle")}
        width={isAdmin ? 520 : 420}
        okText={isAdmin ? t("admin:ui.saveWarningThreshold") : undefined}
        okButtonProps={{ disabled: isAdmin && (!thresholdValid || thresholdInput === thresholdStore?.lowStockThreshold) }}
      >
        {isAdmin && <><p className="inventory-modal-hint">{t("admin:ui.oneThresholdAppliesToAllDishesInThe")}</p>
          <div className="inventory-recorded"><span>{t("admin:ui.currentThreshold")}</span><strong>≤ {thresholdStore?.lowStockThreshold ?? storeThreshold} <small>{t("business:cart.servings")}</small></strong></div></>}
        {isAdmin && thresholdError && <Alert type="error" showIcon message={thresholdError} description={t("admin:ui.ifTheDataHasChangedCloseTheForm")} />}
        <div style={{ padding: '12px 0' }}>
          <label htmlFor="inventory-threshold-value" style={{ display: 'block', marginBottom: 6, fontWeight: 600 }}>
            {t("business:inventory.storeLowStockThreshold")}
          </label>
          <InputNumber
            id="inventory-threshold-value"
            disabled={savingThreshold}
            precision={0}
            min={0}
            max={9999}
            value={thresholdInput}
            onChange={(val) => setThresholdInput(isAdmin ? val : val ?? 0)}
            style={{ width: '100%', height: 40 }}
          />
          {isAdmin && <p className="inventory-modal-hint">{t("admin:ui.thisOnlyUpdatesTheWarningThresholdItDoes")}</p>}
        </div>
      </AdminModal>
    </div>
  );
};

export default StaffInventoryPage;
