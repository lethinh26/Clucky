'use client';

import { useTranslations } from "next-intl";
import { useLocaleTools } from "@/lib/i18n/hooks";
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
import type { Voucher } from '@/lib/types/promotion';
import {
  fetchAvailableVouchers,
  formatVoucherDiscount,
  formatVoucherCondition,
  getVoucherStatus,
} from '@/lib/promotion';
import { catalogApi, promotionApi, getErrorMessage, type StoreItem } from '@/lib/api';
import styles from './vouchers.module.css';

type TabStatus = 'ALL' | 'ACTIVE' | 'UPCOMING' | 'EXPIRED';
type FilterType = 'ALL' | 'AMOUNT' | 'PERCENT' | 'STORE';

export default function VouchersPage() {
  const t = useTranslations();
  const { locale, money: formatPrice } = useLocaleTools();

  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [storeList, setStoreList] = useState<StoreItem[]>([]);
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
      const [voucherData, storesData] = await Promise.all([
        fetchAvailableVouchers(),
        catalogApi.getStores(false).catch(() => [] as StoreItem[]),
      ]);
      setVouchers(voucherData);
      if (Array.isArray(storesData)) {
        setStoreList(storesData);
      }
    } catch {
      setError(t("business.promotionUi.vouchersLoadError"));
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
    showToast(t("business.promotionUi.copiedCode", { code: code }));
  };

  // Quick checker handler via Backend API (/api/promotions/vouchers/validate)
  const handleCheckVoucher = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = checkCode.trim().toUpperCase();
    if (!cleanCode) {
      setCheckResult({
        tested: true,
        valid: false,
        discount: 0,
        reason: t("business.promotionUi.enterCode"),
      });
      return;
    }

    const matched = vouchers.find(
      (v) => v.code.toUpperCase() === cleanCode,
    );

    try {
      const apiRes = await promotionApi.validateVoucher({
        code: cleanCode,
        orderAmount: checkAmount,
        storeId: checkStoreId ? Number(checkStoreId) : null,
      });

      setCheckResult({
        tested: true,
        valid: Boolean(apiRes?.valid),
        discount: Number(apiRes?.discountAmount) || 0,
        reason: apiRes?.reason,
        voucher: matched ?? apiRes?.voucher,
      });
    } catch (err: any) {
      setCheckResult({
        tested: true,
        valid: false,
        discount: 0,
        reason:
          getErrorMessage(err) ||
          t("business.promotionUi.unknownCode", { code: cleanCode }),
      });
    }
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
          {t("business.promotionUi.voucherHero")}
        </h1>
        <p className={styles.heroDesc}>
          {t("business.promotionUi.voucherIntro")}
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
              {t("business.promotionUi.quickCheck")}
            </h2>
            <p className={styles.checkerSub}>
              {t("business.promotionUi.quickCheckBody")}
            </p>
          </div>
        </div>

        <form onSubmit={handleCheckVoucher} className={styles.checkerForm}>
          <div className={styles.inputGroup}>
            <label htmlFor="chk-code" className={styles.inputLabel}>
              {t("business.promotionUi.voucherCode")}
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
              {t("business.promotionUi.orderValue")}
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
              {t("business.promotionUi.applicableStore")}
            </label>
            <select
              id="chk-store"
              value={checkStoreId}
              onChange={(e) => setCheckStoreId(e.target.value)}
              className={styles.inputField}
            >
              <option value="">{t("business.promotionUi.allStores")}</option>
              {storeList.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <button type="submit" className={styles.checkerBtn} aria-label={t("business.promotionUi.checkDiscount")}>
            <Check size={16} aria-hidden="true" />
            {t("business.promotionUi.check")}
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
                    <strong>{t("business.promotionUi.applied")}</strong> {t("business.promotionUi.save")}{' '}
                    <span style={{ fontSize: 16, fontWeight: 800, color: '#15803d' }}>
                      {formatPrice(checkResult.discount)}
                    </span>{' '}
                    {t("business.promotionUi.forOrder")} {formatPrice(checkAmount)}.
                    <div style={{ fontSize: 12, marginTop: 2, color: '#166534' }}>
                      {t("business.promotionUi.remainingTotal")} <strong>{formatPrice(Math.max(0, checkAmount - checkResult.discount))}</strong>
                    </div>
                  </div>
                </div>
                {(checkResult.voucher || checkCode.trim()) && (
                  <button
                    type="button"
                    onClick={() => handleCopyCode(checkResult.voucher?.code || checkCode.trim().toUpperCase())}
                    className={styles.copyCodeBtn}
                    style={{ background: '#ffffff' }}
                  >
                    <Copy size={13} aria-hidden="true" />
                    {t("business.promotionUi.getCode")} {checkResult.voucher?.code || checkCode.trim().toUpperCase()}
                  </button>
                )}
              </div>
            ) : (
              <div className={styles.checkerResultInvalid} role="alert">
                <AlertCircle size={18} color="#dc2626" aria-hidden="true" />
                <span>{checkResult.reason || t("business.promotionUi.ineligible")}</span>
              </div>
            )}
          </div>
        )}
      </section>

      {/* 3. Filter & Search Toolbar */}
      <section className={styles.toolbar} aria-label={t("business.promotionUi.offerFilters")}>
        <div className={styles.searchRow}>
          <div className={styles.searchWrap}>
            <Search size={18} className={styles.searchIcon} aria-hidden="true" />
            <input
              type="text"
              placeholder={t("business.promotionUi.searchPlaceholder")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={styles.searchInput}
              aria-label={t("business.promotionUi.searchVouchers")}
            />
          </div>
        </div>

        {/* Status Tabs */}
        <div className={styles.tabList} role="tablist" aria-label={t("business.promotionUi.voucherStatus")}>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'ALL'}
            onClick={() => setActiveTab('ALL')}
            className={`${styles.tabBtn} ${activeTab === 'ALL' ? styles.tabBtnActive : ''}`}
          >
            {t("business.promotionUi.allCount")}{vouchers.length})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'ACTIVE'}
            onClick={() => setActiveTab('ACTIVE')}
            className={`${styles.tabBtn} ${activeTab === 'ACTIVE' ? styles.tabBtnActive : ''}`}
          >
            {t("business.promotionUi.availableCount")}{activeCount})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'UPCOMING'}
            onClick={() => setActiveTab('UPCOMING')}
            className={`${styles.tabBtn} ${activeTab === 'UPCOMING' ? styles.tabBtnActive : ''}`}
          >
            {t("business.promotionUi.upcoming")}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'EXPIRED'}
            onClick={() => setActiveTab('EXPIRED')}
            className={`${styles.tabBtn} ${activeTab === 'EXPIRED' ? styles.tabBtnActive : ''}`}
          >
            {t("business.promotionUi.expiredExhausted")}
          </button>
        </div>

        {/* Type Filter Chips */}
        <div className={styles.chipGroup} aria-label={t("business.promotionUi.offerType")}>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#75675e' }}>{t("business.promotionUi.filterType")}</span>
          <button
            type="button"
            onClick={() => setFilterType('ALL')}
            className={`${styles.chipBtn} ${filterType === 'ALL' ? styles.chipBtnActive : ''}`}
          >
            {t("business.promotionUi.all")}
          </button>
          <button
            type="button"
            onClick={() => setFilterType('AMOUNT')}
            className={`${styles.chipBtn} ${filterType === 'AMOUNT' ? styles.chipBtnActive : ''}`}
          >
            {t("business.promotionUi.amountOff")}
          </button>
          <button
            type="button"
            onClick={() => setFilterType('PERCENT')}
            className={`${styles.chipBtn} ${filterType === 'PERCENT' ? styles.chipBtnActive : ''}`}
          >
            {t("business.promotionUi.percentOff")}
          </button>
          <button
            type="button"
            onClick={() => setFilterType('STORE')}
            className={`${styles.chipBtn} ${filterType === 'STORE' ? styles.chipBtnActive : ''}`}
          >
            {t("business.promotionUi.storeOffers")}
          </button>
        </div>
      </section>

      {/* 4. Voucher Grid / List */}
      {loading ? (
        <div className={styles.grid} aria-busy="true" aria-label={t("business.promotionUi.loadingVouchers")}>
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
          <h3 className={styles.emptyTitle}>{t("business.promotionUi.errorTitle")}</h3>
          <p className={styles.emptyDesc}>{error}</p>
          <button type="button" onClick={loadVouchers} className={styles.resetBtn}>
            <RotateCcw size={14} style={{ display: 'inline', marginRight: 6 }} aria-hidden="true" />
            {t("business.promotionUi.reload")}
          </button>
        </div>
      ) : filteredVouchers.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>
            <Tag size={28} aria-hidden="true" />
          </div>
          <h3 className={styles.emptyTitle}>{t("business.promotionUi.noVouchers")}</h3>
          <p className={styles.emptyDesc}>
            {t("business.promotionUi.noVouchersBody")}
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
            {t("business.promotionUi.resetFilters")}
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
              voucher.maxDiscount,
              locale
            );
            const conditionLabel = formatVoucherCondition(
              voucher.minOrderAmount,
              voucher.maxDiscount,
              voucher.type,
              locale
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
                  <h3 className={styles.ticketTitle}>{voucher.title || t("business.promotionUi.offerName", { code: voucher.code })}</h3>
                  <p className={styles.ticketDesc}>
                    {voucher.description || t("business.promotionUi.onlineCustomers")}
                  </p>

                  <div className={styles.ticketMetaRow}>
                    <span className={styles.ticketMetaItem}>
                      <Clock size={13} aria-hidden="true" />
                      <span>HSD: {formatDate(voucher.endAt)}</span>
                    </span>

                    {voucher.scope === 'STORE' ? (
                      <span className={styles.ticketMetaItem} style={{ color: '#0369a1' }}>
                        <StoreIcon size={13} aria-hidden="true" />
                        <span>{voucher.storeName || storeList.find((s) => s.id === Number(voucher.storeId))?.name || t("business.promotionUi.selectedStores")}</span>
                      </span>
                    ) : (
                      <span className={styles.ticketMetaItem} style={{ color: '#15803d' }}>
                        <StoreIcon size={13} aria-hidden="true" />
                        <span>{t("business.promotionUi.allClucky")}</span>
                      </span>
                    )}
                  </div>

                  {/* Usage progress bar if total limit exists */}
                  {hasLimit && (
                    <div className={styles.usageProgressWrap}>
                      <div className={styles.usageLabelRow}>
                        <span>{t("business.promotionUi.used")}</span>
                        <span>
                          {voucher.usedCount}/{voucher.totalLimit} {t("business.promotionUi.uses")}{usedRatio}%)
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
                    title={t("business.promotionUi.clickCopy")}
                    aria-label={t("business.promotionUi.copyCode", { code: voucher.code })}
                  >
                    <span>{voucher.code}</span>
                    <Copy size={13} aria-hidden="true" />
                  </button>

                  {isUsable ? (
                    <Link
                      href="/menu"
                      onClick={() => handleCopyCode(voucher.code)}
                      className={styles.applyNowBtn}
                      aria-label={t("business.promotionUi.orderWithCode", { code: voucher.code })}
                    >
                      <span>{t("business.promotionUi.useNow")}</span>
                      <ArrowRight size={14} aria-hidden="true" />
                    </Link>
                  ) : (
                    <button
                      type="button"
                      disabled
                      className={styles.applyNowBtn}
                      style={{ background: '#d1d5db', cursor: 'not-allowed' }}
                    >
                      {status === 'UPCOMING' ? t("business.promotionUi.notStarted") : t("business.promotionUi.noLongerValid")}
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
          {t("business.promotionUi.voucherRules")}
        </h2>
        <div className={styles.guideGrid}>
          <div className={styles.guideItem}>
            <h3 className={styles.guideItemTitle}>{t("business.promotionUi.useCodeTitle")}</h3>
            <p className={styles.guideItemDesc}>
              {t("business.promotionUi.useCodeStart")} <strong>{t("business.promotionUi.checkout")}</strong> {t("business.promotionUi.useCodeEnd")}
            </p>
          </div>

          <div className={styles.guideItem}>
            <h3 className={styles.guideItemTitle}>{t("business.promotionUi.combineTitle")}</h3>
            <p className={styles.guideItemDesc}>
              {t("business.promotionUi.combineStart")} <strong>{t("business.promotionUi.oneVoucher")}</strong> {t("business.promotionUi.combineEnd")}
            </p>
          </div>

          <div className={styles.guideItem}>
            <h3 className={styles.guideItemTitle}>{t("business.promotionUi.validityTitle")}</h3>
            <p className={styles.guideItemDesc}>
              {t("business.promotionUi.validityBody")}
            </p>
          </div>

          <div className={styles.guideItem}>
            <h3 className={styles.guideItemTitle}>{t("business.promotionUi.scopeTitle")}</h3>
            <p className={styles.guideItemDesc}>
              {t("business.promotionUi.scopeBody")}
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
