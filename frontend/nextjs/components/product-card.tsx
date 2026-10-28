import { FoodImage } from "@/components/order/food-image";
import Link from "next/link";
import Image from "next/image";
import { formatPrice, type Product } from "@/lib/products";
import { Plus, Flame, Star } from "lucide-react";

export function ProductCard({ product }: { product: Product }) {
  const isSoldOut = product.isSoldOut || !product.isAvailable;

  return (
    <article className="product-card">
      <Link
        href={`/menu/${product.slug}`}
        className="product-card-media"
        aria-label={`Xem chi tiết ${product.name}`}
      >
        <FoodImage
          src={product.imageUrl || product.image}
          alt={product.alt || product.name}
          loading="lazy"
        />

        {product.isBestSeller && !isSoldOut && (
          <span className="badge-best-seller">
            <Star size={12} fill="currentColor" /> Best Seller
          </span>
        )}

        {isSoldOut && <span className="badge-sold-out">Tạm hết hôm nay</span>}
      </Link>

      <div className="product-card-body">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span className="card-tag">
            {product.categoryName || (product as any).category}
          </span>
          {product.spicyLevel > 0 && (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 2,
                fontSize: 11,
                fontWeight: 700,
                color: product.spicyLevel >= 2 ? "#B42318" : "#D97706",
              }}
            >
              <Flame size={13} />
              {product.spicyLevel >= 2 ? "Siêu cay" : "Cay vừa"}
            </span>
          )}
        </div>

        <h2>
          <Link href={`/menu/${product.slug}`}>{product.name}</Link>
        </h2>

        <p>{product.description}</p>

        <div className="product-meta">
          <span className="price">
            {formatPrice(product.basePrice || product.price)}
          </span>
          <Link
            className="add-button"
            href={`/menu/${product.slug}`}
            aria-label={`Xem và chọn món ${product.name}`}
          >
            <Plus size={20} />
          </Link>
        </div>
      </div>
    </article>
  );
}

export default ProductCard;
