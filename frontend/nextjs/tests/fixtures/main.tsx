import { NextIntlClientProvider } from "next-intl";
import { resources } from "../../lib/i18n/resources";
import React from "react";
import { createRoot } from "react-dom/client";
import { GoogleAuthFlow } from "../../components/auth/google-auth-flow";
import { SessionBoundary } from "../../components/auth/session-boundary";
import { PaymentWidget } from "../../components/payment/payment-widget";
import { ShipmentCard } from "../../components/shipping/shipment-card";
import { ShippingFeeCard } from "../../components/shipping/shipping-fee-card";
import { PaymentStatusBadge } from "../../components/payment/payment-status-badge";
import { Toaster } from "../../components/feedback";
const params = new URLSearchParams(location.search);
const qr = params.has("qr");
document.body.style.cssText =
  "margin:16px;background:#fffaf3;font-family:Arial,sans-serif";
createRoot(document.getElementById("root")!).render(
  <NextIntlClientProvider locale="vi" messages={resources.vi} timeZone="Asia/Ho_Chi_Minh">{qr ? (
    <>
      <PaymentWidget
        orderCode="CLUCKY-TEST-001"
        amount={245000}
        expiresAt={params.has("expired") ? 0 : undefined}
        qrUrl={params.has("missing") ? undefined : "/qr.svg"}
        bankInfo={
          params.has("missing")
            ? undefined
            : {
                bankCode: "MB",
                bankName: "Ngân hàng demo",
                accountNo: "000000",
                accountName: "CLUCKY DEMO",
              }
        }
      />
      <PaymentStatusBadge status="FAILED" />
      <ShipmentCard
        receiverName="Khách hàng"
        receiverPhone="0900000000"
        address="Địa chỉ giao hàng rất dài để kiểm tra hiển thị trên màn hình nhỏ"
        orderType={params.has("pickup") ? "PICKUP" : "DELIVERY"}
      />
      <ShippingFeeCard
        fee={params.has("loading") ? null : 0}
        loading={params.has("loading")}
      />
    </>
  ) : (
    <SessionBoundary><GoogleAuthFlow>
      <p>Đăng nhập bằng email</p>
    </GoogleAuthFlow></SessionBoundary>
  )}<Toaster locale="vi" /></NextIntlClientProvider>,
);
