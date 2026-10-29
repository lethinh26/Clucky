import { notFound } from 'next/navigation';
import { ProductDetailClient } from '@/components/product-detail-client';
import { getProduct, products, type Product } from '@/lib/products';
import { catalogApi } from '@/lib/api';

export function generateStaticParams() {
  return products.map(({ slug }) => ({ slug }));
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  let product: Product | undefined = getProduct(slug);

  try {
    const match = slug.match(/-(\d+)$/);
    const id = match ? Number(match[1]) : (!isNaN(Number(slug)) ? Number(slug) : undefined);
    if (id) {
      const live = await catalogApi.getProductById(id);
      if (live) {
        product = live as unknown as Product;
      }
    }
  } catch (err) {
    // Keep fallback
  }

  if (!product) {
    notFound();
  }

  return (
    <>
      <main>
        <ProductDetailClient product={product} />
      </main>
    </>
  );
}
