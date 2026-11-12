export function posUnavailableReason(item: {
  isActive?: boolean; isAvailable?: boolean | null; isSoldOut?: boolean | null;
  startAt?: string | null; endAt?: string | null;
}, now = Date.now()): string | undefined {
  if (item.isActive === false) return 'inactive';
  if (item.isSoldOut) return 'soldOut';
  if (item.isAvailable === false) return 'branchDisabled';
  if (item.startAt && Date.parse(item.startAt) > now) return 'notStarted';
  if (item.endAt && Date.parse(item.endAt) <= now) return 'expired';
  return undefined;
}
