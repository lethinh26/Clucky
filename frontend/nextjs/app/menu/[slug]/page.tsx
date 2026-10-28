import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { CustomerFooter } from '@/components/customer-footer';
import { CustomerHeader } from '@/components/customer-header';
import { formatPrice, getProduct, products } from '@/lib/products';

export function generateStaticParams() { return products.map(({ slug }) => ({ slug })); }

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = getProduct(slug);
  if (!product) notFound();
  return <><CustomerHeader /><main className="product-detail"><Link className="back-link" href="/menu"><ArrowLeft size={16} aria-hidden="true" /> Quay lại thực đơn</Link><div className="product-detail-grid"><div className="product-visual"><img src={product.image} alt={product.alt} /><div className="product-badge">best<br />seller</div></div><section className="product-copy" aria-labelledby="product-title"><span className="product-tag">{product.category} · Clucky classic</span><h1 id="product-title">{product.name}</h1><p className="product-description">{product.description} Công thức gia vị Clucky cho một phần gà vừa đủ ngon, vừa đủ vui.</p><div className="rating" aria-label="Đánh giá 4.9 trên 5">★★★★★ <span>4.9 · 128 đánh giá</span></div><div className="buy-row"><strong className="detail-price">{formatPrice(product.price)}</strong><div className="quantity" aria-label="Số lượng"><button aria-label="Giảm số lượng">−</button><strong>1</strong><button aria-label="Tăng số lượng">+</button></div></div><Link className="detail-cta" href="/cart">Thêm vào giỏ hàng&nbsp; →</Link><div className="detail-notes"><div><strong>Giòn</strong><span>làm mới mỗi phần</span></div><div><strong>250g</strong><span>khẩu phần vừa đủ</span></div><div><strong>15′</strong><span>chuẩn bị món</span></div></div></section></div></main><CustomerFooter /></>;
}
