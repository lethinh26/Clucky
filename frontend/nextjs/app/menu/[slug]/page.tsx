import { getTranslations } from 'next-intl/server';
import Link from '@/components/ui-loader/navigation-link';
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
  const id = Number(isCombo ? slug.slice('combo-'.length) : slug.match(/-(\d+)$/)?.[1] || slug);
  const storeIdValue = Array.isArray(query.storeId) ? query.storeId[0] : query.storeId;
  const parsedStoreId = storeIdValue === undefined ? undefined : Number(storeIdValue);
  const storeId = Number.isSafeInteger(parsedStoreId) && (parsedStoreId ?? 0) > 0 ? parsedStoreId : undefined;

  let product: Product | null = null;
  try {
    if (Number.isSafeInteger(id) && id > 0) {
      product = isCombo
        ? await catalogApi.getComboProductById(id, storeId)
        : await catalogApi.getProductById(id, storeId);
    } else {
      const allProducts = await catalogApi.getProducts({ storeId, activeOnly: true });
      const matched = allProducts.find(
        (p) => p.slug === slug || String(p.id) === slug,
      );
      if (matched) {
        const matchedIsCombo =
          (matched.categoryName ?? matched.category ?? '').toLowerCase() === 'combo' ||
          Boolean(matched.comboItems?.length);
        product = matchedIsCombo
          ? await catalogApi.getComboProductById(matched.id, storeId)
          : await catalogApi.getProductById(matched.id, storeId);
      }
    }
  } catch {
    product = null;
  }

  if (!product) {
    const t = await getTranslations();
    return (
      <main style={{ maxWidth: 1240, margin: '60px auto', padding: '0 24px', textAlign: 'center' }}>
        <h1 style={{ fontFamily: 'Baloo 2, sans-serif', fontSize: 28, color: '#16100D', marginBottom: 12 }}>
          {t("menu.empty.title")}
        </h1>
        <p style={{ fontFamily: 'Quicksand, sans-serif', color: '#6B6259', marginBottom: 24 }}>
          {t("menu.empty.description")}
        </p>
        <Link href="/menu" className="btn-primary" style={{ display: 'inline-flex', padding: '10px 24px' }}>
          {t("menu.empty.reset")}
        </Link>
      </main>
    );
  }

  return (
    <main>
      <ProductDetailClient product={product} storeId={storeId} />
    </main>
  );
}
