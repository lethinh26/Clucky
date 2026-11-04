import { notFound } from 'next/navigation';
import { ProductDetailClient } from '@/components/product-detail-client';
import type { Product } from '@/lib/products';
import { catalogApi } from '@/lib/api';

export default async function ProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ storeId?: string | string[] }>;
}) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const isCombo = slug.startsWith('combo-');
  const id = Number(isCombo ? slug.slice('combo-'.length) : slug.match(/-(\d+)$/)?.[1]);
  if (!Number.isSafeInteger(id) || id <= 0) notFound();
  const storeIdValue = Array.isArray(query.storeId) ? query.storeId[0] : query.storeId;
  const parsedStoreId = storeIdValue === undefined ? undefined : Number(storeIdValue);
  if (storeIdValue !== undefined &&
      (parsedStoreId === undefined || !Number.isSafeInteger(parsedStoreId) || parsedStoreId <= 0)) notFound();
  const storeId = parsedStoreId;

  const product: Product = isCombo
    ? await catalogApi.getComboProductById(id)
    : await catalogApi.getProductById(id, storeId);

  return (
    <>
      <main>
        <ProductDetailClient product={product} storeId={storeId} />
      </main>
    </>
  );
}
