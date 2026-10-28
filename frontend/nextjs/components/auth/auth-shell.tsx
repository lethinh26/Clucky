import Image from 'next/image';
import Link from 'next/link';

export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="auth-shell">
      <div className="auth-card">
        <Link className="brand" href="/" aria-label="Clucky trang chủ">
          <Image className="brand-logo" src="/logo_primary.png" alt="Clucky Logo" width={40} height={40} />
          <span>Clucky</span>
        </Link>
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
        {children}
      </div>
    </div>
  );
}

export default AuthShell;

