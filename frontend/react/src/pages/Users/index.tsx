import React, { useEffect, useMemo, useState } from 'react';
import { Select, Button, Space, message, Tooltip } from 'antd';
import type { TableColumnsType } from 'antd';
import {
  LockOutlined,
  UnlockOutlined,
  ShopOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { AdminTable } from '../../components/ui/AdminTable';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { ConfirmModal } from '../../components/ui/AdminModal';
import { AdminModal } from '../../components/ui/AdminModal';
import { usersApi, AdminUser, getErrorMessage } from '../../lib/api';
import { mockStores } from '../../mocks/catalogData';
import { useAuth } from '../../context/AuthContext';

const roleLabelMap: Record<AdminUser['role'], { label: string; status: 'error' | 'gold' | 'success' | 'info' | 'default' }> = {
  ADMIN: { label: 'Quản trị viên HQ', status: 'error' },
  STORE_MANAGER: { label: 'Quản lý chi nhánh', status: 'gold' },
  STAFF: { label: 'Nhân viên ca', status: 'success' },
  SHIPPER: { label: 'Shipper', status: 'info' },
  CUSTOMER: { label: 'Khách hàng', status: 'default' },
};

export const UsersPage: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [apiAvailable, setApiAvailable] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [storeFilter, setStoreFilter] = useState<string>('ALL');

  // action state
  const [lockTarget, setLockTarget] = useState<AdminUser | null>(null);
  const [assignTarget, setAssignTarget] = useState<AdminUser | null>(null);
  const [assignStoreId, setAssignStoreId] = useState<number | undefined>(undefined);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const data = await usersApi.list();
      setUsers(data);
      setApiAvailable(true);
    } catch (err) {
      setApiAvailable(false);
      message.warning(
        'Không kết nối được Identity Service qua Gateway — hiển thị dữ liệu mẫu. ' +
          getErrorMessage(err, '')
      );
      // Graceful fallback so the admin UI is still reviewable.
      setUsers([
        { id: 1, fullName: 'Lê Phú Thịnh', email: 'admin@clucky.local', phone: '0901000001', role: 'ADMIN', status: 'ACTIVE' },
        { id: 2, fullName: 'Nguyễn Minh Anh', email: 'manager.d1@clucky.local', phone: '0901000002', role: 'STORE_MANAGER', storeId: 1, storeName: 'Clucky Lê Lợi (Q.1)', status: 'ACTIVE' },
        { id: 3, fullName: 'Trần Quốc Bảo', email: 'staff.d1@clucky.local', phone: '0901000003', role: 'STAFF', storeId: 1, storeName: 'Clucky Lê Lợi (Q.1)', status: 'ACTIVE' },
        { id: 4, fullName: 'Trần Gia Huy', email: 'manager.govap@clucky.local', phone: '0901000006', role: 'STORE_MANAGER', storeId: 2, storeName: 'Clucky Phan Văn Trị', status: 'ACTIVE' },
        { id: 5, fullName: 'Phạm Thuỳ Linh', email: 'manager.thuduc@clucky.local', phone: '0901000008', role: 'STORE_MANAGER', storeId: 4, storeName: 'Clucky Thủ Đức', status: 'LOCKED' },
        { id: 6, fullName: 'Vũ Quốc Khánh', email: 'shipper.khanh@clucky.local', phone: '0901000011', role: 'SHIPPER', storeId: 1, storeName: 'Clucky Lê Lợi (Q.1)', status: 'ACTIVE' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchUsers();
  }, []);

  const filtered = useMemo(() => {
    return users.filter((u) => {
      const q = keyword.trim().toLowerCase();
      if (q && !`${u.fullName} ${u.email}`.toLowerCase().includes(q)) return false;
      if (roleFilter !== 'ALL' && u.role !== roleFilter) return false;
      if (storeFilter !== 'ALL' && String(u.storeId ?? '') !== storeFilter) return false;
      return true;
    });
  }, [users, keyword, roleFilter, storeFilter]);

  /* ---------- actions ---------- */
  const canLockTarget = (u: AdminUser) => {
    if (currentUser.role === 'ADMIN') return u.id !== currentUser.id;
    if (currentUser.role === 'STORE_MANAGER') return u.role === 'STAFF' && u.storeId === currentUser.storeId;
    return false;
  };
  const canAssignStore = (u: AdminUser) => {
    if (currentUser.role !== 'ADMIN') return false;
    return u.role === 'STAFF' || u.role === 'STORE_MANAGER' || u.role === 'SHIPPER';
  };

  const confirmLockToggle = async () => {
    if (!lockTarget) return;
    setActionLoading(true);
    const target = lockTarget;
    const willLock = target.status !== 'LOCKED';
    try {
      if (apiAvailable) {
        if (willLock) await usersApi.lock(target.id);
        else await usersApi.unlock(target.id);
      }
      setUsers((prev) => prev.map((u) => (u.id === target.id ? { ...u, status: willLock ? 'LOCKED' : 'ACTIVE' } : u)));
      message.success(`${willLock ? 'Đã khóa' : 'Đã mở khóa'} tài khoản ${target.fullName}.`);
    } catch (err) {
      message.error(getErrorMessage(err, 'Thao tác thất bại.'));
    } finally {
      setActionLoading(false);
      setLockTarget(null);
    }
  };

  const confirmAssign = async () => {
    if (!assignTarget || assignStoreId === undefined) return;
    setActionLoading(true);
    const store = mockStores.find((s) => s.id === assignStoreId);
    try {
      if (apiAvailable) await usersApi.assignStore(assignTarget.id, assignStoreId);
      setUsers((prev) =>
        prev.map((u) => (u.id === assignTarget.id ? { ...u, storeId: assignStoreId, storeName: store?.name } : u))
      );
      message.success(`Đã gán ${assignTarget.fullName} cho ${store?.name ?? 'chi nhánh mới'}.`);
    } catch (err) {
      message.error(getErrorMessage(err, 'Gán chi nhánh thất bại.'));
    } finally {
      setActionLoading(false);
      setAssignTarget(null);
      setAssignStoreId(undefined);
    }
  };

  const columns: TableColumnsType<AdminUser> = [
    {
      title: 'Tài khoản',
      key: 'account',
      render: (_, u) => (
        <div>
          <div style={{ fontWeight: 700, color: '#16100D' }}>{u.fullName}</div>
          <span className="table-subtext">{u.email}</span>
        </div>
      ),
    },
    {
      title: 'Vai trò',
      dataIndex: 'role',
      key: 'role',
      width: 180,
      render: (role: AdminUser['role']) => (
        <StatusBadge status={roleLabelMap[role]?.status ?? 'default'} text={roleLabelMap[role]?.label ?? role} />
      ),
    },
    {
      title: 'Chi nhánh',
      dataIndex: 'storeName',
      key: 'store',
      render: (_, u) => u.storeName || <span style={{ color: '#B8AA9B' }}>—</span>,
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 140,
      render: (status: AdminUser['status']) => (
        <StatusBadge status={status === 'LOCKED' ? 'error' : 'success'} text={status === 'LOCKED' ? 'Đã khóa' : 'Hoạt động'} />
      ),
    },
    {
      title: 'Hành động',
      key: 'actions',
      width: 200,
      render: (_, u) => (
        <Space size={8}>
          <Tooltip title={canLockTarget(u) ? (u.status === 'LOCKED' ? 'Mở khóa' : 'Khóa tài khoản') : 'Không có quyền'}>
            <Button
              type="text"
              danger={u.status !== 'LOCKED'}
              icon={u.status === 'LOCKED' ? <UnlockOutlined /> : <LockOutlined />}
              disabled={!canLockTarget(u)}
              onClick={() => setLockTarget(u)}
              aria-label={u.status === 'LOCKED' ? 'Mở khóa' : 'Khóa'}
            />
          </Tooltip>
          <Tooltip title={canAssignStore(u) ? 'Gán chi nhánh' : 'Chỉ Admin gán cho nhân sự'}>
            <Button
              type="text"
              icon={<ShopOutlined />}
              disabled={!canAssignStore(u)}
              onClick={() => {
                setAssignTarget(u);
                setAssignStoreId(u.storeId);
              }}
              aria-label="Gán chi nhánh"
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div className="page-intro" style={{ marginBottom: 24 }}>
        <div>
          <span className="eyebrow">Phân hệ tài khoản</span>
          <h1 style={{ margin: '6px 0 4px', fontFamily: 'Baloo 2, sans-serif', fontWeight: 700, fontSize: 34, letterSpacing: '-0.02em', color: '#16100D' }}>
            Quản lý Người dùng
          </h1>
          <p style={{ margin: 0, color: '#6B6259', fontFamily: 'Quicksand, sans-serif', fontSize: 14 }}>
            Danh sách tài khoản toàn hệ thống · Khóa / mở khóa · Gán chi nhánh
          </p>
        </div>
        <Button icon={<ReloadOutlined />} onClick={fetchUsers} loading={loading} style={{ borderRadius: 999, height: 42, fontWeight: 600 }}>
          Làm mới
        </Button>
      </div>

      <AdminTable<AdminUser>
        columns={columns}
        dataSource={filtered}
        rowKey="id"
        loading={loading}
        searchPlaceholder="Tìm theo tên hoặc email…"
        searchValue={keyword}
        onSearchChange={setKeyword}
        emptyTitle="Không tìm thấy người dùng"
        emptyDescription="Thử điều chỉnh từ khóa hoặc bộ lọc."
        filterNodes={
          <>
            <Select
              value={roleFilter}
              onChange={setRoleFilter}
              style={{ width: 180, borderRadius: 999 }}
              options={[
                { value: 'ALL', label: 'Tất cả vai trò' },
                { value: 'ADMIN', label: 'Quản trị viên HQ' },
                { value: 'STORE_MANAGER', label: 'Quản lý chi nhánh' },
                { value: 'STAFF', label: 'Nhân viên ca' },
                { value: 'SHIPPER', label: 'Shipper' },
                { value: 'CUSTOMER', label: 'Khách hàng' },
              ]}
            />
            <Select
              value={storeFilter}
              onChange={setStoreFilter}
              style={{ width: 220, borderRadius: 999 }}
              options={[
                { value: 'ALL', label: 'Tất cả chi nhánh' },
                ...mockStores.map((s) => ({ value: String(s.id), label: s.name })),
              ]}
            />
          </>
        }
        scroll={{ x: 720 }}
      />

      {/* Lock / Unlock confirm */}
      <ConfirmModal
        open={!!lockTarget}
        title={lockTarget?.status === 'LOCKED' ? 'Mở khóa tài khoản' : 'Khóa tài khoản'}
        danger={lockTarget?.status !== 'LOCKED'}
        loading={actionLoading}
        content={
          <>
            Bạn có chắc muốn {lockTarget?.status === 'LOCKED' ? 'mở khóa' : 'khóa'} tài khoản{' '}
            <strong>{lockTarget?.fullName}</strong> ({lockTarget?.email})?
            {lockTarget?.status !== 'LOCKED' && (
              <div style={{ marginTop: 8 }}>Người dùng này sẽ không thể đăng nhập cho đến khi được mở lại.</div>
            )}
          </>
        }
        confirmText={lockTarget?.status === 'LOCKED' ? 'Mở khóa' : 'Khóa tài khoản'}
        onConfirm={confirmLockToggle}
        onCancel={() => setLockTarget(null)}
      />

      {/* Assign store */}
      <AdminModal
        open={!!assignTarget}
        title="Gán chi nhánh"
        subtitle={`Gán ${assignTarget?.fullName} vào một chi nhánh`}
        okText="Lưu gán chi nhánh"
        confirmLoading={actionLoading}
        onOk={confirmAssign}
        onCancel={() => setAssignTarget(null)}
      >
        <div style={{ marginBottom: 18 }}>
          <label
            htmlFor="assign-store-select"
            style={{ display: 'block', marginBottom: 8, fontFamily: 'Quicksand, sans-serif', fontWeight: 700, fontSize: 14, color: '#16100D' }}
          >
            Chi nhánh
          </label>
          <Select
            id="assign-store-select"
            value={assignStoreId}
            onChange={(v) => setAssignStoreId(v)}
            style={{ width: '100%' }}
            placeholder="Chọn chi nhánh"
            options={mockStores.map((s) => ({ value: s.id, label: `${s.name} — ${s.district}` }))}
          />
        </div>
      </AdminModal>
    </div>
  );
};

export default UsersPage;
