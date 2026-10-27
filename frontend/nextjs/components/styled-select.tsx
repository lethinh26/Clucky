'use client';

import { Select } from '@base-ui/react/select';
import { ChevronDown } from 'lucide-react';
import React from 'react';

type Option = { value: string; label: string };

export function StyledSelect({
  value,
  onChange,
  options,
  ariaLabel,
}: {
  value: string;
  onChange: (v: string) => void;
  options: Option[];
  ariaLabel?: string;
}) {
  const selected = options.find((o) => o.value === value);

  return (
    <Select.Root value={value} onValueChange={(v) => onChange(v as string)}>
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
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          fontFamily: "'Quicksand', sans-serif",
        }}
      >
        <Select.Value>{selected?.label ?? value}</Select.Value>
        <Select.Icon>
          <ChevronDown size={14} />
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Positioner sideOffset={8} align="start" alignItemWithTrigger={false}>
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
                  <Select.ItemText>{opt.label}</Select.ItemText>
                </Select.Item>
              ))}
            </Select.List>
          </Select.Popup>
        </Select.Positioner>
      </Select.Portal>
    </Select.Root>
  );
}
