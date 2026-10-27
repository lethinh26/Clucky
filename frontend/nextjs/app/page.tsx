import Link from 'next/link';
import { CustomerFooter } from '@/components/customer-footer';
import { CustomerHeader } from '@/components/customer-header';
import { ProductCard } from '@/components/product-card';
import { products } from '@/lib/products';

export default function Home() {
  return <><CustomerHeader /><main><section className="hero"><div className="hero-inner"><div className="hero-copy"><span className="eyebrow">Fresh from the fryer</span><h1><span>Crispy <strong>outside.</strong></span><span>Happy <strong>inside.</strong></span></h1><p>Gà rán giòn tan, nóng hổi và vừa đủ vui cho một ngày thật ngon.</p></div><div className="hero-food"><img src="https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?auto=format&fit=crop&w=1000&q=85" alt="Đĩa gà rán giòn vàng" /></div></div></section><section className="intro"><h2>Made for<br />good moods.</h2><p>Không cần quá nhiều lựa chọn. Chỉ những món ngon dễ chọn, dễ đặt và đủ làm bữa ăn hôm nay vui hơn một chút.</p></section><section className="featured" aria-labelledby="featured-title"><div className="section-head"><h2 id="featured-title">Món được yêu thích</h2><Link className="text-link" href="/menu">Xem toàn bộ thực đơn&nbsp; →</Link></div><div className="product-grid">{products.slice(0, 3).map((product) => <ProductCard key={product.slug} product={product} />)}</div></section></main><CustomerFooter /></>;
}
