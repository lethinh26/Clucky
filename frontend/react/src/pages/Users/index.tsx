import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { usePageLoading } from "../../components/ui-loader/page-loading";
import { Select, Button, Space, message, Tooltip } from "antd";
import type { TableColumnsType } from "antd";
import {
  LockOutlined,
  UnlockOutlined,
  ShopOutlined,
  ReloadOutlined,
  TeamOutlined,
  UserOutlined,
  CheckCircleOutlined,
} from "@ant-design/icons";
import { AdminTable } from "../../components/ui/AdminTable";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { ConfirmModal } from "../../components/ui/AdminModal";
import { AdminModal } from "../../components/ui/AdminModal";
import { usersApi, AdminUser, getErrorMessage } from "../../lib/api";
import { mockStores } from "../../mocks/catalogData";
import { useAuth } from "../../context/AuthContext";
import styles from "./users.module.css";

const roleLabelMap: Record<
  AdminUser["role"],
  { label: string; status: "error" | "gold" | "success" | "info" | "default" }
> = {
  ADMIN: { label: "Quản trị viên HQ", status: "error" },
  STORE_MANAGER: { label: "Quản lý chi nhánh", status: "gold" },
  STAFF: { label: "Nhân viên ca", status: "success" },
  SHIPPER: { label: "Shipper", status: "info" },
  CUSTOMER: { label: "Khách hàng", status: "default" },
};

export const UsersPage: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);
  const request = useRef<AbortController | null>(null);
  const actionRequest = useRef<AbortController | null>(null);
  usePageLoading(loading && initialLoad);
  const [apiAvailable, setApiAvailable] = useState(true);
  const [keyword, setKeyword] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("ALL");
  const [storeFilter, setStoreFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "LOCKED">(
    "ALL",
  );

  // action state
  const [lockTarget, setLockTarget] = useState<AdminUser | null>(null);
  const [assignTarget, setAssignTarget] = useState<AdminUser | null>(null);
  const [assignStoreId, setAssignStoreId] = useState<number | undefined>(
    undefined,
  );
  const [actionLoading, setActionLoading] = useState(false);

  const fetchUsers = useCallback(async () => {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setLoading(true);
    try {
      const data = await usersApi.list(undefined, controller.signal);
      if (controller.signal.aborted) return;
      setUsers(data);
      setApiAvailable(true);
    } catch {
      if (controller.signal.aborted) return;
      setApiAvailable(false);
      // Graceful fallback so the admin UI is still reviewable.
      setUsers([
        {
          id: 1,
          fullName: "Lê Phú Thịnh",
          email: "admin@clucky.local",
          phone: "0901000001",
          role: "ADMIN",
          status: "ACTIVE",
        },
        {
          id: 2,
          fullName: "Nguyễn Minh Anh",
          email: "manager.d1@clucky.local",
          phone: "0901000002",
          role: "STORE_MANAGER",
          storeId: 1,
          storeName: "Clucky Lê Lợi (Q.1)",
          status: "ACTIVE",
        },
        {
          id: 3,
          fullName: "Trần Quốc Bảo",
          email: "staff.d1@clucky.local",
          phone: "0901000003",
          role: "STAFF",
          storeId: 1,
          storeName: "Clucky Lê Lợi (Q.1)",
          status: "ACTIVE",
        },
        {
          id: 4,
          fullName: "Trần Gia Huy",
          email: "manager.govap@clucky.local",
          phone: "0901000006",
          role: "STORE_MANAGER",
          storeId: 2,
          storeName: "Clucky Phan Văn Trị",
          status: "ACTIVE",
        },
        {
          id: 5,
          fullName: "Phạm Thuỳ Linh",
          email: "manager.thuduc@clucky.local",
          phone: "0901000008",
          role: "STORE_MANAGER",
          storeId: 4,
          storeName: "Clucky Thủ Đức",
          status: "LOCKED",
        },
        {
          id: 6,
          fullName: "Vũ Quốc Khánh",
          email: "shipper.khanh@clucky.local",
          phone: "0901000011",
          role: "SHIPPER",
          storeId: 1,
          storeName: "Clucky Lê Lợi (Q.1)",
          status: "ACTIVE",
        },
      ]);
    } finally {
      if (!controller.signal.aborted && request.current === controller) {
        setLoading(false);
        setInitialLoad(false);
      }
    }
  }, []);

  useEffect(() => {
    void fetchUsers();
    return () => {
      request.current?.abort();
      actionRequest.current?.abort();
    };
  }, [fetchUsers]);

  const filtered = useMemo(() => {
    return users.filter((u) => {
      const q = keyword.trim().toLowerCase();
      if (q && !`${u.fullName} ${u.email}`.toLowerCase().includes(q))
        return false;
      if (roleFilter !== "ALL" && u.role !== roleFilter) return false;
      if (storeFilter !== "ALL" && String(u.storeId ?? "") !== storeFilter)
        return false;
      if (statusFilter !== "ALL" && u.status !== statusFilter) return false;
      return true;
    });
  }, [users, keyword, roleFilter, storeFilter, statusFilter]);

  const activeCount = users.filter((u) => u.status === "ACTIVE").length;
  const lockedCount = users.filter((u) => u.status === "LOCKED").length;
  const storeCount = new Set(
    users.flatMap((u) => (u.storeId == null ? [] : [u.storeId])),
  ).size;
  const hasFilters =
    keyword !== "" ||
    roleFilter !== "ALL" ||
    storeFilter !== "ALL" ||
    statusFilter !== "ALL";
  const resetFilters = () => {
    setKeyword("");
    setRoleFilter("ALL");
    setStoreFilter("ALL");
    setStatusFilter("ALL");
  };

  /* ---------- actions ---------- */
  const canLockTarget = (u: AdminUser) => {
    if (currentUser.role === "ADMIN") return u.id !== currentUser.id;
    if (currentUser.role === "STORE_MANAGER")
      return u.role === "STAFF" && u.storeId === currentUser.storeId;
    return false;
  };
  const canAssignStore = (u: AdminUser) => {
    if (currentUser.role !== "ADMIN") return false;
    return (
      u.role === "STAFF" || u.role === "STORE_MANAGER" || u.role === "SHIPPER"
    );
  };

  const confirmLockToggle = async () => {
    if (!lockTarget || actionRequest.current) return;
    const controller = new AbortController();
    actionRequest.current = controller;
    setActionLoading(true);
    const target = lockTarget;
    const willLock = target.status !== "LOCKED";
    try {
      if (apiAvailable) {
        if (willLock) await usersApi.lock(target.id, controller.signal);
        else await usersApi.unlock(target.id, controller.signal);
      }
      if (controller.signal.aborted) return;
      setUsers((prev) =>
        prev.map((u) =>
          u.id === target.id
            ? { ...u, status: willLock ? "LOCKED" : "ACTIVE" }
            : u,
        ),
      );
      message.success(
        `${willLock ? "Đã khóa" : "Đã mở khóa"} tài khoản ${target.fullName}.`,
      );
    } catch (err) {
      if (!controller.signal.aborted)
        message.error(getErrorMessage(err, "Thao tác thất bại."));
    } finally {
      if (!controller.signal.aborted) {
        actionRequest.current = null;
        setActionLoading(false);
        setLockTarget(null);
      }
    }
  };

  const confirmAssign = async () => {
    if (!assignTarget || assignStoreId === undefined || actionRequest.current)
      return;
    const controller = new AbortController();
    actionRequest.current = controller;
    setActionLoading(true);
    const store = mockStores.find((s) => s.id === assignStoreId);
    try {
      if (apiAvailable)
        await usersApi.assignStore(
          assignTarget.id,
          assignStoreId,
          controller.signal,
        );
      if (controller.signal.aborted) return;
      setUsers((prev) =>
        prev.map((u) =>
          u.id === assignTarget.id
            ? { ...u, storeId: assignStoreId, storeName: store?.name }
            : u,
        ),
      );
      message.success(
        `Đã gán ${assignTarget.fullName} cho ${store?.name ?? "chi nhánh mới"}.`,
      );
    } catch (err) {
      if (!controller.signal.aborted)
        message.error(getErrorMessage(err, "Gán chi nhánh thất bại."));
    } finally {
      if (!controller.signal.aborted) {
        actionRequest.current = null;
        setActionLoading(false);
        setAssignTarget(null);
        setAssignStoreId(undefined);
      }
    }
  };

  const columns: TableColumnsType<AdminUser> = [
    {
      title: "Tài khoản",
      key: "account",
      render: (_, u) => (
        <div className={styles.account}>
          <span className={styles.avatar} data-role={u.role} aria-hidden="true">
            {u.fullName
              .split(" ")
              .filter(Boolean)
              .slice(-2)
              .map((word) => word[0])
              .join("")}
          </span>
          <div>
            <strong>{u.fullName}</strong>
            <span className="table-subtext">{u.email}</span>
          </div>
        </div>
      ),
    },
    {
      title: "Vai trò",
      dataIndex: "role",
      key: "role",
      width: 180,
      render: (role: AdminUser["role"]) => (
        <StatusBadge
          status={roleLabelMap[role]?.status ?? "default"}
          text={roleLabelMap[role]?.label ?? role}
        />
      ),
    },
    {
      title: "Chi nhánh",
      dataIndex: "storeName",
      key: "store",
      render: (_, u) =>
        u.storeName ? (
          <span className={styles.storeCell}>
            <ShopOutlined />
            {u.storeName}
          </span>
        ) : (
          <span className={styles.noStore}>Chưa gán chi nhánh</span>
        ),
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",
      width: 140,
      render: (status: AdminUser["status"]) => (
        <StatusBadge
          status={status === "LOCKED" ? "error" : "success"}
          text={status === "LOCKED" ? "Đã khóa" : "Hoạt động"}
        />
      ),
    },
    {
      title: "Hành động",
      key: "actions",
      width: 200,
      render: (_, u) => (
        <Space size={8}>
          <Tooltip
            title={
              canLockTarget(u)
                ? u.status === "LOCKED"
                  ? "Mở khóa"
                  : "Khóa tài khoản"
                : "Không có quyền"
            }
          >
            <Button
              type="text"
              danger={u.status !== "LOCKED"}
              icon={
                u.status === "LOCKED" ? <UnlockOutlined /> : <LockOutlined />
              }
              disabled={!canLockTarget(u)}
              onClick={() => setLockTarget(u)}
              aria-label={u.status === "LOCKED" ? "Mở khóa" : "Khóa"}
            />
          </Tooltip>
          <Tooltip
            title={
              canAssignStore(u) ? "Gán chi nhánh" : "Chỉ Admin gán cho nhân sự"
            }
          >
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
    <div className={styles.root}>
      <div className={styles.intro}>
        <div>
          <span className={styles.eyebrow}>CON NGƯỜI LÀM NÊN CLUCKY</span>
          <h1>
            Quản lý người dùng<span>.</span>
          </h1>
          <p>Kết nối đội ngũ, quản lý tài khoản và phân công chi nhánh.</p>
        </div>
        <div className={styles.introActions}>
          {!apiAvailable && (
            <span className={styles.demoBadge}>Dữ liệu mẫu</span>
          )}
          <Button
            icon={<ReloadOutlined />}
            onClick={fetchUsers}
            loading={loading}
          >
            Làm mới danh sách
          </Button>
        </div>
      </div>

      <section className={styles.metrics} aria-label="Tổng quan người dùng">
        {[
          {
            label: "Tổng tài khoản",
            value: users.length,
            note: "Trong danh sách hiện tại",
            icon: <TeamOutlined />,
            tone: "wine",
          },
          {
            label: "Đang hoạt động",
            value: activeCount,
            note: "Tài khoản được mở khóa",
            icon: <CheckCircleOutlined />,
            tone: "green",
          },
          {
            label: "Đã khóa",
            value: lockedCount,
            note: "Tạm ngừng quyền truy cập",
            icon: <LockOutlined />,
            tone: "gold",
          },
          {
            label: "Chi nhánh có nhân sự",
            value: storeCount,
            note: "Đã được gán tài khoản",
            icon: <ShopOutlined />,
            tone: "blue",
          },
        ].map((metric) => (
          <div
            className={styles.metric}
            key={metric.label}
            data-tone={metric.tone}
          >
            <div className={styles.metricTop}>
              <span>{metric.label}</span>
              <span className={styles.metricIcon}>{metric.icon}</span>
            </div>
            <strong>
              {loading ? "—" : metric.value.toString().padStart(2, "0")}
            </strong>
            <span className={styles.metricNote}>{metric.note}</span>
          </div>
        ))}
      </section>

      <section className={styles.directory} aria-label="Danh sách người dùng">
        <div className={styles.directoryHeading}>
          <div>
            <span className={styles.directoryIcon}>
              <UserOutlined />
            </span>
            <h2>Danh sách tài khoản</h2>
            <span className={styles.resultCount}>
              {loading ? "…" : filtered.length}
            </span>
          </div>
          <span>Quản lý vai trò và chi nhánh ở cùng một nơi</span>
        </div>
        <div
          className={styles.statusFilters}
          role="group"
          aria-label="Lọc trạng thái tài khoản"
        >
          {(
            [
              { key: "ALL", label: "Tất cả", count: users.length },
              { key: "ACTIVE", label: "Hoạt động", count: activeCount },
              { key: "LOCKED", label: "Đã khóa", count: lockedCount },
            ] as const
          ).map((status) => (
            <button
              type="button"
              key={status.key}
              aria-pressed={statusFilter === status.key}
              onClick={() => setStatusFilter(status.key)}
            >
              {status.label}
              <span>{loading ? "—" : status.count}</span>
            </button>
          ))}
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
          emptyAction={
            hasFilters ? (
              <Button onClick={resetFilters}>Xóa bộ lọc</Button>
            ) : undefined
          }
          toolbarExtra={
            hasFilters ? (
              <Button type="text" onClick={resetFilters}>
                Xóa bộ lọc
              </Button>
            ) : undefined
          }
          filterNodes={
            <>
              <Select
                aria-label="Lọc theo vai trò"
                value={roleFilter}
                onChange={setRoleFilter}
                style={{ width: 180, borderRadius: 999 }}
                options={[
                  { value: "ALL", label: "Tất cả vai trò" },
                  { value: "ADMIN", label: "Quản trị viên HQ" },
                  { value: "STORE_MANAGER", label: "Quản lý chi nhánh" },
                  { value: "STAFF", label: "Nhân viên ca" },
                  { value: "SHIPPER", label: "Shipper" },
                  { value: "CUSTOMER", label: "Khách hàng" },
                ]}
              />
              <Select
                aria-label="Lọc theo chi nhánh"
                value={storeFilter}
                onChange={setStoreFilter}
                style={{ width: 220, borderRadius: 999 }}
                options={[
                  { value: "ALL", label: "Tất cả chi nhánh" },
                  ...mockStores.map((s) => ({
                    value: String(s.id),
                    label: s.name,
                  })),
                ]}
              />
            </>
          }
          scroll={{ x: 720 }}
        />
      </section>

      {/* Lock / Unlock confirm */}
      <ConfirmModal
        open={!!lockTarget}
        title={
          lockTarget?.status === "LOCKED"
            ? "Mở khóa tài khoản"
            : "Khóa tài khoản"
        }
        danger={lockTarget?.status !== "LOCKED"}
        loading={actionLoading}
        content={
          <>
            Bạn có chắc muốn{" "}
            {lockTarget?.status === "LOCKED" ? "mở khóa" : "khóa"} tài khoản{" "}
            <strong>{lockTarget?.fullName}</strong> ({lockTarget?.email})?
            {lockTarget?.status !== "LOCKED" && (
              <div style={{ marginTop: 8 }}>
                Người dùng này sẽ không thể đăng nhập cho đến khi được mở lại.
              </div>
            )}
          </>
        }
        confirmText={
          lockTarget?.status === "LOCKED" ? "Mở khóa" : "Khóa tài khoản"
        }
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
        okButtonProps={{ disabled: assignStoreId === undefined }}
        onOk={confirmAssign}
        onCancel={() => setAssignTarget(null)}
      >
        <div style={{ marginBottom: 18 }}>
          <label
            htmlFor="assign-store-select"
            style={{
              display: "block",
              marginBottom: 8,
              fontFamily: "Quicksand, sans-serif",
              fontWeight: 700,
              fontSize: 14,
              color: "#16100D",
            }}
          >
            Chi nhánh
          </label>
          <Select
            id="assign-store-select"
            value={assignStoreId}
            onChange={(v) => setAssignStoreId(v)}
            style={{ width: "100%" }}
            placeholder="Chọn chi nhánh"
            options={mockStores.map((s) => ({
              value: s.id,
              label: `${s.name} — ${s.district}`,
            }))}
          />
        </div>
      </AdminModal>
    </div>
  );
};

export default UsersPage;
