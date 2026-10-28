import React from "react";
import { createRoot } from "react-dom/client";
import { GoogleAuthFlow } from "../../components/auth/google-auth-flow";
import { PaymentWidget } from "../../components/payment/payment-widget";
import { ShipmentCard } from "../../components/shipping/shipment-card";
import { ShippingFeeCard } from "../../components/shipping/shipping-fee-card";
import { PaymentStatusBadge } from "../../components/payment/payment-status-badge";
const params = new URLSearchParams(location.search);
const qr = params.has("qr");
document.body.style.cssText =
  "margin:16px;background:#fffaf3;font-family:Arial,sans-serif";
createRoot(document.getElementById("root")!).render(
  qr ? (
    <>
      <PaymentWidget
        orderCode="CLUCKY-TEST-001"
        amount={245000}
        expiresAt={params.has("expired") ? 0 : undefined}
        qrUrl={params.has("missing") ? undefined : "/qr.svg"}
        bankInfo={{
          bankName: "Ngân hàng demo",
          accountNo: "000000",
          accountName: "CLUCKY DEMO",
        }}
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
    <GoogleAuthFlow>
      <p>Đăng nhập bằng email</p>
    </GoogleAuthFlow>
  ),
);
