import Link from 'next/link';
import { CustomerFooter } from '@/components/customer-footer';
import { CustomerHeader } from '@/components/customer-header';
import { ArrowRight } from 'lucide-react';

export default function AccountPage() {
  return <><CustomerHeader /><main className="simple-page account-page"><span className="eyebrow">Your Clucky</span><h1>Xin chào,<br />bạn nhé.</h1><p className="lead">Đăng nhập để lưu địa chỉ, xem lịch sử đơn và tích điểm cho những lần ghé Clucky tiếp theo.</p><div className="account-actions"><Link className="button button-primary" href="/menu">Đặt món ngay <ArrowRight size={16} aria-hidden="true" /></Link><Link className="button button-ghost-dark" href="/orders/demo-clucky">Xem đơn gần nhất</Link></div><section className="account-preview"><div><span className="card-tag">Member points</span><strong>0 điểm</strong><p>Đăng nhập để bắt đầu tích điểm.</p></div><div><span className="card-tag">Saved addresses</span><strong>Chưa có địa chỉ</strong><p>Lưu địa chỉ để đặt món nhanh hơn.</p></div></section></main><CustomerFooter /></>;
}
