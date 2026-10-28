import { notFound } from 'next/navigation';
import { ProductDetailClient } from '@/components/product-detail-client';
import { getProduct, products } from '@/lib/products';

export function generateStaticParams() {
  return products.map(({ slug }) => ({ slug }));
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = getProduct(slug);

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
