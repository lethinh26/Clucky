'use client';

import React from 'react';
import { Award, Crown, Star, CheckCircle, RefreshCw, LogIn } from 'lucide-react';
import { LoyaltyTier, MemberPoints } from '@/lib/types/promotion';
import { calculateTierProgress, LOYALTY_TIER_CONFIG } from '@/lib/promotion';
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
  // Loading skeleton state
  if (loading) {
    if (variant === 'compact' || variant === 'badge') {
      return (
        <span
          className={`${styles.promotionScope} ${styles.shimmerSkeleton} ${className}`}
          style={{ display: 'inline-block', width: 90, height: 24 }}
          aria-busy="true"
          aria-label="Đang tải điểm thành viên..."
        />
      );
    }
    return (
      <div
        className={`${styles.promotionScope} ${styles.pointsCard} ${className}`}
        aria-busy="true"
        aria-label="Đang tải thông tin điểm thành viên..."
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
            aria-label="Thử tải lại điểm tích lũy"
          >
            <RefreshCw size={12} style={{ display: 'inline', marginRight: 4 }} aria-hidden="true" />
            Thử lại
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
          <span>Tích điểm Clucky</span>
        </span>
      );
    }
    return (
      <div className={`${styles.promotionScope} ${styles.pointsCard} ${className}`}>
        <div className={styles.pointsHeader}>
          <div>
            <span className={styles.pointsAmountLabel}>Điểm thành viên</span>
            <p style={{ margin: '4px 0 0 0', fontSize: 13, color: '#4B5563' }}>
              Đăng nhập để tích điểm thưởng và hưởng ưu đãi hạng thành viên!
            </p>
          </div>
          {onLoginClick && (
            <button
              type="button"
              className={styles.couponApplyBtn}
              onClick={onLoginClick}
            >
              <LogIn size={13} style={{ display: 'inline', marginRight: 4 }} aria-hidden="true" />
              Đăng nhập
            </button>
          )}
        </div>
      </div>
    );
  }

  // Calculate tier & progress
  const numericPoints = typeof rawPoints === 'number' ? rawPoints : rawPoints?.totalPoints ?? 0;
  const progressData = calculateTierProgress(numericPoints);
  const activeTier = propTier ?? progressData.tier;
  const activeTierInfo = LOYALTY_TIER_CONFIG[activeTier];

  // 1. Badge variant: small chip showing tier only
  if (variant === 'badge') {
    return (
      <span
        className={`${styles.promotionScope} ${styles.tierPill} ${TIER_PILL_CLASS[activeTier]} ${className}`}
        aria-label={`Hạng ${activeTierInfo.label}`}
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
        title={`${activeTierInfo.label}: ${numericPoints.toLocaleString('vi-VN')} điểm`}
        aria-label={`${activeTierInfo.label}, ${numericPoints} điểm`}
      >
        {TIER_ICONS[activeTier]}
        <span>{numericPoints.toLocaleString('vi-VN')} điểm</span>
      </span>
    );
  }

  // 3. Card variant: complete loyalty tier card
  return (
    <div
      className={`${styles.promotionScope} ${styles.pointsCard} ${className}`}
      role="region"
      aria-label="Thông tin điểm và hạng thành viên"
    >
      <div className={styles.pointsHeader}>
        <div className={styles.pointsAmountWrap}>
          <span className={styles.pointsAmountLabel}>Điểm tích lũy</span>
          <span className={styles.pointsAmountVal}>
            {numericPoints.toLocaleString('vi-VN')}{' '}
            <span style={{ fontSize: 14, fontWeight: 700, color: '#92400E' }}>điểm</span>
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
          aria-label={`Tiến độ lên hạng: ${progressData.progressPercent}%`}
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
              ? 'Hạng cao nhất'
              : `Cần thêm ${progressData.pointsToNextTier.toLocaleString(
                  'vi-VN'
                )} điểm lên ${LOYALTY_TIER_CONFIG[progressData.nextTier!].label}`}
          </span>
        </div>
      </div>

      {/* Benefits List */}
      {showBenefits && activeTierInfo.benefits?.length > 0 && (
        <ul className={styles.benefitsList} aria-label="Đặc quyền hạng thành viên">
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

