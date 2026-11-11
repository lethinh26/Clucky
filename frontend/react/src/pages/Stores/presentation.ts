import dayjs from 'dayjs';

export function storeTime(value: string | null | undefined) {
  if (!value || !/^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(value)) return null;
  const [hours, minutes] = value.split(':').map(Number);
  return dayjs().startOf('day').hour(hours).minute(minutes);
}

export function matchesStoreSearch(values: (string | null | undefined)[], query: string) {
  const normalize = (value: string) => value.normalize('NFD').replace(/\p{M}/gu, '').replace(/[đĐ]/g, 'd').toLowerCase().replace(/\s+/g, ' ').trim();
  return values.some(value => normalize(value ?? '').includes(normalize(query)));
}

export function readinessLabel(value?: string) {
  return ({ READY: 'Sẵn sàng', UNPROVISIONED: 'Chưa có tài khoản', PENDING: 'Đang cấp tài khoản', PROVISIONED: 'Chờ kích hoạt' } as Record<string, string>)[value ?? ''] ?? 'Chưa xác định';
}
