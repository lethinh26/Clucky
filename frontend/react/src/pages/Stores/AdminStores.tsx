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

const statusLabels: Record<string, string> = { OPEN: 'Cho phép nhận đơn', CLOSED_TEMP: 'Tạm đóng cửa', INACTIVE: 'Ngừng hoạt động' };

export function AdminStores({ stores, loading, busy, onCreate, onEdit, onLocation, onStatus, onDeactivate, onUpdated }: {
  stores: Store[]; loading: boolean; busy: boolean; onCreate: () => void; onEdit: (store: Store) => void;
  onLocation: (store: Store) => void; onStatus: (store: Store, status: StoreStatus) => Promise<boolean>;
  onDeactivate: (store: Store) => void; onUpdated: (store: Store) => void;
}) {
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
    { title: 'Chi nhánh', key: 'name', width: 275, sorter: (first, second) => first.name.localeCompare(second.name, 'vi'), render: (_, store) => <div className="stores-identity">
      <span className="stores-avatar"><ShopOutlined /></span><div><button type="button" className="stores-name" aria-expanded={expandedStoreIds.includes(store.id)} aria-controls={expandedStoreIds.includes(store.id) ? `store-details-${store.id}` : undefined}>{store.name}</button>
        <span className="stores-meta">Mã chi nhánh #{store.id}</span><a className="stores-phone" href={`tel:${store.phone}`} onClick={event => event.stopPropagation()}><PhoneOutlined />{store.phone}</a>
      </div></div> },
    { title: 'Địa chỉ & giao hàng', key: 'address', width: 295, render: (_, store) => <div className="stores-address">
      <Tooltip title={store.address}><p className="stores-address-text">{store.address}</p></Tooltip>
      <button type="button" className={`stores-location-link ${missingLocation(store) ? 'is-missing' : ''}`} disabled={blocked} onClick={event => { event.stopPropagation(); onLocation(store); }}>
        <EnvironmentOutlined />{missingLocation(store) ? 'Chưa có tọa độ · Cập nhật' : 'Xem vị trí trên bản đồ'}
      </button>
      <span className="stores-meta">{store.deliveryRadiusKm != null ? `Bán kính giao hàng: ${store.deliveryRadiusKm} km` : 'Chưa cấu hình bán kính giao hàng'}</span>
    </div> },
    { title: 'Vận hành', key: 'status', width: 185, render: (_, store) => <div className="stores-operation">
      <Tag color={store.status === 'OPEN' ? 'green' : store.status === 'CLOSED_TEMP' ? 'gold' : 'default'}>{statusLabels[store.status] ?? 'Chưa xác định'}</Tag>
      <span className="stores-hours"><ClockCircleOutlined />{store.openTime || '—'} – {store.closeTime || '—'}</span>
      {store.status === 'OPEN' && typeof store.isOpenNow === 'boolean' && <span className="stores-meta">{store.isOpenNow ? 'Trong giờ phục vụ' : 'Ngoài giờ phục vụ'}</span>}
    </div> },
    { title: 'Tài khoản', key: 'accounts', width: 175, render: (_, store) => <div style={{ display: 'contents' }} onClick={event => event.stopPropagation()}><StoreReadiness store={store} disabled={blocked} onUpdated={async () => onUpdated(await storesApi.get(store.id))} /></div> },
    { title: 'Thao tác', key: 'actions', width: 115, fixed: 'right', render: (_, store) => <div className="stores-actions" onClick={event => event.stopPropagation()}>
      <Tooltip title="Chỉnh sửa chi nhánh"><Button type="text" icon={<EditOutlined />} disabled={blocked} aria-label={`Chỉnh sửa ${store.name}`} onClick={() => onEdit(store)} /></Tooltip>
      <Dropdown trigger={['click']} disabled={blocked} menu={{ items: [
        { key: 'location', icon: <EnvironmentOutlined />, label: 'Vị trí trên bản đồ' },
        { key: 'delivery', icon: <CompassOutlined />, label: 'Phạm vi giao hàng' },
        { type: 'divider' },
        { key: 'status', label: store.status === 'OPEN' ? 'Tạm đóng cửa' : 'Cho phép nhận đơn' },
        { key: 'deactivate', danger: true, disabled: store.status === 'INACTIVE', label: 'Ngừng hoạt động' },
      ], onClick: ({ key }) => {
        if (key === 'location') onLocation(store);
        if (key === 'delivery') setDeliveryStore(store);
        if (key === 'status') setStatusChange({ store, status: store.status === 'OPEN' ? 'CLOSED_TEMP' : 'OPEN' });
        if (key === 'deactivate') onDeactivate(store);
      } }}><Button type="text" icon={<MoreOutlined />} disabled={blocked} aria-label={`Thao tác khác cho ${store.name}`} /></Dropdown>
    </div> },
  ];
  return <section className="stores-admin" aria-busy={loading || busy}>
    <header className="stores-header"><div><span className="stores-eyebrow">MẠNG LƯỚI CLUCKY</span><h1>Quản lý chi nhánh</h1><p>Thông tin, giờ phục vụ và phạm vi giao hàng của từng cửa hàng.</p></div>
      <div className="stores-header-actions"><Button icon={<SettingOutlined />} onClick={() => setShippingOpen(true)} disabled={busy}>Phí giao hàng</Button><Button type="primary" icon={<PlusOutlined />} onClick={onCreate} disabled={blocked}>Thêm chi nhánh</Button></div>
    </header>
    <div className="stores-overview">
      {[{ label: 'Tổng chi nhánh', value: stores.length, icon: <ShopOutlined />, tone: 'wine' },
        { label: 'Cho phép nhận đơn', value: stores.filter(store => store.status === 'OPEN').length, icon: <ShopOutlined />, tone: 'green' },
        { label: 'Tạm đóng / ngừng hoạt động', value: stores.filter(store => store.status !== 'OPEN').length, icon: <ClockCircleOutlined />, tone: 'neutral' },
        { label: 'Chưa có tọa độ', value: stores.filter(missingLocation).length, icon: <EnvironmentOutlined />, tone: 'amber' },
      ].map(item => <div className="stores-metric" key={item.label}><span className={`stores-metric-icon ${item.tone}`}>{item.icon}</span><div><strong>{loading ? '—' : item.value}</strong><span>{item.label}</span></div></div>)}
    </div>
    <div className="stores-panel"><div className="stores-toolbar">
      <Input size="large" className="stores-search" prefix={<SearchOutlined />} allowClear aria-label="Tìm chi nhánh" placeholder="Tìm tên, địa chỉ hoặc số điện thoại…" value={search} onChange={event => { setSearch(event.target.value); setPage(1); }} />
      <Select size="large" className="stores-filter" aria-label="Lọc trạng thái chi nhánh" value={status} onChange={value => { setStatus(value); setPage(1); }} options={[{ value: 'ALL', label: 'Tất cả trạng thái' }, ...Object.entries(statusLabels).map(([value, label]) => ({ value, label }))]} />
      <Select size="large" className="stores-filter" aria-label="Lọc tọa độ chi nhánh" value={location} onChange={value => { setLocation(value); setPage(1); }} options={[{ value: 'ALL', label: 'Tất cả vị trí' }, { value: 'MISSING', label: 'Chưa có tọa độ' }]} />
    </div><div className="stores-table-caption"><span>{loading ? 'Đang tải chi nhánh…' : `${rows.length} chi nhánh${hasFilters ? ' phù hợp' : ''}`}</span>{hasFilters ? <Button size="small" type="link" onClick={() => { setSearch(''); setStatus('ALL'); setLocation('ALL'); setPage(1); }}>Xóa bộ lọc</Button> : <span>Bấm vào chi nhánh để mở / thu gọn thông tin</span>}</div>
    <Table<Store> className="stores-table" rowKey="id" columns={columns} dataSource={rows} loading={loading} tableLayout="fixed" scroll={{ x: 1085 }}
      rowClassName={store => `stores-expandable-row${expandedStoreIds.includes(store.id) ? ' is-expanded' : ''}`}
      locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={hasFilters ? 'Không có chi nhánh phù hợp với bộ lọc.' : 'Chưa có chi nhánh. Thêm chi nhánh để bắt đầu.'} /> }}
      pagination={{ current: Math.min(page, Math.max(1, Math.ceil(rows.length / pageSize))), pageSize, total: rows.length, showSizeChanger: true, pageSizeOptions: [10, 20, 50], onChange: (next, size) => { setPage(size === pageSize ? next : 1); setPageSize(size); } }}
      expandable={{ expandRowByClick: true, showExpandColumn: false, expandedRowKeys: expandedStoreIds, onExpandedRowsChange: setExpandedStoreIds,
        expandedRowRender: store => <div id={`store-details-${store.id}`} className="stores-detail-grid">
        <div><h4><EnvironmentOutlined /> Địa chỉ đầy đủ</h4><p>{store.address}</p><span>{[store.district, store.city].filter(Boolean).join(' · ')}</span></div>
        <div><h4><CompassOutlined /> Phạm vi giao hàng</h4><p>{store.deliveryArea || 'Chưa có mô tả khu vực giao hàng.'}</p><span>{missingLocation(store) || store.deliveryRadiusKm == null ? 'Cần đủ tọa độ và bán kính để nhận giao hàng.' : `Bán kính đã cấu hình: ${store.deliveryRadiusKm} km.`}</span><Button size="small" type="link" disabled={blocked} onClick={() => setDeliveryStore(store)}>Chỉnh phạm vi</Button></div>
        <div><h4><TeamOutlined /> Tài khoản chi nhánh</h4><p>{store.managerName || 'Quản lý cặp tài khoản Quản lý và Nhân viên tại trang tài khoản chi nhánh.'}</p><Link to="/admin/users">Mở quản lý tài khoản</Link></div>
      </div> }} />
    </div>
    <Modal className="stores-modal" centered width={600} open={shippingOpen} title="Phí giao hàng toàn chuỗi" footer={null} maskClosable={false} closable={!shippingSaving} keyboard={!shippingSaving} onCancel={() => { if (!shippingSaving) setShippingOpen(false); }}>
      {shippingOpen && <ShippingSettings onSavingChange={setShippingSaving} />}
    </Modal>
    <Modal className="stores-modal" centered width={600} open={Boolean(deliveryStore)} title={<div className="stores-modal-heading"><h3>Phạm vi giao hàng</h3><p>{deliveryStore?.name}</p></div>} footer={null} maskClosable={false} closable={!deliverySaving} keyboard={!deliverySaving} onCancel={() => { if (!deliverySaving) setDeliveryStore(null); }}>
      {deliveryStore && <StoreDeliverySettings key={deliveryStore.id} store={deliveryStore} onSavingChange={setDeliverySaving} onSaved={saved => { setDeliveryStore(saved); onUpdated(saved); }} />}
    </Modal>
    <Modal className="stores-modal" centered width={480} open={Boolean(statusChange)} title={statusChange?.status === 'OPEN' ? 'Cho phép chi nhánh nhận đơn?' : 'Tạm đóng cửa chi nhánh?'} okText="Xác nhận thay đổi" cancelText="Hủy" confirmLoading={busy} closable={!busy} keyboard={!busy} maskClosable={false} cancelButtonProps={{ disabled: busy }}
      onCancel={() => { if (!busy) setStatusChange(null); }} onOk={async () => { if (statusChange && await onStatus(statusChange.store, statusChange.status)) setStatusChange(null); }}>
      <div className="stores-confirm-store"><ShopOutlined /><strong>{statusChange?.store.name}</strong></div><p className="stores-note">{statusChange?.status === 'OPEN' ? 'Đơn mới vẫn phụ thuộc giờ phục vụ, tồn kho và trạng thái tài khoản của chi nhánh.' : 'Chi nhánh tạm ngừng nhận đơn mới. Lịch sử đơn hàng và tài khoản được giữ nguyên.'}</p>
    </Modal>
  </section>;
}

export function AdminStoreFields({ store }: { store: Store | null }) {
  return <div className="stores-editor"><div className="stores-editor-main">
    <section className="stores-form-section"><h4><span>01</span>Thông tin chi nhánh</h4>
      <Form.Item name="name" label="Tên chi nhánh" rules={[{ required: true, whitespace: true, message: 'Nhập tên chi nhánh.' }]}><Input size="large" placeholder="Tên cửa hàng hiển thị cho khách" /></Form.Item>
      <Form.Item name="phone" label="Hotline chi nhánh" rules={[{ required: true, message: 'Nhập số điện thoại chi nhánh.' }, { pattern: /^(0|\+84)[0-9]{8,11}$/, message: 'Nhập số điện thoại hợp lệ, bắt đầu bằng 0 hoặc +84.' }]}><Input prefix={<PhoneOutlined />} inputMode="tel" autoComplete="tel" placeholder="Số điện thoại liên hệ" /></Form.Item>
      <Form.Item name="address" label="Địa chỉ cửa hàng" rules={[{ required: true, whitespace: true, message: 'Nhập số nhà, đường và phường/xã.' }]}><Input.TextArea autoSize={{ minRows: 2, maxRows: 4 }} placeholder="Số nhà, tên đường, phường/xã" /></Form.Item>
      <div className="stores-form-grid"><Form.Item name="district" label="Quận / huyện" rules={[{ required: true, whitespace: true, message: 'Nhập quận/huyện.' }]}><Input placeholder="Quận / huyện" /></Form.Item><Form.Item name="city" label="Tỉnh / thành phố" rules={[{ required: true, whitespace: true, message: 'Nhập tỉnh/thành phố.' }]}><Input placeholder="Tỉnh / thành phố" /></Form.Item></div>
    </section>
    <section className="stores-form-section"><h4><span>02</span>Giờ phục vụ & giao hàng</h4>
      <div className="stores-form-grid"><Form.Item name="openTime" label="Mở cửa" rules={[{ required: true, message: 'Chọn giờ mở cửa.' }]}><TimePicker format="HH:mm" placeholder="Giờ mở cửa" /></Form.Item><Form.Item name="closeTime" label="Đóng cửa" rules={[{ required: true, message: 'Chọn giờ đóng cửa.' }]}><TimePicker format="HH:mm" placeholder="Giờ đóng cửa" /></Form.Item></div>
      <Form.Item name="deliveryArea" label="Ghi chú khu vực giao hàng" extra="Mô tả này không thay thế tọa độ và bán kính giao hàng." rules={[{ required: true, whitespace: true, message: 'Mô tả khu vực phục vụ của chi nhánh.' }]}><Input.TextArea rows={2} placeholder="Các khu vực phục vụ và lưu ý khi giao hàng" /></Form.Item>
    </section>
  </div><aside className="stores-editor-aside"><div className="stores-aside-icon"><ShopOutlined /></div><h4>Trạng thái hoạt động</h4><p className="stores-note">Trạng thái quyết định việc nhận đơn mới; giờ phục vụ được áp dụng riêng.</p>
    <Form.Item name="status" rules={[{ required: true, message: 'Chọn trạng thái chi nhánh.' }]}><Radio.Group className="stores-status-options" aria-label="Trạng thái hoạt động">
      <Radio value="OPEN"><strong>Cho phép nhận đơn</strong><span>Nhận đơn trong giờ phục vụ.</span></Radio>
      <Radio value="CLOSED_TEMP"><strong>Tạm đóng cửa</strong><span>Tạm dừng nhận đơn mới.</span></Radio>
      <Radio value="INACTIVE"><strong>Ngừng hoạt động</strong><span>Giữ lại dữ liệu và tài khoản.</span></Radio>
    </Radio.Group></Form.Item>
    <div className="stores-account-note"><h4><TeamOutlined /> Tài khoản chi nhánh</h4>{!store ? <>
      <p className="stores-note">Email quản lý dùng để kích hoạt và khôi phục cặp tài khoản chi nhánh.</p>
      <Form.Item name="recoveryEmail" label="Email khôi phục" rules={[{ required: true, type: 'email', max: 255, message: 'Nhập email khôi phục hợp lệ.' }]}><Input autoComplete="email" placeholder="Email của người quản lý" /></Form.Item>
    </> : <p className="stores-note">Kích hoạt, khôi phục và khóa tài khoản tại mục Tài khoản chi nhánh. Không gán người quản lý qua biểu mẫu này.</p>}</div>
    {!store && <Alert type="info" showIcon message="Sau khi tạo chi nhánh" description="Thiết lập vị trí, bán kính giao hàng và kiểm tra tài khoản trước khi mở nhận đơn." />}
  </aside></div>;
}
