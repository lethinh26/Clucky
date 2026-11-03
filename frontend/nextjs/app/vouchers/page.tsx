'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Tag,
  Copy,
  Check,
  Search,
  Sparkles,
  ArrowRight,
  Clock,
  Store as StoreIcon,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  RotateCcw,
  Zap,
} from 'lucide-react';
import Link from '@/components/ui-loader/navigation-link';
import { useNavigationTask } from '@/components/ui-loader';
import { VoucherBadge } from '@/components/promotion/voucher-badge';
import type { Voucher, VoucherStatus, VoucherType, VoucherScope } from '@/lib/types/promotion';
import {
  fetchAvailableVouchers,
  validateVoucherForOrder,
  formatVoucherDiscount,
  formatVoucherCondition,
  getVoucherStatus,
} from '@/lib/promotion';
import { formatPrice, stores } from '@/lib/products';
import styles from './vouchers.module.css';

type TabStatus = 'ALL' | 'ACTIVE' | 'UPCOMING' | 'EXPIRED';
type FilterType = 'ALL' | 'AMOUNT' | 'PERCENT' | 'STORE';

export default function VouchersPage() {
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Search
  const [activeTab, setActiveTab] = useState<TabStatus>('ALL');
  const [filterType, setFilterType] = useState<FilterType>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Quick Voucher Checker state
  const [checkCode, setCheckCode] = useState('');
  const [checkAmount, setCheckAmount] = useState<number>(150000);
  const [checkStoreId, setCheckStoreId] = useState<string>('');
  const [checkResult, setCheckResult] = useState<{
    tested: boolean;
    valid: boolean;
    discount: number;
    reason?: string;
    voucher?: Voucher;
  } | null>(null);

  // Copy toast state
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useNavigationTask(loading);

  const loadVouchers = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAvailableVouchers();
      setVouchers(data);
    } catch {
      setError('Không thể tải danh sách ưu đãi. Vui lòng thử lại sau.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVouchers();
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  const showToast = (message: string) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToastMessage(message);
    toastTimerRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 2500);
  };

  const handleCopyCode = (code: string) => {
    if (!code) return;
    navigator.clipboard?.writeText(code).catch(() => {});
    showToast(`Đã sao chép mã ưu đãi "${code}"!`);
  };

  // Quick checker handler
  const handleCheckVoucher = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = checkCode.trim().toUpperCase();
    if (!cleanCode) {
      setCheckResult({
        tested: true,
        valid: false,
        discount: 0,
        reason: 'Vui lòng nhập mã voucher để kiểm tra.',
      });
      return;
    }

    const matched = vouchers.find(
      (v) => v.code.toUpperCase() === cleanCode
    );

    if (!matched) {
      setCheckResult({
        tested: true,
        valid: false,
        discount: 0,
        reason: `Mã "${cleanCode}" không tồn tại trong hệ thống ưu đãi của Clucky.`,
      });
      return;
    }

    const validation = validateVoucherForOrder(
      matched,
      checkAmount,
      checkStoreId ? Number(checkStoreId) : null
    );

    setCheckResult({
      tested: true,
      valid: validation.valid,
      discount: validation.discountAmount,
      reason: validation.reason,
      voucher: matched,
    });
  };

  // Filter vouchers
  const filteredVouchers = useMemo(() => {
    return vouchers.filter((v) => {
      const status = getVoucherStatus(v);

      // Search match
      if (searchQuery.trim()) {
        const query = searchQuery.trim().toLowerCase();
        const codeMatch = v.code.toLowerCase().includes(query);
        const titleMatch = (v.title || '').toLowerCase().includes(query);
        const descMatch = (v.description || '').toLowerCase().includes(query);
        if (!codeMatch && !titleMatch && !descMatch) return false;
      }

      // Tab match
      if (activeTab === 'ACTIVE' && status !== 'ACTIVE') return false;
      if (activeTab === 'UPCOMING' && status !== 'UPCOMING') return false;
      if (activeTab === 'EXPIRED' && status !== 'EXPIRED' && status !== 'EXHAUSTED') return false;

      // Filter type match
      if (filterType === 'AMOUNT' && v.type !== 'AMOUNT') return false;
      if (filterType === 'PERCENT' && v.type !== 'PERCENT') return false;
      if (filterType === 'STORE' && v.scope !== 'STORE') return false;

      return true;
    });
  }, [vouchers, activeTab, filterType, searchQuery]);

  const activeCount = useMemo(() => {
    return vouchers.filter((v) => getVoucherStatus(v) === 'ACTIVE').length;
  }, [vouchers]);

  return (
    <div className={styles.container}>
      {/* 1. Hero Banner */}
      <section className={styles.hero} aria-labelledby="voucher-hero-heading">
        <div className={styles.heroTag}>
          <Sparkles size={13} aria-hidden="true" />
          <span>Clucky Promotions</span>
        </div>
        <h1 id="voucher-hero-heading" className={styles.heroTitle}>
          Kho Voucher & Ưu Đãi Nóng Hổi
        </h1>
        <p className={styles.heroDesc}>
          Săn voucher thả ga, ăn gà cực đã! Thu thập mã giảm giá cho đơn hàng giao tận nơi
          hoặc nhận tại chi nhánh Clucky gần nhất.
        </p>
      </section>

      {/* 2. Quick Voucher Checker & Simulator */}
      <section className={styles.checkerCard} aria-labelledby="voucher-checker-title">
        <div className={styles.checkerHeader}>
          <div className={styles.checkerIconWrap}>
            <Zap size={20} aria-hidden="true" />
          </div>
          <div>
            <h2 id="voucher-checker-title" className={styles.checkerTitle}>
              Kiểm Tra Nhanh Mã Ưu Đãi
            </h2>
            <p className={styles.checkerSub}>
              Nhập mã và giá trị đơn dự kiến để mô phỏng mức chiết khấu tức thì trước khi đặt món.
            </p>
          </div>
        </div>

        <form onSubmit={handleCheckVoucher} className={styles.checkerForm}>
          <div className={styles.inputGroup}>
            <label htmlFor="chk-code" className={styles.inputLabel}>
              Mã voucher
            </label>
            <input
              id="chk-code"
              type="text"
              placeholder="VD: CLUCKYGIAM20"
              value={checkCode}
              onChange={(e) => setCheckCode(e.target.value.toUpperCase())}
              className={styles.inputField}
            />
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="chk-amount" className={styles.inputLabel}>
              Giá trị đơn hàng (VNĐ)
            </label>
            <input
              id="chk-amount"
              type="number"
              min={0}
              step={10000}
              value={checkAmount}
              onChange={(e) => setCheckAmount(Number(e.target.value))}
              className={styles.inputField}
            />
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="chk-store" className={styles.inputLabel}>
              Chi nhánh áp dụng
            </label>
            <select
              id="chk-store"
              value={checkStoreId}
              onChange={(e) => setCheckStoreId(e.target.value)}
              className={styles.inputField}
            >
              <option value="">Tất cả chi nhánh</option>
              {stores.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <button type="submit" className={styles.checkerBtn} aria-label="Kiểm tra mức giảm voucher">
            <Check size={16} aria-hidden="true" />
            Kiểm tra
          </button>
        </form>

        {/* Checker Results */}
        {checkResult && checkResult.tested && (
          <div>
            {checkResult.valid ? (
              <div className={styles.checkerResultValid} role="status">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <CheckCircle2 size={20} color="#16a34a" aria-hidden="true" />
                  <div>
                    <strong>Áp dụng thành công!</strong> Tiết kiệm{' '}
                    <span style={{ fontSize: 16, fontWeight: 800, color: '#15803d' }}>
                      {formatPrice(checkResult.discount)}
                    </span>{' '}
                    cho đơn {formatPrice(checkAmount)}.
                    <div style={{ fontSize: 12, marginTop: 2, color: '#166534' }}>
                      Tổng thanh toán còn lại: <strong>{formatPrice(Math.max(0, checkAmount - checkResult.discount))}</strong>
                    </div>
                  </div>
                </div>
                {checkResult.voucher && (
                  <button
                    type="button"
                    onClick={() => handleCopyCode(checkResult.voucher!.code)}
                    className={styles.copyCodeBtn}
                    style={{ background: '#ffffff' }}
                  >
                    <Copy size={13} aria-hidden="true" />
                    Lấy mã {checkResult.voucher.code}
                  </button>
                )}
              </div>
            ) : (
              <div className={styles.checkerResultInvalid} role="alert">
                <AlertCircle size={18} color="#dc2626" aria-hidden="true" />
                <span>{checkResult.reason || 'Mã ưu đãi không đủ điều kiện áp dụng.'}</span>
              </div>
            )}
          </div>
        )}
      </section>

      {/* 3. Filter & Search Toolbar */}
      <section className={styles.toolbar} aria-label="Bộ lọc ưu đãi">
        <div className={styles.searchRow}>
          <div className={styles.searchWrap}>
            <Search size={18} className={styles.searchIcon} aria-hidden="true" />
            <input
              type="text"
              placeholder="Tìm kiếm mã voucher, tên chương trình khuyến mãi..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={styles.searchInput}
              aria-label="Tìm kiếm voucher"
            />
          </div>
        </div>

        {/* Status Tabs */}
        <div className={styles.tabList} role="tablist" aria-label="Trạng thái voucher">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'ALL'}
            onClick={() => setActiveTab('ALL')}
            className={`${styles.tabBtn} ${activeTab === 'ALL' ? styles.tabBtnActive : ''}`}
          >
            Tất cả ({vouchers.length})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'ACTIVE'}
            onClick={() => setActiveTab('ACTIVE')}
            className={`${styles.tabBtn} ${activeTab === 'ACTIVE' ? styles.tabBtnActive : ''}`}
          >
            Đang khả dụng ({activeCount})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'UPCOMING'}
            onClick={() => setActiveTab('UPCOMING')}
            className={`${styles.tabBtn} ${activeTab === 'UPCOMING' ? styles.tabBtnActive : ''}`}
          >
            Sắp diễn ra
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'EXPIRED'}
            onClick={() => setActiveTab('EXPIRED')}
            className={`${styles.tabBtn} ${activeTab === 'EXPIRED' ? styles.tabBtnActive : ''}`}
          >
            Đã hết hạn / Hết lượt
          </button>
        </div>

        {/* Type Filter Chips */}
        <div className={styles.chipGroup} aria-label="Loại ưu đãi">
          <span style={{ fontSize: 12, fontWeight: 700, color: '#75675e' }}>Lọc loại:</span>
          <button
            type="button"
            onClick={() => setFilterType('ALL')}
            className={`${styles.chipBtn} ${filterType === 'ALL' ? styles.chipBtnActive : ''}`}
          >
            Tất cả
          </button>
          <button
            type="button"
            onClick={() => setFilterType('AMOUNT')}
            className={`${styles.chipBtn} ${filterType === 'AMOUNT' ? styles.chipBtnActive : ''}`}
          >
            Giảm tiền mặt
          </button>
          <button
            type="button"
            onClick={() => setFilterType('PERCENT')}
            className={`${styles.chipBtn} ${filterType === 'PERCENT' ? styles.chipBtnActive : ''}`}
          >
            Giảm % hóa đơn
          </button>
          <button
            type="button"
            onClick={() => setFilterType('STORE')}
            className={`${styles.chipBtn} ${filterType === 'STORE' ? styles.chipBtnActive : ''}`}
          >
            Theo chi nhánh
          </button>
        </div>
      </section>

      {/* 4. Voucher Grid / List */}
      {loading ? (
        <div className={styles.grid} aria-busy="true" aria-label="Đang tải danh sách voucher">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className={styles.ticketCard}
              style={{ minHeight: 220, padding: 20 }}
            >
              <div style={{ height: 28, background: '#f5ede0', borderRadius: 8, marginBottom: 12 }} />
              <div style={{ height: 16, width: '70%', background: '#f5ede0', borderRadius: 6, marginBottom: 10 }} />
              <div style={{ height: 40, background: '#f5ede0', borderRadius: 8, marginTop: 'auto' }} />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className={styles.emptyState} role="alert">
          <div className={styles.emptyIcon} style={{ background: '#fee2e2', color: '#dc2626' }}>
            <AlertCircle size={28} aria-hidden="true" />
          </div>
          <h3 className={styles.emptyTitle}>Đã xảy ra lỗi</h3>
          <p className={styles.emptyDesc}>{error}</p>
          <button type="button" onClick={loadVouchers} className={styles.resetBtn}>
            <RotateCcw size={14} style={{ display: 'inline', marginRight: 6 }} aria-hidden="true" />
            Thử tải lại
          </button>
        </div>
      ) : filteredVouchers.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>
            <Tag size={28} aria-hidden="true" />
          </div>
          <h3 className={styles.emptyTitle}>Không tìm thấy voucher phù hợp</h3>
          <p className={styles.emptyDesc}>
            Không có mã ưu đãi nào khớp với tiêu chí tìm kiếm hoặc bộ lọc hiện tại của bạn.
          </p>
          <button
            type="button"
            onClick={() => {
              setActiveTab('ALL');
              setFilterType('ALL');
              setSearchQuery('');
            }}
            className={styles.resetBtn}
          >
            Đặt lại bộ lọc
          </button>
        </div>
      ) : (
        <div className={styles.grid}>
          {filteredVouchers.map((voucher) => {
            const status = getVoucherStatus(voucher);
            const isUsable = status === 'ACTIVE';
            const discountLabel = formatVoucherDiscount(
              voucher.type,
              voucher.value,
              voucher.maxDiscount
            );
            const conditionLabel = formatVoucherCondition(
              voucher.minOrderAmount,
              voucher.maxDiscount,
              voucher.type
            );

            const hasLimit = typeof voucher.totalLimit === 'number' && voucher.totalLimit > 0;
            const usedRatio = hasLimit
              ? Math.min(100, Math.round(((voucher.usedCount || 0) / voucher.totalLimit!) * 100))
              : 0;

            const formatDate = (iso: string) => {
              try {
                const d = new Date(iso);
                return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
              } catch {
                return iso;
              }
            };

            return (
              <article
                key={voucher.id}
                className={`${styles.ticketCard} ${!isUsable ? styles.ticketCardDisabled : ''}`}
                aria-label={`Voucher ${voucher.code}: ${discountLabel}`}
              >
                {/* Top bar with discount value & status badge */}
                <div className={styles.ticketTopBar}>
                  <div className={styles.ticketValueCol}>
                    <span className={styles.ticketAmount}>{discountLabel}</span>
                    <span className={styles.ticketMaxDiscount}>{conditionLabel}</span>
                  </div>

                  <VoucherBadge voucher={voucher} variant="compact" />
                </div>

                {/* Ticket Body */}
                <div className={styles.ticketBody}>
                  <h3 className={styles.ticketTitle}>{voucher.title || `Ưu đãi ${voucher.code}`}</h3>
                  <p className={styles.ticketDesc}>
                    {voucher.description || 'Áp dụng cho khách hàng đặt món online tại Clucky.'}
                  </p>

                  <div className={styles.ticketMetaRow}>
                    <span className={styles.ticketMetaItem}>
                      <Clock size={13} aria-hidden="true" />
                      <span>HSD: {formatDate(voucher.endAt)}</span>
                    </span>

                    {voucher.scope === 'STORE' ? (
                      <span className={styles.ticketMetaItem} style={{ color: '#0369a1' }}>
                        <StoreIcon size={13} aria-hidden="true" />
                        <span>{voucher.storeName || 'Chi nhánh chọn lọc'}</span>
                      </span>
                    ) : (
                      <span className={styles.ticketMetaItem} style={{ color: '#15803d' }}>
                        <StoreIcon size={13} aria-hidden="true" />
                        <span>Toàn chuỗi Clucky</span>
                      </span>
                    )}
                  </div>

                  {/* Usage progress bar if total limit exists */}
                  {hasLimit && (
                    <div className={styles.usageProgressWrap}>
                      <div className={styles.usageLabelRow}>
                        <span>Đã sử dụng</span>
                        <span>
                          {voucher.usedCount}/{voucher.totalLimit} lượt ({usedRatio}%)
                        </span>
                      </div>
                      <div className={styles.usageProgressBar}>
                        <div
                          className={styles.usageProgressFill}
                          style={{
                            width: `${usedRatio}%`,
                            background: usedRatio > 80 ? '#dc2626' : '#d97706',
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Ticket Footer Actions */}
                <div className={styles.ticketFooter}>
                  <button
                    type="button"
                    onClick={() => handleCopyCode(voucher.code)}
                    className={styles.copyCodeBtn}
                    title="Nhấn để sao chép mã"
                    aria-label={`Sao chép mã ${voucher.code}`}
                  >
                    <span>{voucher.code}</span>
                    <Copy size={13} aria-hidden="true" />
                  </button>

                  {isUsable ? (
                    <Link
                      href="/menu"
                      onClick={() => handleCopyCode(voucher.code)}
                      className={styles.applyNowBtn}
                      aria-label={`Đặt món ngay với mã ${voucher.code}`}
                    >
                      <span>Dùng ngay</span>
                      <ArrowRight size={14} aria-hidden="true" />
                    </Link>
                  ) : (
                    <button
                      type="button"
                      disabled
                      className={styles.applyNowBtn}
                      style={{ background: '#d1d5db', cursor: 'not-allowed' }}
                    >
                      {status === 'UPCOMING' ? 'Chưa bắt đầu' : 'Hết hiệu lực'}
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* 5. FAQ / Promotion Policy Guide */}
      <section className={styles.guideSection} aria-labelledby="voucher-faq-title">
        <h2 id="voucher-faq-title" className={styles.guideTitle}>
          <HelpCircle size={22} color="#8f1216" aria-hidden="true" />
          Quy Định & Hướng Dẫn Sử Dụng Voucher Clucky
        </h2>
        <div className={styles.guideGrid}>
          <div className={styles.guideItem}>
            <h3 className={styles.guideItemTitle}>1. Cách dùng mã ưu đãi</h3>
            <p className={styles.guideItemDesc}>
              Sao chép mã voucher bạn muốn sử dụng, chuyển đến bước <strong>Thanh toán (Checkout)</strong> và dán mã
              vào ô &ldquo;Mã ưu đãi&rdquo; rồi bấm &ldquo;Áp dụng&rdquo;.
            </p>
          </div>

          <div className={styles.guideItem}>
            <h3 className={styles.guideItemTitle}>2. Điều kiện kết hợp</h3>
            <p className={styles.guideItemDesc}>
              Mỗi đơn hàng được áp dụng <strong>tối đa 01 mã voucher</strong> kết hợp cùng điểm thưởng Clucky Club
              (nếu có). Voucher không quy đổi thành tiền mặt.
            </p>
          </div>

          <div className={styles.guideItem}>
            <h3 className={styles.guideItemTitle}>3. Thời hạn & Số lượt</h3>
            <p className={styles.guideItemDesc}>
              Mỗi voucher có thời gian hiệu lực và số lượng giới hạn theo từng chương trình. Hãy nhanh tay sử dụng
              trước khi voucher đạt giới hạn lượt dùng!
            </p>
          </div>

          <div className={styles.guideItem}>
            <h3 className={styles.guideItemTitle}>4. Phạm vi áp dụng</h3>
            <p className={styles.guideItemDesc}>
              Voucher &ldquo;Toàn chuỗi&rdquo; có hiệu lực tại mọi cửa hàng Clucky. Voucher &ldquo;Chi nhánh&rdquo; chỉ
              áp dụng cho đơn hàng giao hoặc nhận tại cửa hàng được chỉ định.
            </p>
          </div>
        </div>
      </section>

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className={styles.toast} role="status" aria-live="polite">
          <Check size={16} color="#10b981" aria-hidden="true" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}

