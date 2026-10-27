import Image from 'next/image';
import Link from 'next/link';

export function CustomerFooter() {
  return <footer className="site-footer"><div className="footer-inner"><Link className="brand" href="/"><Image className="brand-logo footer-logo" src="/logo_primary.png" alt="Clucky" width={44} height={44} /><span>Clucky</span></Link><nav className="footer-links" aria-label="Liên kết cuối trang"><Link href="/menu">Thực đơn</Link><Link href="/stores">Cửa hàng</Link><Link href="/account">Tài khoản</Link></nav><span>Crispy Outside, Happy Inside.</span></div></footer>;
}
