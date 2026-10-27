import { CustomerFooter } from '@/components/customer-footer';
import { CustomerHeader } from '@/components/customer-header';
import { ProductCard } from '@/components/product-card';
import { products } from '@/lib/products';

export default function MenuPage() {
  return <><CustomerHeader /><main><section className="page-head menu-hero"><div className="menu-hero-media" aria-hidden="true"><img src="https://images.unsplash.com/photo-1562967916-eb82221dfb92?auto=format&fit=crop&w=1200&q=85" alt="" /></div><div className="page-head-inner"><div className="page-head-copy"><span className="eyebrow">Made fresh for you</span><h1>Chọn món.<br />Chọn vui.</h1><p>Những món Clucky được làm nóng, giòn và sẵn sàng cho bữa ăn hôm nay.</p><div className="page-head-meta"><span>Gà giòn</span><span>Combo đủ đầy</span><span>Giao nhanh</span></div></div><div className="page-head-card"><strong>Đang phục vụ</strong><p>Gà rán nóng giòn, burger và combo cho bữa ăn nhanh hôm nay.</p></div></div></section><section className="menu-section"><div className="menu-toolbar"><div className="categories"><button className="category active">Tất cả</button><button className="category">Gà rán</button><button className="category">Burger</button><button className="category">Combo</button></div><input className="search-input" type="search" placeholder="Tìm món ăn..." aria-label="Tìm món ăn" /></div><div className="product-grid">{products.map((product) => <ProductCard key={product.slug} product={product} />)}</div></section></main><CustomerFooter /></>;
}
