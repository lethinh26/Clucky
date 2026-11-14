export type FulfillmentMode = 'DELIVERY' | 'DINE_IN' | 'TAKE_AWAY' | 'PICKUP_UNKNOWN';

export function getFulfillmentMode(order: {
  orderType?: string | null;
  type?: string | null;
  diningOption?: string | null;
  orderSource?: string | null;
}): FulfillmentMode {
  if (order.orderType === 'DELIVERY' || order.type === 'DELIVERY') return 'DELIVERY';
  if (order.diningOption === 'DINE_IN') return 'DINE_IN';
  if (order.diningOption === 'TAKE_AWAY') return 'TAKE_AWAY';
  return order.orderSource === 'WEB' ? 'TAKE_AWAY' : 'PICKUP_UNKNOWN';
}

export function fulfillmentLabel(order: Parameters<typeof getFulfillmentMode>[0]): string {
  switch (getFulfillmentMode(order)) {
    case 'DELIVERY': return 'Giao hàng';
    case 'DINE_IN': return 'Ăn tại quán · khách tự nhận tại quầy';
    case 'TAKE_AWAY': return 'Mang về';
    default: return 'Nhận tại quán';
  }
}

export function fulfillmentShortLabel(order: Parameters<typeof getFulfillmentMode>[0]): string {
  switch (getFulfillmentMode(order)) {
    case 'DELIVERY': return 'GIAO HÀNG';
    case 'DINE_IN': return 'ĂN TẠI QUÁN';
    case 'TAKE_AWAY': return 'MANG VỀ';
    default: return 'NHẬN TẠI QUÁN';
  }
}
