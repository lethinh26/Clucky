import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { resources } from "@/lib/i18n/resources";
import "./globals.css";
import { Toaster } from "@/components/feedback";
import "mapbox-gl/dist/mapbox-gl.css";
import { LocationProvider } from "@/components/maps/location-provider";
import "./order-theme.css";
import {
  NavigationLoaderProvider,
  NavigationContent,
} from "@/components/ui-loader";
import { OrderProvider } from "@/components/order/order-provider";
import { SessionBoundary } from "@/components/auth/session-boundary";
import { OrderDock } from "@/components/order/order-dock";
import { CustomerHeader } from "@/components/customer-header";
import { CustomerFooter } from "@/components/customer-footer";
import loaderStyles from "@/components/ui-loader/navigation-loader.module.css";

export const metadata: Metadata = {
  title: "Clucky — Crispy Outside, Happy Inside",
  description:
    resources.vi.business.layout.cluckyPremiumFriedChickenAndFastFoodOrderingPlatformCrispyOutsideHappy,
  icons: {
    icon: "/favicon.png",
    apple: "/favicon.png",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = await getMessages();
  return (
    <html lang={locale}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Baloo+2:wght@400;500;600;700&family=Quicksand:wght@400;500;600;700&display=swap&subset=vietnamese"
          rel="stylesheet"
        />
      </head>
      <body>
        <NextIntlClientProvider locale={locale} messages={messages} timeZone="Asia/Ho_Chi_Minh">
        <Toaster locale={locale} />
        <NavigationLoaderProvider>
          <LocationProvider><OrderProvider>
            <div className={loaderStyles.siteLayout}>
              <CustomerHeader />
              <NavigationContent><SessionBoundary>{children}</SessionBoundary></NavigationContent>
              <CustomerFooter />
              <OrderDock />
            </div>
          </OrderProvider></LocationProvider>
        </NavigationLoaderProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
