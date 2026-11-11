import { message } from "../../components/feedback";
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useTranslation } from "react-i18next";
import { Alert, Button, ConfigProvider, Modal, Space, Tag, Tooltip, Form, Input, Select, TimePicker, Radio } from "antd";
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
import { catalogAdministration } from '../../lib/catalog-administration';
import { ShippingSettings, StoreDeliverySettings } from './ShippingSettings';
import { StoreReadiness } from './StoreReadiness';
import { AdminStores, AdminStoreFields } from './AdminStores';
import { storeTime } from './presentation';

export const StoresPage: React.FC = () => {
  const { t } = useTranslation();

  const { user, isAdmin } = useAuth();
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
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
  const mutationLock = React.useRef(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [deactivation, setDeactivation] = useState<Store | null>(null);
  const [deactivationError, setDeactivationError] = useState('');
  const [locationError, setLocationError] = useState('');
  const storeRequest = React.useRef<AbortController | null>(null);

  const fetchStores = useCallback(async () => {
    storeRequest.current?.abort();
    const controller = new AbortController();
    storeRequest.current = controller;
    try {
      setLoading(true);
      const result = await storesApi.list(false, controller.signal);
      if (controller.signal.aborted) return;
      setStores(result);
      setLoadError('');
    } catch (err) {
      if (!controller.signal.aborted) setLoadError(getErrorMessage(err));
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStores();
    return () => storeRequest.current?.abort();
  }, [fetchStores, isAdmin, user.storeId]);

  // Role-based store isolation: Store Manager only sees their assigned branch
  const scopedStores = useMemo(() => {
    if (isAdmin) return stores;
    return stores.filter((store) => store.id === user.storeId);
  }, [stores, isAdmin, user.storeId]);

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
    setSaveError('');
    createKey.current = crypto.randomUUID();
    setEditingStore(null);
    form.resetFields();
    if (isAdmin) form.setFieldsValue({ status: 'CLOSED_TEMP' });
    setModalOpen(true);
  };

  const handleOpenEditModal = (store: Store) => {
    setSaveError('');
    setEditingStore(store);
    form.resetFields();
    form.setFieldsValue({
      name: store.name,
      address: store.address,
      district: store.district,
      city: store.city,
      phone: store.phone,
      openTime: isAdmin ? storeTime(store.openTime) : dayjs(store.openTime, 'HH:mm'),
      closeTime: isAdmin ? storeTime(store.closeTime) : dayjs(store.closeTime, 'HH:mm'),
      deliveryArea: store.deliveryArea,
      status: store.status,
      managerId: store.managerId,
    });
    setModalOpen(true);
  };

  const handleFormSubmit = async () => {
    if (mutationLock.current) return;
    mutationLock.current = true; setSaving(true); setSaveError('');
    try {
      const values = await form.validateFields(isAdmin ? undefined : ['openTime', 'closeTime', 'status', 'phone', 'deliveryArea']);
      const storePayload: Partial<Store> = {
        latitude: editingStore?.latitude ?? null,
        longitude: editingStore?.longitude ?? null,
        name: values.name,
        address: values.address,
        district: values.district,
        city: values.city,
        phone: values.phone,
        openTime: values.openTime ? values.openTime.format('HH:mm') : undefined,
        closeTime: values.closeTime ? values.closeTime.format('HH:mm') : undefined,
        deliveryArea: values.deliveryArea,
        status: values.status,
        recoveryEmail: editingStore ? undefined : values.recoveryEmail,
      };

      if (editingStore) {
        const updated = isAdmin
          ? await catalogAdministration.updateStore(editingStore, storePayload)
          : await storesApi.updateOperation(editingStore.id, {
              openTime: storePayload.openTime,
              closeTime: storePayload.closeTime,
              status: storePayload.status ?? undefined,
              phone: storePayload.phone ?? undefined,
              deliveryArea: storePayload.deliveryArea ?? undefined,
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
      if (err && typeof err === 'object' && 'errorFields' in err) {
        const fields = (err as { errorFields: { name: (string | number)[] }[] }).errorFields;
        if (fields[0]) form.scrollToField(fields[0].name, { focus: true });
      } else {
        setSaveError(getErrorMessage(err, t("business:stores.pleaseCheckTheStoreInformationFields")));
        await fetchStores();
      }
    } finally { mutationLock.current = false; setSaving(false); }
  };

  const handleQuickStatusChange = async (store: Store, newStatus: StoreStatus): Promise<boolean> => {
    if (mutationLock.current) return false;
    mutationLock.current = true; setSaving(true);
    try {
      const saved = isAdmin ? await catalogAdministration.storeOperation(store, { status: newStatus })
        : await storesApi.updateOperation(store.id, { status: newStatus });
      setStores((prev) =>
        prev.map((store) => (store.id === saved.id ? saved : store))
      );
      const label =
        newStatus === 'OPEN'
          ? t("business:stores.open")
          : newStatus === 'CLOSED_TEMP'
            ? t("business:stores.temporarilyClosed")
            : t("business:stores.inactive");
      message.success(t("business:stores.changedStoreTo", { value1: store.name, value2: label }));
      return true;
    } catch (err) {
      message.error(getErrorMessage(err));
      await fetchStores();
      return false;
    } finally { mutationLock.current = false; setSaving(false); }
  };

  const columns: TableColumnsType<Store> = [
    {
      title: t("business:stores.storeNameHotline"),
      key: 'name',
      render: (_, record) => (
        <div>
          <div
            style={{
              fontFamily: 'Fredoka, sans-serif',
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
          {isAdmin && <StoreReadiness store={record} onUpdated={async () => {
            const saved = await storesApi.get(record.id);
            setStores(current => current.map(store => store.id === saved.id ? saved : store));
          }} />}
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
          <Tooltip title={t('maps:viewLocation')}><Button type="text" aria-label={t('maps:viewLocation')} disabled={saving || savingLocation} icon={<CompassOutlined />} onClick={() => { setLocationStore(record); setLocationPoint({ latitude: record.latitude ?? null, longitude: record.longitude ?? null }); }} /></Tooltip>
          <Tooltip title={t("business:stores.editStore")}>
            <Button
              type="text"
              icon={<EditOutlined style={{ color: '#22577A' }} />}
              onClick={() => handleOpenEditModal(record)}
              disabled={saving || savingLocation}
              aria-label={t('business:stores.editStore')}
            />
          </Tooltip>
          {record.status === 'OPEN' ? (
            <Tooltip title={t("business:stores.temporarilyClose")}>
              <Button
                type="text"
                danger
                icon={<ExclamationCircleOutlined />}
                onClick={() => handleQuickStatusChange(record, 'CLOSED_TEMP')}
                disabled={saving || savingLocation}
                aria-label={t('business:stores.temporarilyClose')}
              />
            </Tooltip>
          ) : (
            <Tooltip title={t("business:stores.reopen")}>
              <Button
                type="text"
                style={{ color: '#1E7A46' }}
                icon={<CheckCircleOutlined />}
                onClick={() => handleQuickStatusChange(record, 'OPEN')}
                disabled={saving || savingLocation}
                aria-label={t('business:stores.reopen')}
              />
            </Tooltip>
          )}
          {isAdmin && <Button danger disabled={saving || record.status === 'INACTIVE'} onClick={() => { setDeactivationError(''); setDeactivation(record); }}>{t("business:stores.inactive")}</Button>}
        </Space>
      ),
    },
  ];

  return (
    <div className={isAdmin ? 'stores-admin-page' : undefined}>
      {loadError && <Alert type="error" showIcon title={loadError} action={<Button loading={loading} onClick={() => void fetchStores()}>{t('common:retry')}</Button>} />}
      <Modal className="stores-modal" centered width={520} maskClosable={false} closable={!saving} keyboard={!saving} cancelButtonProps={{ disabled: saving }} open={Boolean(deactivation)} title={t("admin:ui.deactivateBranch")} okText={t("business:stores.inactive")} cancelText={t("business:account.cancel")} confirmLoading={saving} okButtonProps={{ danger: true }}
        onCancel={() => { if (!mutationLock.current) setDeactivation(null); }} onOk={async () => {
          if (!deactivation || mutationLock.current || !isAdmin) return;
          mutationLock.current = true; setSaving(true); setDeactivationError('');
          try {
            const saved = await catalogAdministration.deactivateStore(deactivation);
            setStores(current => current.map(store => store.id === saved.id ? saved : store)); setDeactivation(null);
          } catch (failure) { setDeactivationError(getErrorMessage(failure)); await fetchStores(); }
          finally { mutationLock.current = false; setSaving(false); }
        }}>
        <div className="stores-confirm-store"><ShopOutlined /><div><strong>{deactivation?.name}</strong><p className="stores-note">{deactivation?.address}</p></div></div>
        <p>{t("admin:ui.theBranchBecomesInactiveAndStopsAcceptingNew")}</p>
        {deactivationError && <Alert type="error" showIcon title={deactivationError} description={t("admin:ui.ifTheVersionHasChangedCloseTheDialog")} />}
      </Modal>
      {isAdmin ? <AdminStores stores={stores} loading={loading} busy={saving || savingLocation} onCreate={handleOpenCreateModal}
        onEdit={handleOpenEditModal} onLocation={store => { setLocationError(''); setLocationStore(store); setLocationPoint({ latitude: store.latitude ?? null, longitude: store.longitude ?? null }); }}
        onStatus={handleQuickStatusChange} onDeactivate={store => { setDeactivationError(''); setDeactivation(store); }}
        onUpdated={saved => setStores(current => current.map(store => store.id === saved.id ? saved : store))} /> : <>
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
            disabled={saving || loading}
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
      <ShippingSettings />
      <AdminTable<Store>
        loading={loading}
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
      </>}

      {/* Create / Edit Store Modal */}
      <AdminModal className={isAdmin ? 'stores-modal' : undefined} centered={isAdmin} styles={isAdmin ? {} : undefined} maskClosable={isAdmin ? false : undefined}
        open={Boolean(locationStore)} confirmLoading={savingLocation} onCancel={() => { if (!savingLocation) setLocationStore(null); }} title={t('maps:viewLocation')} subtitle={locationStore?.name} width={isAdmin ? 880 : 740}
        okText={isAdmin ? t("admin:ui.saveLocation") : undefined}
        onOk={async () => {
          if (!locationStore || locationLock.current) return;
          if ((locationPoint.latitude == null) !== (locationPoint.longitude == null)) { message.error(t('maps:pinHint')); return; }
          locationLock.current = true; setSavingLocation(true); setLocationError('');
          try {
            const saved = isAdmin ? await catalogAdministration.storeLocation(locationStore, locationPoint)
              : await storesApi.updateLocation(locationStore.id, locationPoint);
            setStores(current => current.map(store => store.id === saved.id ? { ...store, ...saved } : store)); setLocationStore(null);
          } catch (error) { if (isAdmin) setLocationError(getErrorMessage(error)); else message.error(getErrorMessage(error)); await fetchStores(); }
          finally { locationLock.current = false; setSavingLocation(false); }
        }}>
        {isAdmin && <div className="stores-location-note"><CompassOutlined /><div><strong>{t("admin:ui.locateTheBranchPrecisely")}</strong><p>{locationStore?.address}</p><span>{t("admin:ui.searchAnAddressOrChooseAPointOn")}</span></div></div>}
        {locationError && <Alert type="error" showIcon message={locationError} />}
        {locationStore && <div className={isAdmin ? 'stores-location-picker' : undefined}><StoreLocationPicker key={locationStore.id} address={locationStore.address} value={locationPoint} onChange={savingLocation ? undefined : setLocationPoint} /></div>}
      </AdminModal>
      <ConfigProvider theme={{ token: { colorBgContainer: '#FFFFFF' } }}>
      <AdminModal
        className={isAdmin ? 'stores-modal' : undefined}
        centered={isAdmin}
        maskClosable={isAdmin ? false : undefined}
        open={modalOpen}
        confirmLoading={saving}
        onCancel={() => { if (!mutationLock.current) setModalOpen(false); }}
        onOk={handleFormSubmit}
        title={editingStore ? t("business:stores.editStoreDetails") : t("business:stores.setUpANewStore")}
        subtitle={t("business:stores.detailsShownInTheCustomerAppAndUsedForOrderRouting")}
        width={isAdmin ? 980 : 680}
        okText={isAdmin ? editingStore ? t("business:account.saveChanges") : t("admin:ui.createBranch") : undefined}
        styles={isAdmin ? {} : {
          container: { background: '#FFFFFF' },
          header: { background: '#FFFFFF', marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid #EEEEEE' },
          body: { background: '#FFFFFF', padding: '16px 0' },
          footer: { background: '#FFFFFF', marginTop: 20, paddingTop: 16, borderTop: '1px solid #EEEEEE' },
        }}
      >
        {saveError && <Alert type="error" showIcon title={saveError} description={t("admin:ui.ifTheVersionHasChangedCloseTheForm")} />}
        <Form name="store-editor" form={form} layout="vertical" disabled={saving} onFinish={handleFormSubmit}>
          {isAdmin ? <AdminStoreFields store={editingStore} /> : <>
          {!editingStore && <Form.Item name="recoveryEmail" label={t("accounts:recovery")} rules={[{ required: true, type: 'email', max: 255 }]}><Input autoComplete="email" /></Form.Item>}
          <Form.Item
            name="name"
            label={t("business:stores.storeName")}
            rules={[{ required: true, message: t("business:stores.pleaseEnterAStoreName") }]}
          >
            <Input disabled={!isAdmin || saving} placeholder={t("business:stores.forExampleCluckyLLIFlagshipStore")} style={{ height: 40 }} />
          </Form.Item>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
            <Form.Item
              name="address"
              label={t("business:stores.fullAddressHouseNumberStreetWard")}
              rules={[{ required: true, message: t("business:stores.enterFullAddress") }]}
            >
              <Input disabled={!isAdmin || saving} placeholder={t("business:stores.enterFullAddress")} style={{ height: 40 }} />
            </Form.Item>

            <Form.Item
              name="district"
              label={t("business:account.district")}
              rules={[{ required: true, message: t("business:stores.enterDistrict") }]}
            >
              <Input disabled={!isAdmin || saving} placeholder={t("business:stores.enterDistrict")} style={{ height: 40 }} />
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
              <TimePicker format="HH:mm" style={{ width: '100%', height: 40 }} />
            </Form.Item>

            <Form.Item
              name="closeTime"
              label={t("business:stores.closingTime")}
              rules={[{ required: true, message: t("business:stores.chooseClosingTime") }]}
            >
              <TimePicker format="HH:mm" style={{ width: '100%', height: 40 }} />
            </Form.Item>
          </div>

          <Form.Item
            name="city"
            label={t("business:stores.city")}
            rules={[{ required: true, message: t("business:stores.enterCity") }]}
          >
            <Input disabled={!isAdmin || saving} placeholder={t("business:stores.enterCity")} style={{ height: 40 }} />
          </Form.Item>

          {modalOpen && editingStore && <StoreDeliverySettings key={editingStore.id} store={editingStore} onSaved={saved => {
            setStores(current => current.map(store => store.id === saved.id ? { ...store, ...saved } : store));
            setEditingStore(current => current?.id === saved.id ? saved : current);
          }} />}

          <Form.Item
            name="deliveryArea"
            label={t("shipping:areaNote")}
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
              <Radio.Group style={{ marginTop: 6 }}>
                <Radio value="OPEN">{t("business:stores.open")}</Radio>
                <Radio value="CLOSED_TEMP">{t("business:stores.temporarilyClosed")}</Radio>
                <Radio value="INACTIVE" disabled={!isAdmin || saving}>{t("business:stores.salesStopped")}</Radio>
              </Radio.Group>
            </Form.Item>
          </div>
          </>}
        </Form>
      </AdminModal>
      </ConfigProvider>
    </div>
  );
};

export default StoresPage;
