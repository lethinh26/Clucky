import Link from 'next/link';
import Image from 'next/image';
import { ProductCard } from '@/components/product-card';
import { CategoryIcon } from '@/components/category-icon';
import { products, categories } from '@/lib/products';
import {
  Flame,
  Award,
  Truck,
  Sparkles,
  ArrowRight,
} from 'lucide-react';

export default function Home() {
  const featuredProducts = products.filter((p) => p.isBestSeller || p.id <= 6).slice(0, 6);

  return (
    <>
            <main>
        {/* Hero Section */}
        <section className="hero">
          <div className="hero-inner">
            <div className="hero-copy">
              <span className="eyebrow">
                <Sparkles size={16} className="inline mr-2 text-[#C9A227]" />
                Fresh from the fryer
              </span>
              <h1>
                <span>Crispy <strong>outside.</strong></span>
                <span>Happy <strong>inside.</strong></span>
              </h1>
              <p>
                Gà rán giòn rụm đậm vị truyền thống, chế biến thủ công từ 100% gà tươi mỗi ngày.
                Từng miếng gà nóng hổi chuẩn nhiệt độ vàng mang lại niềm vui trọn vẹn cho bạn và người thân.
              </p>
              <div className="actions">
                <Link className="btn-primary" href="/menu">
                  <span>Đặt món ngay</span>
                  <ArrowRight size={18} />
                </Link>
                <Link className="btn-secondary" href="/menu">
                  <span>Xem thực đơn</span>
                </Link>
              </div>
            </div>

            <div className="hero-food">
              <Image
                src="https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?auto=format&fit=crop&w=1000&q=85"
                alt="Đĩa gà rán giòn vàng óng ánh Clucky"
                width={560}
                height={440}
                priority
                style={{ width: '100%', height: 'auto', borderRadius: 28, objectFit: 'cover' }}
              />
            </div>
          </div>
        </section>

        {/* Floating Category Dock */}
        <section className="category-row-section" aria-label="Danh mục món ăn">
          <div className="category-dock">
            {categories.map((cat) => (
              <Link
                key={cat.id}
                href={cat.id === 0 ? '/menu' : `/menu?cat=${cat.id}`}
                className={`category-pill ${cat.id === 0 ? 'active' : ''}`}
              >
                <CategoryIcon id={cat.id} size={18} active={cat.id === 0} />
                <span>{cat.name}</span>
              </Link>
            ))}
          </div>
        </section>

        {/* Intro */}
        <section
          style={{
            width: 'min(1240px, calc(100% - 64px))',
            margin: '0 auto 40px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            flexWrap: 'wrap',
            gap: 24,
          }}
        >
          <div>
            <span
              style={{
                color: '#8F1216',
                fontFamily: 'Baloo 2, sans-serif',
                fontWeight: 600,
                fontSize: 14,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
              }}
            >
              Món ăn bán chạy nhất
            </span>
            <h2
              style={{
                fontFamily: 'Baloo 2, sans-serif',
                fontWeight: 700,
                fontSize: 'clamp(32px, 4vw, 46px)',
                color: '#16100D',
                margin: '6px 0 0',
                letterSpacing: '-0.03em',
              }}
            >
              Hương vị được yêu thích tại Clucky
            </h2>
          </div>
          <Link
            href="/menu"
            style={{
              color: '#8F1216',
              fontFamily: 'Quicksand, sans-serif',
              fontWeight: 700,
              fontSize: 15,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            Xem tất cả thực đơn →
          </Link>
        </section>

        {/* Featured Product Grid */}
        <section
          style={{
            width: 'min(1240px, calc(100% - 64px))',
            margin: '0 auto 80px',
          }}
        >
          <div className="product-grid">
            {featuredProducts.map((product) => (
              <ProductCard key={product.slug} product={product} />
            ))}
          </div>
        </section>

        {/* Brand Promise Section */}
        <section className="brand-promise" aria-label="Cam kết thương hiệu Clucky">
          <div className="promise-card">
            <div className="promise-icon" style={{ color: '#8F1216' }}>
              <Flame size={28} />
            </div>
            <h3>Giòn nóng mỗi phần</h3>
            <p>
              Gà chỉ được chiên áp suất ngay sau khi bạn đặt hàng, cam kết lớp vỏ giòn rụm không bị ỉu, giữ trọn độ ẩm ngọt mọng nước bên trong.
            </p>
          </div>

          <div className="promise-card">
            <div className="promise-icon" style={{ color: '#C9A227' }}>
              <Award size={28} />
            </div>
            <h3>Công thức độc quyền</h3>
            <p>
              Pha trộn tinh tế từ 12 loại thảo mộc tự nhiên theo công thức chuẩn Âu, mang lại dư vị thơm nồng kích thích vị giác nhưng không gắt cổ.
            </p>
          </div>

          <div className="promise-card">
            <div className="promise-icon" style={{ color: '#1E7A46' }}>
              <Truck size={28} />
            </div>
            <h3>Giao hàng chuẩn nhiệt</h3>
            <p>
              Túi giữ nhiệt chuyên dụng giữ trọn độ nóng giòn từ bếp tới tận cửa nhà bạn trong vòng 30 phút từ các chi nhánh gần nhất.
            </p>
          </div>
        </section>
      </main>
          </>
  );
}
