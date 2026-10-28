"use client";

import { useState } from "react";
import { MOCK_STORES } from "@/lib/mock/order-mock-data";
import styles from "./party.module.css";
import { OrderDialog } from "@/components/order/order-dialog";
import {
  PartyPopper,
  CheckCircle2,
  CalendarDays,
  Users,
  Store,
} from "lucide-react";

const PARTY_PACKAGES = [
  {
    id: "pkg-birthday",
    title: "Tiệc Sinh Nhật Vui Vẻ",
    desc: "Phù hợp 10-15 người: 30 miếng gà giòn, 4 khoai lắc, nước ngọt thỏa thích.",
    price: "1.290.000đ",
  },
  {
    id: "pkg-office",
    title: "Tiệc Công Ty & Hội Nghị",
    desc: "Phù hợp 20-30 người: 60 miếng gà giòn + sốt cay mật ong, 10 burger mini.",
    price: "2.590.000đ",
  },
  {
    id: "pkg-custom",
    title: "Tự Chọn Thực Đơn",
    desc: "Đội ngũ tư vấn sẽ gọi điện thiết kế thực đơn phù hợp theo ngân sách.",
    price: "Tùy chọn",
  },
];

export default function PartyOrderPage() {
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [expectedDate, setExpectedDate] = useState("");
  const [expectedTime, setExpectedTime] = useState("11:30");
  const [guestCount, setGuestCount] = useState<number>(15);
  const [selectedStore, setSelectedStore] = useState<string>(MOCK_STORES[0].id);
  const [selectedPackage, setSelectedPackage] =
    useState<string>("pkg-birthday");
  const [notes, setNotes] = useState("");
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [savedLocally, setSavedLocally] = useState(true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      localStorage.setItem(
        "clucky-party-request-v1",
        JSON.stringify({
          customerName,
          customerPhone,
          customerEmail,
          expectedDate,
          expectedTime,
          guestCount,
          selectedStore,
          selectedPackage,
          notes,
        }),
      );
      setSavedLocally(true);
    } catch {
      setSavedLocally(false);
    }
    setIsSuccessModalOpen(true);
  };

  return (
    <>
            <main className={`${styles.partyContainer} m3-page`}>
        <div className={styles.heading}>
          <span className={styles.eyebrow}>Sự kiện & Đặt tiệc</span>
          <h1 className={styles.title}>Đặt tiệc & Đơn số lượng lớn</h1>
          <p className={styles.sub}>
            Clucky hân hạnh đồng hành cùng sinh nhật, tiệc công ty, liên hoan
            lớp học với những phần gà vàng giòn nóng hổi, phục vụ đúng giờ và ưu
            đãi chiết khấu hấp dẫn!
          </p>
        </div>

        <section className="order-hero">
          <div>
            <small>CÀNG ĐÔNG, CÀNG VUI</small>
            <h2>Góp món giòn. Gói niềm vui.</h2>
            <p>Chọn gói tiệc, để lại thông tin và cùng Clucky lên thực đơn.</p>
          </div>
          <PartyPopper size={48} strokeWidth={1.2} />
        </section>
        <div className={styles.partyCard}>
          <form onSubmit={handleSubmit}>
            {/* Packages */}
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>Chọn gói tiệc gợi ý</label>
              <div className={styles.packageGrid}>
                {PARTY_PACKAGES.map((pkg) => (
                  <button
                    type="button"
                    aria-pressed={selectedPackage === pkg.id}
                    key={pkg.id}
                    className={`${styles.packageCard} ${
                      selectedPackage === pkg.id ? styles.packageCardActive : ""
                    }`}
                    onClick={() => setSelectedPackage(pkg.id)}
                  >
                    {selectedPackage === pkg.id && (
                      <CheckCircle2 className={styles.packageCheck} size={20} />
                    )}
                    <h3 className={styles.packageTitle}>{pkg.title}</h3>
                    <p className={styles.packageDesc}>{pkg.desc}</p>
                    <div className={styles.packagePrice}>{pkg.price}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Contact Info */}
            <div className={styles.fieldGrid}>
              <div className={styles.fieldGroup}>
                <label htmlFor="partyName" className={styles.fieldLabel}>
                  Họ và tên người đặt *
                </label>
                <input
                  id="partyName"
                  type="text"
                  required
                  placeholder="Ví dụ: Trần Đức Anh"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className={styles.input}
                />
              </div>

              <div className={styles.fieldGroup}>
                <label htmlFor="partyPhone" className={styles.fieldLabel}>
                  Số điện thoại liên hệ *
                </label>
                <input
                  pattern="0[0-9]{9}"
                  title="Số điện thoại gồm 10 chữ số, bắt đầu bằng 0"
                  id="partyPhone"
                  type="tel"
                  required
                  placeholder="0909123456"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className={styles.input}
                />
              </div>
            </div>

            <div className={styles.fieldGrid}>
              <div className={styles.fieldGroup}>
                <label htmlFor="partyEmail" className={styles.fieldLabel}>
                  Email nhận báo giá *
                </label>
                <input
                  id="partyEmail"
                  type="email"
                  required
                  placeholder="ducanh@gmail.com"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  className={styles.input}
                />
              </div>

              <div className={styles.fieldGroup}>
                <label htmlFor="guestCount" className={styles.fieldLabel}>
                  Số lượng khách dự kiến (người) *
                </label>
                <input
                  id="guestCount"
                  type="number"
                  min="5"
                  max="500"
                  required
                  value={guestCount}
                  onChange={(e) => setGuestCount(Number(e.target.value))}
                  className={styles.input}
                />
              </div>
            </div>

            {/* Date, Time & Branch */}
            <div className={styles.fieldGrid}>
              <div className={styles.fieldGroup}>
                <label htmlFor="partyDate" className={styles.fieldLabel}>
                  Ngày tổ chức mong muốn *
                </label>
                <input
                  id="partyDate"
                  type="date"
                  min={new Intl.DateTimeFormat("sv-SE", {
                    timeZone: "Asia/Ho_Chi_Minh",
                    year: "numeric",
                    month: "2-digit",
                    day: "2-digit",
                  }).format(new Date())}
                  required
                  value={expectedDate}
                  onChange={(e) => setExpectedDate(e.target.value)}
                  className={styles.input}
                />
              </div>

              <div className={styles.fieldGroup}>
                <label htmlFor="partyTime" className={styles.fieldLabel}>
                  Giờ giao món / Khai tiệc *
                </label>
                <input
                  id="partyTime"
                  type="time"
                  required
                  value={expectedTime}
                  onChange={(e) => setExpectedTime(e.target.value)}
                  className={styles.input}
                />
              </div>
            </div>

            <div className={styles.fieldGroup}>
              <label htmlFor="storeSelect" className={styles.fieldLabel}>
                Chọn chi nhánh Clucky phụ trách *
              </label>
              <select
                id="storeSelect"
                value={selectedStore}
                onChange={(e) => setSelectedStore(e.target.value)}
                className={styles.select}
              >
                {MOCK_STORES.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.address})
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.fieldGroup}>
              <label htmlFor="partyNotes" className={styles.fieldLabel}>
                Yêu cầu đặc biệt & Ghi chú thêm
              </label>
              <textarea
                id="partyNotes"
                placeholder="Yêu cầu về đóng gói riêng từng phần, thiệp mừng, xuất hóa đơn VAT, giao tận nơi..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className={styles.textarea}
              />
            </div>

            <button type="submit" className={styles.submitBtn}>
              Gửi yêu cầu đặt tiệc →
            </button>
          </form>
        </div>

        {/* Success Modal */}
        <OrderDialog
          open={isSuccessModalOpen}
          onClose={() => setIsSuccessModalOpen(false)}
          titleId="party-success-title"
        >
          <div className={styles.modalBox}>
            <div className={styles.modalEmoji} aria-hidden="true">
              <CheckCircle2 size={48} />
            </div>
            <h2 id="party-success-title" className={styles.modalTitle}>
              Yêu cầu đặt tiệc demo đã sẵn sàng!
            </h2>
            <p className={styles.modalDesc}>
              Bạn đã hoàn tất biểu mẫu cho {guestCount} khách. Đây là bản xem
              thử giao diện, chưa gửi yêu cầu đến chi nhánh. Bạn có thể quay lại
              để điều chỉnh thông tin.
            </p>
            <dl className={styles.partyReceipt}>
              <div>
                <dt>
                  <Users size={15} />
                  Số khách
                </dt>
                <dd>{guestCount} người</dd>
              </div>
              <div>
                <dt>
                  <CalendarDays size={15} />
                  Thời gian
                </dt>
                <dd>
                  {expectedTime} · {expectedDate}
                </dd>
              </div>
              <div>
                <dt>
                  <Store size={15} />
                  Chi nhánh
                </dt>
                <dd>
                  {
                    MOCK_STORES.find((store) => store.id === selectedStore)
                      ?.name
                  }
                </dd>
              </div>
              <div>
                <dt>Gói tiệc</dt>
                <dd>
                  {
                    PARTY_PACKAGES.find((pkg) => pkg.id === selectedPackage)
                      ?.title
                  }
                </dd>
              </div>
            </dl>
            <p className={styles.saveHint}>
              {savedLocally
                ? "Biểu mẫu demo đã lưu trên trình duyệt này."
                : "Chưa lưu được vào trình duyệt; thông tin vẫn được giữ trong phiên hiện tại."}
            </p>
            <button
              type="button"
              onClick={() => setIsSuccessModalOpen(false)}
              className={styles.modalBtn}
            >
              Quay lại biểu mẫu
            </button>
          </div>
        </OrderDialog>
      </main>
          </>
  );
}
