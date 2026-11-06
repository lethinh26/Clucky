'use client';

import { useTranslations } from "next-intl";
import { useLocaleTools } from "@/lib/i18n/hooks";
import React, { useState, useEffect, useMemo } from 'react';
import {
  Crown,
  Award,
  Star,
  Sparkles,
  Gift,
  LogIn,
  ArrowRight,
  RotateCcw,
  CheckCircle2,
  Calculator,
  History,
  PlusCircle,
  MinusCircle,
  Clock,
  ShieldCheck,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';
import Link from '@/components/ui-loader/navigation-link';
import { useNavigationTask } from '@/components/ui-loader';
import type { MemberPoints, PointTransaction, LoyaltyTier, PointTransactionType } from '@/lib/types/promotion';
import {
  fetchMyLoyalty,
  calculateTierProgress,
  calculateEarnPoints,
  calculatePointsDiscount,
  getLoyaltyTierConfig,
} from '@/lib/promotion';
import styles from './loyalty.module.css';

const TIER_ICONS: Record<LoyaltyTier, React.ReactNode> = {
  MEMBER: <Star size={16} aria-hidden="true" />,
  SILVER: <Award size={16} aria-hidden="true" />,
  GOLD: <Crown size={16} aria-hidden="true" />,
};

const TIER_BADGE_CLASS: Record<LoyaltyTier, string> = {
  MEMBER: styles.tierBadgeMember,
  SILVER: styles.tierBadgeSilver,
  GOLD: styles.tierBadgeGold,
};

type TxFilter = 'ALL' | 'EARN' | 'REDEEM' | 'ADJUST';

export default function LoyaltyPage() {
  const t = useTranslations();
  const { locale, money: formatPrice } = useLocaleTools();
  const LOYALTY_TIER_CONFIG = getLoyaltyTierConfig(locale);


  const [memberPoints, setMemberPoints] = useState<MemberPoints | null>(null);
  const [transactions, setTransactions] = useState<PointTransaction[]>([]);
  const [isGuest, setIsGuest] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Transactions filter
  const [txFilter, setTxFilter] = useState<TxFilter>('ALL');

  // Calculator state
  const [calcSpend, setCalcSpend] = useState<number>(250000);

  useNavigationTask(loading);

  const loadLoyaltyData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchMyLoyalty();
      setMemberPoints(data.points);
      setTransactions(data.transactions);
      setIsGuest(data.isGuest);
    } catch {
      setError(t("business.promotionUi.loyaltyLoadError"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLoyaltyData();
  }, []);

  // Calculate current tier progress
  const currentPoints = memberPoints?.totalPoints ?? 0;
  const progressData = useMemo(() => {
    return calculateTierProgress(currentPoints, locale);
  }, [currentPoints, locale]);

  const currentTier = progressData.tier;
  const currentTierInfo = LOYALTY_TIER_CONFIG[currentTier];

  // Calculator outputs
  const estimatedEarn = useMemo(() => {
    return calculateEarnPoints(calcSpend);
  }, [calcSpend]);

  const estimatedRedeemValue = useMemo(() => {
    return calculatePointsDiscount(estimatedEarn);
  }, [estimatedEarn]);

  const tierDiscountPercent = currentTierInfo.discountPercent;
  const estimatedTierDiscount = useMemo(() => {
    return Math.round((calcSpend * tierDiscountPercent) / 100);
  }, [calcSpend, tierDiscountPercent]);

  // Filtered transactions
  const filteredTransactions = useMemo(() => {
    if (txFilter === 'ALL') return transactions;
    return transactions.filter((t) => t.type === txFilter);
  }, [transactions, txFilter]);

  const formatTxTime = (iso: string) => {
    try {
      const d = new Date(iso);
      const hours = String(d.getHours()).padStart(2, '0');
      const mins = String(d.getMinutes()).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${hours}:${mins} — ${day}/${month}/${year}`;
    } catch {
      return iso;
    }
  };

  const scrollToHistory = () => {
    const el = document.getElementById('loyalty-history-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className={styles.container}>
      {/* 1. Hero Banner */}
      <section className={styles.hero} aria-labelledby="loyalty-hero-heading">
        <div className={styles.heroTag}>
          <Sparkles size={13} aria-hidden="true" />
          <span>Clucky Club</span>
        </div>
        <h1 id="loyalty-hero-heading" className={styles.heroTitle}>
          {t("business.promotionUi.loyaltyHero")}
        </h1>
        <p className={styles.heroDesc}>
          {t("business.promotionUi.loyaltyIntro")}
        </p>
      </section>

      {/* 2. Guest Banner OR Member Overview Card */}
      {isGuest ? (
        <section className={styles.guestBanner} aria-label={t("business.promotionUi.signInRewards")}>
          <div className={styles.guestLeft}>
            <div className={styles.guestIconWrap}>
              <Gift size={26} aria-hidden="true" />
            </div>
            <div>
              <h2 className={styles.guestTitle}>{t("business.promotionUi.joinClub")}</h2>
              <p className={styles.guestDesc}>
                {t("business.promotionUi.welcomeStart")}{' '}
                <strong>{t("business.promotionUi.welcomePoints")}</strong> {t("business.promotionUi.welcomeEnd")}
              </p>
            </div>
          </div>
          <div className={styles.guestActions}>
            <Link href="/login" className={styles.loginBtn}>
              <LogIn size={15} aria-hidden="true" />
              <span>{t("business.promotionUi.signIn")}</span>
            </Link>
            <Link href="/register" className={styles.registerBtn}>
              <span>{t("business.promotionUi.register")}</span>
            </Link>
          </div>
        </section>
      ) : (
        <section className={styles.statusCard} aria-labelledby="loyalty-status-title">
          <div className={styles.statusHeader}>
            <div className={styles.pointsBigWrap}>
              <span className={styles.pointsLabel}>{t("business.promotionUi.cluckyBalance")}</span>
              <div className={styles.pointsBigVal}>
                {currentPoints.toLocaleString((locale === 'en' ? 'en-US' : 'vi-VN'))}
                <span className={styles.pointsUnit}>{t("business.promotionUi.points")}</span>
              </div>
              <div className={styles.equivalentVal}>
                <CheckCircle2 size={14} aria-hidden="true" />
                <span>
                  {t("business.promotionUi.equivalent")} <strong>{formatPrice(calculatePointsDiscount(currentPoints))}</strong> {t("business.promotionUi.checkoutDiscount")}
                </span>
              </div>
            </div>

            <div className={`${styles.tierBadgeHero} ${TIER_BADGE_CLASS[currentTier]}`}>
              {TIER_ICONS[currentTier]}
              <span>{currentTierInfo.label}</span>
            </div>
          </div>

          {/* Tier Progress Bar */}
          <div className={styles.progressSection}>
            <div className={styles.progressLabelRow}>
              <span>{t("business.promotionUi.tierProgress")}</span>
              <span>
                {progressData.isMaxTier
                  ? t("business.promotionUi.maxTierReached")
                  : t("business.promotionUi.tierRemaining", { points: progressData.pointsToNextTier.toLocaleString(
                      (locale === 'en' ? 'en-US' : 'vi-VN')
                    ), tier: LOYALTY_TIER_CONFIG[progressData.nextTier!].label })}
              </span>
            </div>
            <div
              className={styles.progressTrack}
              role="progressbar"
              aria-valuenow={progressData.progressPercent}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div
                className={styles.progressFill}
                style={{ width: `${progressData.progressPercent}%` }}
              />
            </div>
          </div>

          <div className={styles.statusBarFooter}>
            <div style={{ fontSize: 13, color: '#75675e' }}>
              {t("business.promotionUi.conversion")} <strong>{t("business.promotionUi.earnRate")}</strong> • <strong>{t("business.promotionUi.redeemRate")}</strong> {t("business.promotionUi.deduction")}
            </div>
            <div className={styles.statusActions}>
              <button
                type="button"
                onClick={scrollToHistory}
                className={styles.historyJumpBtn}
                aria-label={t("business.promotionUi.viewHistory")}
              >
                <History size={14} aria-hidden="true" />
                <span>{t("business.promotionUi.history")}</span>
              </button>
              <Link href="/menu" className={styles.orderNowBtn} aria-label={t("business.promotionUi.orderToEarn")}>
                <span>{t("business.promotionUi.earnWithOrder")}</span>
                <ArrowRight size={14} aria-hidden="true" />
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* 3. Tier Comparison Cards */}
      <section aria-labelledby="tier-comparison-title" style={{ marginBottom: 48 }}>
        <div className={styles.sectionTitleRow}>
          <h2 id="tier-comparison-title" className={styles.sectionTitle}>
            {t("business.promotionUi.tierBenefitsTitle")}
          </h2>
          <p className={styles.sectionSub}>
            {t("business.promotionUi.tierBenefitsIntro")}
          </p>
        </div>

        <div className={styles.tierGrid}>
          {/* Member Tier */}
          <div
            className={`${styles.tierCard} ${
              currentTier === 'MEMBER' && !isGuest ? styles.tierCardCurrent : ''
            }`}
          >
            {currentTier === 'MEMBER' && !isGuest && (
              <span className={styles.currentBadge}>{t("business.promotionUi.currentTier")}</span>
            )}
            <div className={styles.tierHeader}>
              <h3 className={styles.tierTitle}>{t("business.promotionUi.memberLabel")}</h3>
              <span className={`${styles.tierBadgeHero} ${styles.tierBadgeMember}`}>
                <Star size={13} aria-hidden="true" />
                Member
              </span>
            </div>
            <div className={styles.tierPointsReq}>{t("business.promotionUi.memberRange")}</div>
            <div className={styles.tierDiscountCallout}>{t("business.promotionUi.memberEarn")}</div>
            <ul className={styles.tierBenefitsList}>
              {LOYALTY_TIER_CONFIG.MEMBER.benefits.map((b, i) => (
                <li key={i} className={styles.tierBenefitItem}>
                  <CheckCircle2 size={15} className={styles.tierCheckIcon} aria-hidden="true" />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Silver Tier */}
          <div
            className={`${styles.tierCard} ${
              currentTier === 'SILVER' && !isGuest ? styles.tierCardCurrent : ''
            }`}
          >
            {currentTier === 'SILVER' && !isGuest && (
              <span className={styles.currentBadge}>{t("business.promotionUi.currentTier")}</span>
            )}
            <div className={styles.tierHeader}>
              <h3 className={styles.tierTitle}>{t("business.promotionUi.silverLabel")}</h3>
              <span className={`${styles.tierBadgeHero} ${styles.tierBadgeSilver}`}>
                <Award size={13} aria-hidden="true" />
                Silver
              </span>
            </div>
            <div className={styles.tierPointsReq}>{t("business.promotionUi.silverRange")}</div>
            <div
              className={styles.tierDiscountCallout}
              style={{ color: '#0369a1', borderColor: '#bae6fd', background: '#f0f9ff' }}
            >
              {t("business.promotionUi.silverDiscount")}
            </div>
            <ul className={styles.tierBenefitsList}>
              {LOYALTY_TIER_CONFIG.SILVER.benefits.map((b, i) => (
                <li key={i} className={styles.tierBenefitItem}>
                  <CheckCircle2 size={15} className={styles.tierCheckIcon} aria-hidden="true" />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Gold Tier */}
          <div
            className={`${styles.tierCard} ${
              currentTier === 'GOLD' && !isGuest ? styles.tierCardCurrent : ''
            }`}
          >
            {currentTier === 'GOLD' && !isGuest && (
              <span className={styles.currentBadge}>{t("business.promotionUi.currentTier")}</span>
            )}
            <div className={styles.tierHeader}>
              <h3 className={styles.tierTitle}>{t("business.promotionUi.goldLabel")}</h3>
              <span className={`${styles.tierBadgeHero} ${styles.tierBadgeGold}`}>
                <Crown size={13} aria-hidden="true" />
                Gold VIP
              </span>
            </div>
            <div className={styles.tierPointsReq}>{t("business.promotionUi.goldRange")}</div>
            <div
              className={styles.tierDiscountCallout}
              style={{ color: '#b45309', borderColor: '#fde68a', background: '#fffbeb' }}
            >
              {t("business.promotionUi.goldDiscount")}
            </div>
            <ul className={styles.tierBenefitsList}>
              {LOYALTY_TIER_CONFIG.GOLD.benefits.map((b, i) => (
                <li key={i} className={styles.tierBenefitItem}>
                  <CheckCircle2 size={15} className={styles.tierCheckIcon} aria-hidden="true" />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* 4. How It Works (3 Steps) */}
      <section aria-labelledby="how-it-works-title" style={{ marginBottom: 48 }}>
        <div className={styles.sectionTitleRow}>
          <h2 id="how-it-works-title" className={styles.sectionTitle}>
            {t("business.promotionUi.howClubWorks")}
          </h2>
          <p className={styles.sectionSub}>{t("business.promotionUi.threeSteps")}</p>
        </div>

        <div className={styles.stepsGrid}>
          <div className={styles.stepCard}>
            <div className={styles.stepNumber}>1</div>
            <h3 className={styles.stepTitle}>{t("business.promotionUi.orderEnjoy")}</h3>
            <p className={styles.stepDesc}>
              {t("business.promotionUi.orderEnjoyBody")}
            </p>
          </div>

          <div className={styles.stepCard}>
            <div className={styles.stepNumber}>2</div>
            <h3 className={styles.stepTitle}>{t("business.promotionUi.automaticTier")}</h3>
            <p className={styles.stepDesc}>
              {t("business.promotionUi.automaticTierBody")}
            </p>
          </div>

          <div className={styles.stepCard}>
            <div className={styles.stepNumber}>3</div>
            <h3 className={styles.stepTitle}>{t("business.promotionUi.redeemTitle")}</h3>
            <p className={styles.stepDesc}>
              {t("business.promotionUi.redeemBody")}
            </p>
          </div>
        </div>
      </section>

      {/* 5. Loyalty Points Calculator */}
      <section className={styles.calcCard} aria-labelledby="points-calculator-title">
        <div className={styles.calcHeader}>
          <div className={styles.calcIconWrap}>
            <Calculator size={20} aria-hidden="true" />
          </div>
          <div>
            <h2 id="points-calculator-title" className={styles.sectionTitle} style={{ fontSize: 20 }}>
              {t("business.promotionUi.calculatorTitle")}
            </h2>
            <p className={styles.sectionSub}>
              {t("business.promotionUi.calculatorBody")}
            </p>
          </div>
        </div>

        <div className={styles.calcGrid}>
          <div className={styles.calcInputWrap}>
            <label htmlFor="calc-spend-input" style={{ fontSize: 13, fontWeight: 700, color: '#4b3e36' }}>
              {t("business.promotionUi.estimatedBill")}
            </label>
            <input
              id="calc-spend-input"
              type="number"
              min={10000}
              step={10000}
              value={calcSpend}
              onChange={(e) => setCalcSpend(Math.max(0, Number(e.target.value)))}
              style={{
                height: 46,
                padding: '0 16px',
                border: '1.5px solid #ebd9c8',
                borderRadius: 12,
                fontSize: 16,
                fontWeight: 700,
                color: '#8f1216',
                fontFamily: 'inherit',
                background: '#fffaf3',
              }}
            />
            <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
              {[100000, 200000, 350000, 500000].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setCalcSpend(amt)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: 6,
                    border: '1px solid #ebd9c8',
                    background: '#ffffff',
                    fontSize: 11,
                    fontWeight: 700,
                    color: '#75675e',
                    cursor: 'pointer',
                  }}
                >
                  {formatPrice(amt)}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.calcOutputBox}>
            <div className={styles.calcStatItem}>
              <span className={styles.calcStatLabel}>{t("business.promotionUi.pointsEarned")}</span>
              <span className={styles.calcStatVal}>
                +{estimatedEarn}{' '}
                <span style={{ fontSize: 14, fontWeight: 700, color: '#c9a227' }}>{t("business.promotionUi.points")}</span>
              </span>
              <span style={{ fontSize: 11, color: '#75675e', marginTop: 2 }}>
                {t("business.promotionUi.convertedTo")} {formatPrice(estimatedRedeemValue)})
              </span>
            </div>

            <div className={styles.calcStatItem}>
              <span className={styles.calcStatLabel}>
                {t("business.promotionUi.tierDiscount")} {currentTierInfo.label} ({tierDiscountPercent}%)
              </span>
              <span className={styles.calcStatVal} style={{ color: '#16a34a' }}>
                {formatPrice(estimatedTierDiscount)}
              </span>
              <span style={{ fontSize: 11, color: '#75675e', marginTop: 2 }}>
                {t("business.promotionUi.totalPayment")} <strong>{formatPrice(Math.max(0, calcSpend - estimatedTierDiscount))}</strong>
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Point Transactions History */}
      <section
        id="loyalty-history-section"
        className={styles.historyCard}
        aria-labelledby="loyalty-history-title"
      >
        <div className={styles.historyToolbar}>
          <div>
            <h2 id="loyalty-history-title" className={styles.sectionTitle} style={{ fontSize: 20 }}>
              {t("business.promotionUi.transactionTitle")}
            </h2>
            <p className={styles.sectionSub}>{t("business.promotionUi.transactionIntro")}</p>
          </div>

          <div className={styles.txFilterList} role="tablist" aria-label={t("business.promotionUi.filterTransactions")}>
            <button
              type="button"
              role="tab"
              aria-selected={txFilter === 'ALL'}
              onClick={() => setTxFilter('ALL')}
              className={`${styles.txFilterBtn} ${txFilter === 'ALL' ? styles.txFilterBtnActive : ''}`}
            >
              {t("business.promotionUi.all")}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={txFilter === 'EARN'}
              onClick={() => setTxFilter('EARN')}
              className={`${styles.txFilterBtn} ${txFilter === 'EARN' ? styles.txFilterBtnActive : ''}`}
            >
              {t("business.promotionUi.earnedFilter")}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={txFilter === 'REDEEM'}
              onClick={() => setTxFilter('REDEEM')}
              className={`${styles.txFilterBtn} ${txFilter === 'REDEEM' ? styles.txFilterBtnActive : ''}`}
            >
              {t("business.promotionUi.redeemedFilter")}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={txFilter === 'ADJUST'}
              onClick={() => setTxFilter('ADJUST')}
              className={`${styles.txFilterBtn} ${txFilter === 'ADJUST' ? styles.txFilterBtnActive : ''}`}
            >
              {t("business.promotionUi.adjustedFilter")}
            </button>
          </div>
        </div>

        {filteredTransactions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '36px 16px', color: '#75675e' }}>
            <History size={36} color="#d97706" style={{ margin: '0 auto 8px' }} aria-hidden="true" />
            <p style={{ margin: 0, fontWeight: 600 }}>{t("business.promotionUi.emptyTransactions")}</p>
          </div>
        ) : (
          <div className={styles.txList}>
            {filteredTransactions.map((tx) => {
              const isEarn = tx.type === 'EARN';
              const isRedeem = tx.type === 'REDEEM';
              const isAdjust = tx.type === 'ADJUST';

              return (
                <div key={tx.id} className={styles.txItem}>
                  <div className={styles.txLeft}>
                    <div
                      className={`${styles.txTypeIconWrap} ${
                        isEarn
                          ? styles.txEarnIcon
                          : isRedeem
                          ? styles.txRedeemIcon
                          : styles.txAdjustIcon
                      }`}
                    >
                      {isEarn && <PlusCircle size={20} aria-hidden="true" />}
                      {isRedeem && <MinusCircle size={20} aria-hidden="true" />}
                      {isAdjust && <Sparkles size={20} aria-hidden="true" />}
                    </div>

                    <div className={styles.txDetails}>
                      <span className={styles.txReason}>
                        {tx.reason || (isEarn ? t("business.promotionUi.earnedOrder") : t("business.promotionUi.redeemedOrder"))}
                      </span>
                      <span className={styles.txTime}>
                        <Clock
                          size={11}
                          style={{ display: 'inline', marginRight: 4, verticalAlign: '-1px' }}
                          aria-hidden="true"
                        />
                        {formatTxTime(tx.createdAt)}
                        {tx.orderId && t("business.promotionUi.orderReference", { order: tx.orderId })}
                      </span>
                    </div>
                  </div>

                  <div className={styles.txRight}>
                    <span
                      className={
                        isEarn
                          ? styles.txChangeEarn
                          : isRedeem
                          ? styles.txChangeRedeem
                          : styles.txChangeAdjust
                      }
                    >
                      {tx.change > 0 ? `+${tx.change}` : tx.change} {t("business.promotionUi.points")}
                    </span>
                    <span className={styles.txBalanceAfter}>
                      {t("business.promotionUi.balanceAfter")} {tx.balanceAfter.toLocaleString((locale === 'en' ? 'en-US' : 'vi-VN'))} {t("business.promotionUi.points")}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

