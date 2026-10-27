import Image from 'next/image';
import Link from 'next/link';

export function CustomerHeader() {
  return <header className="site-header"><Link className="brand" href="/" aria-label="Clucky trang chủ"><Image className="brand-logo" src="/logo_primary.png" alt="Clucky" width={48} height={48} priority /><span>Clucky</span></Link><nav className="nav" aria-label="Điều hướng chính"><Link href="/">Trang chủ</Link><Link href="/menu">Thực đơn</Link><Link href="/stores">Cửa hàng</Link><Link href="/orders/demo-clucky">Theo dõi đơn</Link><Link href="/account">Tài khoản</Link><Link className="nav-order" href="/cart">Đặt món</Link></nav></header>;
}
