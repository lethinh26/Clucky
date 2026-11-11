import { useTranslation } from "react-i18next";
import i18n from "../../i18n/index.ts";
import { useState, type Key } from 'react';
import { Alert, Button, Dropdown, Empty, Form, Input, Modal, Radio, Select, Table, Tag, TimePicker, Tooltip } from 'antd';
import type { TableColumnsType } from 'antd';
import { ClockCircleOutlined, CompassOutlined, EditOutlined, EnvironmentOutlined, MoreOutlined, PhoneOutlined, PlusOutlined, SearchOutlined, SettingOutlined, ShopOutlined, TeamOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import { storesApi, type Store } from '../../lib/api';
import type { StoreStatus } from '../../types/store';
import { ShippingSettings, StoreDeliverySettings } from './ShippingSettings';
import { StoreReadiness } from './StoreReadiness';
import { matchesStoreSearch } from './presentation';
import './stores.css';

const statusLabels: Record<string, string> = { get OPEN() { return i18n.t("admin:ui.acceptingOrders"); }, get CLOSED_TEMP() { return i18n.t("admin:ui.temporarilyClosed"); }, get INACTIVE() { return i18n.t("business:stores.inactive"); } };

export function AdminStores({ stores, loading, busy, onCreate, onEdit, onLocation, onStatus, onDeactivate, onUpdated }: {
  stores: Store[]; loading: boolean; busy: boolean; onCreate: () => void; onEdit: (store: Store) => void;
  onLocation: (store: Store) => void; onStatus: (store: Store, status: StoreStatus) => Promise<boolean>;
  onDeactivate: (store: Store) => void; onUpdated: (store: Store) => void;
}) {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('ALL');
  const [location, setLocation] = useState('ALL');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [expandedStoreIds, setExpandedStoreIds] = useState<readonly Key[]>([]);
  const [shippingOpen, setShippingOpen] = useState(false);
  const [shippingSaving, setShippingSaving] = useState(false);
  const [deliveryStore, setDeliveryStore] = useState<Store | null>(null);
  const [deliverySaving, setDeliverySaving] = useState(false);
  const [statusChange, setStatusChange] = useState<{ store: Store; status: StoreStatus } | null>(null);
  const missingLocation = (store: Store) => store.latitude == null || store.longitude == null;
  const rows = stores.filter(store => (status === 'ALL' || status === store.status)
    && (location !== 'MISSING' || missingLocation(store))
    && matchesStoreSearch([store.name, store.address, store.district, store.city, store.phone], search));
  const hasFilters = Boolean(search || status !== 'ALL' || location !== 'ALL');
  const blocked = busy || loading;
  const columns: TableColumnsType<Store> = [
    { title: t("business:party.store"), key: 'name', width: 275, sorter: (first, second) => first.name.localeCompare(second.name, 'vi'), render: (_, store) => <div className="stores-identity">
      <span className="stores-avatar"><ShopOutlined /></span><div><button type="button" className="stores-name" aria-expanded={expandedStoreIds.includes(store.id)} aria-controls={expandedStoreIds.includes(store.id) ? `store-details-${store.id}` : undefined}>{store.name}</button>
        <span className="stores-meta">{t("admin:ui.branchId")}{store.id}</span><a className="stores-phone" href={`tel:${store.phone}`} onClick={event => event.stopPropagation()}><PhoneOutlined />{store.phone}</a>
      </div></div> },
    { title: t("admin:ui.addressDelivery"), key: 'address', width: 295, render: (_, store) => <div className="stores-address">
      <Tooltip title={store.address}><p className="stores-address-text">{store.address}</p></Tooltip>
      <button type="button" className={`stores-location-link ${missingLocation(store) ? 'is-missing' : ''}`} disabled={blocked} onClick={event => { event.stopPropagation(); onLocation(store); }}>
        <EnvironmentOutlined />{missingLocation(store) ? t("admin:ui.noCoordinatesUpdate") : t("admin:ui.viewLocationOnMap")}
      </button>
      <span className="stores-meta">{store.deliveryRadiusKm != null ? t("admin:ui.deliveryRadiusKm", { value1: store.deliveryRadiusKm }) : t("admin:ui.deliveryRadiusNotConfigured")}</span>
    </div> },
    { title: t("admin:ui.operations"), key: 'status', width: 185, render: (_, store) => <div className="stores-operation">
      <Tag color={store.status === 'OPEN' ? 'green' : store.status === 'CLOSED_TEMP' ? 'gold' : 'default'}>{statusLabels[store.status] ?? t("admin:ui.unknown")}</Tag>
      <span className="stores-hours"><ClockCircleOutlined />{store.openTime || '—'} – {store.closeTime || '—'}</span>
      {store.status === 'OPEN' && typeof store.isOpenNow === 'boolean' && <span className="stores-meta">{store.isOpenNow ? t("admin:ui.withinServiceHours") : t("admin:ui.outsideServiceHours")}</span>}
    </div> },
    { title: t("accounts:account"), key: 'accounts', width: 175, render: (_, store) => <div style={{ display: 'contents' }} onClick={event => event.stopPropagation()}><StoreReadiness store={store} disabled={blocked} onUpdated={async () => onUpdated(await storesApi.get(store.id))} /></div> },
    { title: t("accounts:action"), key: 'actions', width: 115, fixed: 'right', render: (_, store) => <div className="stores-actions" onClick={event => event.stopPropagation()}>
      <Tooltip title={t("business:stores.editStore")}><Button type="text" icon={<EditOutlined />} disabled={blocked} aria-label={t("admin:ui.edit", { value1: store.name })} onClick={() => onEdit(store)} /></Tooltip>
      <Dropdown trigger={['click']} disabled={blocked} menu={{ items: [
        { key: 'location', icon: <EnvironmentOutlined />, label: t("admin:ui.mapLocation") },
        { key: 'delivery', icon: <CompassOutlined />, label: t("admin:ui.deliveryCoverage") },
        { type: 'divider' },
        { key: 'status', label: store.status === 'OPEN' ? t("admin:ui.temporarilyClosed") : t("admin:ui.acceptingOrders") },
        { key: 'deactivate', danger: true, disabled: store.status === 'INACTIVE', label: t("business:stores.inactive") },
      ], onClick: ({ key }) => {
        if (key === 'location') onLocation(store);
        if (key === 'delivery') setDeliveryStore(store);
        if (key === 'status') setStatusChange({ store, status: store.status === 'OPEN' ? 'CLOSED_TEMP' : 'OPEN' });
        if (key === 'deactivate') onDeactivate(store);
      } }}><Button type="text" icon={<MoreOutlined />} disabled={blocked} aria-label={t("admin:ui.moreActionsFor", { value1: store.name })} /></Dropdown>
    </div> },
  ];
  return <section className="stores-admin" aria-busy={loading || busy}>
    <header className="stores-header"><div><span className="stores-eyebrow">{t("admin:ui.cluckyNetwork")}</span><h1>{t("admin:roles.manager")}</h1><p>{t("admin:ui.informationServiceHoursAndDeliveryCoverageForEach")}</p></div>
      <div className="stores-header-actions"><Button icon={<SettingOutlined />} onClick={() => setShippingOpen(true)} disabled={busy}>{t("business:ordersummarycard.deliveryFee")}</Button><Button type="primary" icon={<PlusOutlined />} onClick={onCreate} disabled={blocked}>{t("admin:ui.addBranch")}</Button></div>
    </header>
    <div className="stores-overview">
      {[{ label: t("admin:ui.totalBranches"), value: stores.length, icon: <ShopOutlined />, tone: 'wine' },
        { label: t("admin:ui.acceptingOrders"), value: stores.filter(store => store.status === 'OPEN').length, icon: <ShopOutlined />, tone: 'green' },
        { label: t("admin:ui.temporarilyClosedInactive"), value: stores.filter(store => store.status !== 'OPEN').length, icon: <ClockCircleOutlined />, tone: 'neutral' },
        { label: t("maps:unknownDistance"), value: stores.filter(missingLocation).length, icon: <EnvironmentOutlined />, tone: 'amber' },
      ].map(item => <div className="stores-metric" key={item.label}><span className={`stores-metric-icon ${item.tone}`}>{item.icon}</span><div><strong>{loading ? '—' : item.value}</strong><span>{item.label}</span></div></div>)}
    </div>
    <div className="stores-panel"><div className="stores-toolbar">
      <Input size="large" className="stores-search" prefix={<SearchOutlined />} allowClear aria-label={t("admin:ui.searchBranches")} placeholder={t("admin:ui.searchNameAddressOrPhoneNumber")} value={search} onChange={event => { setSearch(event.target.value); setPage(1); }} />
      <Select size="large" className="stores-filter" aria-label={t("admin:ui.filterBranchStatus")} value={status} onChange={value => { setStatus(value); setPage(1); }} options={[{ value: 'ALL', label: t("business:paymentspage.allStatuses") }, ...Object.entries(statusLabels).map(([value, label]) => ({ value, label }))]} />
      <Select size="large" className="stores-filter" aria-label={t("admin:ui.filterBranchCoordinates")} value={location} onChange={value => { setLocation(value); setPage(1); }} options={[{ value: 'ALL', label: t("maps:allLocations") }, { value: 'MISSING', label: t("maps:unknownDistance") }]} />
    </div><div className="stores-table-caption"><span>{loading ? t("admin:ui.loadingBranches") : t("admin:ui.branches", { value1: rows.length, value2: hasFilters ? t("admin:ui.matching") : '' })}</span>{hasFilters ? <Button size="small" type="link" onClick={() => { setSearch(''); setStatus('ALL'); setLocation('ALL'); setPage(1); }}>{t("business:orderspage.clearFilters")}</Button> : <span>{t("admin:ui.clickABranchToExpandOrCollapseIts")}</span>}</div>
    <Table<Store> className="stores-table" rowKey="id" columns={columns} dataSource={rows} loading={loading} tableLayout="fixed" scroll={{ x: 1085 }}
      rowClassName={store => `stores-expandable-row${expandedStoreIds.includes(store.id) ? ' is-expanded' : ''}`}
      locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={hasFilters ? t("admin:ui.noBranchesMatchYourFilters") : t("admin:ui.noBranchesYetAddABranchToGet")} /> }}
      pagination={{ current: Math.min(page, Math.max(1, Math.ceil(rows.length / pageSize))), pageSize, total: rows.length, showSizeChanger: true, pageSizeOptions: [10, 20, 50], onChange: (next, size) => { setPage(size === pageSize ? next : 1); setPageSize(size); } }}
      expandable={{ expandRowByClick: true, showExpandColumn: false, expandedRowKeys: expandedStoreIds, onExpandedRowsChange: setExpandedStoreIds,
        expandedRowRender: store => <div id={`store-details-${store.id}`} className="stores-detail-grid">
        <div><h4><EnvironmentOutlined /> {t("admin:ui.fullAddress")}</h4><p>{store.address}</p><span>{[store.district, store.city].filter(Boolean).join(' · ')}</span></div>
        <div><h4><CompassOutlined /> {t("admin:ui.deliveryCoverage")}</h4><p>{store.deliveryArea || t("admin:ui.noDeliveryAreaDescriptionYet")}</p><span>{missingLocation(store) || store.deliveryRadiusKm == null ? t("admin:ui.coordinatesAndARadiusAreRequiredToAccept") : t("admin:ui.configuredRadiusKm", { value1: store.deliveryRadiusKm })}</span><Button size="small" type="link" disabled={blocked} onClick={() => setDeliveryStore(store)}>{t("admin:ui.editCoverage")}</Button></div>
        <div><h4><TeamOutlined /> {t("accounts:title")}</h4><p>{store.managerName || t("admin:ui.manageTheManagerAndStaffAccountPairOn")}</p><Link to="/admin/users">{t("admin:ui.openAccountManagement")}</Link></div>
      </div> }} />
    </div>
    <Modal className="stores-modal" centered width={600} open={shippingOpen} title={t("shipping:chainFee")} footer={null} maskClosable={false} closable={!shippingSaving} keyboard={!shippingSaving} onCancel={() => { if (!shippingSaving) setShippingOpen(false); }}>
      {shippingOpen && <ShippingSettings onSavingChange={setShippingSaving} />}
    </Modal>
    <Modal className="stores-modal" centered width={600} open={Boolean(deliveryStore)} title={<div className="stores-modal-heading"><h3>{t("admin:ui.deliveryCoverage")}</h3><p>{deliveryStore?.name}</p></div>} footer={null} maskClosable={false} closable={!deliverySaving} keyboard={!deliverySaving} onCancel={() => { if (!deliverySaving) setDeliveryStore(null); }}>
      {deliveryStore && <StoreDeliverySettings key={deliveryStore.id} store={deliveryStore} onSavingChange={setDeliverySaving} onSaved={saved => { setDeliveryStore(saved); onUpdated(saved); }} />}
    </Modal>
    <Modal className="stores-modal" centered width={480} open={Boolean(statusChange)} title={statusChange?.status === 'OPEN' ? t("admin:ui.allowThisBranchToAcceptOrders") : t("admin:ui.temporarilyCloseThisBranch")} okText={t("admin:ui.confirmChange")} cancelText={t("business:account.cancel")} confirmLoading={busy} closable={!busy} keyboard={!busy} maskClosable={false} cancelButtonProps={{ disabled: busy }}
      onCancel={() => { if (!busy) setStatusChange(null); }} onOk={async () => { if (statusChange && await onStatus(statusChange.store, statusChange.status)) setStatusChange(null); }}>
      <div className="stores-confirm-store"><ShopOutlined /><strong>{statusChange?.store.name}</strong></div><p className="stores-note">{statusChange?.status === 'OPEN' ? t("admin:ui.newOrdersStillDependOnServiceHoursInventory") : t("admin:ui.theBranchWillTemporarilyStopAcceptingNewOrders")}</p>
    </Modal>
  </section>;
}

export function AdminStoreFields({ store }: { store: Store | null }) {
  const { t } = useTranslation();
  return <div className="stores-editor"><div className="stores-editor-main">
    <section className="stores-form-section"><h4><span>01</span>{t("admin:ui.branchInformation")}</h4>
      <Form.Item name="name" label={t("business:stores.storeName")} rules={[{ required: true, whitespace: true, message: t("admin:ui.enterABranchName") }]}><Input size="large" placeholder={t("admin:ui.branchNameShownToCustomers")} /></Form.Item>
      <Form.Item name="phone" label={t("admin:ui.branchHotline")} rules={[{ required: true, message: t("admin:ui.enterTheBranchPhoneNumber") }, { pattern: /^(0|\+84)[0-9]{8,11}$/, message: t("admin:ui.enterAValidPhoneNumberStartingWith0") }]}><Input prefix={<PhoneOutlined />} inputMode="tel" autoComplete="tel" placeholder={t("admin:ui.contactPhoneNumber")} /></Form.Item>
      <Form.Item name="address" label={t("admin:ui.branchAddress")} rules={[{ required: true, whitespace: true, message: t("admin:ui.enterTheStreetNumberStreetAndWardCommune") }]}><Input.TextArea autoSize={{ minRows: 2, maxRows: 4 }} placeholder={t("admin:ui.streetNumberStreetWardCommune")} /></Form.Item>
      <div className="stores-form-grid"><Form.Item name="district" label={t("admin:ui.district")} rules={[{ required: true, whitespace: true, message: t("admin:ui.enterADistrict") }]}><Input placeholder={t("admin:ui.district")} /></Form.Item><Form.Item name="city" label={t("admin:ui.provinceCity")} rules={[{ required: true, whitespace: true, message: t("admin:ui.enterAProvinceOrCity") }]}><Input placeholder={t("admin:ui.provinceCity")} /></Form.Item></div>
    </section>
    <section className="stores-form-section"><h4><span>02</span>{t("admin:ui.serviceHoursDelivery")}</h4>
      <div className="stores-form-grid"><Form.Item name="openTime" label={t("admin:ui.openingTime")} rules={[{ required: true, message: t("admin:ui.selectAnOpeningTime") }]}><TimePicker format="HH:mm" placeholder={t("business:stores.openingTime")} /></Form.Item><Form.Item name="closeTime" label={t("business:dashboard.storeClosed")} rules={[{ required: true, message: t("admin:ui.selectAClosingTime") }]}><TimePicker format="HH:mm" placeholder={t("business:stores.closingTime")} /></Form.Item></div>
      <Form.Item name="deliveryArea" label={t("admin:ui.deliveryAreaNotes")} extra={t("admin:ui.thisDescriptionDoesNotReplaceDeliveryCoordinatesAnd")} rules={[{ required: true, whitespace: true, message: t("admin:ui.describeTheBranchSServiceArea") }]}><Input.TextArea rows={2} placeholder={t("admin:ui.serviceAreasAndDeliveryNotes")} /></Form.Item>
    </section>
  </div><aside className="stores-editor-aside"><div className="stores-aside-icon"><ShopOutlined /></div><h4>{t("business:stores.activityStatus")}</h4><p className="stores-note">{t("admin:ui.theStatusDeterminesWhetherNewOrdersAreAccepted")}</p>
    <Form.Item name="status" rules={[{ required: true, message: t("admin:ui.selectABranchStatus") }]}><Radio.Group className="stores-status-options" aria-label={t("business:stores.activityStatus")}>
      <Radio value="OPEN"><strong>{t("admin:ui.acceptingOrders")}</strong><span>{t("admin:ui.acceptOrdersDuringServiceHours")}</span></Radio>
      <Radio value="CLOSED_TEMP"><strong>{t("admin:ui.temporarilyClosed")}</strong><span>{t("admin:ui.temporarilyStopAcceptingNewOrders")}</span></Radio>
      <Radio value="INACTIVE"><strong>{t("business:stores.inactive")}</strong><span>{t("admin:ui.preserveDataAndAccounts")}</span></Radio>
    </Radio.Group></Form.Item>
    <div className="stores-account-note"><h4><TeamOutlined /> {t("accounts:title")}</h4>{!store ? <>
      <p className="stores-note">{t("admin:ui.theManagerSEmailIsUsedToActivate")}</p>
      <Form.Item name="recoveryEmail" label={t("admin:ui.recoveryEmail")} rules={[{ required: true, type: 'email', max: 255, message: t("admin:ui.enterAValidRecoveryEmail") }]}><Input autoComplete="email" placeholder={t("admin:ui.managerSEmail")} /></Form.Item>
    </> : <p className="stores-note">{t("admin:ui.manageAccountActivationRecoveryAndLockingUnderBranch")}</p>}</div>
    {!store && <Alert type="info" showIcon message={t("admin:ui.afterCreatingTheBranch")} description={t("admin:ui.setTheLocationAndDeliveryRadiusThenCheck")} />}
  </aside></div>;
}
