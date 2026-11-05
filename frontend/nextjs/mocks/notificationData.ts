import type { NotificationItemData } from '@/lib/types/notification';

export const MOCK_CUSTOMER_NOTIFICATIONS: NotificationItemData[] = [
  {
    id: 'notif-1',
    title: 'Đơn hàng #CLUCKY-101 đã xác nhận',
    content: 'Bếp Clucky đang chuẩn bị món cho bạn. Đơn hàng dự kiến giao sau 20 phút.',
    type: 'ORDER',
    refId: 101,
    isRead: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
  },
  {
    id: 'notif-2',
    title: 'Ưu đãi đặc biệt: Giảm 20% hôm nay',
    content: 'Nhập mã CLUCKY20 khi thanh toán để được giảm 20% cho đơn từ 150.000đ.',
    type: 'PROMOTION',
    isRead: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
  },
  {
    id: 'notif-3',
    title: 'Thanh toán thành công đơn #CLUCKY-098',
    content: 'Bạn đã thanh toán 245.000đ qua ví điện tử. Điểm tích lũy đã được cộng vào tài khoản.',
    type: 'PAYMENT',
    refId: 98,
    isRead: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
  },
  {
    id: 'notif-4',
    title: 'Thông báo nâng cấp ứng dụng',
    content: 'Clucky vừa cập nhật giao diện đặt món mới giúp thao tác nhanh và mượt mà hơn.',
    type: 'SYSTEM',
    isRead: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
  },
  {
    id: 'notif-err-test',
    title: 'Mô phỏng lỗi khi đánh dấu đọc (AC-03)',
    content: 'Nhấp đánh dấu đọc mục này sẽ mô phỏng lỗi kết nối và tự động hoàn tác trạng thái chưa đọc.',
    type: 'SYSTEM',
    isRead: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
  },
  {
    id: 'notif-broken-target',
    title: 'Đơn hàng lưu trữ cũ không khả dụng (AC-04)',
    content: 'Nhấp vào thông báo này để kiểm chứng cơ chế xử lý liên kết không hợp lệ an toàn, không gây lỗi 404.',
    type: 'ORDER',
    refId: 999999,
    link: '/orders/not-found-id',
    isRead: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
  },
];

