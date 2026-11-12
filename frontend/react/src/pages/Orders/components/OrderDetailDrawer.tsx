import { useTranslation } from "react-i18next";
import { useLocaleTools } from "../../../i18n/hooks";
import { useEffect, useRef, useState } from "react";
import { Drawer, Button, Modal, Input, Space, Tag, Select, Alert } from "antd";
import { message } from "../../../components/feedback";
import {
  Clock3,
  UserRound,
  ShoppingBag,
  MapPin,
  Wallet,
  MessageSquare,
  CircleAlert,
  ChefHat,
  PackageCheck,
  CheckCircle2,
  XCircle,
  Store,
  Truck,
} from "lucide-react";
import type { AdminOrder } from "../../../types/order";
import { OrderProgress } from "../../../components/ui/OrderProgress";
import { OrderStatusBadge } from "../../../components/ui/OrderStatusBadge";
import { FoodImage } from "../../../components/ui/FoodImage";
import { displayOrderTime } from "../../../lib/order-demo";
import { formatQueueWithDate } from "../../../utils/orderExcelExport";
import { useOrders } from "../../../context/OrderContext";
import { useAuth } from "../../../context/AuthContext";
import { getErrorMessage, vietQrApi, type VietQrBank } from "../../../lib/api";
import styles from "../orders.module.css";
import { CodEvidencePanel } from "./CodEvidencePanel";

interface Props {
  order: AdminOrder | null;
  open: boolean;
  onClose: () => void;
  onStatusChange: (
    id: string,
    status: AdminOrder["status"],
    reason?: string,
  ) => Promise<boolean> | boolean;
  onOpenRefundModal?: (order: AdminOrder) => void;
  onOpenFinance?: (order: AdminOrder) => void;
  onCollectCounter?: (order: AdminOrder) => void;
  onChanged?: () => void;
}

export function OrderDetailDrawer({
  order,
  open,
  onClose,
  onStatusChange,
  onOpenRefundModal,
  onOpenFinance,
  onCollectCounter,
  onChanged,
}: Props) {
  const { t } = useTranslation();


  const { locale, money: money } = useLocaleTools();
  const { stores, actionError, createRefund } = useOrders();
  const { isStaff } = useAuth();
  const [cancelOpen, setCancelOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [createRefundOpen, setCreateRefundOpen] = useState(false);
  const [refundReason, setRefundReason] = useState("");
  const [bankBin, setBankBin] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountNo, setAccountNo] = useState("");
  const [accountName, setAccountName] = useState("");
  const [submittingRefund, setSubmittingRefund] = useState(false);
  const [banks, setBanks] = useState<VietQrBank[]>([]);
  const [banksLoading, setBanksLoading] = useState(false);
  const [banksError, setBanksError] = useState("");

  useEffect(() => {
    if (!createRefundOpen || banks.length > 0) return;
    let active = true;
    setBanksLoading(true);
    setBanksError("");
    vietQrApi.banks()
      .then(items => { if (active) setBanks(items); })
      .catch(error => { if (active) setBanksError(getErrorMessage(error)); })
      .finally(() => { if (active) setBanksLoading(false); });
    return () => { active = false; };
  }, [createRefundOpen, banks.length]);
  if (!order) return null;
  return (
    <>
      <Drawer
        title={
          <div className={styles.drawerTitle}>
            <span>
              {t("business:orderdetaildrawer.details")} {order.orderCode}
              {order.queueNumber ? ` · ${formatQueueWithDate(order.queueNumber, order.createdAt).combinedLabel}` : ""}
            </span>
            <OrderStatusBadge status={order.status} />
          </div>
        }
        size="min(720px, 100vw)"
        open={open}
        onClose={onClose}
      >
        <div className={styles.drawerMeta}>
          <span>
            <Clock3 size={14} /> {t("business:orderdetaildrawer.placed")} {displayOrderTime(order.createdAt, locale)}
          </span>
          <span> {t("business:orderdetaildrawer.updated")} {displayOrderTime(order.updatedAt ?? order.createdAt, locale)}
          </span>
        </div>
        <OrderProgress order={order} surface="detail" />
        {actionError && (
          <p role="alert" className={styles.drawerError}>
            <CircleAlert size={16} />
            {actionError}
          </p>
        )}
        {order.hasRefundRequest && (
          <div className={styles.refundAlert}>
            <strong>
              <CircleAlert size={17} /> {t("business:orderdetaildrawer.refundRequestAwaitingReview")} </strong>
            <p>
              {money(order.refundAmount ?? order.total)} · {order.refundReason}
            </p>
            {!isStaff && onOpenRefundModal && (
              <Button danger onClick={() => onOpenRefundModal(order)}> {t("business:orderdetaildrawer.reviewRefundRequest")} </Button>
            )}
          </div>
        )}
        {order.refundStatus && !order.hasRefundRequest && (
          <div className={styles.drawerNotice} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
                {t("business:orderdetaildrawer.refundDecision")}:{" "}
                {order.refundStatus === "REFUNDED" ? (
                  <Tag color="success">
                    {t("business:orderdetaildrawer.refundCompletedAmount", {
                      value1: money(order.refundAmount ?? order.total),
                    })}
                  </Tag>
                ) : order.refundStatus === "REJECTED" ? (
                  <Tag color="error">{t("business:orderdetaildrawer.refundRejectedTag")}</Tag>
                ) : (
                  <Tag color="default">{order.refundStatus}</Tag>
                )}
              </div>
              {order.refundData?.bankName && (
                <div style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>
                  {t("business:orderdetaildrawer.accountLabel")} {order.refundData.bankName} - {order.refundData.accountNumber || order.refundData.bankAccountNo} ({order.refundData.accountHolderName || order.refundData.bankAccountName})
                </div>
              )}
            </div>
            {!isStaff && onOpenRefundModal && order.refundRequestId && (
              <Button size="small" onClick={() => onOpenRefundModal(order)}>
                {t("business:orderspage.viewDetails")}
              </Button>
            )}
          </div>
        )}
        <section className={styles.drawerSection}>
          <h2 className={styles.drawerHeading}>
            <UserRound size={18} /> {t("business:orderdetaildrawer.customerFulfilment")} </h2>
          <dl className={styles.drawerInfoGrid}>
            <div>
              <dt>{t("business:dashboard.customer")}</dt>
              <dd>{order.customerName}</dd>
            </div>
            <div>
              <dt>{t("business:orderdetaildrawer.phone")}</dt>
              <dd>
                <a href={`tel:${order.customerPhone}`}>{order.customerPhone}</a>
              </dd>
            </div>
            <div>
              <dt>{t("business:orderdetaildrawer.fulfilmentMethod")}</dt>
              <dd className={styles.inlineValue}>
                {order.orderType === "PICKUP" ? (
                  <Store size={15} />
                ) : (
                  <Truck size={15} />
                )}
                {order.orderType === "PICKUP"
                  ? t("business:orderdetaildrawer.counterPickup")
                  : t("business:checkout.homeDelivery")}
              </dd>
            </div>
            <div>
              <dt>{t("business:stores.store")}</dt>
              <dd>
                {(() => {
                  const s = stores.find((item) => Number(item.id) === Number(order.storeId));
                  return (
                    <>
                      <div>{s?.name || order.storeName}</div>
                      {s?.address && <small style={{ color: "#6b6259" }}>{s.address}</small>}
                    </>
                  );
                })()}
              </dd>
            </div>
            {order.deliveryAddress && (
              <div className={styles.wideField}>
                <dt>
                  <MapPin size={13} /> {t("business:shipmentcard.deliveryAddress")} </dt>
                <dd>{order.deliveryAddress}</dd>
              </div>
            )}
          </dl>
        </section>
        <section className={styles.drawerSection}>
          <h2 className={styles.drawerHeading}>
            <ShoppingBag size={18} /> {t("business:id.orderedItems")}{" "}
            <span>
              {order.items.reduce((sum, item) => sum + item.quantity, 0)} {t("business:cart.servings")} </span>
          </h2>
          <div className={styles.drawerItems}>
            {order.items.map((item) => (
              <article key={item.id} className={styles.drawerItem}>
                <FoodImage
                  src={item.image}
                  alt={item.itemName}
                  width={64}
                  height={64}
                />
                <div>
                  <strong>{item.itemName}</strong>
                  <p>
                    {item.quantity} {t("business:orderdetaildrawer.servings")} {money(item.unitPrice)}
                  </p>
                  {item.options && <small>{item.options}</small>}
                  {item.note && <small>{t("business:orderitemcard.note")} {item.note}</small>}
                </div>
                <b>{money(item.lineTotal)}</b>
              </article>
            ))}
          </div>
          {order.note && (
            <div className={styles.drawerNote}>
              <MessageSquare size={17} />
              <div>
                <strong>{t("business:orderdetaildrawer.customerNotes")}</strong>
                <p>{order.note}</p>
              </div>
            </div>
          )}
        </section>
        <section className={styles.drawerSection}>
          <h2 className={styles.drawerHeading}>
            <Wallet size={18} /> {t("business:orderdetaildrawer.paymentReceipt")} </h2>
          <dl className={styles.receiptRows}>
            <div>
              <dt>{t("business:orderdetaildrawer.method")}</dt>
              <dd>
                {onOpenFinance
                  ? (order.paymentMethod || "UNKNOWN")
                  : (order.paymentMethod === "COD" || (order.paymentMethod as string) === "CASH")
                    ? t("business:orderdetaildrawer.cashCod")
                    : t("business:id.bankTransfer")}
              </dd>
            </div>
            <div>
              <dt>{t("business:catalog.status")}</dt>
              <dd data-paid={["PAID", "COLLECTED"].includes(order.paymentStatus)}>
                {t(`admin:paymentStates.${order.paymentStatus}`)}
              </dd>
            </div>
            <div>
              <dt>{t("business:cart.subtotal")}</dt>
              <dd>{money(order.subtotal)}</dd>
            </div>
            {order.discount > 0 && (
              <div>
                <dt>{t("business:ordersummarycard.discount")}</dt>
                <dd>-{money(order.discount)}</dd>
              </div>
            )}
            <div>
              <dt>{t("business:ordersummarycard.deliveryFee")}</dt>
              <dd>{money(order.shippingFee)}</dd>
            </div>
            <div className={styles.receiptTotal}>
              <dt>{t("business:checkout.totalDue")}</dt>
              <dd>{money(order.total)}</dd>
            </div>
          </dl>
        </section>
        <section className={styles.drawerSection}>
          <h2 className={styles.drawerHeading}>{t("business:orderdetaildrawer.orderActions")}</h2>
          <p className={styles.actionHint}> {t("business:orderdetaildrawer.actionsDependOnTheCurrentStatusAndYourDemoRole")} </p>
          <div className={styles.drawerActions}>
            {onOpenFinance && <Button icon={<Wallet size={16} />} onClick={() => onOpenFinance(order)}>{t("admin:ui.financeCollectionRefunds")}</Button>}
            {order.status === "CONFIRMED" && (order.orderType !== "PICKUP" || ["PAID", "COLLECTED"].includes(order.paymentStatus)) && (
              <Button
                type="primary"
                icon={<ChefHat size={16} />}
                onClick={() => onStatusChange(order.id, "PREPARING")}
              > {t("business:orderdetaildrawer.startPreparation")} </Button>
            )}
            {order.status === "PREPARING" && (
              <Button
                type="primary"
                icon={<PackageCheck size={16} />}
                onClick={() => onStatusChange(order.id, "READY")}
              > {t("business:orderdetaildrawer.mealReady")} </Button>
            )}
            {!onOpenFinance && order.paymentStatus === "PENDING" &&
              !["CANCELLED", "COMPLETED", "PENDING_PAYMENT"].includes(order.status) && (
                onCollectCounter ? (
                  <Button
                    type="primary"
                    icon={<Wallet size={16} />}
                    onClick={() => onCollectCounter(order)}
                  >
                    {t("business:staffcard.collectCounterWithMethods")}
                  </Button>
                ) : (
                  order.paymentMethod === "COD" &&
                  order.orderType === "PICKUP" && ["CONFIRMED", "PREPARING", "READY"].includes(order.status) &&
                  <CodEvidencePanel orderId={order.id} onCollect={() => onStatusChange(order.id, order.status, "COLLECT_COD")} />
                )
              )}
            {["READY", "SHIPPING"].includes(order.status) && (
              <Button
                type="primary"
                disabled={!["PAID", "COLLECTED"].includes(order.paymentStatus)}
                icon={<CheckCircle2 size={16} />}
                onClick={() => onStatusChange(order.id, "COMPLETED")}
              > {t("business:orderdetaildrawer.completeOrder")} </Button>
            )}
            {["PENDING_PAYMENT", "CONFIRMED"].includes(order.status) && (
              <Button
                danger
                icon={<XCircle size={16} />}
                onClick={() => {
                  setReason("");
                  setCancelOpen(true);
                }}
              > {t("business:orderdetaildrawer.rejectCancelOrder")} </Button>
            )}
            {order.status === "CANCELLED" &&
              order.paymentMethod === "BANK_TRANSFER" &&
              order.paymentStatus === "PAID" &&
              !order.hasRefundRequest &&
              !order.refundStatus &&
              !isStaff && (
                <Button
                  danger
                  type="primary"
                  onClick={() => {
                    setRefundReason(t("business:orderdetaildrawer.eligibleRefundNotice"));
                    setBankBin("");
                    setBankName("");
                    setAccountNo("");
                    setAccountName("");
                    setCreateRefundOpen(true);
                  }}
                >
                  {t("business:orderdetaildrawer.createRefundRequest")}
                </Button>
              )}
            {["COMPLETED", "CANCELLED"].includes(order.status) && (
              <p className={styles.drawerNotice}> {t("business:orderdetaildrawer.thisOrderHasEndedNoFurtherStatusChangesAreAvailable")} </p>
            )}
          </div>
          {["READY", "SHIPPING"].includes(order.status) &&
            !["PAID", "COLLECTED"].includes(order.paymentStatus) && (
              <p className={styles.actionHint}> {t("business:orderdetaildrawer.confirmPaymentCollectionBeforeCompletingTheOrder")} </p>
            )}
        </section>
      </Drawer>
      <Modal
        title={`${t("business:orderdetaildrawer.createRefundRequest")} - ${order.orderCode}`}
        open={createRefundOpen}
        onCancel={() => setCreateRefundOpen(false)}
        okText={t("business:orderdetaildrawer.submitRefundRequest")}
        cancelText={t("business:orderdetaildrawer.close")}
        confirmLoading={submittingRefund}
        okButtonProps={{
          danger: true,
          disabled: !refundReason.trim() || !bankBin || !/^\d{1,80}$/.test(accountNo.trim()) || !accountName.trim(),
        }}
        onOk={async () => {
          setSubmittingRefund(true);
          const ok = await createRefund({
            orderId: Number(order.id),
            reason: refundReason.trim(),
            bankBin,
            bankName,
            bankAccountNo: accountNo.trim(),
            bankAccountName: accountName.trim(),
          });
          setSubmittingRefund(false);
          if (ok) {
            setCreateRefundOpen(false);
            onChanged?.();
            message.success(t("business:orderdetaildrawer.refundRequestSuccess"));
          }
        }}
      >
        <p style={{ color: "#6b6259", marginBottom: 12 }}>
          {t("business:orderdetaildrawer.refundInstruction", { value1: money(order.total) })}
        </p>
        <Space direction="vertical" style={{ width: "100%" }} size={12}>
          <div>
            <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>{t("business:orderdetaildrawer.bankLabel")} *</label>
            <Select
              showSearch
              loading={banksLoading}
              value={bankBin || undefined}
              placeholder={t("business:refundmodal.searchAndChooseBank")}
              optionFilterProp="label"
              options={banks.map(bank => ({
                value: bank.bin,
                label: `${bank.shortName || bank.name || bank.bin} (${bank.bin})`,
              }))}
              onChange={(value: string) => {
                setBankBin(value);
                const selected = banks.find(b => b.bin === value);
                setBankName(selected ? (selected.shortName || selected.name || selected.bin) : "");
              }}
            />
            {banksError && <Alert type="error" showIcon message={banksError} />}
          </div>
          <div>
            <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>{t("business:orderdetaildrawer.accountNoLabel")} *</label>
            <Input
              type="text"
              inputMode="numeric"
              autoComplete="off"
              value={accountNo}
              onChange={(e) => setAccountNo(e.target.value.replace(/\s+/g, ""))}
              placeholder="123456789..."
            />
          </div>
          <div>
            <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>{t("business:orderdetaildrawer.accountNameLabel")} *</label>
            <Input
              value={accountName}
              onChange={(e) => setAccountName(e.target.value.toUpperCase())}
              placeholder="NGUYEN VAN A"
            />
          </div>
          <div>
            <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>{t("business:orderdetaildrawer.refundReasonLabel")} *</label>
            <Input.TextArea
              value={refundReason}
              onChange={(e) => setRefundReason(e.target.value)}
              rows={2}
              placeholder={t("business:orderdetaildrawer.refundReasonPlaceholder")}
            />
          </div>
        </Space>
      </Modal>
      <Modal
        title={t("business:orderdetaildrawer.cancelOrder", { value1: order.orderCode })}
        open={cancelOpen}
        onCancel={() => setCancelOpen(false)}
        okText={t("business:id.confirmCancellation")}
        cancelText={t("business:id.keepOrder")}
        okButtonProps={{ danger: true, disabled: !reason.trim() }}
        onOk={async () => {
          const success = await onStatusChange(order.id, "CANCELLED", reason.trim());
          if (success) {
            setCancelOpen(false);
            onClose();
          }
        }}
      >
        <p> {t("business:orderdetaildrawer.enterACancellationReasonPaidOrdersWillCreateARefundRequestIn")} </p>
        <label htmlFor="staff-cancel-reason">{t("business:id.cancellationReason")}</label>
        <Input.TextArea
          id="staff-cancel-reason"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          rows={3}
          maxLength={500}
        />
      </Modal>
    </>
  );
}
