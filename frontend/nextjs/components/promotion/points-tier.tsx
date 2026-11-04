'use client';

import { useTranslations } from "next-intl";
import { useLocaleTools } from "@/lib/i18n/hooks";
import React from 'react';
import { Award, Crown, Star, CheckCircle, RefreshCw, LogIn } from 'lucide-react';
import { LoyaltyTier, MemberPoints } from '@/lib/types/promotion';
import { calculateTierProgress, getLoyaltyTierConfig } from '@/lib/promotion';
import styles from './promotion-shared.module.css';

export interface PointsTierProps {
  points?: number | MemberPoints;
  tier?: LoyaltyTier;
  variant?: 'card' | 'compact' | 'badge';
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  showBenefits?: boolean;
  isGuest?: boolean;
  onLoginClick?: () => void;
  className?: string;
}

const TIER_ICONS: Record<LoyaltyTier, React.ReactNode> = {
  MEMBER: <Star size={14} aria-hidden="true" />,
  SILVER: <Award size={14} aria-hidden="true" />,
  GOLD: <Crown size={14} aria-hidden="true" />,
};

const TIER_PILL_CLASS: Record<LoyaltyTier, string> = {
  MEMBER: styles.tierPillMember,
  SILVER: styles.tierPillSilver,
  GOLD: styles.tierPillGold,
};

export function PointsTier({
  points: rawPoints = 0,
  tier: propTier,
  variant = 'card',
  loading = false,
  error = null,
  onRetry,
  showBenefits = true,
  isGuest = false,
  onLoginClick,
  className = '',
}: PointsTierProps) {
  const t = useTranslations();
  const { locale } = useLocaleTools();
  const LOYALTY_TIER_CONFIG = getLoyaltyTierConfig(locale);


  // Loading skeleton state
  if (loading) {
    if (variant === 'compact' || variant === 'badge') {
      return (
        <span
          className={`${styles.promotionScope} ${styles.shimmerSkeleton} ${className}`}
          style={{ display: 'inline-block', width: 90, height: 24 }}
          aria-busy="true"
          aria-label={t("business.promotionUi.loadingPoints")}
        />
      );
    }
    return (
      <div
        className={`${styles.promotionScope} ${styles.pointsCard} ${className}`}
        aria-busy="true"
        aria-label={t("business.promotionUi.loadingMember")}
      >
        <div className={styles.shimmerSkeleton} style={{ width: '40%', height: 16, marginBottom: 12 }} />
        <div className={styles.shimmerSkeleton} style={{ width: '60%', height: 28, marginBottom: 16 }} />
        <div className={styles.shimmerSkeleton} style={{ width: '100%', height: 10, borderRadius: 999 }} />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div
        className={`${styles.promotionScope} ${styles.errorBox} ${className}`}
        role="alert"
      >
        <span>{error}</span>
        {onRetry && (
          <button
            type="button"
            className={styles.retryBtn}
            onClick={onRetry}
            aria-label={t("business.promotionUi.retryPoints")}
          >
            <RefreshCw size={12} style={{ display: 'inline', marginRight: 4 }} aria-hidden="true" />
            {t("business.promotionUi.retry")}
          </button>
        )}
      </div>
    );
  }

  // Guest state (not logged in)
  if (isGuest) {
    if (variant === 'compact' || variant === 'badge') {
      return (
        <span
          className={`${styles.promotionScope} ${styles.pointsCompact} ${className}`}
          style={{ background: '#F3F4F6', color: '#6B7280', borderColor: '#E5E7EB' }}
        >
          <Star size={13} aria-hidden="true" />
          <span>{t("business.promotionUi.earnClucky")}</span>
        </span>
      );
    }
    return (
      <div className={`${styles.promotionScope} ${styles.pointsCard} ${className}`}>
        <div className={styles.pointsHeader}>
          <div>
            <span className={styles.pointsAmountLabel}>{t("business.promotionUi.memberPoints")}</span>
            <p style={{ margin: '4px 0 0 0', fontSize: 13, color: '#4B5563' }}>
              {t("business.promotionUi.guestBenefits")}
            </p>
          </div>
          {onLoginClick && (
            <button
              type="button"
              className={styles.couponApplyBtn}
              onClick={onLoginClick}
            >
              <LogIn size={13} style={{ display: 'inline', marginRight: 4 }} aria-hidden="true" />
              {t("business.promotionUi.signIn")}
            </button>
          )}
        </div>
      </div>
    );
  }

  // Calculate tier & progress
  const numericPoints = typeof rawPoints === 'number' ? rawPoints : rawPoints?.totalPoints ?? 0;
  const progressData = calculateTierProgress(numericPoints, locale);
  const activeTier = propTier ?? progressData.tier;
  const activeTierInfo = LOYALTY_TIER_CONFIG[activeTier];

  // 1. Badge variant: small chip showing tier only
  if (variant === 'badge') {
    return (
      <span
        className={`${styles.promotionScope} ${styles.tierPill} ${TIER_PILL_CLASS[activeTier]} ${className}`}
        aria-label={t("business.promotionUi.tierLabel", { tier: activeTierInfo.label })}
      >
        {TIER_ICONS[activeTier]}
        <span>{activeTierInfo.label}</span>
      </span>
    );
  }

  // 2. Compact variant: tier + points pill (e.g. for header)
  if (variant === 'compact') {
    return (
      <span
        className={`${styles.promotionScope} ${styles.pointsCompact} ${className}`}
        title={t("business.promotionUi.tierPointsTitle", { tier: activeTierInfo.label, points: numericPoints.toLocaleString((locale === 'en' ? 'en-US' : 'vi-VN')) })}
        aria-label={t("business.promotionUi.tierPointsLabel", { tier: activeTierInfo.label, points: numericPoints })}
      >
        {TIER_ICONS[activeTier]}
        <span>{numericPoints.toLocaleString((locale === 'en' ? 'en-US' : 'vi-VN'))} {t("business.promotionUi.points")}</span>
      </span>
    );
  }

  // 3. Card variant: complete loyalty tier card
  return (
    <div
      className={`${styles.promotionScope} ${styles.pointsCard} ${className}`}
      role="region"
      aria-label={t("business.promotionUi.pointsAndTier")}
    >
      <div className={styles.pointsHeader}>
        <div className={styles.pointsAmountWrap}>
          <span className={styles.pointsAmountLabel}>{t("business.promotionUi.rewardPoints")}</span>
          <span className={styles.pointsAmountVal}>
            {numericPoints.toLocaleString((locale === 'en' ? 'en-US' : 'vi-VN'))}{' '}
            <span style={{ fontSize: 14, fontWeight: 700, color: '#92400E' }}>{t("business.promotionUi.points")}</span>
          </span>
        </div>

        <span className={`${styles.tierPill} ${TIER_PILL_CLASS[activeTier]}`}>
          {TIER_ICONS[activeTier]}
          <span>{activeTierInfo.label}</span>
        </span>
      </div>

      {/* Progress Bar */}
      <div className={styles.progressWrap}>
        <div
          className={styles.progressTrack}
          role="progressbar"
          aria-valuenow={progressData.progressPercent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={t("business.promotionUi.tierPercent", { percent: progressData.progressPercent })}
        >
          <div
            className={styles.progressFill}
            style={{ width: `${progressData.progressPercent}%` }}
          />
        </div>

        <div className={styles.progressLabelRow}>
          <span>{activeTierInfo.label}</span>
          <span>
            {progressData.isMaxTier
              ? t("business.promotionUi.maxTier")
              : t("business.promotionUi.tierRemaining", { points: progressData.pointsToNextTier.toLocaleString(
                  (locale === 'en' ? 'en-US' : 'vi-VN')
                ), tier: LOYALTY_TIER_CONFIG[progressData.nextTier!].label })}
          </span>
        </div>
      </div>

      {/* Benefits List */}
      {showBenefits && activeTierInfo.benefits?.length > 0 && (
        <ul className={styles.benefitsList} aria-label={t("business.promotionUi.memberBenefits")}>
          {activeTierInfo.benefits.map((benefit, idx) => (
            <li key={idx} className={styles.benefitItem}>
              <CheckCircle size={14} className={styles.benefitCheck} aria-hidden="true" />
              <span>{benefit}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

