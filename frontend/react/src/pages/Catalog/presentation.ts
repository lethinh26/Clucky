export function matchesCatalogSearch(values: (string | undefined)[], query: string) {
  const normalize = (value: string) => value.normalize('NFD').replace(/\p{M}/gu, '').replace(/[đĐ]/g, 'd').toLocaleLowerCase().replace(/\s+/g, ' ').trim();
  const needle = normalize(query);
  return values.some(value => normalize(value ?? '').includes(needle));
}

export function isCatalogImage(file: { type: string; size: number }) {
  return ['image/png', 'image/jpeg', 'image/webp'].includes(file.type)
    && Number.isFinite(file.size) && file.size > 0 && file.size <= 5 * 1024 * 1024;
}
