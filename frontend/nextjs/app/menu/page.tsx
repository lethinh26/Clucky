'use client';

import React, { useState, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CustomerHeader } from '@/components/customer-header';
import { CustomerFooter } from '@/components/customer-footer';
import { ProductCard } from '@/components/product-card';
import { CategoryIcon } from '@/components/category-icon';
import { products, categories, type Product } from '@/lib/products';
import {
  Search,
  X,
  Filter,
  Flame,
  ArrowUpDown,
  UtensilsCrossed,
  Sparkles,
} from 'lucide-react';

function MenuContent() {
  const searchParams = useSearchParams();
  const initialCategory = Number(searchParams.get('cat')) || 0;
  const storeIdParam = searchParams.get('storeId');

  const [selectedCategory, setSelectedCategory] = useState<number>(initialCategory);
  const [searchTerm, setSearchTerm] = useState('');
  const [spicyFilter, setSpicyFilter] = useState<'ALL' | '0' | '1' | '2'>('ALL');
  const [sortOption, setSortOption] = useState<'POPULAR' | 'PRICE_ASC' | 'PRICE_DESC'>('POPULAR');

  // Filter & Sort Logic
  const filteredProducts = useMemo(() => {
    return products
      .filter((p) => {
        // Category Filter
        const matchCat = selectedCategory === 0 || p.categoryId === selectedCategory;
        // Search Term
        const matchSearch =
          p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.categoryName.toLowerCase().includes(searchTerm.toLowerCase());
        // Spicy Filter
        const matchSpicy =
          spicyFilter === 'ALL' || p.spicyLevel.toString() === spicyFilter;

        return matchCat && matchSearch && matchSpicy;
      })
      .sort((a, b) => {
        if (sortOption === 'PRICE_ASC') return (a.basePrice || a.price) - (b.basePrice || b.price);
        if (sortOption === 'PRICE_DESC') return (b.basePrice || b.price) - (a.basePrice || a.price);
        // Default popular: Best seller first
        return (b.isBestSeller ? 1 : 0) - (a.isBestSeller ? 1 : 0);
      });
  }, [selectedCategory, searchTerm, spicyFilter, sortOption]);

  const handleResetFilters = () => {
    setSelectedCategory(0);
    setSearchTerm('');
    setSpicyFilter('ALL');
    setSortOption('POPULAR');
  };

  return (
    <div style={{ maxWidth: 1240, margin: '0 auto', padding: '0 24px 80px' }}>
      {/* Page Title & Slogan */}
      <div style={{ padding: '32px 0 24px', textAlign: 'center' }}>
        <span className="eyebrow">
          <Sparkles size={16} className="inline mr-1 text-[#C9A227]" />
          Fresh from the fryer
        </span>
        <h1
          style={{
            fontFamily: 'Fredoka, sans-serif',
            fontSize: 'clamp(36px, 4.5vw, 56px)',
            fontWeight: 700,
            color: '#16100D',
            margin: '6px 0 12px',
            letterSpacing: '-0.03em',
          }}
        >
          Thực đơn Clucky
        </h1>
        <p
          style={{
            fontFamily: 'Quicksand, sans-serif',
            color: '#6B6259',
            fontSize: 16,
            maxWidth: 580,
            margin: '0 auto',
            lineHeight: 1.6,
          }}
        >
          Chọn món yêu thích của bạn — từ gà rán giòn rụm áp suất, burger brioche thơm lừng, cho tới các combo tiết kiệm trọn gói.
        </p>

        {storeIdParam && (
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              marginTop: 16,
              padding: '6px 16px',
              backgroundColor: '#FEF9C3',
              border: '1px solid #FDE047',
              borderRadius: 999,
              fontSize: 13,
              fontWeight: 700,
              color: '#946C00',
            }}
          >
            <span>📍 Đang xem thực đơn giao hàng từ Chi nhánh #{storeIdParam}</span>
          </div>
        )}
      </div>

      {/* Toolbar: Search & Smart Filters */}
      <div
        style={{
          background: '#FFFAF3',
          border: '1px solid #E8E2D9',
          borderRadius: 24,
          padding: '20px 24px',
          boxShadow: '0 8px 30px rgba(22, 16, 13, 0.04)',
          marginBottom: 36,
          display: 'flex',
          flexDirection: 'column',
          gap: 18,
        }}
      >
        {/* Top bar: Search Input & Sort dropdown */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 16,
          }}
        >
          {/* Search Box */}
          <div
            style={{
              position: 'relative',
              flex: '1 1 300px',
              maxWidth: 480,
            }}
          >
            <Search
              size={18}
              style={{
                position: 'absolute',
                left: 16,
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#6B6259',
              }}
            />
            <input
              type="text"
              placeholder="Tìm kiếm món ăn, vị cay, thành phần..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                height: 46,
                padding: '0 44px 0 44px',
                borderRadius: 999,
                border: '1px solid #E8E2D9',
                backgroundColor: '#FFFFFF',
                fontSize: 14,
                color: '#16100D',
                outline: 'none',
              }}
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                style={{
                  position: 'absolute',
                  right: 14,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#6B6259',
                  padding: 4,
                }}
                aria-label="Xóa từ khóa"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* Spicy filter & Sort */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: '#6B6259' }}>
              <Flame size={16} className="text-[#8F1216]" />
              <span>Độ cay:</span>
              <select
                value={spicyFilter}
                onChange={(e) => setSpicyFilter(e.target.value as any)}
                style={{
                  height: 38,
                  padding: '0 12px',
                  borderRadius: 999,
                  border: '1px solid #E8E2D9',
                  backgroundColor: '#FFFFFF',
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#16100D',
                  cursor: 'pointer',
                }}
              >
                <option value="ALL">Tất cả mức cay</option>
                <option value="0">Không cay</option>
                <option value="1">Cay vừa (Tiêu chuẩn)</option>
                <option value="2">Siêu cay</option>
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: '#6B6259' }}>
              <ArrowUpDown size={16} className="text-[#8F1216]" />
              <span>Sắp xếp:</span>
              <select
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value as any)}
                style={{
                  height: 38,
                  padding: '0 12px',
                  borderRadius: 999,
                  border: '1px solid #E8E2D9',
                  backgroundColor: '#FFFFFF',
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#16100D',
                  cursor: 'pointer',
                }}
              >
                <option value="POPULAR">Bán chạy nhất</option>
                <option value="PRICE_ASC">Giá tăng dần</option>
                <option value="PRICE_DESC">Giá giảm dần</option>
              </select>
            </div>
          </div>
        </div>

        {/* Category Pills Navigation */}
        <div
          style={{
            display: 'flex',
            gap: 10,
            overflowX: 'auto',
            paddingBottom: 4,
            scrollbarWidth: 'none',
          }}
        >
          {categories.map((cat) => {
            const isActive = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                style={{
                  padding: '9px 20px',
                  borderRadius: 999,
                  border: `1px solid ${isActive ? '#8F1216' : '#E8E2D9'}`,
                  backgroundColor: isActive ? '#8F1216' : '#FFFFFF',
                  color: isActive ? '#FFFFFF' : '#16100D',
                  fontFamily: 'Fredoka, sans-serif',
                  fontWeight: 600,
                  fontSize: 14,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  whiteSpace: 'nowrap',
                  boxShadow: isActive ? '0 4px 14px rgba(143, 18, 22, 0.25)' : 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <CategoryIcon id={cat.id} size={18} active={isActive} />
                <span>{cat.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Product Grid or Empty State */}
      {filteredProducts.length > 0 ? (
        <div>
          <div style={{ marginBottom: 16, fontSize: 13, color: '#6B6259', fontWeight: 600 }}>
            Hiển thị <strong>{filteredProducts.length}</strong> món ăn thơm ngon phù hợp
          </div>
          <div className="product-grid">
            {filteredProducts.map((product) => (
              <ProductCard key={product.slug} product={product} />
            ))}
          </div>
        </div>
      ) : (
        /* Empty State */
        <div
          style={{
            textAlign: 'center',
            padding: '72px 24px',
            background: '#FFFAF3',
            border: '1px solid #E8E2D9',
            borderRadius: 24,
            marginTop: 20,
          }}
        >
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: '50%',
              backgroundColor: '#F5EDE0',
              display: 'grid',
              placeItems: 'center',
              margin: '0 auto 16px',
              color: '#8F1216',
            }}
          >
            <UtensilsCrossed size={36} />
          </div>
          <h3
            style={{
              fontFamily: 'Fredoka, sans-serif',
              fontWeight: 700,
              fontSize: 22,
              color: '#16100D',
              margin: '0 0 8px',
            }}
          >
            Không tìm thấy món ăn phù hợp
          </h3>
          <p
            style={{
              fontFamily: 'Quicksand, sans-serif',
              color: '#6B6259',
              fontSize: 15,
              maxWidth: 420,
              margin: '0 auto 24px',
              lineHeight: 1.6,
            }}
          >
            Thử tìm kiếm với tên món khác hoặc xóa bộ lọc để khám phá các món gà giòn hấp dẫn khác của Clucky.
          </p>
          <button
            onClick={handleResetFilters}
            className="btn-primary"
            style={{ border: 'none', cursor: 'pointer' }}
          >
            Xem tất cả món ăn
          </button>
        </div>
      )}
    </div>
  );
}

export default function MenuPage() {
  return (
    <>
      <CustomerHeader />
      <main>
        <Suspense
          fallback={
            <div style={{ maxWidth: 1240, margin: '60px auto', padding: '0 24px', textAlign: 'center' }}>
              <div
                className="skeleton-shimmer"
                style={{ height: 280, borderRadius: 24, marginBottom: 30 }}
              />
              <div className="product-grid">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div
                    key={i}
                    className="skeleton-shimmer"
                    style={{ height: 380, borderRadius: 24 }}
                  />
                ))}
              </div>
            </div>
          }
        >
          <MenuContent />
        </Suspense>
      </main>
      <CustomerFooter />
    </>
  );
}
