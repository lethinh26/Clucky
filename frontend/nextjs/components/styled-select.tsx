'use client';

import { Select } from '@base-ui/react/select';
import { ChevronDown } from 'lucide-react';
import React from 'react';

type Option = { value: string; label: string; lang?: string; icon?: React.ReactNode };

export function StyledSelect({
  value,
  onChange,
  options,
  ariaLabel,
  disabled = false,
  style,
  triggerContent,
  align = 'start',
}: {
  value: string;
  onChange: (v: string) => void;
  options: Option[];
  ariaLabel?: string;
  disabled?: boolean;
  style?: React.CSSProperties;
  triggerContent?: React.ReactNode;
  align?: 'start' | 'end';
}) {
  const selected = options.find((o) => o.value === value);

  return (
    <Select.Root value={value} disabled={disabled} onValueChange={(nextValue) => {
      if (typeof nextValue === 'string') onChange(nextValue);
    }}>
      <Select.Trigger
        aria-label={ariaLabel}
        style={{
          height: 38,
          padding: '0 12px',
          paddingRight: 8,
          borderRadius: 999,
          border: '1px solid #E8E2D9',
          backgroundColor: '#FFFFFF',
          fontSize: 13,
          fontWeight: 600,
          color: '#16100D',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.6 : 1,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          fontFamily: "'Quicksand', sans-serif",
          ...style,
        }}
      >
        <Select.Value lang={selected?.lang} style={{ display: 'inline-flex', alignItems: 'center' }}>{triggerContent ?? selected?.label ?? value}</Select.Value>
        <Select.Icon style={{ display: 'inline-flex', alignItems: 'center', flexShrink: 0 }}>
          <ChevronDown size={14} style={{ display: 'block' }} />
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Positioner sideOffset={8} align={align} alignItemWithTrigger={false} style={{ zIndex: 1100 }}>
          <Select.Popup
            style={{
              background: '#FFFAF3',
              border: '1px solid #E8E2D9',
              borderRadius: 14,
              padding: 6,
              minWidth: 'var(--anchor-width, 180px)',
              boxShadow: '0 12px 32px rgba(22,16,13,0.12), 0 4px 10px rgba(22,16,13,0.06)',
              fontFamily: "'Quicksand', sans-serif",
              fontSize: 13,
              fontWeight: 600,
              color: '#16100D',
            }}
          >
            <Select.List>
              {options.map((opt) => (
                <Select.Item
                  key={opt.value}
                  value={opt.value}
                  lang={opt.lang}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 9,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    outline: 'none',
                  }}
                  className="clucky-select-item"
                >
                  <Select.ItemText style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                    {opt.icon}{opt.label}
                  </Select.ItemText>
                </Select.Item>
              ))}
            </Select.List>
          </Select.Popup>
        </Select.Positioner>
      </Select.Portal>
    </Select.Root>
  );
}
