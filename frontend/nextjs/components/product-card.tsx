import Link from 'next/link';
import { formatPrice, type Product } from '@/lib/products';

export function ProductCard({ product }: { product: Product }) {
  return <article className="product-card"><Link href={`/menu/${product.slug}`}><img src={product.image} alt={product.alt} /></Link><div className="product-card-body"><span className="card-tag">{product.category}</span><h2><Link href={`/menu/${product.slug}`}>{product.name}</Link></h2><p>{product.description}</p><div className="product-meta"><span className="price">{formatPrice(product.price)}</span><Link className="add-button" href={`/menu/${product.slug}`} aria-label={`Xem ${product.name}`}>+</Link></div></div></article>;
}
