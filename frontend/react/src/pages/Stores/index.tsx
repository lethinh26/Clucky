import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useTranslation } from "react-i18next";
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
import { getStoreStatusMeta, normalizeStoreStatus, type StoreStatus } from '../../types/store';
import { storesApi, usersApi, getErrorMessage, type AdminUser, type Store } from '../../lib/api';

export const StoresPage: React.FC = () => {
  const { t } = useTranslation();

  const { user, isAdmin } = useAuth();
  const [stores, setStores] = useState<Store[]>([]);
  const [managers, setManagers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingStore, setEditingStore] = useState<Store | null>(null);
  const [form] = Form.useForm();

  const fetchStores = useCallback(async () => {
    try {
      setLoading(true);
      const [list, managerList] = await Promise.all([
        storesApi.list(false),
        isAdmin ? usersApi.list({ role: 'STORE_MANAGER' }) : Promise.resolve([]),
      ]);
      setManagers(managerList);
      setStores(list.map((store) => {
        const manager = managerList.find((candidate) => candidate.storeId === store.id);
        return { ...store, managerId: manager?.id, managerName: manager?.fullName };
      }));
    } catch (err) {
      message.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

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
      return matchStatus && matchSearch;
    });
  }, [scopedStores, statusFilter, searchTerm]);

  const handleOpenCreateModal = () => {
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
      const values = await form.validateFields();
      const storePayload: Partial<Store> = {
        name: values.name,
        address: values.address,
        district: values.district,
        city: values.city,
        phone: values.phone,
        openTime: values.openTime.format('HH:mm'),
        closeTime: values.closeTime.format('HH:mm'),
        deliveryArea: values.deliveryArea,
        status: values.status,
      };

      if (editingStore) {
        const updated = await storesApi.update(editingStore.id, storePayload);
        if (values.managerId) await usersApi.assignStore(values.managerId, updated.id);
        setStores((prev) => prev.map((store) => store.id === updated.id ? updated : store));
        message.success(t("business:stores.storeDetailsUpdatedFor", { value1: updated.name }));
      } else {
        const created = await storesApi.create(storePayload);
        setEditingStore(created);
        if (values.managerId) await usersApi.assignStore(values.managerId, created.id);
        setStores((prev) => [created, ...prev]);
        message.success(t("business:stores.storeCreatedSuccessfully", { value1: created.name }));
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
          <span style={{ fontWeight: 600, color: '#16100D' }}>{manager || t("business:stores.unassigned")}</span>
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
          />
        }
        emptyTitle={t("business:stores.noStoresFound")}
        emptyDescription={t("business:stores.tryADifferentDistrictOrStatus")}
      />

      {/* Create / Edit Store Modal */}
      <AdminModal
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={handleFormSubmit}
        title={editingStore ? t("business:stores.editStoreDetails") : t("business:stores.setUpANewStore")}
        subtitle={t("business:stores.detailsShownInTheCustomerAppAndUsedForOrderRouting")}
        width={680}
      >
        <Form form={form} layout="vertical">
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
                placeholder={t("business:stores.chooseTheResponsibleManager")}
                style={{ height: 40 }}
                options={managers.map((manager) => ({
                  value: manager.id,
                  label: manager.phone ? `${manager.fullName} (${manager.phone})` : manager.fullName,
                }))}
              />
            </Form.Item>

            <Form.Item name="status" label={t("business:stores.activityStatus")}>
              <Radio.Group style={{ marginTop: 6 }}>
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
