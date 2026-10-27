'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { CustomerHeader } from '@/components/customer-header';
import { CustomerFooter } from '@/components/customer-footer';
import { stores, type Store } from '@/lib/products';
import {
  MapPin,
  Clock,
  Phone,
  Truck,
  Search,
  ExternalLink,
  ShoppingBag,
  Sparkles,
  Store as StoreIcon,
} from 'lucide-react';

export default function StoresPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState<string>('ALL');

  const districts = useMemo(() => {
    return ['ALL', ...Array.from(new Set(stores.map((s) => s.district)))];
  }, []);

  const filteredStores = useMemo(() => {
    return stores.filter((s) => {
      const matchDistrict = selectedDistrict === 'ALL' || s.district === selectedDistrict;
      const matchSearch =
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.district.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.phone.includes(searchTerm);
      return matchDistrict && matchSearch;
    });
  }, [searchTerm, selectedDistrict]);

  return (
    <>
      <CustomerHeader />
      <main style={{ maxWidth: 1240, margin: '0 auto', padding: '32px 24px 100px' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <span className="eyebrow">
            <Sparkles size={16} className="inline mr-1 text-[#C9A227]" />
            Find your Clucky
          </span>
          <h1
            style={{
              fontFamily: 'Fredoka, sans-serif',
              fontWeight: 700,
              fontSize: 'clamp(36px, 4.5vw, 54px)',
              color: '#16100D',
              margin: '6px 0 12px',
              letterSpacing: '-0.03em',
            }}
          >
            Hệ thống Cửa hàng Clucky
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
            Ghé lấy món nóng giòn trực tiếp tại cửa hàng hoặc chọn chi nhánh gần bạn nhất để nhận đơn giao siêu tốc.
          </p>
        </div>

        {/* Search & District Filter */}
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
            gap: 16,
          }}
        >
          <div style={{ position: 'relative', width: '100%', maxWidth: 500 }}>
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
              placeholder="Tìm theo tên chi nhánh, đường, quận..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                height: 46,
                padding: '0 20px 0 44px',
                borderRadius: 999,
                border: '1px solid #E8E2D9',
                backgroundColor: '#FFFFFF',
                fontSize: 14,
                color: '#16100D',
                outline: 'none',
              }}
            />
          </div>

          {/* District Pills */}
          <div
            style={{
              display: 'flex',
              gap: 10,
              flexWrap: 'wrap',
            }}
          >
            {districts.map((district) => {
              const isActive = selectedDistrict === district;
              return (
                <button
                  key={district}
                  onClick={() => setSelectedDistrict(district)}
                  style={{
                    padding: '8px 18px',
                    borderRadius: 999,
                    border: `1px solid ${isActive ? '#8F1216' : '#E8E2D9'}`,
                    backgroundColor: isActive ? '#8F1216' : '#FFFFFF',
                    color: isActive ? '#FFFFFF' : '#16100D',
                    fontFamily: 'Fredoka, sans-serif',
                    fontWeight: 600,
                    fontSize: 14,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    boxShadow: isActive ? '0 4px 14px rgba(143, 18, 22, 0.25)' : 'none',
                  }}
                >
                  {district === 'ALL' ? 'Tất cả chi nhánh' : district}
                </button>
              );
            })}
          </div>
        </div>

        {/* Store Cards Grid or Empty State */}
        {filteredStores.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 24 }}>
            {filteredStores.map((store) => {
              const isOpen = store.status === 'OPEN';
              return (
                <article
                  key={store.id}
                  style={{
                    background: '#FFFAF3',
                    border: '1px solid #E8E2D9',
                    borderRadius: 24,
                    padding: 28,
                    boxShadow: '0 8px 30px rgba(22, 16, 13, 0.05)',
                    display: 'flex',
                    flexDirection: 'column',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                  }}
                >
                  {/* Header: Name & Status */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 12,
                          backgroundColor: '#F5EDE0',
                          display: 'grid',
                          placeItems: 'center',
                          color: '#8F1216',
                        }}
                      >
                        <StoreIcon size={20} />
                      </div>
                      <div>
                        <h2
                          style={{
                            fontFamily: 'Fredoka, sans-serif',
                            fontWeight: 700,
                            fontSize: 20,
                            color: '#16100D',
                            margin: 0,
                          }}
                        >
                          {store.name}
                        </h2>
                        <span style={{ fontSize: 12, color: '#C9A227', fontWeight: 700 }}>
                          Chi nhánh Clucky TP.HCM
                        </span>
                      </div>
                    </div>

                    <span
                      style={{
                        padding: '4px 12px',
                        borderRadius: 999,
                        fontSize: 12,
                        fontWeight: 700,
                        backgroundColor: isOpen ? '#EAF6EE' : '#FEF3C7',
                        color: isOpen ? '#1E7A46' : '#D97706',
                        border: `1px solid ${isOpen ? '#A7F3D0' : '#FDE68A'}`,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {isOpen ? '● Đang mở cửa' : '○ Tạm đóng cửa'}
                    </span>
                  </div>

                  {/* Details */}
                  <div style={{ margin: '20px 0', display: 'flex', flexDirection: 'column', gap: 10, fontSize: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, color: '#16100D' }}>
                      <MapPin size={18} className="text-[#8F1216] flex-shrink-0 mt-0.5" />
                      <span style={{ fontWeight: 600 }}>{store.address}</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#6B6259' }}>
                      <Clock size={18} className="text-[#C9A227] flex-shrink-0" />
                      <span>Giờ phục vụ: <strong>{store.openTime} – {store.closeTime}</strong></span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#6B6259' }}>
                      <Phone size={18} className="text-[#22577A] flex-shrink-0" />
                      <span>Hotline: <strong>{store.phone}</strong></span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, color: '#6B6259', fontSize: 13 }}>
                      <Truck size={18} className="text-[#1E7A46] flex-shrink-0 mt-0.5" />
                      <span>Giao hàng: {store.deliveryArea}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div
                    style={{
                      marginTop: 'auto',
                      paddingTop: 18,
                      borderTop: '1px dashed #E8E2D9',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                    }}
                  >
                    {isOpen ? (
                      <Link
                        href={`/menu?storeId=${store.id}`}
                        className="btn-primary"
                        style={{
                          flex: 1,
                          padding: '10px 16px',
                          fontSize: 14,
                          justifyContent: 'center',
                        }}
                      >
                        <ShoppingBag size={16} />
                        <span>Đặt tại quán này</span>
                      </Link>
                    ) : (
                      <button
                        disabled
                        className="btn-primary"
                        style={{
                          flex: 1,
                          padding: '10px 16px',
                          fontSize: 14,
                          justifyContent: 'center',
                          backgroundColor: '#6B6259',
                          opacity: 0.6,
                          cursor: 'not-allowed',
                          border: 'none',
                        }}
                        title="Chi nhánh đang tạm đóng cửa"
                      >
                        <span>Tạm ngưng phục vụ</span>
                      </button>
                    )}

                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(store.address)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-secondary"
                      style={{
                        padding: '10px 16px',
                        fontSize: 14,
                        color: '#16100D',
                        borderColor: '#E8E2D9',
                        backgroundColor: '#FFFFFF',
                      }}
                    >
                      <ExternalLink size={16} />
                      <span>Chỉ đường</span>
                    </a>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
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
              <StoreIcon size={36} />
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
              Không tìm thấy chi nhánh phù hợp
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
              Thử tìm kiếm với tên đường, quận khác hoặc chọn xem tất cả chi nhánh để xem danh sách điểm bán Clucky.
            </p>
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedDistrict('ALL');
              }}
              className="btn-primary"
              style={{ border: 'none', cursor: 'pointer' }}
            >
              Xem tất cả chi nhánh
            </button>
          </div>
        )}
      </main>
      <CustomerFooter />
    </>
  );
}
