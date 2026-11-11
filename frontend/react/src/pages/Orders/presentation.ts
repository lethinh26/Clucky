export const orderLabels: Record<string, string> = {
  PENDING_PAYMENT: 'Chờ thanh toán', CONFIRMED: 'Đã xác nhận', PREPARING: 'Đang chế biến',
  READY: 'Sẵn sàng nhận món', SHIPPING: 'Đang giao', COMPLETED: 'Đã hoàn thành', DELIVERED: 'Đã hoàn thành', CANCELLED: 'Đã hủy',
};

export const paymentLabels: Record<string, string> = {
  PENDING: 'Chờ thanh toán', PAID: 'Đã thanh toán', COLLECTED: 'Đã thu tiền', REFUNDED: 'Đã hoàn tiền',
  FAILED: 'Thất bại', EXPIRED: 'Hết hạn', CANCELLED: 'Đã hủy', UNKNOWN: 'Chưa xác minh',
};

export function paymentMethodLabel(method?: string) {
  return ({ BANK_TRANSFER: 'Chuyển khoản ngân hàng', COD: 'Thanh toán khi nhận món', CASH: 'Tiền mặt', MIXED: 'Tiền mặt & chuyển khoản' } as Record<string, string>)[method ?? ''] ?? method ?? 'Chưa xác định';
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
  if (reason.startsWith(creationPrefix)) return `Đặt đơn · ${paymentMethodLabel(reason.slice(creationPrefix.length))}`;
  if (reason.startsWith('Status updated to ')) return '';
  return ({ PAYMENT_EXPIRED: 'Quá thời hạn thanh toán. Hệ thống tự động hủy đơn.', PAYMENT_FAILED: 'Thanh toán không thành công.',
    'Payment failed / cancelled by saga compensation': 'Hệ thống hủy đơn do thanh toán không thành công hoặc giao dịch bị hủy.',
  } as Record<string, string>)[reason] ?? reason;
}

export function actorLabel(role?: string) {
  return ({ CUSTOMER: 'Khách hàng', ADMIN: 'Quản trị viên', STAFF: 'Nhân viên chi nhánh', STORE_MANAGER: 'Quản lý chi nhánh',
    SYSTEM: 'Hệ thống', SYSTEM_SAGA: 'Hệ thống tự động', SYSTEM_PAYMENT: 'Hệ thống thanh toán' } as Record<string, string>)[role ?? ''] ?? role;
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
