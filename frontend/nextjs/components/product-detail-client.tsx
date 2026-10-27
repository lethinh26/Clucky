'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  formatPrice,
  type Product,
  type ProductOptionGroup,
  type ProductTopping,
} from '@/lib/products';
import {
  ArrowLeft,
  Star,
  Minus,
  Plus,
  ShoppingBag,
  Check,
} from 'lucide-react';

interface ProductDetailClientProps {
  product: Product;
}

export function ProductDetailClient({ product }: ProductDetailClientProps) {
  const router = useRouter();

  // Selected single options (one choice per group)
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    product.options?.forEach((group) => {
      if (group.choices.length > 0) {
        initial[group.id] = group.choices[0].id;
      }
    });
    return initial;
  });

  // Selected multi toppings (set of topping IDs)
  const [selectedToppings, setSelectedToppings] = useState<string[]>([]);

  // Quantity stepper
  const [quantity, setQuantity] = useState<number>(1);
  const [specialNote, setSpecialNote] = useState<string>('');
  const [isAddedSuccess, setIsAddedSuccess] = useState<boolean>(false);

  // Toggle single option
  const handleSelectOption = (groupId: string, choiceId: string) => {
    setSelectedOptions((prev) => ({
      ...prev,
      [groupId]: choiceId,
    }));
  };

  // Toggle multi topping
  const handleToggleTopping = (toppingId: string) => {
    setSelectedToppings((prev) =>
      prev.includes(toppingId)
        ? prev.filter((id) => id !== toppingId)
        : [...prev, toppingId]
    );
  };

  // Stepper handlers
  const handleDecrease = () => {
    if (quantity > 1) setQuantity((q) => q - 1);
  };

  const handleIncrease = () => {
    setQuantity((q) => q + 1);
  };

  // Dynamic Price Formula: Total = (BasePrice + sum(Options) + sum(Toppings)) * Quantity
  const { unitPrice, totalPrice, optionsCost, toppingsCost } = useMemo(() => {
    const base = product.basePrice || product.price;

    // Sum options
    let optSum = 0;
    product.options?.forEach((group) => {
      const selectedChoiceId = selectedOptions[group.id];
      const choice = group.choices.find((c) => c.id === selectedChoiceId);
      if (choice) {
        optSum += choice.priceAdjustment;
      }
    });

    // Sum toppings
    let topSum = 0;
    product.toppings?.forEach((top) => {
      if (selectedToppings.includes(top.id)) {
        topSum += top.price;
      }
    });

    const singleItemPrice = base + optSum + topSum;
    const finalTotal = singleItemPrice * quantity;

    return {
      unitPrice: singleItemPrice,
      totalPrice: finalTotal,
      optionsCost: optSum,
      toppingsCost: topSum,
    };
  }, [product, selectedOptions, selectedToppings, quantity]);

  const handleAddToCart = () => {
    setIsAddedSuccess(true);
    setTimeout(() => {
      setIsAddedSuccess(false);
      router.push('/cart');
    }, 600);
  };

  const isSoldOut = product.isSoldOut || !product.isAvailable;

  return (
    <div style={{ maxWidth: 1240, margin: '0 auto', padding: '32px 24px 120px' }}>
      {/* Back button */}
      <Link
        href="/menu"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          color: '#6B6259',
          fontFamily: 'Quicksand, sans-serif',
          fontWeight: 700,
          fontSize: 14,
          marginBottom: 32,
          transition: 'color 0.2s',
        }}
      >
        <ArrowLeft size={18} />
        <span>Quay lại Thực đơn Clucky</span>
      </Link>

      {/* Main 2-Column Detail Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
          gap: 'clamp(36px, 6vw, 72px)',
          alignItems: 'start',
        }}
      >
        {/* Left Column: Big Image & Badges */}
        <div>
          <div
            style={{
              position: 'relative',
              borderRadius: 32,
              overflow: 'hidden',
              boxShadow: '0 24px 60px rgba(22, 16, 13, 0.12)',
              border: '1px solid #E8E2D9',
              background: '#FFFAF3',
            }}
          >
            <img
              src={product.imageUrl || product.image}
              alt={product.alt || product.name}
              style={{
                width: '100%',
                aspectRatio: 1,
                objectFit: 'cover',
                display: 'block',
              }}
            />

            {product.isBestSeller && !isSoldOut && (
              <span
                style={{
                  position: 'absolute',
                  top: 20,
                  left: 20,
                  background: 'linear-gradient(135deg, #E5C358, #C9A227)',
                  color: '#16100D',
                  fontFamily: 'Baloo 2, sans-serif',
                  fontWeight: 700,
                  fontSize: 13,
                  letterSpacing: '0.08em',
                  padding: '6px 16px',
                  borderRadius: 999,
                  boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
                  textTransform: 'uppercase',
                }}
              >
                ★ Best Seller
              </span>
            )}

            {isSoldOut && (
              <span
                style={{
                  position: 'absolute',
                  top: 20,
                  right: 20,
                  background: '#B42318',
                  color: '#FFFFFF',
                  fontFamily: 'Quicksand, sans-serif',
                  fontWeight: 700,
                  fontSize: 12,
                  padding: '6px 14px',
                  borderRadius: 999,
                }}
              >
                Tạm hết hôm nay
              </span>
            )}
          </div>

          {/* Quality Promises */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 12,
              marginTop: 24,
            }}
          >
            <div
              style={{
                padding: '16px 12px',
                borderRadius: 18,
                background: '#FFFAF3',
                border: '1px solid #E8E2D9',
                textAlign: 'center',
              }}
            >
              <strong
                style={{
                  display: 'block',
                  fontFamily: 'Baloo 2, sans-serif',
                  fontSize: 16,
                  color: '#16100D',
                }}
              >
                Giòn tan
              </strong>
              <span style={{ fontSize: 12, color: '#6B6259' }}>Làm mới mỗi phần</span>
            </div>

            <div
              style={{
                padding: '16px 12px',
                borderRadius: 18,
                background: '#FFFAF3',
                border: '1px solid #E8E2D9',
                textAlign: 'center',
              }}
            >
              <strong
                style={{
                  display: 'block',
                  fontFamily: 'Baloo 2, sans-serif',
                  fontSize: 16,
                  color: '#16100D',
                }}
              >
                {product.kcal} kcal
              </strong>
              <span style={{ fontSize: 12, color: '#6B6259' }}>Khẩu phần vừa đủ</span>
            </div>

            <div
              style={{
                padding: '16px 12px',
                borderRadius: 18,
                background: '#FFFAF3',
                border: '1px solid #E8E2D9',
                textAlign: 'center',
              }}
            >
              <strong
                style={{
                  display: 'block',
                  fontFamily: 'Baloo 2, sans-serif',
                  fontSize: 16,
                  color: '#16100D',
                }}
              >
                15 phút
              </strong>
              <span style={{ fontSize: 12, color: '#6B6259' }}>Chuẩn bị nóng hổi</span>
            </div>
          </div>
        </div>

        {/* Right Column: Title, Rating, Options, Stepper, Total Price */}
        <div>
          {/* Tag & Title */}
          <div
            style={{
              display: 'inline-block',
              padding: '4px 12px',
              borderRadius: 999,
              backgroundColor: '#F5EDE0',
              border: '1px solid #E8E2D9',
              color: '#8F1216',
              fontFamily: 'Quicksand, sans-serif',
              fontWeight: 700,
              fontSize: 12,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              marginBottom: 10,
            }}
          >
            {product.categoryName || (product as any).category} · Clucky Classic
          </div>

          <h1
            style={{
              fontFamily: 'Baloo 2, sans-serif',
              fontWeight: 700,
              fontSize: 'clamp(32px, 4vw, 44px)',
              lineHeight: 1.1,
              color: '#16100D',
              margin: '0 0 12px',
              letterSpacing: '-0.02em',
            }}
          >
            {product.name}
          </h1>

          {/* Rating */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 18,
            }}
          >
            <div style={{ display: 'flex', color: '#C9A227' }}>
              {[1, 2, 3, 4, 5].map((s) => (
                <Star key={s} size={18} fill="#C9A227" stroke="#C9A227" />
              ))}
            </div>
            <span
              style={{
                fontFamily: 'Quicksand, sans-serif',
                fontWeight: 700,
                fontSize: 14,
                color: '#16100D',
              }}
            >
              {product.rating || 4.9}
            </span>
            <span style={{ color: '#6B6259', fontSize: 13 }}>
              ({product.reviewCount || 128} đánh giá từ thực khách)
            </span>
          </div>

          {/* Description */}
          <p
            style={{
              fontFamily: 'Quicksand, sans-serif',
              fontSize: 15,
              lineHeight: 1.7,
              color: '#6B6259',
              margin: '0 0 28px',
            }}
          >
            {product.description}
          </p>

          {/* Single Options (Chọn 1) */}
          {product.options?.map((group) => (
            <div key={group.id} style={{ marginBottom: 24 }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 10,
                }}
              >
                <span
                  style={{
                    fontFamily: 'Baloo 2, sans-serif',
                    fontWeight: 600,
                    fontSize: 16,
                    color: '#16100D',
                  }}
                >
                  {group.name}
                </span>
                <span style={{ fontSize: 12, color: '#8F1216', fontWeight: 700 }}>
                  * Chọn 1
                </span>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                {group.choices.map((choice) => {
                  const isSelected = selectedOptions[group.id] === choice.id;
                  return (
                    <button
                      key={choice.id}
                      type="button"
                      onClick={() => handleSelectOption(group.id, choice.id)}
                      style={{
                        padding: '10px 18px',
                        borderRadius: 999,
                        border: `2px solid ${isSelected ? '#8F1216' : '#E8E2D9'}`,
                        backgroundColor: isSelected ? '#FFFAF3' : '#FFFFFF',
                        color: isSelected ? '#8F1216' : '#16100D',
                        fontFamily: 'Quicksand, sans-serif',
                        fontWeight: 700,
                        fontSize: 14,
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 8,
                      }}
                    >
                      {isSelected && <Check size={16} className="text-[#8F1216]" />}
                      <span>{choice.name}</span>
                      {choice.priceAdjustment > 0 && (
                        <span style={{ color: '#8F1216', fontSize: 13 }}>
                          +{formatPrice(choice.priceAdjustment)}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Multi Toppings (Chọn nhiều) */}
          {product.toppings && product.toppings.length > 0 && (
            <div style={{ marginBottom: 28 }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 10,
                }}
              >
                <span
                  style={{
                    fontFamily: 'Baloo 2, sans-serif',
                    fontWeight: 600,
                    fontSize: 16,
                    color: '#16100D',
                  }}
                >
                  Thêm Topping hảo hạng
                </span>
                <span style={{ fontSize: 12, color: '#6B6259', fontWeight: 600 }}>
                  Chọn nhiều tùy thích
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
                {product.toppings.map((top) => {
                  const isSelected = selectedToppings.includes(top.id);
                  return (
                    <button
                      key={top.id}
                      type="button"
                      onClick={() => handleToggleTopping(top.id)}
                      style={{
                        padding: '12px 16px',
                        borderRadius: 16,
                        border: `1.5px solid ${isSelected ? '#C9A227' : '#E8E2D9'}`,
                        backgroundColor: isSelected ? '#FEFDF8' : '#FFFFFF',
                        color: '#16100D',
                        fontFamily: 'Quicksand, sans-serif',
                        fontSize: 14,
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        textAlign: 'left',
                        boxShadow: isSelected ? '0 4px 14px rgba(201, 162, 39, 0.15)' : 'none',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div
                          style={{
                            width: 18,
                            height: 18,
                            borderRadius: 4,
                            border: `2px solid ${isSelected ? '#C9A227' : '#B0A8A0'}`,
                            backgroundColor: isSelected ? '#C9A227' : 'transparent',
                            display: 'grid',
                            placeItems: 'center',
                            color: '#FFFFFF',
                          }}
                        >
                          {isSelected && <Check size={12} strokeWidth={3} />}
                        </div>
                        <span style={{ fontWeight: 600 }}>{top.name}</span>
                      </div>
                      <span style={{ color: '#8F1216', fontWeight: 700, fontSize: 13 }}>
                        +{formatPrice(top.price)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Special Instructions / Order Note */}
          <div style={{ marginBottom: 24 }}>
            <label
              htmlFor="special-note"
              style={{
                display: 'block',
                fontFamily: 'Baloo 2, sans-serif',
                fontWeight: 600,
                fontSize: 16,
                color: '#16100D',
                marginBottom: 8,
              }}
            >
              Ghi chú cho bếp (tùy chọn)
            </label>
            <textarea
              id="special-note"
              rows={2}
              value={specialNote}
              onChange={(e) => setSpecialNote(e.target.value)}
              placeholder="Ví dụ: Gà chiên giòn kỹ, sốt để riêng, không lấy tương ớt..."
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: 16,
                border: '1px solid #E8E2D9',
                backgroundColor: '#FFFFFF',
                fontFamily: 'Quicksand, sans-serif',
                fontSize: 14,
                color: '#16100D',
                outline: 'none',
                resize: 'none',
              }}
            />
          </div>

          {/* Stepper & Dynamic Price Row */}
          <div
            style={{
              padding: '24px 28px',
              background: '#FFFAF3',
              borderRadius: 24,
              border: '1px solid #E8E2D9',
              boxShadow: '0 8px 30px rgba(22, 16, 13, 0.04)',
              marginBottom: 24,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 20,
              }}
            >
              {/* Stepper */}
              <div>
                <span
                  style={{
                    display: 'block',
                    fontSize: 12,
                    fontWeight: 700,
                    color: '#6B6259',
                    marginBottom: 6,
                    textTransform: 'uppercase',
                  }}
                >
                  Số lượng phần
                </span>
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '4px 8px',
                    borderRadius: 999,
                    border: '1px solid #E8E2D9',
                    background: '#FFFFFF',
                  }}
                >
                  <button
                    type="button"
                    onClick={handleDecrease}
                    disabled={quantity <= 1}
                    aria-label="Giảm số lượng"
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: '50%',
                      border: 'none',
                      background: quantity <= 1 ? '#F5EDE0' : '#EAF0F6',
                      cursor: quantity <= 1 ? 'not-allowed' : 'pointer',
                      display: 'grid',
                      placeItems: 'center',
                      color: '#16100D',
                      transition: 'background-color 0.2s',
                    }}
                  >
                    <Minus size={16} />
                  </button>
                  <strong
                    style={{
                      fontFamily: 'Baloo 2, sans-serif',
                      fontSize: 18,
                      minWidth: 28,
                      textAlign: 'center',
                      color: '#16100D',
                    }}
                  >
                    {quantity}
                  </strong>
                  <button
                    type="button"
                    onClick={handleIncrease}
                    aria-label="Tăng số lượng"
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: '50%',
                      border: 'none',
                      background: '#EAF0F6',
                      cursor: 'pointer',
                      display: 'grid',
                      placeItems: 'center',
                      color: '#16100D',
                      transition: 'background-color 0.2s',
                    }}
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>

              {/* Dynamic Price Display */}
              <div style={{ textAlign: 'right' }}>
                <span
                  style={{
                    display: 'block',
                    fontSize: 12,
                    fontWeight: 700,
                    color: '#6B6259',
                    marginBottom: 2,
                    textTransform: 'uppercase',
                  }}
                >
                  Tổng tiền ({quantity} phần)
                </span>
                <div
                  style={{
                    fontFamily: 'Baloo 2, sans-serif',
                    fontSize: 32,
                    fontWeight: 700,
                    color: '#8F1216',
                    letterSpacing: '-0.02em',
                    transition: 'color 0.2s',
                  }}
                >
                  {formatPrice(totalPrice)}
                </div>
                <div style={{ fontSize: 12, color: '#6B6259', marginTop: 2 }}>
                  Đơn giá: {formatPrice(unitPrice)}/phần
                </div>
              </div>
            </div>

            {/* Desktop CTA Button */}
            <button
              type="button"
              onClick={handleAddToCart}
              disabled={isSoldOut}
              className="btn-primary"
              style={{
                width: '100%',
                marginTop: 20,
                height: 52,
                fontSize: 16,
                border: 'none',
                cursor: isSoldOut ? 'not-allowed' : 'pointer',
                opacity: isSoldOut ? 0.6 : 1,
              }}
            >
              <ShoppingBag size={20} />
              <span>
                {isSoldOut
                  ? 'Món ăn tạm hết hàng'
                  : isAddedSuccess
                  ? '✓ Đã thêm vào giỏ hàng!'
                  : `Thêm vào giỏ hàng · ${formatPrice(totalPrice)}`}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Sticky Bottom Bar */}
      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: '#FFFAF3',
          borderTop: '1px solid #E8E2D9',
          padding: '12px 20px',
          boxShadow: '0 -8px 24px rgba(22, 16, 13, 0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          zIndex: 40,
        }}
        className="md:hidden"
      >
        <div>
          <span style={{ fontSize: 11, color: '#6B6259', fontWeight: 600 }}>TỔNG TIỀN</span>
          <div
            style={{
              fontFamily: 'Baloo 2, sans-serif',
              fontSize: 22,
              fontWeight: 700,
              color: '#8F1216',
            }}
          >
            {formatPrice(totalPrice)}
          </div>
        </div>

        <button
          type="button"
          onClick={handleAddToCart}
          disabled={isSoldOut}
          className="btn-primary"
          style={{
            padding: '10px 24px',
            fontSize: 14,
            border: 'none',
            cursor: isSoldOut ? 'not-allowed' : 'pointer',
          }}
        >
          <ShoppingBag size={18} />
          <span>{isSoldOut ? 'Tạm hết' : 'Thêm giỏ'}</span>
        </button>
      </div>
    </div>
  );
}

export default ProductDetailClient;
