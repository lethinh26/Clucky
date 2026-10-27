import Link from 'next/link';
import { CustomerFooter } from '@/components/customer-footer';
import { CustomerHeader } from '@/components/customer-header';
import { formatPrice, products } from '@/lib/products';

export default function CartPage() {
  const items = [{ product: products[0], quantity: 1 }, { product: products[1], quantity: 1 }];
  const subtotal = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  return <><CustomerHeader /><main className="order-page"><div className="order-heading"><span className="eyebrow">Your order</span><h1>Giỏ hàng</h1><p>Kiểm tra món trước khi tiếp tục.</p></div><div className="order-layout"><section className="order-list">{items.map(({ product, quantity }) => <article className="order-item" key={product.slug}><img src={product.image} alt={product.alt} /><div><span className="card-tag">{product.category}</span><h2>{product.name}</h2><p>{formatPrice(product.price)} · SL {quantity}</p></div><strong>{formatPrice(product.price * quantity)}</strong></article>)}</section><aside className="summary-card"><h2>Tóm tắt đơn hàng</h2><div><span>Tạm tính</span><strong>{formatPrice(subtotal)}</strong></div><div><span>Phí giao hàng</span><strong>20.000đ</strong></div><hr /><div className="summary-total"><span>Tổng cộng</span><strong>{formatPrice(subtotal + 20000)}</strong></div><Link className="detail-cta" href="/checkout">Tiếp tục đặt hàng&nbsp; →</Link></aside></div></main><CustomerFooter /></>;
}
