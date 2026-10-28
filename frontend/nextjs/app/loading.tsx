import { UtensilsCrossed } from "lucide-react";
import styles from "./loading.module.css";

export default function Loading() {
  return (
    <div
      className={styles.loadingWrapper}
      role="status"
      aria-live="polite"
      aria-label="Đang tải dữ liệu"
    >
      <div className={styles.spinnerBox}>
        <div className={styles.ring} />
        <UtensilsCrossed size={26} className={styles.icon} />
      </div>
      <h2 className={styles.title}>Đang chuẩn bị trang…</h2>
      <p className={styles.subtitle}>Món ngon sẽ xuất hiện ngay trong giây lát</p>
    </div>
  );
}
