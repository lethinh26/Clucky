import i18n from "../../i18n/index.ts";
export const orderLabels: Record<string, string> = {
  get PENDING_PAYMENT() { return i18n.t("admin:paymentStates.PENDING"); }, get CONFIRMED() { return i18n.t("business:orderstatuschip.confirmed"); }, get PREPARING() { return i18n.t("admin:ui.preparing"); },
  get READY() { return i18n.t("admin:ui.readyForPickup"); }, get SHIPPING() { return i18n.t("business:orderprogress.delivering"); }, get COMPLETED() { return i18n.t("business:orders.completed"); }, get DELIVERED() { return i18n.t("business:orders.completed"); }, get CANCELLED() { return i18n.t("business:orders.cancelled"); }, DELIVERY_FAILED: 'Giao không thành công',
};

export const paymentLabels: Record<string, string> = {
  get PENDING() { return i18n.t("admin:paymentStates.PENDING"); }, get PAID() { return i18n.t("admin:paymentStates.PAID"); }, get COLLECTED() { return i18n.t("business:stafforderspage.paymentCollected"); }, get REFUNDED() { return i18n.t("admin:paymentStates.REFUNDED"); },
  get FAILED() { return i18n.t("business:orderdetaildrawer.failed"); }, get EXPIRED() { return i18n.t("business:paymentstatusbadge.expired"); }, get CANCELLED() { return i18n.t("business:orders.cancelled"); }, get UNKNOWN() { return i18n.t("admin:ui.unverified"); },
};

export function paymentMethodLabel(method?: string) {
  return ({ get BANK_TRANSFER() { return i18n.t("business:id.bankTransfer"); }, get COD() { return i18n.t("admin:ui.payOnReceipt"); }, get CASH() { return i18n.t("admin:ui.cash"); }, get MIXED() { return i18n.t("admin:ui.cashBankTransfer"); } } as Record<string, string>)[method ?? ''] ?? method ?? i18n.t("admin:ui.unknown");
}

export function paymentColor(status?: string) {
  if (['PAID', 'COLLECTED', 'REFUNDED'].includes(status ?? '')) return 'success';
  if (['FAILED', 'EXPIRED', 'CANCELLED'].includes(status ?? '')) return 'error';
  return status === 'PENDING' ? 'gold' : 'default';
}

export function orderDate(value?: string | null, locale = 'vi') {
  if (!value || !Number.isFinite(Date.parse(value))) return '—';
  return new Intl.DateTimeFormat(locale === 'en' ? 'en-GB' : 'vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Ho_Chi_Minh',
  }).format(new Date(value));
}

export function historyReason(reason?: string, status?: string) {
  if (!reason || reason === status) return '';
  const creationPrefix = 'Order created with payment method: ';
  if (reason.startsWith(creationPrefix)) return i18n.t("admin:ui.orderPlaced400", { value1: paymentMethodLabel(reason.slice(creationPrefix.length)) });
  if (reason.startsWith('Status updated to ')) return '';
  return ({ get PAYMENT_EXPIRED() { return i18n.t("admin:ui.thePaymentDeadlineExpiredTheSystemAutomaticallyCancelled"); }, get PAYMENT_FAILED() { return i18n.t("admin:ui.paymentUnsuccessful"); },
    get 'Payment failed / cancelled by saga compensation'() { return i18n.t("admin:ui.theSystemCancelledTheOrderBecausePaymentFailed"); },
  } as Record<string, string>)[reason] ?? reason;
}

export function actorLabel(role?: string) {
  return ({ get CUSTOMER() { return i18n.t("admin:nav.customers"); }, get ADMIN() { return i18n.t("admin:roles.admin"); }, get STAFF() { return i18n.t("admin:ui.branchStaff"); }, get STORE_MANAGER() { return i18n.t("admin:roles.manager"); },
    get SYSTEM() { return i18n.t("business:promotionUi.system"); }, get SYSTEM_SAGA() { return i18n.t("admin:ui.automatedSystem"); }, get SYSTEM_PAYMENT() { return i18n.t("admin:ui.paymentSystem"); } } as Record<string, string>)[role ?? ''] ?? role;
}

export function catalogItemPath(item: { itemType: string; productId?: number; comboId?: number }) {
  const identifier = item.itemType === 'PRODUCT' ? item.productId : item.itemType === 'COMBO' ? item.comboId : undefined;
  if (!identifier || !Number.isSafeInteger(identifier) || identifier <= 0) return undefined;
  return `/api/catalog/${item.itemType === 'PRODUCT' ? 'products' : 'combos'}/${identifier}`;
}

export function snapshotLabels(snapshot: unknown): string[] {
  if (!Array.isArray(snapshot)) return [];
  return snapshot.flatMap(entry => {
    if (!entry || typeof entry !== 'object' || typeof entry.name !== 'string') return [];
    const group = typeof entry.groupName === 'string' ? `${entry.groupName}: ` : '';
    const quantity = Number.isSafeInteger(entry.quantity) && entry.quantity > 1 ? ` × ${entry.quantity}` : '';
    return [`${group}${entry.name}${quantity}`];
  });
}
