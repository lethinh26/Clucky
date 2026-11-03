"use client";
import { useTranslations } from "next-intl";


import Image from "next/image";
import Link from "@/components/ui-loader/navigation-link";
import { usePathname } from "next/navigation";
import {
  ArrowLeft,
  ArrowUpRight,
  Gift,
  Heart,
  MapPin,
  Sparkles,
} from "lucide-react";
import styles from "./auth-shell.module.css";

export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  const t = useTranslations();
  const pathname = usePathname();
  const showTabs = pathname === "/login" || pathname === "/register";
  return (
    <>
      <main className={styles.shell}>
        <div className={styles.breadcrumb}>
          <Link href="/">
            <ArrowLeft size={15} aria-hidden="true" /> {" "}{t("common.backHome")}{" "}</Link>
        </div>
        <div className={styles.layout}>
          <section className={styles.story} aria-label={t("auth.shell.eyebrow")}>
            <span className={styles.eyebrow}>
              <Sparkles size={15} aria-hidden="true" /> A LITTLE CRISPY. A LOT
              OF HAPPY.
            </span>
            <h2>
              {t("auth.shell.title")}{" "}<br />
              <em>{t("auth.shell.subtitle")}</em>
            </h2>
            <p>{t("auth.shell.description")}</p>
            <div className={styles.photo}>
              <Image
                src="https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?auto=format&fit=crop&w=1000&q=85"
                alt={t("auth.shell.imageAlt")}
                fill
                sizes="(max-width: 900px) 90vw, 480px"
                priority
              />
              <div className={styles.photoCaption}>
                <span>Fresh from the fryer</span>
                <strong>
                  Crispy outside.
                  <br />
                  Happy inside.
                </strong>
              </div>
            </div>
            <ul className={styles.benefits}>
              <li>
                <Heart size={17} aria-hidden="true" />
                <span>{t("auth.shell.reorder")}</span>
              </li>
              <li>
                <MapPin size={17} aria-hidden="true" />
                <span>{t("auth.shell.addresses")}</span>
              </li>
              <li>
                <Gift size={17} aria-hidden="true" />
                <span>{t("auth.shell.points")}</span>
              </li>
            </ul>
          </section>
          <section className={styles.formPanel} aria-label={title}>
            <div className={styles.formInner}>
              <div className={styles.wordmark}>
                <Image src="/logo_primary.png" alt="" width={42} height={42} />
                <span>YOUR CLUCKY</span>
              </div>
              {showTabs && (
                <nav className={styles.tabs} aria-label={t("auth.shell.options")}>
                  <Link
                    href="/login"
                    aria-current={pathname === "/login" ? "page" : undefined}
                  >
                    {t("auth.login.action")}{" "}</Link>
                  <Link
                    href="/register"
                    aria-current={pathname === "/register" ? "page" : undefined}
                  >
                    {t("auth.register.action")}{" "}</Link>
                </nav>
              )}
              <h1>{title}</h1>
              {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
              {children}
              <div className={styles.bottomNote}>
                <span>{t("auth.shell.waiting")}</span>
                <Link href="/menu">
                  {t("common.exploreMenu")}{" "}
                  <ArrowUpRight size={14} aria-hidden="true" />
                </Link>
              </div>
            </div>
          </section>
        </div>
      </main>
    </>
  );
}

export default AuthShell;
