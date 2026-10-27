import Image from 'next/image';
import Link from 'next/link';
import { ShoppingBag, MapPin, Search } from 'lucide-react';

export function CustomerHeader() {
  return (
    <header className="site-header">
      <Link className="brand" href="/" aria-label="Clucky trang chủ">
        <Image
          className="brand-logo"
          src="/logo_primary.png"
          alt="Clucky Logo"
          width={44}
          height={44}
          priority
        />
        <span>Clucky</span>
      </Link>

      <nav className="nav" aria-label="Điều hướng chính">
        <Link href="/">Trang chủ</Link>
        <Link href="/menu">Thực đơn</Link>
        <Link href="/stores">Cửa hàng</Link>
        <Link href="/orders/demo-clucky">Theo dõi đơn</Link>
        <Link href="/account">Tài khoản</Link>
        <Link className="nav-order" href="/cart">
          <ShoppingBag size={16} className="inline mr-1" />
          <span>Giỏ hàng</span>
        </Link>
      </nav>
    </header>
  );
}

export default CustomerHeader;
