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
  let product: Product | undefined = undefined;

  // 1. Try live data from backend PostgreSQL
  try {
    if (slug.startsWith('combo-')) {
      const comboId = Number(slug.replace('combo-', ''));
      if (!isNaN(comboId)) {
        const liveCombo = await catalogApi.getComboById(comboId);
        if (liveCombo) {
          product = {
            id: 10000 + liveCombo.id,
            slug: `combo-${liveCombo.id}`,
            name: liveCombo.name,
            categoryId: 3,
            categoryName: 'Combo',
            category: 'Combo',
            description: liveCombo.description,
            basePrice: liveCombo.comboPrice,
            price: liveCombo.comboPrice,
            imageUrl: liveCombo.imageUrl || 'https://images.unsplash.com/photo-1513639776629-7b61b0ac49cb?auto=format&fit=crop&w=900&q=85',
            image: liveCombo.imageUrl || 'https://images.unsplash.com/photo-1513639776629-7b61b0ac49cb?auto=format&fit=crop&w=900&q=85',
            alt: liveCombo.name,
            kcal: 850,
            spicyLevel: 1,
            isActive: liveCombo.isActive,
            isAvailable: liveCombo.isActive,
            isSoldOut: !liveCombo.isActive,
            isBestSeller: true,
            rating: 4.9,
            reviewCount: 95,
            options: [],
            toppings: [],
          };
        }
      }
    } else {
      const match = slug.match(/-(\d+)$/);
      const id = match ? Number(match[1]) : (!isNaN(Number(slug)) ? Number(slug) : undefined);
      if (id) {
        const live = await catalogApi.getProductById(id);
        if (live) {
          product = live as unknown as Product;
        }
      }
    }
  } catch (err) {
    // If backend unreachable, fall back
  }

  // 2. Fallback if backend was unreachable
  if (!product) {
    product = getProduct(slug);
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
