import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "../../i18n/language-switcher";
import React from "react";
import { Link } from "react-router-dom";
import { AdminFooter } from "../../components/AdminFooter";
import { PageLoadingContent } from "../../components/ui-loader/page-loading";
import {
  ArrowLeft,
  ArrowUpRight,
  Check,
  ClipboardList,
  ShieldCheck,
  Store,
  UsersRound,
} from "lucide-react";
import styles from "./auth-layout.module.css";

export const AuthLayout: React.FC<{
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}> = ({ title, subtitle, children }) => {
  const { t } = useTranslation();
  return (
    <>
      <main className={styles.shell}>
        <header className={styles.header} data-loading-shell="top">
          <Link to="/" className={styles.brand}>
            <img src="/logo_primary.png" alt="" width={46} height={46} />
            <span>
              Clucky<small>WORKSPACE</small>
            </span>
          </Link>
          <span className={styles.headerNote}>
            {t("admin:auth.eyebrow")}{" "}</span>
          <LanguageSwitcher />
        </header>
        <div className={styles.layout}>
          <section
            className={styles.story}
            aria-label={t("admin:auth.workspace")}
          >
            <span className={styles.eyebrow}>
              <span /> CLUCKY, BEHIND THE COUNTER
            </span>
            <h2>
              {t("admin:auth.title")}{" "}<br />
              <em>{t("admin:auth.subtitle")}</em>
            </h2>
            <p>
              {t("admin:auth.description")}{" "}</p>
            <div className={styles.workspaceCard}>
              <div className={styles.cardHeader}>
                <span>{t("admin:auth.team")}</span>
                <ShieldCheck size={19} aria-hidden="true" />
              </div>
              {[
                {
                  icon: UsersRound,
                  name: t("admin:roles.admin"),
                  detail: t("admin:auth.adminDescription"),
                  number: "01",
                },
                {
                  icon: Store,
                  name: t("admin:roles.manager"),
                  detail: t("admin:auth.managerDescription"),
                  number: "02",
                },
                {
                  icon: ClipboardList,
                  name: t("admin:roles.staff"),
                  detail: t("admin:auth.staffDescription"),
                  number: "03",
                },
              ].map(({ icon: Icon, name, detail, number }) => (
                <div className={styles.teamRow} key={number}>
                  <span className={styles.roleIcon}>
                    <Icon size={20} aria-hidden="true" />
                  </span>
                  <div>
                    <strong>{name}</strong>
                    <span>{detail}</span>
                  </div>
                  <span className={styles.roleNumber}>{number}</span>
                </div>
              ))}
              <div className={styles.cardFooter}>
                <Check size={14} aria-hidden="true" /> {" "}{t("admin:auth.teamMotto")}{" "}</div>
            </div>
            <div className={styles.storyFooter}>
              <span>
                Crispy outside.
                <br />
                Happy inside.
              </span>
              <ArrowUpRight size={28} aria-hidden="true" />
            </div>
          </section>
          <section className={styles.formPanel} aria-label={title}>
            <div className={styles.formInner}>
              <span className={styles.formEyebrow}>
                <ShieldCheck size={16} aria-hidden="true" /> {" "}{t("admin:auth.badge")}{" "}</span>
              <h1>{title}</h1>
              {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
              <PageLoadingContent>{children}</PageLoadingContent>
              <div className={styles.formFooter}>
                <Link to="/">
                  <ArrowLeft size={14} aria-hidden="true" /> {" "}{t("admin:auth.back")}{" "}</Link>
                <span>Clucky Workspace</span>
              </div>
            </div>
          </section>
        </div>
      </main>
      <AdminFooter />
    </>
  );
};

export default AuthLayout;
