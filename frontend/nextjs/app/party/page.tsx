'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CustomerFooter } from '@/components/customer-footer';
import { CustomerHeader } from '@/components/customer-header';
import { MOCK_STORES } from '@/lib/mock/order-mock-data';
import styles from './party.module.css';

const PARTY_PACKAGES = [
  {
    id: 'pkg-birthday',
    title: 'Tiệc Sinh Nhật Vui Vẻ',
    desc: 'Phù hợp 10-15 người: 30 miếng gà giòn, 4 khoai lắc, nước ngọt thỏa thích.',
    price: '1.290.000đ',
  },
  {
    id: 'pkg-office',
    title: 'Tiệc Công Ty & Hội Nghị',
    desc: 'Phù hợp 20-30 người: 60 miếng gà giòn + sốt cay mật ong, 10 burger mini.',
    price: '2.590.000đ',
  },
  {
    id: 'pkg-custom',
    title: 'Tự Chọn Thực Đơn',
    desc: 'Đội ngũ tư vấn sẽ gọi điện thiết kế thực đơn phù hợp theo ngân sách.',
    price: 'Tùy chọn',
  },
];

export default function PartyOrderPage() {
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [expectedDate, setExpectedDate] = useState('');
  const [expectedTime, setExpectedTime] = useState('11:30');
  const [guestCount, setGuestCount] = useState<number>(15);
  const [selectedStore, setSelectedStore] = useState<string>(MOCK_STORES[0].id);
  const [selectedPackage, setSelectedPackage] = useState<string>('pkg-birthday');
  const [notes, setNotes] = useState('');
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSuccessModalOpen(true);
  };

  return (
    <>
      <CustomerHeader />
      <main className={styles.partyContainer}>
        <div className={styles.heading}>
          <span className={styles.eyebrow}>Sự kiện & Đặt tiệc</span>
          <h1 className={styles.title}>Đặt tiệc & Đơn số lượng lớn</h1>
          <p className={styles.sub}>
            Clucky hân hạnh đồng hành cùng sinh nhật, tiệc công ty, liên hoan lớp học với những
            phần gà vàng giòn nóng hổi, phục vụ đúng giờ và ưu đãi chiết khấu hấp dẫn!
          </p>
        </div>

        <div className={styles.partyCard}>
          <form onSubmit={handleSubmit}>
            {/* Packages */}
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>Chọn gói tiệc gợi ý</label>
              <div className={styles.packageGrid}>
                {PARTY_PACKAGES.map((pkg) => (
                  <div
                    key={pkg.id}
                    className={`${styles.packageCard} ${
                      selectedPackage === pkg.id ? styles.packageCardActive : ''
                    }`}
                    onClick={() => setSelectedPackage(pkg.id)}
                  >
                    <h3 className={styles.packageTitle}>{pkg.title}</h3>
                    <p className={styles.packageDesc}>{pkg.desc}</p>
                    <div className={styles.packagePrice}>{pkg.price}</div>
                  </div>
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
        {isSuccessModalOpen && (
          <div className={styles.modalOverlay} role="dialog" aria-modal="true">
            <div className={styles.modalBox}>
              <div className={styles.modalEmoji} aria-hidden="true">
                🎉
              </div>
              <h2 className={styles.modalTitle}>Yêu cầu đã được gửi thành công!</h2>
              <p className={styles.modalDesc}>
                Cảm ơn bạn đã lựa chọn Clucky cho sự kiện của mình. Đội ngũ Quản lý chi nhánh sẽ
                liên hệ với bạn qua số điện thoại <strong>{customerPhone}</strong> trong vòng 30
                phút để xác nhận thực đơn và chiết khấu ưu đãi.
              </p>
              <Link href="/" className={styles.modalBtn}>
                Quay về trang chủ
              </Link>
            </div>
          </div>
        )}
      </main>
      <CustomerFooter />
    </>
  );
}
