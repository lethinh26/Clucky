import Link from 'next/link';
import { CustomerFooter } from '@/components/customer-footer';
import { CustomerHeader } from '@/components/customer-header';

export default function OrdersPage() {
  return <><CustomerHeader /><main className="simple-page orders-page"><span className="eyebrow">Order tracking</span><h1>Theo dõi<br />đơn hàng.</h1><p className="lead">Nhập mã đơn để xem trạng thái món ăn của bạn.</p><form className="track-form"><label htmlFor="order-code">Mã đơn hàng</label><div><input id="order-code" placeholder="Ví dụ: CLU-240826" /><Link className="button button-primary" href="/orders/demo-clucky">Theo dõi →</Link></div></form><p className="muted-note">Bạn đang xem bản demo giao diện. <Link href="/menu">Đặt món mới</Link></p></main><CustomerFooter /></>;
}
