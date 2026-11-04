'use client';
import { useTranslations } from "next-intl";


import React, { useState, useMemo, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from '@/components/ui-loader/navigation-link';
import { ProductCard } from '@/components/product-card';
import { CategoryIcon } from '@/components/category-icon';
import { StyledSelect } from '@/components/styled-select';
import { catalogApi, type CategoryItem, type ProductItem } from '@/lib/api';
import {
  Search,
  X,
  Flame,
  ArrowUpDown,
  UtensilsCrossed,
  Sparkles,
} from 'lucide-react';

function MenuContent() {
  const t = useTranslations();
  const searchParams = useSearchParams();
  const initialCategory = Number(searchParams.get('cat')) || 0;
  const storeIdParam = searchParams.get('storeId');
  const parsedStoreId = Number(storeIdParam);
  const storeId = Number.isSafeInteger(parsedStoreId) && parsedStoreId > 0
    ? parsedStoreId
    : undefined;
  const hasInvalidStoreId = storeIdParam !== null && storeId === undefined;

  const [products, setProducts] = useState<ProductItem[]>([]);
  const [categories, setCategories] = useState<{ id: number; name: string; messageKey?: string }[]>([
    { id: 0, name: 'All', messageKey: 'menu.categories.all' },
  ]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<number>(initialCategory);
  const [searchTerm, setSearchTerm] = useState('');
  const [spicyFilter, setSpicyFilter] = useState<'ALL' | '0' | '1' | '2'>('ALL');
  const [sortOption, setSortOption] = useState<'DEFAULT' | 'PRICE_ASC' | 'PRICE_DESC'>('DEFAULT');

  useEffect(() => {
    let active = true;
    const fetchCatalog = async () => {
      setLoading(true);
      setLoadError(null);
      setProducts([]);
      if (hasInvalidStoreId) {
        setCategories([{ id: 0, name: 'All', messageKey: 'menu.categories.all' }]);
        setLoading(false);
        return;
      }

      try {
        const [liveProds, liveCats] = await Promise.all([
          catalogApi.getProducts({ storeId, activeOnly: true }),
          catalogApi.getCategories(true),
        ]);
        if (active) {
          setProducts(liveProds);
          setCategories([
            { id: 0, name: 'All', messageKey: 'menu.categories.all' },
            ...liveCats.map((c: CategoryItem) => ({ id: c.id, name: c.name })),
          ]);
        }
      } catch (err) {
        if (active) setLoadError(err instanceof Error ? err.message : t("menu.empty.title"));
      } finally {
        if (active) setLoading(false);
      }
    };
    fetchCatalog();
    return () => { active = false; };
  }, [storeId, hasInvalidStoreId]);

  // Filter & Sort Logic
  const filteredProducts = useMemo(() => {
    return products
      .filter((p) => {
        // Category Filter
        const selectedCategoryName = categories.find((category) => category.id === selectedCategory)?.name;
        const matchCat =
          selectedCategory === 0 ||
          p.categoryId === selectedCategory ||
          (selectedCategoryName?.toLocaleLowerCase() === 'combo' &&
            p.categoryName?.toLocaleLowerCase() === 'combo');
        // Search Term
        const matchSearch =
          p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (p.categoryName ?? p.category ?? '').toLowerCase().includes(searchTerm.toLowerCase());
        // Spicy Filter
        const matchSpicy =
          spicyFilter === 'ALL' || p.spicyLevel?.toString() === spicyFilter;

        return matchCat && matchSearch && matchSpicy;
      })
      .sort((a, b) => {
        if (sortOption === 'PRICE_ASC') return (a.basePrice || a.price) - (b.basePrice || b.price);
        if (sortOption === 'PRICE_DESC') return (b.basePrice || b.price) - (a.basePrice || a.price);
        return 0;
      });
  }, [products, categories, selectedCategory, searchTerm, spicyFilter, sortOption]);

  const handleResetFilters = () => {
    setSelectedCategory(0);
    setSearchTerm('');
    setSpicyFilter('ALL');
    setSortOption('DEFAULT');
  };

  const errorMessage = hasInvalidStoreId ? t("menu.errors.invalidStoreId") : loadError;

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
            fontFamily: 'Baloo 2, sans-serif',
            fontSize: 'clamp(36px, 4.5vw, 56px)',
            fontWeight: 700,
            color: '#16100D',
            margin: '6px 0 12px',
            letterSpacing: '-0.03em',
          }}
        >
          {t("menu.title")}{" "}</h1>
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
          {t("menu.description")}{" "}</p>

        {storeId && (
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
            <span>{t("menu.storePrefix")}{storeId}</span>
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
              placeholder={t("menu.search.placeholder")}
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
                aria-label={t("menu.search.clear")}
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* Spicy filter & Sort */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: '#6B6259' }}>
              <Flame size={16} className="text-[#8F1216]" />
              <span>{t("menu.spice.label")}</span>
              <StyledSelect
                value={spicyFilter}
                onChange={(v) => setSpicyFilter(v as any)}
                ariaLabel={t("menu.spice.filter")}
                options={[
                  { value: 'ALL', label: t("menu.spice.all") },
                  { value: '0', label: t("menu.spice.none") },
                  { value: '1', label: t("menu.spice.standard") },
                  { value: '2', label: t("menu.spice.hot") },
                ]}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: '#6B6259' }}>
              <ArrowUpDown size={16} className="text-[#8F1216]" />
              <span>{t("menu.sort.label")}</span>
              <StyledSelect
                value={sortOption}
                onChange={(v) => setSortOption(v as any)}
                ariaLabel={t("menu.sort.accessibleLabel")}
                options={[
                  { value: 'DEFAULT', label: t("menu.sort.default") },
                  { value: 'PRICE_ASC', label: t("menu.sort.priceAscending") },
                  { value: 'PRICE_DESC', label: t("menu.sort.priceDescending") },
                ]}
              />
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
                  fontFamily: 'Baloo 2, sans-serif',
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
                <span>{cat.messageKey ? t(cat.messageKey) : cat.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {errorMessage && (
        <p role="alert" style={{ color: '#B42318', textAlign: 'center' }}>
          {errorMessage}
        </p>
      )}
      {loading ? (
        <p aria-live="polite" style={{ textAlign: 'center' }}>{t("menu.loading")}</p>
      ) : errorMessage ? null : filteredProducts.length > 0 ? (
        <div>
          <div style={{ marginBottom: 16, fontSize: 13, color: '#6B6259', fontWeight: 600 }}>
            {t("menu.results.prefix")}{" "}<strong>{filteredProducts.length}</strong> {" "}{t("menu.results.suffix")}{" "}</div>
          <div className="product-grid">
            {filteredProducts.map((product) => (
              <ProductCard key={product.slug} product={product} storeId={storeId} />
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
              fontFamily: 'Baloo 2, sans-serif',
              fontWeight: 700,
              fontSize: 22,
              color: '#16100D',
              margin: '0 0 8px',
            }}
          >
            {t("menu.empty.title")}{" "}</h3>
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
            {t("menu.empty.description")}{" "}</p>
          <button
            onClick={handleResetFilters}
            className="btn-primary"
            style={{ border: 'none', cursor: 'pointer' }}
          >
            {t("menu.empty.reset")}{" "}</button>
        </div>
      )}
    </div>
  );
}

export default function MenuPage() {
  return (
    <>
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
          </>
  );
}
