import { message } from "../components/feedback";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "../i18n/language-switcher";
import React, { useState } from "react";
import { Outlet, useNavigate, useLocation, Link } from "react-router-dom";
import { Layout, Menu, Breadcrumb, Button, Badge, Dropdown, Avatar, Tag, Flex, Typography, Drawer, Grid } from "antd";
import { MenuProps } from "antd";
import {
  DashboardOutlined,
  CoffeeOutlined,
  ShopOutlined,
  InboxOutlined,
  FileTextOutlined,
  CommentOutlined,
  BarChartOutlined,
  GiftOutlined,
  BellOutlined,
  UserOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
} from "@ant-design/icons";
import { useAuth } from "../context/AuthContext";
import { getErrorMessage } from "../lib/api";
import { roleHome } from "../lib/role-home";
import { AdminFooter } from "../components/AdminFooter";
import { PageLoadingContent } from "../components/ui-loader/page-loading";
import { AdminNotificationCenter } from "../components/ui/AdminNotificationCenter";

const routeBreadcrumbMap: Record<string, string> = {
  "/admin": "admin:nav.overview",
  "/admin/dashboard": "admin:nav.overview",
  "/admin/catalog": "admin:nav.catalog",
  "/admin/stores": "admin:nav.stores",
  "/admin/inventory": "admin:nav.inventory",
  "/admin/orders": "admin:nav.orders",
  "/admin/staff/orders": "admin:nav.shiftOrders",
  "/admin/reviews": "admin:nav.reviews",
  "/admin/users": "admin:nav.users",
  "/admin/reports": "admin:nav.reports",
  "/admin/payments": "admin:nav.payments",
  "/admin/promotions": "admin:nav.promotions",
};

export const AdminLayout: React.FC = () => {
  const { t } = useTranslation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const screens = Grid.useBreakpoint();
  const isMobile = screens.lg === false;
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Determine current active menu key
  const pathname = location.pathname;
  let selectedKey = "dashboard";
  if (pathname.includes("/catalog")) selectedKey = "catalog";
  else if (pathname.includes("/stores")) selectedKey = "stores";
  else if (pathname.includes("/inventory")) selectedKey = "inventory";
  else if (pathname.includes("/staff/orders")) selectedKey = "staff-orders";
  else if (pathname.includes("/orders")) selectedKey = "orders";
  else if (pathname.includes("/users")) selectedKey = "users";
  else if (pathname.includes("/reviews")) selectedKey = "reviews";
  else if (pathname.includes("/reports")) selectedKey = "reports";
  else if (pathname.includes("/payments")) selectedKey = "payments";
  else if (pathname.includes("/promotions")) selectedKey = "promotions";

  const roleNavPermissions: Record<
    "ADMIN" | "STORE_MANAGER" | "STAFF",
    string[]
  > = {
    ADMIN: [
      "dashboard",
      "catalog",
      "stores",
      "inventory",
      "orders",
      "users",
      "reviews",
      "reports",
      "payments",
      "promotions",
    ],
    STORE_MANAGER: [
      "dashboard",
      "stores",
      "inventory",
      "orders",
      "users",
      "reviews",
      "reports",
      "payments",
    ],
    STAFF: ["inventory", "orders", "reviews"],
  };

  const navItems: MenuProps["items"] = [
    {
      key: "dashboard",
      icon: <DashboardOutlined />,
      label: t("admin:nav.overview"),
      onClick: () => navigate("/admin/dashboard"),
    },
    {
      key: "catalog",
      icon: <CoffeeOutlined />,
      label: t("admin:breadcrumb.catalog"),
      onClick: () => navigate("/admin/catalog"),
    },
    {
      key: "stores",
      icon: <ShopOutlined />,
      label: t("admin:breadcrumb.stores"),
      onClick: () => navigate("/admin/stores"),
    },
    {
      key: "inventory",
      icon: <InboxOutlined />,
      label: t("admin:nav.inventory"),
      onClick: () => navigate("/admin/inventory"),
    },
    {
      key: "orders",
      icon: <FileTextOutlined />,
      label: t("admin:nav.orders"),
      onClick: () => navigate("/admin/orders"),
    },
    {
      key: "staff-orders",
      icon: <ShopOutlined />,
      label: t("admin:nav.shiftOrders"),
      onClick: () => navigate("/admin/staff/orders"),
    },
    {
      key: "reviews",
      icon: <CommentOutlined />,
      label: t("admin:breadcrumb.reviews"),
      onClick: () => navigate("/admin/reviews"),
    },
    {
      key: "users",
      icon: <UserOutlined />,
      label: t("admin:breadcrumb.users"),
      onClick: () => navigate("/admin/users"),
    },
    {
      key: "reports",
      icon: <BarChartOutlined />,
      label: t("admin:nav.reports"),
      onClick: () => navigate("/admin/reports"),
    },
    {
      key: "payments",
      icon: <BarChartOutlined />,
      label: t("admin:nav.payments"),
      onClick: () => navigate("/admin/payments"),
    },
    {
      key: "promotions",
      icon: <GiftOutlined />,
      label: t("admin:breadcrumb.promotions"),
      onClick: () => navigate("/admin/promotions"),
    },
  ];

  const allowedNavKeys = roleNavPermissions[user.role] || ["dashboard"];
  const visibleNavItems = navItems.filter(
    (item) => item && allowedNavKeys.includes(String(item.key)),
  );

  const roleLabelMap: Record<string, { label: string; color: string }> = {
    ADMIN: { label: t("admin:roles.hqAdmin"), color: "#8F1216" },
    STORE_MANAGER: { label: t("admin:nav.stores"), color: "#C9A227" },
    STAFF: { label: t("admin:roles.staff"), color: "#1E7A46" },
  };

  const profileMenuItems: MenuProps["items"] = [
    {
      key: "user-info",
      disabled: true,
      label: (
        <div style={{ padding: "4px 0" }}>
          <div style={{ fontWeight: 700, color: "#16100D" }}>
            {user.fullName}
          </div>
          <div style={{ fontSize: 12, color: "#6B6259" }}>{user.email}</div>
          <Tag
            color={roleLabelMap[user.role]?.color}
            style={{ marginTop: 6, borderRadius: 6 }}
          >
            {roleLabelMap[user.role]?.label}
          </Tag>
        </div>
      ),
    },
    { type: "divider" },
    {
      key: "logout",
      label: t("common:signOut"),
      icon: <LogoutOutlined />,
      onClick: async () => {
        try {
          await logout();
          message.info(t("common:signedOut"));
          navigate("/login", { replace: true });
        } catch (error) {
          message.error(getErrorMessage(error));
        }
      },
    },
  ];

  const currentTitle = t(routeBreadcrumbMap[pathname] || "admin:dashboard");

  return (
    <Layout
      className="admin-layout"
      style={{ minHeight: "100vh", background: "#F5EDE0" }}
    >
      <Layout.Sider
        data-loading-shell="left"
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        width={260}
        trigger={null}
        className="admin-sider"
        style={{
          background: "#16100D",
          boxShadow: "4px 0 24px rgba(22, 16, 13, 0.08)",
          zIndex: 10,
        }}
      >
        <div
          className="sider-brand"
          style={{
            height: 76,
            display: "flex",
            alignItems: "center",
            justifyContent: collapsed ? "center" : "flex-start",
            padding: collapsed ? "0" : "0 24px",
            gap: 12,
            borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
          }}
        >
          <img
            src="/logo_primary.png"
            alt="Clucky"
            style={{ width: 38, height: 38, objectFit: "contain" }}
          />
          {!collapsed && (
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span
                style={{
                  fontFamily: "Baloo 2, sans-serif",
                  fontWeight: 700,
                  fontSize: 22,
                  color: "#FFFAF3",
                  letterSpacing: "0.04em",
                  lineHeight: 1.1,
                }}
              >
                CLUCKY
              </span>
              <span
                style={{
                  fontFamily: "Quicksand, sans-serif",
                  fontWeight: 600,
                  fontSize: 10,
                  color: "#C9A227",
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                }}
              >
                Management System
              </span>
            </div>
          )}
        </div>

        {!collapsed && (
          <div
            style={{
              padding: "16px 24px 6px",
              color: "rgba(245, 237, 224, 0.45)",
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.14em",
              fontFamily: "Quicksand, sans-serif",
            }}
          >
            {t("admin:workspace")}{" "}</div>
        )}

        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[selectedKey]}
          items={visibleNavItems}
          style={{
            background: "transparent",
            borderRight: "none",
            fontFamily: "Quicksand, sans-serif",
            fontWeight: 600,
            fontSize: 14,
          }}
        />

        {!collapsed && (
          <div
            style={{
              position: "absolute",
              bottom: 24,
              left: 20,
              right: 20,
              padding: 14,
              background: "rgba(255, 250, 243, 0.05)",
              borderRadius: 14,
              border: "1px solid rgba(255, 250, 243, 0.1)",
            }}
          >
            <div
              style={{
                fontSize: 11,
                color: "rgba(245, 237, 224, 0.6)",
                fontFamily: "Quicksand, sans-serif",
              }}
            >
              {t("admin:currentRole")}{" "}</div>
            <div
              style={{
                fontFamily: "Baloo 2, sans-serif",
                color: "#C9A227",
                fontWeight: 600,
                fontSize: 13,
                marginTop: 2,
              }}
            >
              {roleLabelMap[user.role]?.label}
            </div>
            {user.storeName && (
              <div
                style={{
                  fontSize: 11,
                  color: "#FFFAF3",
                  marginTop: 2,
                  fontFamily: "Quicksand, sans-serif",
                }}
              >
                📍 {user.storeName}
              </div>
            )}
          </div>
        )}
      </Layout.Sider>

      <Drawer
        title={t("admin:navigation")}
        placement="left"
        open={isMobile && mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        styles={{
          wrapper: { width: "min(300px, 90vw)" },
          body: { padding: 0 },
        }}
      >
        <Menu
          mode="inline"
          selectedKeys={[selectedKey]}
          items={visibleNavItems}
          onClick={() => setMobileMenuOpen(false)}
        />
      </Drawer>

      <Layout style={{ minWidth: 0 }}>
        <Layout.Header
          data-loading-shell="top"
          className="admin-header"
          style={{
            height: 72,
            background: "#FFFAF3",
            borderBottom: "1px solid #E8E2D9",
            padding: "0 28px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
            position: "sticky",
            top: 0,
            zIndex: 9,
          }}
        >
          <Flex className="admin-header-navigation" align="center" gap={16}>
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              aria-label={
                isMobile
                  ? t("common:nav.open")
                  : collapsed
                    ? t("admin:expandNav")
                    : t("admin:collapseNav")
              }
              onClick={() =>
                isMobile ? setMobileMenuOpen(true) : setCollapsed(!collapsed)
              }
              style={{ fontSize: 16, color: "#16100D" }}
            />
            <Breadcrumb
              items={[
                { title: <Link to={roleHome(user.role)}>Clucky</Link> },
                { title: currentTitle },
              ]}
              style={{ fontFamily: "Quicksand, sans-serif", fontWeight: 600 }}
            />
          </Flex>

          <Flex className="admin-header-actions" align="center" gap={16}>
            {/* Store Chip for Staff / Store Manager */}
            {(user.role === "STAFF" || user.role === "STORE_MANAGER") && (
              <Tag
                className="admin-header-store"
                style={{
                  backgroundColor: "#FEF9C3",
                  border: "1px solid #FDE047",
                  color: "#946C00",
                  borderRadius: 999,
                  padding: "4px 12px",
                  fontFamily: "Quicksand, sans-serif",
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <ShopOutlined />
                <span>
                  {t("admin:storeLabel")}{" "}{user.storeName || (user.storeId ? `#${user.storeId}` : t('errors:FORBIDDEN'))}
                </span>
              </Tag>
            )}


            {/* Notification Center */}
            <AdminNotificationCenter />
            {false && (
            <Badge dot color="#8F1216">
              <Button
                type="text"
                shape="circle"
                icon={
                  <BellOutlined style={{ fontSize: 18, color: "#16100D" }} />
                }
                aria-label={t("admin:notifications.title")}
                onClick={() => message.info(t("admin:notifications.empty"))}
              />
            </Badge>
            )}

            {/* Profile Dropdown */}
            <LanguageSwitcher />
            <Dropdown menu={{ items: profileMenuItems }} trigger={["click"]}>
              <Button
                type="text"
                aria-label={t("admin:myAccount")}
                className="admin-profile-button"
                style={{
                  height: 44,
                  padding: "4px 10px",
                  borderRadius: 12,
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <Avatar
                  size={34}
                  style={{
                    backgroundColor: "#8F1216",
                    fontFamily: "Baloo 2, sans-serif",
                    fontWeight: 700,
                    color: "#FFFAF3",
                  }}
                >
                  {user.fullName.split(" ").pop()?.[0] || "C"}
                </Avatar>
                <div
                  className="admin-profile-details"
                  style={{ textAlign: "left", lineHeight: 1.2 }}
                >
                  <div
                    style={{
                      fontFamily: "Quicksand, sans-serif",
                      fontWeight: 700,
                      fontSize: 13,
                      color: "#16100D",
                    }}
                  >
                    {user.fullName}
                  </div>
                  <div
                    style={{
                      fontFamily: "Quicksand, sans-serif",
                      fontSize: 11,
                      color: "#6B6259",
                    }}
                  >
                    {roleLabelMap[user.role]?.label}
                  </div>
                </div>
              </Button>
            </Dropdown>
          </Flex>
        </Layout.Header>

        <Layout.Content
          className="admin-main-content"
          style={{
            padding: "28px 32px 48px",
            background: "#F5EDE0",
            minHeight: "calc(100vh - 72px - 56px)",
          }}
        >
          <div style={{ maxWidth: 1400, margin: "0 auto" }}>
            <PageLoadingContent>
              <Outlet
                key={`${location.pathname}${location.search}:${user.role}:${user.storeId ?? ""}`}
              />
            </PageLoadingContent>
          </div>
        </Layout.Content>

        <AdminFooter />
      </Layout>
    </Layout>
  );
};

export default AdminLayout;
