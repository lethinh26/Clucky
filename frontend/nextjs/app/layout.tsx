import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'Clucky', description: 'Crispy Outside, Happy Inside', icons: { icon: '/favicon.png' } };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="vi"><body>{children}</body></html>; }
