export function incomingOrders<Order extends { id: string | number; status: string }>(orders: Order[], seen: ReadonlySet<string>): Order[] {
  return orders.filter(order => !seen.has(String(order.id)) && !['CANCELLED', 'COMPLETED', 'DELIVERED'].includes(order.status));
}
