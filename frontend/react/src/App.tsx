import { useLocaleTools } from "./i18n/hooks";
import React from "react";
import { Toaster } from "./components/feedback";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ConfigProvider, App as AntApp } from "antd";
import viVN from "antd/locale/vi_VN";
import enUS from "antd/locale/en_US";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import { AdminLayout } from "./layouts/AdminLayout";
import { roleHome } from "./lib/role-home";
import { CatalogPage } from "./pages/Catalog";
import Dashboard from "./pages/Dashboard";
import { ReportsPage } from "./pages/Reports";
import { StoresPage } from "./pages/Stores";
import { StaffInventoryPage } from "./pages/Staff/Inventory";
import { OrdersPage } from "./pages/Orders";
import { AdminOrdersPage } from "./pages/Orders/AdminOrdersPage";
import { StaffOrdersPage } from "./pages/Staff/StaffOrdersPage";
import { IncomingTransfersPage } from "./pages/Staff/IncomingTransfersPage";
import { PromotionsPage } from "./pages/Promotions";
import { ReviewsPage } from "./pages/Reviews";
import { LoginPage } from "./pages/Auth/LoginPage";
import { BranchAccessPage } from "./pages/Auth/BranchAccessPage";
import { BranchAccountsPage } from "./pages/Users/BranchAccountsPage";
import { PaymentsPage } from "./pages/Payments";
import { PartyOrdersPage } from "./pages/PartyOrders/PartyOrdersPage";
import { AdminPaymentsPage } from "./pages/Payments/AdminPaymentsPage";
import { CustomersPage } from "./pages/Customers";
import { EmailLogsPage } from "./pages/EmailLogs";
import AuditLogPage from "./pages/AuditLog";

import { OrderProvider } from "./context/OrderContext";
import { PageLoadingProvider } from "./components/ui-loader/page-loading";
function OrdersRoute() {
  const { isAdmin, isStaff } = useAuth();
  return isAdmin ? <AdminOrdersPage /> : isStaff ? <StaffOrdersPage /> : <OrdersPage />;
}

function PaymentsRoute() {
  const { isAdmin } = useAuth();
  return isAdmin ? <AdminPaymentsPage /> : <PaymentsPage />;
}

function RoleHome() {
  const { user } = useAuth();
  return <Navigate to={roleHome(user.role)} replace />;
}

export const App: React.FC = () => {
  const { locale } = useLocaleTools();
  return (
    <ConfigProvider
      locale={locale === "vi" ? viVN : enUS}
      theme={{
        token: {
          colorPrimary: "#8F1216",
          colorInfo: "#22577A",
          colorSuccess: "#1E7A46",
          colorWarning: "#D97706",
          colorError: "#B42318",
          colorText: "#16100D",
          colorTextSecondary: "#6B6259",
          colorBorder: "#E8E2D9",
          borderRadius: 14,
          fontFamily: "Quicksand, system-ui, sans-serif",
          colorBgLayout: "#F5EDE0",
          colorBgContainer: "#FFFAF3",
        },
        components: {
          Menu: {
            darkItemBg: "#16100D",
            darkItemSelectedBg: "#8F1216",
            darkItemHoverBg: "#2A1F1B",
            darkItemColor: "rgba(245, 237, 224, 0.85)",
          },
          Button: {
            controlHeight: 42,
            borderRadius: 12,
            fontWeight: 700,
          },
          Card: {
            borderRadiusLG: 20,
          },
          Tag: {
            colorSuccessBg: "#ECFDF3",
            colorSuccessBorder: "#B7E4C7",
          },
        },
      }}
    >
      <AntApp message={{ maxCount: 3 }}>
        <Toaster locale={locale} />
        <AuthProvider>
          <OrderProvider>
            <BrowserRouter>
              <PageLoadingProvider>
                <Routes>
                  <Route
                    path="/"
                    element={<Navigate to="/admin" replace />}
                  />

                  {/* Public auth routes */}
                  <Route path="/login" element={<LoginPage />} />
                  {/* Internal accounts are provisioned; old signup URLs return to login. */}
                  <Route
                    path="/register"
                    element={<Navigate to="/login" replace />}
                  />
                  <Route
                    path="/verify-otp"
                    element={<Navigate to="/login" replace />}
                  />
                  <Route
                    path="/forgot-password"
                    element={<BranchAccessPage />}
                  />
                  <Route
                    path="/reset-password"
                    element={<BranchAccessPage />}
                  />
                  <Route
                    path="/staff/transfers"
                    element={<Navigate to="/admin/transfers" replace />}
                  />

                  <Route path="/admin" element={<ProtectedRoute allowedRoles={["ADMIN", "STORE_MANAGER", "STAFF"]}><AdminLayout /></ProtectedRoute>}>
                    <Route
                      index
                      element={<RoleHome />}
                    />
                    <Route
                      path="dashboard"
                      element={
                        <ProtectedRoute allowedRoles={["ADMIN", "STORE_MANAGER"]}>
                          <Dashboard />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="catalog"
                      element={
                        <ProtectedRoute allowedRoles={["ADMIN"]}>
                          <CatalogPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="stores"
                      element={
                        <ProtectedRoute
                          allowedRoles={["ADMIN", "STORE_MANAGER"]}
                        >
                          <StoresPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="inventory"
                      element={
                        <ProtectedRoute
                          allowedRoles={["ADMIN", "STORE_MANAGER", "STAFF"]}
                        >
                          <StaffInventoryPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="reviews"
                      element={
                        <ProtectedRoute
                          allowedRoles={["ADMIN", "STORE_MANAGER", "STAFF"]}
                        >
                          <ReviewsPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="reports"
                      element={
                        <ProtectedRoute
                          allowedRoles={["ADMIN", "STORE_MANAGER"]}
                        >
                          <ReportsPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="orders"
                      element={
                        <ProtectedRoute
                          allowedRoles={["ADMIN", "STORE_MANAGER", "STAFF"]}
                        >
                          <OrdersRoute />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="party-orders"
                      element={<ProtectedRoute allowedRoles={["ADMIN", "STORE_MANAGER", "STAFF"]}><PartyOrdersPage /></ProtectedRoute>}
                    />
                    <Route
                      path="users"
                      element={
                        <ProtectedRoute
                          allowedRoles={["ADMIN", "STORE_MANAGER"]}
                        >
                          <BranchAccountsPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="payments"
                      element={
                        <ProtectedRoute
                          allowedRoles={["ADMIN", "STORE_MANAGER", "STAFF"]}
                        >
                          <PaymentsRoute />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="customers"
                      element={<ProtectedRoute allowedRoles={["ADMIN"]}><CustomersPage /></ProtectedRoute>}
                    />
                    <Route
                      path="email-logs"
                      element={<ProtectedRoute allowedRoles={["ADMIN"]}><EmailLogsPage /></ProtectedRoute>}
                    />
                    <Route
                      path="audit"
                      element={<ProtectedRoute allowedRoles={["ADMIN"]}><AuditLogPage /></ProtectedRoute>}
                    />
                    <Route
                      path="promotions"
                      element={
                        <ProtectedRoute
                          allowedRoles={["ADMIN", "STORE_MANAGER"]}
                        >
                          <ProtectedRoute allowedRoles={["ADMIN"]}><PromotionsPage /></ProtectedRoute>
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="staff/orders"
                      element={
                        <Navigate to="/admin/orders" replace />
                      }
                    />
                    <Route
                      path="transfers"
                      element={
                        <ProtectedRoute
                          allowedRoles={["ADMIN", "STORE_MANAGER"]}
                        >
                          <IncomingTransfersPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="staff/transfers"
                      element={
                        <Navigate to="/admin/transfers" replace />
                      }
                    />
                    <Route
                      path="*"
                      element={<RoleHome />}
                    />
                  </Route>
                  <Route path="*" element={<Navigate to="/admin" replace />} />
                </Routes>
              </PageLoadingProvider>
            </BrowserRouter>
          </OrderProvider>
        </AuthProvider>
      </AntApp>
    </ConfigProvider>
  );
};

export default App;
