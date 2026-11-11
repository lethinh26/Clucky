import { message } from "../../components/feedback";
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useTranslation } from "react-i18next";
import { Button, Space, Tag, Tooltip, Form, Input, Select, TimePicker, Radio } from "antd";
import { TableColumnsType } from "antd";
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
import { StoreLocationPicker, type StorePoint } from '../../components/StoreLocationPicker';
import { useAuth } from '../../context/AuthContext';
import { getStoreStatusMeta, normalizeStoreStatus, type StoreStatus } from '../../types/store';
import { storesApi, getErrorMessage, type Store } from '../../lib/api';

export const StoresPage: React.FC = () => {
  const { t } = useTranslation();

  const { user, isAdmin } = useAuth();
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [loadError, setLoadError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [missingOnly, setMissingOnly] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingStore, setEditingStore] = useState<Store | null>(null);
  const [form] = Form.useForm();
  const [locationStore, setLocationStore] = useState<Store | null>(null);
  const [locationPoint, setLocationPoint] = useState<StorePoint>({ latitude: null, longitude: null });
  const [savingLocation, setSavingLocation] = useState(false);
  const locationLock = React.useRef(false);
  const createKey = React.useRef(crypto.randomUUID());

  const fetchStores = useCallback(async () => {
    try {
      setLoading(true);
      setStores(await storesApi.list(false));
      setLoadError('');
    } catch (err) {
      setLoadError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [isAdmin, t]);

  useEffect(() => {
    fetchStores();
  }, [fetchStores]);

  // Role-based store isolation: Store Manager only sees their assigned branch
  const scopedStores = useMemo(() => {
    if (isAdmin) return stores;
    return stores.filter((store) => store.id === user.storeId);
  }, [stores, isAdmin, user.storeId, user.storeName]);

  const filteredStores = useMemo(() => {
    return scopedStores.filter((s) => {
      const currentStatus = normalizeStoreStatus(s.status);
      const matchStatus = statusFilter === 'ALL' ? true : currentStatus === statusFilter;
      const matchSearch =
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.district?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false) ||
        s.phone.includes(searchTerm);
      return matchStatus && matchSearch && (!missingOnly || s.latitude == null || s.longitude == null);
    });
  }, [scopedStores, statusFilter, searchTerm, missingOnly]);

  const handleOpenCreateModal = () => {
    createKey.current = crypto.randomUUID();
    setEditingStore(null);
    form.resetFields();
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
      const values = await form.validateFields(isAdmin ? undefined : ['openTime', 'closeTime', 'status']);
      const storePayload: Partial<Store> = {
        latitude: editingStore?.latitude ?? null,
        longitude: editingStore?.longitude ?? null,
        name: values.name,
        address: values.address,
        district: values.district,
        city: values.city,
        phone: values.phone,
        openTime: values.openTime.format('HH:mm'),
        closeTime: values.closeTime.format('HH:mm'),
        deliveryArea: values.deliveryArea,
        status: values.status,
        recoveryEmail: editingStore ? undefined : values.recoveryEmail,
      };

      if (editingStore) {
        const updated = isAdmin
          ? await storesApi.update(editingStore.id, storePayload)
          : await storesApi.updateOperation(editingStore.id, {
              openTime: storePayload.openTime, closeTime: storePayload.closeTime, status: storePayload.status,
            });
        setStores((prev) => prev.map((store) => store.id === updated.id ? updated : store));
        message.success(t("business:stores.storeDetailsUpdatedFor", { value1: updated.name }));
      } else {
        const created = await storesApi.create(storePayload, createKey.current);
        setEditingStore(created);
        setStores((prev) => [created, ...prev]);
        message.info(t("accounts:pending"));
      }

      await fetchStores();
      setModalOpen(false);
      setEditingStore(null);
    } catch (err) {
      message.error(getErrorMessage(err, t("business:stores.pleaseCheckTheStoreInformationFields")));
    }
  };

  const handleQuickStatusChange = async (store: Store, newStatus: StoreStatus) => {
    try {
      await storesApi.updateOperation(store.id, { status: newStatus });
      setStores((prev) =>
        prev.map((s) => (s.id === store.id ? { ...s, status: newStatus } : s))
      );
      const label =
        newStatus === 'OPEN'
          ? t("business:stores.open")
          : newStatus === 'CLOSED_TEMP'
            ? t("business:stores.temporarilyClosed")
            : t("business:stores.inactive");
      message.success(t("business:stores.changedStoreTo", { value1: store.name, value2: label }));
    } catch (err) {
      message.error(getErrorMessage(err));
    }
  };

  const columns: TableColumnsType<Store> = [
    {
      title: t("business:stores.storeNameHotline"),
      key: 'name',
      render: (_, record) => (
        <div>
          <div
            style={{
              fontFamily: 'Fredoka, Quicksand, sans-serif',
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
      title: t("business:stores.addressArea"),
      key: 'address',
      render: (_, record) => (
        <div>
          <div style={{ color: '#16100D', fontWeight: 600 }}>{record.address}</div>
          <div style={{ fontSize: 12, color: '#6B6259', marginTop: 2 }}>
            <CompassOutlined /> {t("business:stores.delivery")} {record.deliveryArea}
          </div>
        </div>
      ),
    },
    {
      title: t('maps:mapLabel'),
      key: 'location',
      width: 150,
      render: (_, record) => <Tag color={record.latitude != null && record.longitude != null ? 'green' : 'orange'}>{t(record.latitude != null && record.longitude != null ? 'maps:locationConfirmed' : 'maps:missingLocations')}</Tag>,
    },
    {
      title: t("business:stores.openingTime"),
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
      title: t("business:reviews.storeManager"),
      dataIndex: 'managerName',
      key: 'managerName',
      width: 170,
      render: (manager) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
          <UserOutlined style={{ color: '#C9A227' }} />
          <span style={{ fontWeight: 600, color: '#16100D' }}>{manager || t('errors:NOT_IMPLEMENTED')}</span>
        </div>
      ),
    },
    {
      title: t("business:stores.operatingStatus"),
      dataIndex: 'status',
      key: 'status',
      width: 160,
      render: (status: Store['status']) => {
        const meta = getStoreStatusMeta(status);
        const text =
          meta.key === 'OPEN'
            ? t("business:stores.open")
            : meta.key === 'CLOSED_TEMP'
              ? t("business:stores.temporarilyClosed")
              : t("business:stores.inactive");
        return <StatusBadge status={meta.badgeStatus} text={text} />;
      },
    },
    {
      title: t("business:catalog.actions"),
      key: 'action',
      width: 140,
      align: 'right',
      render: (_, record) => (
        <Space size={6}>
          <Tooltip title={t('maps:viewLocation')}><Button type="text" icon={<CompassOutlined />} onClick={() => { setLocationStore(record); setLocationPoint({ latitude: record.latitude ?? null, longitude: record.longitude ?? null }); }} /></Tooltip>
          <Tooltip title={t("business:stores.editStore")}>
            <Button
              type="text"
              icon={<EditOutlined style={{ color: '#22577A' }} />}
              onClick={() => handleOpenEditModal(record)}
            />
          </Tooltip>
          {record.status === 'OPEN' ? (
            <Tooltip title={t("business:stores.temporarilyClose")}>
              <Button
                type="text"
                danger
                icon={<ExclamationCircleOutlined />}
                onClick={() => handleQuickStatusChange(record, 'CLOSED_TEMP')}
              />
            </Tooltip>
          ) : (
            <Tooltip title={t("business:stores.reopen")}>
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

  if (loadError) return <div role="alert"><p>{loadError}</p><Button onClick={fetchStores}>{t('common:retry')}</Button></div>;
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
              fontFamily: 'Fredoka, Quicksand, sans-serif',
              fontWeight: 700,
              fontSize: 28,
              color: '#16100D',
              margin: 0,
            }}
          > {t("business:stores.storeNetworkManagement")} </h1>
          <p
            style={{
              fontFamily: 'Quicksand, sans-serif',
              color: '#6B6259',
              fontSize: 14,
              margin: '6px 0 0',
            }}
          > {t("business:stores.configureOpeningHoursDeliveryAreasAndManagersForEachCluckyStore")} </p>
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
          > {t("business:stores.addANewStore")} </Button>
        )}
      </div>

      {/* Admin Table */}
      <AdminTable<Store>
        columns={columns}
        dataSource={filteredStores}
        rowKey="id"
        searchPlaceholder={t("business:stores.searchByStoreNameStreetDistrict")}
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        filterNodes={
          <Space wrap><Select value={missingOnly ? 'missing' : 'all'} onChange={value => setMissingOnly(value === 'missing')} style={{ width: 180 }} options={[{ value: 'all', label: t('maps:allLocations') }, { value: 'missing', label: t('maps:missingLocations') }]} />
          <Select
            value={statusFilter}
            onChange={setStatusFilter}
            style={{ width: 180, fontFamily: 'Quicksand, sans-serif' }}
            options={[
              { value: 'ALL', label: t("business:stores.allStores") },
              { value: 'OPEN', label: t("business:stores.openLabel") },
              { value: 'CLOSED_TEMP', label: t("business:stores.temporarilyClosedIndicator") },
              { value: 'INACTIVE', label: t("business:stores.inactiveLabel") },
            ]}
          /></Space>
        }
        emptyTitle={t("business:stores.noStoresFound")}
        emptyDescription={t("business:stores.tryADifferentDistrictOrStatus")}
      />

      {/* Create / Edit Store Modal */}
      <AdminModal open={Boolean(locationStore)} confirmLoading={savingLocation} onCancel={() => { if (!savingLocation) setLocationStore(null); }} title={t('maps:viewLocation')} subtitle={locationStore?.name} width={740}
        onOk={async () => {
          if (!locationStore || locationLock.current) return;
          if ((locationPoint.latitude == null) !== (locationPoint.longitude == null)) { message.error(t('maps:pinHint')); return; }
          locationLock.current = true; setSavingLocation(true);
          try {
            const saved = await storesApi.updateLocation(locationStore.id, locationPoint);
            setStores(current => current.map(store => store.id === saved.id ? { ...store, ...saved } : store)); setLocationStore(null);
          } catch (error) { message.error(getErrorMessage(error)); }
          finally { locationLock.current = false; setSavingLocation(false); }
        }}>
        {locationStore && <StoreLocationPicker key={locationStore.id} address={locationStore.address} value={locationPoint} onChange={savingLocation ? undefined : setLocationPoint} />}
      </AdminModal>
      <AdminModal
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={handleFormSubmit}
        title={editingStore ? t("business:stores.editStoreDetails") : t("business:stores.setUpANewStore")}
        subtitle={t("business:stores.detailsShownInTheCustomerAppAndUsedForOrderRouting")}
        width={680}
      >
        {!isAdmin && <p>{t('errors:NOT_IMPLEMENTED')}: {t('business:stores.storeHotline')} / {t('business:stores.supportedDeliveryAreaRadiusNearbyDistricts')}</p>}
        <Form form={form} layout="vertical" disabled={!isAdmin}>
          {!editingStore && <Form.Item name="recoveryEmail" label={t("accounts:recovery")} rules={[{ required: true, type: 'email', max: 255 }]}><Input autoComplete="email" /></Form.Item>}
          <Form.Item
            name="name"
            label={t("business:stores.storeName")}
            rules={[{ required: true, message: t("business:stores.pleaseEnterAStoreName") }]}
          >
            <Input placeholder={t("business:stores.forExampleCluckyLLIFlagshipStore")} style={{ height: 40 }} />
          </Form.Item>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
            <Form.Item
              name="address"
              label={t("business:stores.fullAddressHouseNumberStreetWard")}
              rules={[{ required: true, message: t("business:stores.enterFullAddress") }]}
            >
              <Input placeholder={t("business:stores.enterFullAddress")} style={{ height: 40 }} />
            </Form.Item>

            <Form.Item
              name="district"
              label={t("business:account.district")}
              rules={[{ required: true, message: t("business:stores.enterDistrict") }]}
            >
              <Input placeholder={t("business:stores.enterDistrict")} style={{ height: 40 }} />
            </Form.Item>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
            <Form.Item
              name="phone"
              label={t("business:stores.storeHotline")}
              rules={[{ required: true, message: t("business:stores.enterHotline") }]}
            >
              <Input placeholder={t("business:stores.enterHotline")} style={{ height: 40 }} />
            </Form.Item>

            <Form.Item
              name="openTime"
              label={t("business:stores.openingTime")}
              rules={[{ required: true, message: t("business:stores.chooseOpeningTime") }]}
            >
              <TimePicker disabled={false} format="HH:mm" style={{ width: '100%', height: 40 }} />
            </Form.Item>

            <Form.Item
              name="closeTime"
              label={t("business:stores.closingTime")}
              rules={[{ required: true, message: t("business:stores.chooseClosingTime") }]}
            >
              <TimePicker disabled={false} format="HH:mm" style={{ width: '100%', height: 40 }} />
            </Form.Item>
          </div>

          <Form.Item
            name="city"
            label={t("business:stores.city")}
            rules={[{ required: true, message: t("business:stores.enterCity") }]}
          >
            <Input placeholder={t("business:stores.enterCity")} style={{ height: 40 }} />
          </Form.Item>

          <Form.Item
            name="deliveryArea"
            label={t("business:stores.supportedDeliveryAreaRadiusNearbyDistricts")}
            rules={[{ required: true, message: t("business:stores.pleaseDescribeTheDeliveryArea") }]}
          >
            <Input.TextArea
              rows={2}
              placeholder={t("business:stores.forExampleDistrictsBNhThNhKmRadius")}
            />
          </Form.Item>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Form.Item name="managerId" label={t("business:stores.assignAStoreManager")}>
              <Select
                disabled
                title={t('errors:NOT_IMPLEMENTED')}
                placeholder={t("business:stores.chooseTheResponsibleManager")}
                style={{ height: 40 }}
                options={[]}
              />
            </Form.Item>

            <Form.Item name="status" label={t("business:stores.activityStatus")}>
              <Radio.Group disabled={false} style={{ marginTop: 6 }}>
                <Radio value="OPEN">{t("business:stores.open")}</Radio>
                <Radio value="CLOSED_TEMP">{t("business:stores.temporarilyClosed")}</Radio>
                <Radio value="INACTIVE">{t("business:stores.salesStopped")}</Radio>
              </Radio.Group>
            </Form.Item>
          </div>
        </Form>
      </AdminModal>
    </div>
  );
};

export default StoresPage;
