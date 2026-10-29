"use client";

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
  const pathname = usePathname();
  const showTabs = pathname === "/login" || pathname === "/register";
  return (
    <>
      <main className={styles.shell}>
        <div className={styles.breadcrumb}>
          <Link href="/">
            <ArrowLeft size={15} aria-hidden="true" /> Về trang chủ
          </Link>
        </div>
        <div className={styles.layout}>
          <section className={styles.story} aria-label="Trải nghiệm Clucky">
            <span className={styles.eyebrow}>
              <Sparkles size={15} aria-hidden="true" /> A LITTLE CRISPY. A LOT
              OF HAPPY.
            </span>
            <h2>
              Bữa ngon quen thuộc.
              <br />
              <em>Niềm vui của riêng bạn.</em>
            </h2>
            <p>Đăng nhập một lần, để mỗi lần ghé Clucky đều gần gũi hơn.</p>
            <div className={styles.photo}>
              <Image
                src="https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?auto=format&fit=crop&w=1000&q=85"
                alt="Gà rán vàng giòn, món ngon quen thuộc tại Clucky"
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
                <span>Đặt lại món yêu thích</span>
              </li>
              <li>
                <MapPin size={17} aria-hidden="true" />
                <span>Lưu địa chỉ thân quen</span>
              </li>
              <li>
                <Gift size={17} aria-hidden="true" />
                <span>Tích điểm mỗi bữa ngon</span>
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
                <nav className={styles.tabs} aria-label="Lựa chọn xác thực">
                  <Link
                    href="/login"
                    aria-current={pathname === "/login" ? "page" : undefined}
                  >
                    Đăng nhập
                  </Link>
                  <Link
                    href="/register"
                    aria-current={pathname === "/register" ? "page" : undefined}
                  >
                    Đăng ký
                  </Link>
                </nav>
              )}
              <h1>{title}</h1>
              {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
              {children}
              <div className={styles.bottomNote}>
                <span>Món ngon đang chờ bạn.</span>
                <Link href="/menu">
                  Khám phá thực đơn{" "}
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
