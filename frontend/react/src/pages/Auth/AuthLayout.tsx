import React from 'react';
import { Link } from 'react-router-dom';

export const AuthLayout: React.FC<{ title: string; subtitle?: string; children: React.ReactNode }> = ({
  title,
  subtitle,
  children,
}) => (
  <div
    style={{
      minHeight: '100vh',
      display: 'grid',
      placeItems: 'center',
      padding: '40px 20px',
      background: 'radial-gradient(circle at 80% 10%, rgba(201,162,39,.12), transparent 40%), #F5EDE0',
    }}
  >
    <div
      style={{
        width: 'min(440px, 100%)',
        padding: 40,
        border: '1px solid #E8E2D9',
        borderRadius: 28,
        background: '#FFFAF3',
        boxShadow: '0 20px 60px rgba(22,16,13,.1)',
      }}
    >
      <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, marginBottom: 14, textDecoration: 'none' }}>
        <img src="/logo_primary.png" alt="Clucky" width={40} height={40} style={{ objectFit: 'contain' }} />
        <span style={{ fontFamily: 'Baloo 2, sans-serif', fontWeight: 700, fontSize: 24, color: '#16100D' }}>Clucky</span>
      </Link>
      <h1 style={{ margin: '10px 0 6px', fontFamily: 'Baloo 2, sans-serif', fontWeight: 600, fontSize: 32, lineHeight: 1.05, letterSpacing: '-0.03em', color: '#16100D' }}>
        {title}
      </h1>
      {subtitle && <p style={{ margin: '0 0 26px', color: '#6B6259', fontSize: 14, lineHeight: 1.65, fontFamily: 'Quicksand, sans-serif' }}>{subtitle}</p>}
      {children}
    </div>
  </div>
);

export default AuthLayout;

