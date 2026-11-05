import type { AdminNotification } from '../types/notification';

export const MOCK_ADMIN_NOTIFICATIONS: AdminNotification[] = [
  {
    id: 'adm-notif-1',
    title: 'Đơn hàng mới #CLUCKY-105',
    content: 'Khách hàng vừa đặt đơn mới trị giá 320.000đ tại chi nhánh Lê Lợi (Q.1). Vui lòng xử lý.',
    type: 'ORDER',
    refId: '105',
    isRead: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 10).toISOString(), // 10 mins ago
  },
  {
    id: 'adm-notif-2',
    title: 'Đề xuất voucher mới từ Store Manager',
    content: 'Quản lý chi nhánh Lê Lợi vừa gửi đề xuất mã giảm giá [LELOI-LUNCH25] đang chờ duyệt.',
    type: 'PROMOTION',
    isRead: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(), // 45 mins ago
  },
  {
    id: 'adm-notif-3',
    title: 'Thanh toán chuyển khoản khớp lệnh',
    content: 'Đã nhận chuyển khoản 189.000đ cho đơn hàng #CLUCKY-102 qua VietQR MB Bank.',
    type: 'PAYMENT',
    refId: '102',
    isRead: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(), // 3 hours ago
  },
  {
    id: 'adm-notif-4',
    title: 'Báo cáo doanh thu ca sáng',
    content: 'Báo cáo tổng kết ca sáng của tất cả các chi nhánh đã sẵn sàng để đối soát.',
    type: 'SYSTEM',
    isRead: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(),
  },
  {
    id: 'adm-notif-err-test',
    title: 'Mô phỏng lỗi mạng khi đánh dấu đọc (AC-03)',
    content: 'Nhấp đánh dấu đọc mục này sẽ mô phỏng lỗi kết nối và tự động hoàn tác trạng thái chưa đọc.',
    type: 'SYSTEM',
    isRead: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
  },
  {
    id: 'adm-notif-broken-target',
    title: 'Đơn hàng tham chiếu không tồn tại (AC-04)',
    content: 'Mục kiểm thử: Nhấp vào thông báo này để kiểm chứng cơ chế xử lý liên kết không hợp lệ an toàn, không gây lỗi chuyển trang hỏng.',
    type: 'ORDER',
    refId: '999999',
    link: '/admin/orders/not-found-id',
    isRead: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(),
  },
];

