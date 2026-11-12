export function stockState(item: { quantityAvailable: number; isSoldOut: boolean }, threshold: number) {
  const soldOut = item.isSoldOut || item.quantityAvailable <= 0;
  return { soldOut, available: !soldOut, lowStock: !soldOut && item.quantityAvailable <= threshold };
}
