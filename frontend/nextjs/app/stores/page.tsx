import Link from 'next/link';
import { CustomerFooter } from '@/components/customer-footer';
import { CustomerHeader } from '@/components/customer-header';

const stores = [
  { name: 'Clucky Nguyễn Trãi', address: '192 Nguyễn Trãi, Quận 5, TP. Hồ Chí Minh', time: '10:00 – 22:00' },
  { name: 'Clucky Phan Văn Trị', address: '458 Phan Văn Trị, Gò Vấp, TP. Hồ Chí Minh', time: '10:00 – 22:00' },
  { name: 'Clucky Lê Văn Việt', address: '88 Lê Văn Việt, Thủ Đức, TP. Hồ Chí Minh', time: '10:00 – 22:00' },
];

export default function StoresPage() {
  return <><CustomerHeader /><main className="simple-page"><span className="eyebrow">Find your Clucky</span><h1>Cửa hàng<br />gần bạn.</h1><p className="lead">Ghé lấy món nóng giòn hoặc chọn giao tận nơi từ cửa hàng gần nhất.</p><div className="store-list">{stores.map((store) => <article className="store-card" key={store.name}><div><span className="card-tag">Clucky store</span><h2>{store.name}</h2><p>{store.address}</p></div><div className="store-meta"><span>{store.time}</span><Link className="text-link" href="/menu">Đặt món →</Link></div></article>)}</div></main><CustomerFooter /></>;
}
