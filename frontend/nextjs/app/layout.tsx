import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Clucky — Crispy Outside, Happy Inside',
  description: 'Nền tảng website bán hàng thức ăn nhanh chuỗi gà rán cao cấp Clucky. Giòn tan bên ngoài, vui vẻ bên trong.',
  icons: {
    icon: '/favicon.png',
    apple: '/favicon.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Fredoka:wght@400;500;600;700&family=Quicksand:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
