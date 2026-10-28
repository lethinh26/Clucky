import React from "react";
import { Link } from "react-router-dom";
import { AdminFooter } from "../../components/AdminFooter";
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
  return (
    <>
      <main className={styles.shell}>
        <header className={styles.header}>
          <Link to="/" className={styles.brand}>
            <img src="/logo_primary.png" alt="" width={46} height={46} />
            <span>
              Clucky<small>WORKSPACE</small>
            </span>
          </Link>
          <span className={styles.headerNote}>
            Không gian dành cho đội ngũ Clucky
          </span>
        </header>
        <div className={styles.layout}>
          <section
            className={styles.story}
            aria-label="Không gian làm việc Clucky"
          >
            <span className={styles.eyebrow}>
              <span /> CLUCKY, BEHIND THE COUNTER
            </span>
            <h2>
              Cùng nhau tạo nên
              <br />
              <em>những bữa ngon.</em>
            </h2>
            <p>
              Một không gian chung để kết nối đội ngũ, chăm sóc chi nhánh và sẵn
              sàng cho mỗi ca làm việc.
            </p>
            <div className={styles.workspaceCard}>
              <div className={styles.cardHeader}>
                <span>ĐỘI NGŨ CLUCKY</span>
                <ShieldCheck size={19} aria-hidden="true" />
              </div>
              {[
                {
                  icon: UsersRound,
                  name: "Quản trị viên",
                  detail: "Kết nối toàn hệ thống",
                  number: "01",
                },
                {
                  icon: Store,
                  name: "Quản lý chi nhánh",
                  detail: "Đồng hành cùng đội ngũ",
                  number: "02",
                },
                {
                  icon: ClipboardList,
                  name: "Nhân viên",
                  detail: "Chăm chút từng đơn hàng",
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
                <Check size={14} aria-hidden="true" /> Cùng một đội ngũ. Cùng
                một niềm vui.
              </div>
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
                <ShieldCheck size={16} aria-hidden="true" /> KHÔNG GIAN QUẢN TRỊ
              </span>
              <h1>{title}</h1>
              {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
              {children}
              <div className={styles.formFooter}>
                <Link to="/">
                  <ArrowLeft size={14} aria-hidden="true" /> Về không gian làm
                  việc
                </Link>
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
