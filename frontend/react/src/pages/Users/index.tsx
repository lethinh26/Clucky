import { useTranslation } from "react-i18next";
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



export const UsersPage: React.FC = () => {
  const { t } = useTranslation();

  const roleLabelMap: Record<
  AdminUser["role"],
  { label: string; status: "error" | "gold" | "success" | "info" | "default" }
> = {
  ADMIN: { label: t("business:users.hqAdministrator"), status: "error" },
  STORE_MANAGER: { label: t("business:reviews.storeManager"), status: "gold" },
  STAFF: { label: t("business:users.shiftStaff"), status: "success" },
  SHIPPER: { label: "Shipper", status: "info" },
  CUSTOMER: { label: t("business:dashboard.customer"), status: "default" },
};

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
        t("business:users.account", { value1: willLock ? t("business:users.locked") : t("business:users.unlocked"), value2: target.fullName }),
      );
    } catch (err) {
      if (!controller.signal.aborted)
        message.error(getErrorMessage(err, t("business:users.theActionFailed")));
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
        t("business:users.assignedTo", { value1: assignTarget.fullName, value2: store?.name ?? t("business:users.newStore") }),
      );
    } catch (err) {
      if (!controller.signal.aborted)
        message.error(getErrorMessage(err, t("business:users.storeAssignmentFailed")));
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
      title: t("business:users.account"),
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
      title: t("business:users.role"),
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
      title: t("business:party.store"),
      dataIndex: "storeName",
      key: "store",
      render: (_, u) =>
        u.storeName ? (
          <span className={styles.storeCell}>
            <ShopOutlined />
            {u.storeName}
          </span>
        ) : (
          <span className={styles.noStore}>{t("business:users.noStoreAssigned")}</span>
        ),
    },
    {
      title: t("business:catalog.status"),
      dataIndex: "status",
      key: "status",
      width: 140,
      render: (status: AdminUser["status"]) => (
        <StatusBadge
          status={status === "LOCKED" ? "error" : "success"}
          text={status === "LOCKED" ? t("business:users.locked") : t("business:catalog.active")}
        />
      ),
    },
    {
      title: t("business:catalog.actions"),
      key: "actions",
      width: 200,
      render: (_, u) => (
        <Space size={8}>
          <Tooltip
            title={
              canLockTarget(u)
                ? u.status === "LOCKED"
                  ? t("business:users.unlock")
                  : t("business:users.lockAccount")
                : t("business:users.notPermitted")
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
              aria-label={u.status === "LOCKED" ? t("business:users.unlock") : t("business:users.lock")}
            />
          </Tooltip>
          <Tooltip
            title={
              canAssignStore(u) ? t("business:users.assignStore") : t("business:users.onlyAdminCanAssignStaff")
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
              aria-label={t("business:users.assignStore")}
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
          <span className={styles.eyebrow}>{t("business:users.peopleMakeClucky")}</span>
          <h1> {t("business:users.userManagement")}<span>.</span>
          </h1>
          <p>{t("business:users.connectYourTeamManageAccountsAndAssignStores")}</p>
        </div>
        <div className={styles.introActions}>
          {!apiAvailable && (
            <span className={styles.demoBadge}>{t("business:users.sampleData")}</span>
          )}
          <Button
            icon={<ReloadOutlined />}
            onClick={fetchUsers}
            loading={loading}
          > {t("business:users.refreshList")} </Button>
        </div>
      </div>

      <section className={styles.metrics} aria-label={t("business:users.userOverview")}>
        {[
          {
            label: t("business:users.totalAccounts"),
            value: users.length,
            note: t("business:users.inTheCurrentList"),
            icon: <TeamOutlined />,
            tone: "wine",
          },
          {
            label: t("business:catalog.active"),
            value: activeCount,
            note: t("business:users.unlockedAccounts"),
            icon: <CheckCircleOutlined />,
            tone: "green",
          },
          {
            label: t("business:users.locked"),
            value: lockedCount,
            note: t("business:users.accessTemporarilySuspended"),
            icon: <LockOutlined />,
            tone: "gold",
          },
          {
            label: t("business:users.storesWithStaff"),
            value: storeCount,
            note: t("business:users.accountsAssigned"),
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

      <section className={styles.directory} aria-label={t("business:users.userList")}>
        <div className={styles.directoryHeading}>
          <div>
            <span className={styles.directoryIcon}>
              <UserOutlined />
            </span>
            <h2>{t("business:users.accountList")}</h2>
            <span className={styles.resultCount}>
              {loading ? "…" : filtered.length}
            </span>
          </div>
          <span>{t("business:users.manageRolesAndStoresInOnePlace")}</span>
        </div>
        <div
          className={styles.statusFilters}
          role="group"
          aria-label={t("business:users.filterAccountStatus")}
        >
          {(
            [
              { key: "ALL", label: t("business:stafforderspage.all"), count: users.length },
              { key: "ACTIVE", label: t("business:catalog.active"), count: activeCount },
              { key: "LOCKED", label: t("business:users.locked"), count: lockedCount },
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
          searchPlaceholder={t("business:users.searchByNameOrEmail")}
          searchValue={keyword}
          onSearchChange={setKeyword}
          emptyTitle={t("business:users.noUsersFound")}
          emptyDescription={t("business:users.tryAdjustingTheSearchTermOrFilters")}
          emptyAction={
            hasFilters ? (
              <Button onClick={resetFilters}>{t("business:orderspage.clearFilters")}</Button>
            ) : undefined
          }
          toolbarExtra={
            hasFilters ? (
              <Button type="text" onClick={resetFilters}> {t("business:orderspage.clearFilters")} </Button>
            ) : undefined
          }
          filterNodes={
            <>
              <Select
                aria-label={t("business:users.filterByRole")}
                value={roleFilter}
                onChange={setRoleFilter}
                style={{ width: 180, borderRadius: 999 }}
                options={[
                  { value: "ALL", label: t("business:users.allRoles") },
                  { value: "ADMIN", label: t("business:users.hqAdministrator") },
                  { value: "STORE_MANAGER", label: t("business:reviews.storeManager") },
                  { value: "STAFF", label: t("business:users.shiftStaff") },
                  { value: "SHIPPER", label: "Shipper" },
                  { value: "CUSTOMER", label: t("business:dashboard.customer") },
                ]}
              />
              <Select
                aria-label={t("business:users.filterByStore")}
                value={storeFilter}
                onChange={setStoreFilter}
                style={{ width: 220, borderRadius: 999 }}
                options={[
                  { value: "ALL", label: t("business:stores.allStores") },
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
            ? t("business:users.unlockAccount")
            : t("business:users.lockAccount")
        }
        danger={lockTarget?.status !== "LOCKED"}
        loading={actionLoading}
        content={
          <> {t("business:users.areYouSureYouWantTo")}{" "}
            {lockTarget?.status === "LOCKED" ? t("business:users.unlockLabel") : t("business:users.lockLabel")} {t("business:users.accountNoun")}{" "}
            <strong>{lockTarget?.fullName}</strong> ({lockTarget?.email})?
            {lockTarget?.status !== "LOCKED" && (
              <div style={{ marginTop: 8 }}> {t("business:users.thisUserWillNotBeAbleToSignInUntilTheAccount")} </div>
            )}
          </>
        }
        confirmText={
          lockTarget?.status === "LOCKED" ? t("business:users.unlock") : t("business:users.lockAccount")
        }
        onConfirm={confirmLockToggle}
        onCancel={() => setLockTarget(null)}
      />

      {/* Assign store */}
      <AdminModal
        open={!!assignTarget}
        title={t("business:users.assignStore")}
        subtitle={t("business:users.assignToAStore", { value1: assignTarget?.fullName })}
        okText={t("business:users.saveStoreAssignment")}
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
          > {t("business:party.store")} </label>
          <Select
            id="assign-store-select"
            value={assignStoreId}
            onChange={(v) => setAssignStoreId(v)}
            style={{ width: "100%" }}
            placeholder={t("business:users.selectStore")}
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
