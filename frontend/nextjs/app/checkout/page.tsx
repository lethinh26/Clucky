'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { CustomerFooter } from '@/components/customer-footer';
import { CustomerHeader } from '@/components/customer-header';
import { formatPrice } from '@/lib/products';
import { INITIAL_CART_ITEMS, MOCK_STORES } from '@/lib/mock/order-mock-data';
import { OrderType, PaymentMethod } from '@/lib/types/order';
import styles from './checkout.module.css';

export default function CheckoutPage() {
  const router = useRouter();

  // Form states
  const [orderType, setOrderType] = useState<OrderType>('DELIVERY');
  const [selectedStore, setSelectedStore] = useState<string>(MOCK_STORES[0].id);
  const [receiverName, setReceiverName] = useState('Trần Đức Anh');
  const [receiverPhone, setReceiverPhone] = useState('0909123456');
  const [deliveryAddress, setDeliveryAddress] = useState('227 Nguyễn Văn Cừ, Phường 4, Quận 5, TP.HCM');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('BANK_TRANSFER');
  const [orderNote, setOrderNote] = useState('');

  // Voucher & Loyalty states (Contract slots with M5)
  const [voucherInput, setVoucherInput] = useState('CLUCKYGIAM20');
  const [appliedVoucher, setAppliedVoucher] = useState<{ code: string; discount: number } | null>({
    code: 'CLUCKYGIAM20',
    discount: 20000,
  });
  const [voucherMsg, setVoucherMsg] = useState('Áp dụng mã giảm 20.000đ thành công!');
  const [usePoints, setUsePoints] = useState(false);

  // Cost calculations
  const items = INITIAL_CART_ITEMS;
  const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const shippingFee = orderType === 'DELIVERY' ? 20000 : 0;
  const voucherDiscount = appliedVoucher ? appliedVoucher.discount : 0;
  const pointsDiscount = usePoints ? 5000 : 0;
  const totalAmount = Math.max(0, subtotal + shippingFee - voucherDiscount - pointsDiscount);

  const handleApplyVoucher = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = voucherInput.trim().toUpperCase();
    if (cleanCode === 'CLUCKYGIAM20') {
      setAppliedVoucher({ code: 'CLUCKYGIAM20', discount: 20000 });
      setVoucherMsg('Áp dụng mã giảm 20.000đ thành công!');
    } else if (cleanCode === 'CLUCKYFREESHIP') {
      setAppliedVoucher({ code: 'CLUCKYFREESHIP', discount: 20000 });
      setVoucherMsg('Miễn phí vận chuyển thành công!');
    } else {
      setAppliedVoucher(null);
      setVoucherMsg('Mã giảm giá không hợp lệ hoặc đã hết lượt.');
    }
  };

  const handleSubmitOrder = (e: React.FormEvent) => {
    e.preventDefault();
    // Simulate order creation in Next.js router
    router.push('/orders/demo-clucky');
  };

  return (
    <>
      <CustomerHeader />
      <main className={styles.checkoutContainer}>
        <div className={styles.checkoutHeading}>
          <span className={styles.eyebrow}>Hoàn tất đơn món</span>
          <h1 className={styles.title}>Thanh toán & Đặt hàng</h1>
          <p className={styles.subtitle}>
            Kiểm tra thông tin giao nhận và lựa chọn phương thức thanh toán phù hợp.
          </p>
        </div>

        <form onSubmit={handleSubmitOrder} className={styles.checkoutGrid}>
          <div className={styles.formSections}>
            {/* Section 1: Delivery Mode & Receiver Info */}
            <section className={styles.sectionCard}>
              <div className={styles.sectionHeader}>
                <span className={styles.stepNumber}>1</span>
                <h2 className={styles.sectionTitle}>Hình thức nhận món</h2>
              </div>

              <div className={styles.typeTabs}>
                <button
                  type="button"
                  className={`${styles.tabBtn} ${orderType === 'DELIVERY' ? styles.tabBtnActive : ''}`}
                  onClick={() => setOrderType('DELIVERY')}
                >
                  🛵 Giao tận nơi
                </button>
                <button
                  type="button"
                  className={`${styles.tabBtn} ${orderType === 'PICKUP' ? styles.tabBtnActive : ''}`}
                  onClick={() => setOrderType('PICKUP')}
                >
                  🏪 Tự đến lấy tại quán
                </button>
              </div>

              <div className={styles.fieldGrid}>
                <div className={styles.fieldGroup}>
                  <label htmlFor="receiverName" className={styles.fieldLabel}>
                    Họ và tên người nhận *
                  </label>
                  <input
                    id="receiverName"
                    type="text"
                    required
                    value={receiverName}
                    onChange={(e) => setReceiverName(e.target.value)}
                    className={styles.input}
                    placeholder="Nguyễn Văn A"
                  />
                </div>

                <div className={styles.fieldGroup}>
                  <label htmlFor="receiverPhone" className={styles.fieldLabel}>
                    Số điện thoại liên hệ *
                  </label>
                  <input
                    id="receiverPhone"
                    type="tel"
                    required
                    value={receiverPhone}
                    onChange={(e) => setReceiverPhone(e.target.value)}
                    className={styles.input}
                    placeholder="0901234567"
                  />
                </div>
              </div>

              {orderType === 'DELIVERY' ? (
                <div className={styles.fieldGroup}>
                  <label htmlFor="deliveryAddress" className={styles.fieldLabel}>
                    Địa chỉ nhận hàng chi tiết *
                  </label>
                  <input
                    id="deliveryAddress"
                    type="text"
                    required
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    className={styles.input}
                    placeholder="Số nhà, tên đường, phường, quận..."
                  />
                </div>
              ) : (
                <div className={styles.fieldGroup}>
                  <label htmlFor="storeSelect" className={styles.fieldLabel}>
                    Chọn chi nhánh Clucky gần bạn nhất *
                  </label>
                  <select
                    id="storeSelect"
                    value={selectedStore}
                    onChange={(e) => setSelectedStore(e.target.value)}
                    className={styles.select}
                  >
                    {MOCK_STORES.map((store) => (
                      <option key={store.id} value={store.id}>
                        {store.name} — {store.address}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className={styles.fieldGroup}>
                <label htmlFor="orderNote" className={styles.fieldLabel}>
                  Ghi chú cho đơn hàng
                </label>
                <textarea
                  id="orderNote"
                  value={orderNote}
                  onChange={(e) => setOrderNote(e.target.value)}
                  className={styles.textarea}
                  placeholder="Ví dụ: Gọi trước khi giao 5 phút, để trước cửa giúp mình..."
                />
              </div>
            </section>

            {/* Section 2: Promotions & Loyalty (M5 Slot) */}
            <section className={styles.sectionCard}>
              <div className={styles.sectionHeader}>
                <span className={styles.stepNumber}>2</span>
                <h2 className={styles.sectionTitle}>Khuyến mãi & Điểm thưởng</h2>
              </div>

              <div className={styles.promoBlock}>
                <input
                  type="text"
                  value={voucherInput}
                  onChange={(e) => setVoucherInput(e.target.value)}
                  placeholder="Nhập mã ưu đãi (VD: CLUCKYGIAM20)"
                  className={`${styles.input} ${styles.promoInput}`}
                />
                <button type="button" onClick={handleApplyVoucher} className={styles.applyBtn}>
                  Áp dụng
                </button>
              </div>

              {voucherMsg && (
                <p
                  style={{
                    fontSize: 13,
                    marginTop: 8,
                    fontWeight: 600,
                    color: appliedVoucher ? '#1e7a46' : '#b42318',
                  }}
                >
                  {voucherMsg}
                </p>
              )}

              <div className={styles.loyaltyBox}>
                <label className={styles.loyaltyLabel}>
                  <input
                    type="checkbox"
                    checked={usePoints}
                    onChange={(e) => setUsePoints(e.target.checked)}
                    style={{ width: 18, height: 18, accentColor: '#8f1216' }}
                  />
                  <span>Dùng điểm tích lũy Clucky Club</span>
                </label>
                <span className={styles.loyaltyPoints}>Có 120 điểm (-5.000đ khi dùng 50 điểm)</span>
              </div>
            </section>

            {/* Section 3: Payment Method */}
            <section className={styles.sectionCard}>
              <div className={styles.sectionHeader}>
                <span className={styles.stepNumber}>3</span>
                <h2 className={styles.sectionTitle}>Phương thức thanh toán</h2>
              </div>

              <div className={styles.paymentOptions}>
                <label
                  className={`${styles.paymentCard} ${
                    paymentMethod === 'BANK_TRANSFER' ? styles.paymentCardActive : ''
                  }`}
                >
                  <div className={styles.paymentLeft}>
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="BANK_TRANSFER"
                      checked={paymentMethod === 'BANK_TRANSFER'}
                      onChange={() => setPaymentMethod('BANK_TRANSFER')}
                      className={styles.paymentRadio}
                    />
                    <div>
                      <p className={styles.paymentTitle}>Chuyển khoản VietQR tự động</p>
                      <p className={styles.paymentDesc}>
                        Quét mã QR qua app ngân hàng, hệ thống tự động xác nhận sau 5 giây.
                      </p>
                    </div>
                  </div>
                  <span className={styles.paymentBadge}>Khuyên dùng</span>
                </label>

                <label
                  className={`${styles.paymentCard} ${
                    paymentMethod === 'COD' ? styles.paymentCardActive : ''
                  }`}
                >
                  <div className={styles.paymentLeft}>
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="COD"
                      checked={paymentMethod === 'COD'}
                      onChange={() => setPaymentMethod('COD')}
                      className={styles.paymentRadio}
                    />
                    <div>
                      <p className={styles.paymentTitle}>Thanh toán khi nhận hàng (COD)</p>
                      <p className={styles.paymentDesc}>
                        Thanh toán tiền mặt cho tài xế hoặc thu ngân tại quán.
                      </p>
                    </div>
                  </div>
                </label>
              </div>
            </section>
          </div>

          {/* Right Column: Order Summary */}
          <aside className={styles.summaryBox}>
            <h2 className={styles.summaryTitle}>Đơn hàng của bạn</h2>

            <div className={styles.orderItemsList}>
              {items.map((item) => (
                <div key={item.id} className={styles.miniItem}>
                  <div>
                    <div className={styles.miniItemName}>{item.name}</div>
                    <div className={styles.miniItemQty}>SL: {item.quantity} phần</div>
                  </div>
                  <strong className={styles.miniItemPrice}>
                    {formatPrice(item.unitPrice * item.quantity)}
                  </strong>
                </div>
              ))}
            </div>

            <div className={styles.costRow}>
              <span>Tạm tính</span>
              <strong>{formatPrice(subtotal)}</strong>
            </div>

            <div className={styles.costRow}>
              <span>Phí vận chuyển</span>
              <strong>{shippingFee > 0 ? formatPrice(shippingFee) : 'Miễn phí'}</strong>
            </div>

            {voucherDiscount > 0 && (
              <div className={styles.costRow}>
                <span>Voucher giảm giá</span>
                <strong className={styles.discountText}>-{formatPrice(voucherDiscount)}</strong>
              </div>
            )}

            {pointsDiscount > 0 && (
              <div className={styles.costRow}>
                <span>Điểm tích lũy</span>
                <strong className={styles.discountText}>-{formatPrice(pointsDiscount)}</strong>
              </div>
            )}

            <hr className={styles.divider} />

            <div className={styles.totalRow}>
              <span>Tổng thanh toán</span>
              <strong className={styles.totalPrice}>{formatPrice(totalAmount)}</strong>
            </div>

            <button type="submit" className={styles.submitBtn}>
              Xác nhận đặt hàng →
            </button>

            <p className={styles.guaranteeNote}>
              🔒 Đơn hàng được xử lý bảo mật. Gà rán luôn được chiên nóng giòn khi bạn nhận món.
            </p>
          </aside>
        </form>
      </main>
      <CustomerFooter />
    </>
  );
}
