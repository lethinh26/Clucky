import React from 'react';
import { Drawer } from 'antd';
import type { DrawerProps } from 'antd';

export interface AdminDrawerProps extends DrawerProps {
  subtitle?: string;
}

export const AdminDrawer: React.FC<AdminDrawerProps> = ({
  title,
  subtitle,
  children,
  width = 620,
  extra,
  footer,
  ...restProps
}) => {
  return (
    <Drawer
      title={
        <div>
          <div
            style={{
              fontFamily: 'Fredoka, sans-serif',
              fontWeight: 700,
              fontSize: 22,
              color: '#16100D',
              letterSpacing: '-0.02em',
            }}
          >
            {title}
          </div>
          {subtitle && (
            <div
              style={{
                fontFamily: 'Quicksand, sans-serif',
                fontWeight: 500,
                fontSize: 13,
                color: '#6B6259',
                marginTop: 4,
              }}
            >
              {subtitle}
            </div>
          )}
        </div>
      }
      width={width}
      extra={extra}
      footer={footer}
      styles={{
        content: {
          background: '#FFFAF3',
        },
        header: {
          background: '#FFFAF3',
          borderBottom: '1px solid #E8E2D9',
          padding: '20px 24px',
        },
        body: {
          padding: '24px',
          background: '#FFFAF3',
          fontFamily: 'Quicksand, sans-serif',
        },
        footer: {
          background: '#FFFAF3',
          borderTop: '1px solid #E8E2D9',
          padding: '16px 24px',
        },
      }}
      {...restProps}
    >
      {children}
    </Drawer>
  );
};

export default AdminDrawer;
