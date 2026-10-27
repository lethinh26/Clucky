import React from 'react';
import { Tag } from 'antd';

export type StatusType =
  | 'success'
  | 'warning'
  | 'error'
  | 'info'
  | 'gold'
  | 'default';

interface StatusBadgeProps {
  status?: StatusType;
  text: string;
  dot?: boolean;
  size?: 'small' | 'medium';
}

const statusColorConfig: Record<
  StatusType,
  { color: string; bg: string; border: string; dotColor: string }
> = {
  success: {
    color: '#1E7A46',
    bg: '#EAF6EE',
    border: '#A7F3D0',
    dotColor: '#1E7A46',
  },
  warning: {
    color: '#D97706',
    bg: '#FEF3C7',
    border: '#FDE68A',
    dotColor: '#D97706',
  },
  error: {
    color: '#B42318',
    bg: '#FEE4E2',
    border: '#FECDCA',
    dotColor: '#B42318',
  },
  info: {
    color: '#22577A',
    bg: '#E0F2FE',
    border: '#BAE6FD',
    dotColor: '#22577A',
  },
  gold: {
    color: '#946C00',
    bg: '#FEF9C3',
    border: '#FDE047',
    dotColor: '#C9A227',
  },
  default: {
    color: '#6B6259',
    bg: '#F5EDE0',
    border: '#E8E2D9',
    dotColor: '#6B6259',
  },
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status = 'default',
  text,
  dot = true,
  size = 'medium',
}) => {
  const config = statusColorConfig[status] || statusColorConfig.default;

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
        fontWeight: 600,
        fontFamily: 'Quicksand, sans-serif',
        lineHeight: 1.4,
      }}
    >
      {dot && (
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            backgroundColor: config.dotColor,
            flexShrink: 0,
          }}
        />
      )}
      <span>{text}</span>
    </Tag>
  );
};

export default StatusBadge;
