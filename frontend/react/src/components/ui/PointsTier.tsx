import { useTranslation } from "react-i18next";
import { useLocaleTools } from "../../i18n/hooks";
import React from 'react';
import { Tag } from 'antd';
import type { LoyaltyTier } from '../../types/promotion';

export interface PointsTierProps {
  tier: LoyaltyTier;
  points?: number;
  size?: 'small' | 'medium';
}



export const PointsTier: React.FC<PointsTierProps> = ({
  tier = 'MEMBER',
  points,
  size = 'medium',
}) => {
  const { t } = useTranslation();
  const { locale } = useLocaleTools();
  const tierConfig: Record<
    LoyaltyTier,
    { label: string; color: string; bg: string; border: string; dotColor: string }
  > = {
    MEMBER: {
      label: t("business:promotionUi.member"),
      color: '#92400E',
      bg: '#FEF3C7',
      border: '#FDE68A',
      dotColor: '#D97706',
    },
    SILVER: {
      label: t("business:promotionUi.silver"),
      color: '#334155',
      bg: '#F1F5F9',
      border: '#CBD5E1',
      dotColor: '#64748B',
    },
    GOLD: {
      label: t("business:promotionUi.gold"),
      color: '#78350F',
      bg: '#FEF08A',
      border: '#FBBF24',
      dotColor: '#D97706',
    },
  };

  const config = tierConfig[tier] || tierConfig.MEMBER;

  return (
    <Tag
      bordered={false}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        color: config.color,
        backgroundColor: config.bg,
        border: `1px solid ${config.border}`,
        borderRadius: 999,
        padding: size === 'small' ? '2px 8px' : '3px 12px',
        fontSize: size === 'small' ? '12px' : '13px',
        fontWeight: 700,
        fontFamily: 'Quicksand, sans-serif',
        lineHeight: 1.4,
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          backgroundColor: config.dotColor,
          flexShrink: 0,
        }}
      />
      <span>{config.label}</span>
      {typeof points === 'number' && (
        <span style={{ opacity: 0.9, fontWeight: 800 }}>
          ({points.toLocaleString((locale === 'en' ? 'en-US' : 'vi-VN'))} {t("business:promotionUi.pointsClose")}
        </span>
      )}
    </Tag>
  );
};

export default PointsTier;

