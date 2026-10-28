import React, { useState } from 'react';
import {
  Card,
  Table,
  Rate,
  Tag,
  Button,
  Space,
  Input,
  Select,
  Modal,
  Form,
  Avatar,
  Typography,
  Tooltip,
  Row,
  Col,
  Statistic,
  message,
  Popconfirm,
  Empty,
  Flex,
} from 'antd';
import type { TableColumnsType } from 'antd';
import {
  StarFilled,
  MessageOutlined,
  EyeInvisibleOutlined,
  EyeOutlined,
  SearchOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ShopOutlined,
} from '@ant-design/icons';
import { PageIntro } from '../Dashboard';
import { useAuth } from '../../context/AuthContext';

const { Text, Paragraph } = Typography;
const { TextArea } = Input;

export interface ReviewReply {
  id: string;
  responderId: string;
  responderName: string;
  responderRole: 'ADMIN' | 'STORE_MANAGER' | 'STAFF';
  content: string;
  createdAt: string;
}

export interface ReviewItem {
  id: string;
  orderId: string;
  orderCode: string;
  customerId: string;
  customerName: string;
  customerAvatar?: string;
  productId: string;
  productName: string;
  storeId: number;
  storeName: string;
  rating: number; // 1 - 5
  comment: string;
  status: 'VISIBLE' | 'HIDDEN';
  createdAt: string;
  replies: ReviewReply[];
}

export const initialReviews: ReviewItem[] = [
  {
    id: 'rev-01',
    orderId: 'ord-101',
    orderCode: '#CLU-240826',
    customerId: 'cus-01',
    customerName: 'Nguyễn Minh Anh',
    productId: 'prod-01',
    productName: 'Gà rán sốt cay truyền thống',
    storeId: 1,
    storeName: 'Nguyễn Trãi (Q.5)',
    rating: 5,
    comment: 'Gà siêu giòn, sốt cay ngọt vừa vị rất cuốn. Giao hàng nhanh còn nóng hổi!',
    status: 'VISIBLE',
    createdAt: '2026-10-27 11:20',
    replies: [
      {
        id: 'rep-01',
        responderId: 'stf-01',
        responderName: 'Clucky Nguyễn Trãi',
        responderRole: 'STORE_MANAGER',
        content: 'Cảm ơn bạn Minh Anh đã ủng hộ Clucky! Chúc bạn có bữa ăn thật ngon miệng ạ ❤️',
        createdAt: '2026-10-27 11:35',
      },
    ],
  },
  {
    id: 'rev-02',
    orderId: 'ord-102',
    orderCode: '#CLU-240825',
    customerId: 'cus-02',
    customerName: 'Trần Gia Huy',
    productId: 'prod-02',
    productName: 'Burger gà giòn cay Clucky',
    storeId: 2,
    storeName: 'Phan Văn Trị (Gò Vấp)',
    rating: 2,
    comment: 'Hôm nay bánh giao hơi nguội, rau xà lách bị héo. Hy vọng quán cải thiện khâu bảo quản khi ship xa.',
    status: 'VISIBLE',
    createdAt: '2026-10-27 10:45',
    replies: [],
  },
  {
    id: 'rev-03',
    orderId: 'ord-103',
    orderCode: '#CLU-240824',
    customerId: 'cus-03',
    customerName: 'Lê Hoàng Nam',
    productId: 'prod-03',
    productName: 'Combo Clucky Tiết kiệm (2 người)',
    storeId: 1,
    storeName: 'Nguyễn Trãi (Q.5)',
    rating: 4,
    comment: 'Combo nhiều món ăn no nê. Khoai tây chiên giòn rụm nhưng nước ngọt cho hơi ít đá.',
    status: 'VISIBLE',
    createdAt: '2026-10-26 19:30',
    replies: [
      {
        id: 'rep-02',
        responderId: 'mgr-01',
        responderName: 'Quản lý Chi nhánh',
        responderRole: 'STORE_MANAGER',
        content: 'Chào bạn Nam, Clucky xin ghi nhận góp ý về lượng đá để hoàn thiện hơn trong các đơn tới nhé!',
        createdAt: '2026-10-26 20:00',
      },
    ],
  },
  {
    id: 'rev-04',
    orderId: 'ord-104',
    orderCode: '#CLU-240821',
    customerId: 'cus-04',
    customerName: 'Spam User',
    productId: 'prod-01',
    productName: 'Gà rán sốt cay truyền thống',
    storeId: 3,
    storeName: 'Lê Văn Việt (TP. Thủ Đức)',
    rating: 1,
    comment: 'Nội dung chứa liên kết quảng cáo cờ bạc lừa đảo: http://spam-site-example.com/bet',
    status: 'HIDDEN',
    createdAt: '2026-10-25 14:15',
    replies: [],
  },
  {
    id: 'rev-05',
    orderId: 'ord-105',
    orderCode: '#CLU-240819',
    customerId: 'cus-05',
    customerName: 'Phạm Thuỳ Linh',
    productId: 'prod-04',
    productName: 'Khoai tây chiên lắc phô mai',
    storeId: 2,
    storeName: 'Phan Văn Trị (Gò Vấp)',
    rating: 5,
    comment: 'Bột phô mai thơm ngậy, khoai cắt dày ăn đã miệng lắm luôn.',
    status: 'VISIBLE',
    createdAt: '2026-10-25 09:10',
    replies: [],
  },
];

export const ReviewsPage: React.FC = () => {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<ReviewItem[]>(initialReviews);
  const [searchText, setSearchText] = useState('');
  const [ratingFilter, setRatingFilter] = useState<number | 'ALL'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'VISIBLE' | 'HIDDEN'>('ALL');
  const [replyFilter, setReplyFilter] = useState<'ALL' | 'REPLIED' | 'UNREPLIED'>('ALL');
  const [storeFilter, setStoreFilter] = useState<number | 'ALL'>('ALL');

  // Modal trả lời đánh giá
  const [replyModalVisible, setReplyModalVisible] = useState(false);
  const [currentReview, setCurrentReview] = useState<ReviewItem | null>(null);
  const [replyForm] = Form.useForm();

  // Thống kê nhanh
  const totalReviews = reviews.length;
  const avgRating = (reviews.reduce((acc, r) => acc + r.rating, 0) / (totalReviews || 1)).toFixed(1);
  const unrepliedCount = reviews.filter((r) => r.replies.length === 0 && r.status === 'VISIBLE').length;
  const hiddenCount = reviews.filter((r) => r.status === 'HIDDEN').length;

  // Xử lý ẩn / hiện đánh giá (Hide / Unhide)
  const handleToggleHide = (reviewId: string) => {
    const target = reviews.find((r) => r.id === reviewId);
    if (!target) return;

    if (user.role === 'STAFF') {
      message.error('Nhân viên không có quyền ẩn đánh giá. Chỉ Manager hoặc Admin mới có quyền.');
      return;
    }

    if (user.role === 'STORE_MANAGER' && user.storeId && target.storeId !== user.storeId) {
      message.warning('Bạn chỉ có quyền ẩn đánh giá thuộc chi nhánh mình phụ trách.');
      return;
    }

    const nextStatus = target.status === 'VISIBLE' ? 'HIDDEN' : 'VISIBLE';
    setReviews((prev) =>
      prev.map((r) => (r.id === reviewId ? { ...r, status: nextStatus } : r))
    );

    if (nextStatus === 'HIDDEN') {
      message.success('Đã ẩn đánh giá vi phạm khỏi ứng dụng Khách hàng.');
    } else {
      message.success('Đã hiển thị lại đánh giá trên ứng dụng Khách hàng.');
    }
  };

  // Mở modal phản hồi
  const handleOpenReplyModal = (review: ReviewItem) => {
    setCurrentReview(review);
    replyForm.resetFields();
    setReplyModalVisible(true);
  };

  // Submit phản hồi đánh giá
  const handleSendReply = (values: { content: string }) => {
    if (!currentReview) return;

    const newReply: ReviewReply = {
      id: `rep-${Date.now()}`,
      responderId: String(user.id),
      responderName: user.fullName || 'Ban Quản trị Clucky',
      responderRole: user.role,
      content: values.content.trim(),
      createdAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
    };

    setReviews((prev) =>
      prev.map((r) =>
        r.id === currentReview.id ? { ...r, replies: [...r.replies, newReply] } : r
      )
    );

    message.success('Đã gửi phản hồi tới khách hàng thành công.');
    setReplyModalVisible(false);
  };

  // Lọc dữ liệu
  const filteredReviews = reviews.filter((r) => {
    // Phân quyền theo storeId cho Store Manager/Staff nếu có
    if (user.role === 'STORE_MANAGER' && user.storeId && r.storeId !== user.storeId) {
      return false;
    }

    // Bộ lọc chi nhánh
    if (storeFilter !== 'ALL' && r.storeId !== storeFilter) {
      return false;
    }

    // Lọc theo rating
    if (ratingFilter !== 'ALL' && r.rating !== ratingFilter) {
      return false;
    }

    // Lọc theo trạng thái ẩn/hiện
    if (statusFilter !== 'ALL' && r.status !== statusFilter) {
      return false;
    }

    // Lọc theo trạng thái phản hồi
    if (replyFilter === 'REPLIED' && r.replies.length === 0) {
      return false;
    }
    if (replyFilter === 'UNREPLIED' && r.replies.length > 0) {
      return false;
    }

    // Tìm kiếm text
    if (searchText.trim()) {
      const q = searchText.toLowerCase();
      const matchCust = r.customerName.toLowerCase().includes(q);
      const matchProd = r.productName.toLowerCase().includes(q);
      const matchCode = r.orderCode.toLowerCase().includes(q);
      const matchComment = r.comment.toLowerCase().includes(q);
      return matchCust || matchProd || matchCode || matchComment;
    }

    return true;
  });

  const columns: TableColumnsType<ReviewItem> = [
    {
      title: 'Khách hàng & Đơn',
      key: 'customer',
      width: 220,
      render: (_, r) => (
        <Space align="start">
          <Avatar
            style={{
              backgroundColor: '#8F1216',
              fontFamily: 'Fredoka, sans-serif',
              fontWeight: 600,
            }}
          >
            {r.customerName.charAt(0)}
          </Avatar>
          <div>
            <Text strong style={{ color: '#16100D', display: 'block' }}>
              {r.customerName}
            </Text>
            <Text type="secondary" style={{ fontSize: 12, color: '#6B6259' }}>
              Đơn hàng: <span style={{ fontWeight: 600, color: '#8F1216' }}>{r.orderCode}</span>
            </Text>
            <div style={{ fontSize: 11, color: '#8c8c8c' }}>{r.createdAt}</div>
          </div>
        </Space>
      ),
    },
    {
      title: 'Món ăn & Chi nhánh',
      key: 'product',
      width: 230,
      render: (_, r) => (
        <div>
          <Text strong style={{ color: '#16100D', display: 'block' }}>
            {r.productName}
          </Text>
          <Space size={4} style={{ fontSize: 12, color: '#6B6259' }}>
            <ShopOutlined />
            <span>{r.storeName}</span>
          </Space>
        </div>
      ),
    },
    {
      title: 'Đánh giá & Bình luận',
      key: 'ratingComment',
      render: (_, r) => (
        <div>
          <Space style={{ marginBottom: 4 }}>
            <Rate
              disabled
              value={r.rating}
              character={<StarFilled style={{ fontSize: 14 }} />}
              style={{ color: '#C9A227' }}
            />
            <Text strong style={{ color: '#C9A227', fontSize: 13 }}>
              {r.rating}.0
            </Text>
          </Space>
          <Paragraph
            ellipsis={{ rows: 2, expandable: true, symbol: 'Xem thêm' }}
            style={{ margin: 0, color: '#16100D', fontSize: 13 }}
          >
            {r.comment}
          </Paragraph>

          {/* Hiển thị số lượng phản hồi nếu có */}
          {r.replies.length > 0 && (
            <div
              style={{
                marginTop: 6,
                padding: '6px 12px',
                background: '#F5EDE0',
                borderRadius: 8,
                borderLeft: '3px solid #8F1216',
              }}
            >
              <Text strong style={{ fontSize: 11, color: '#8F1216' }}>
                Phản hồi từ {r.replies[0].responderName}:
              </Text>
              <div style={{ fontSize: 12, color: '#16100D' }}>{r.replies[0].content}</div>
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Trạng thái',
      key: 'status',
      width: 140,
      align: 'center',
      render: (_, r) => (
        <Space direction="vertical" size={4} align="center">
          {r.status === 'VISIBLE' ? (
            <Tag
              bordered={false}
              style={{
                color: '#1E7A46',
                backgroundColor: '#D1FAE5',
                border: '1px solid #A7F3D0',
                fontWeight: 600,
                borderRadius: 8,
              }}
            >
              Hiển thị
            </Tag>
          ) : (
            <Tag
              bordered={false}
              style={{
                color: '#B42318',
                backgroundColor: '#FEE2E2',
                border: '1px solid #FECACA',
                fontWeight: 600,
                borderRadius: 8,
              }}
            >
              Đã ẩn vi phạm
            </Tag>
          )}

          {r.replies.length > 0 ? (
            <Text type="secondary" style={{ fontSize: 11, color: '#1E7A46' }}>
              <CheckCircleOutlined /> Đã phản hồi
            </Text>
          ) : (
            <Text type="secondary" style={{ fontSize: 11, color: '#D97706' }}>
              <ClockCircleOutlined /> Chờ phản hồi
            </Text>
          )}
        </Space>
      ),
    },
    {
      title: 'Thao tác',
      key: 'actions',
      width: 170,
      align: 'center',
      render: (_, r) => (
        <Space size={8}>
          {/* Nút phản hồi (Reply Form) */}
          <Tooltip title="Phản hồi ý kiến khách hàng">
            <Button
              size="small"
              icon={<MessageOutlined />}
              onClick={() => handleOpenReplyModal(r)}
              style={{
                borderColor: '#C9A227',
                color: '#8F1216',
                fontWeight: 600,
                borderRadius: 8,
              }}
            >
              Phản hồi
            </Button>
          </Tooltip>

          {/* Nút Ẩn / Hiện (Hide Button) */}
          {user.role !== 'STAFF' && (
            <Popconfirm
              title={
                r.status === 'VISIBLE'
                  ? 'Ẩn đánh giá vi phạm này?'
                  : 'Bỏ ẩn và công khai lại đánh giá này?'
              }
              description={
                r.status === 'VISIBLE'
                  ? 'Đánh giá sẽ không còn xuất hiện trên trang chi tiết món của khách hàng.'
                  : 'Đánh giá sẽ được hiển thị công khai bình thường.'
              }
              onConfirm={() => handleToggleHide(r.id)}
              okText={r.status === 'VISIBLE' ? 'Ẩn ngay' : 'Công khai'}
              cancelText="Hủy"
              okButtonProps={{ danger: r.status === 'VISIBLE' }}
            >
              <Tooltip title={r.status === 'VISIBLE' ? 'Ẩn đánh giá' : 'Bỏ ẩn'}>
                <Button
                  size="small"
                  danger={r.status === 'VISIBLE'}
                  icon={r.status === 'VISIBLE' ? <EyeInvisibleOutlined /> : <EyeOutlined />}
                  style={{ borderRadius: 8 }}
                >
                  {r.status === 'VISIBLE' ? 'Ẩn' : 'Hiện'}
                </Button>
              </Tooltip>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div className="reviews-page">
      <PageIntro
        eyebrow="Review & Report"
        title="Quản lý Đánh giá & Phản hồi"
        description="Xem ý kiến khách hàng về món ăn sau khi hoàn thành đơn, phản hồi chăm sóc và kiểm duyệt nội dung vi phạm."
      />

      {/* Thống kê nhanh */}
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={24} sm={12} md={6}>
          <Card style={{ background: '#FFFAF3', border: '1px solid #E8E2D9', borderRadius: 16 }}>
            <Statistic
              title={<span style={{ color: '#6B6259', fontWeight: 600 }}>Tổng lượt đánh giá</span>}
              value={totalReviews}
              suffix="lượt"
              valueStyle={{ color: '#8F1216', fontFamily: 'Fredoka, sans-serif', fontWeight: 700 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card style={{ background: '#FFFAF3', border: '1px solid #E8E2D9', borderRadius: 16 }}>
            <Statistic
              title={<span style={{ color: '#6B6259', fontWeight: 600 }}>Điểm trung bình</span>}
              value={avgRating}
              prefix={<StarFilled style={{ color: '#C9A227', fontSize: 20, marginRight: 4 }} />}
              suffix="/ 5.0"
              valueStyle={{ color: '#C9A227', fontFamily: 'Fredoka, sans-serif', fontWeight: 700 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card style={{ background: '#FFFAF3', border: '1px solid #E8E2D9', borderRadius: 16 }}>
            <Statistic
              title={<span style={{ color: '#6B6259', fontWeight: 600 }}>Cần phản hồi ngay</span>}
              value={unrepliedCount}
              suffix="đánh giá"
              valueStyle={{ color: '#D97706', fontFamily: 'Fredoka, sans-serif', fontWeight: 700 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card style={{ background: '#FFFAF3', border: '1px solid #E8E2D9', borderRadius: 16 }}>
            <Statistic
              title={<span style={{ color: '#6B6259', fontWeight: 600 }}>Đã ẩn vi phạm</span>}
              value={hiddenCount}
              suffix="nội dung"
              valueStyle={{ color: '#B42318', fontFamily: 'Fredoka, sans-serif', fontWeight: 700 }}
            />
          </Card>
        </Col>
      </Row>

      {/* Bộ lọc và Tìm kiếm */}
      <Card
        style={{
          borderRadius: 20,
          background: '#FFFAF3',
          border: '1px solid #E8E2D9',
          marginBottom: 20,
        }}
      >
        <Row gutter={[16, 12]} align="middle">
          <Col xs={24} md={8}>
            <Input
              placeholder="Tìm theo khách hàng, món ăn, mã đơn, nội dung..."
              prefix={<SearchOutlined style={{ color: '#8F1216' }} />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              allowClear
              style={{ borderRadius: 10, height: 40 }}
            />
          </Col>
          <Col xs={12} sm={6} md={4}>
            <Select
              value={ratingFilter}
              onChange={(val) => setRatingFilter(val)}
              style={{ width: '100%', height: 40 }}
              options={[
                { value: 'ALL', label: 'Tất cả sao' },
                { value: 5, label: '5 sao ⭐⭐⭐⭐⭐' },
                { value: 4, label: '4 sao ⭐⭐⭐⭐' },
                { value: 3, label: '3 sao ⭐⭐⭐' },
                { value: 2, label: '2 sao ⭐⭐' },
                { value: 1, label: '1 sao ⭐' },
              ]}
            />
          </Col>
          <Col xs={12} sm={6} md={4}>
            <Select
              value={replyFilter}
              onChange={(val) => setReplyFilter(val)}
              style={{ width: '100%', height: 40 }}
              options={[
                { value: 'ALL', label: 'Tất cả phản hồi' },
                { value: 'UNREPLIED', label: 'Chưa phản hồi' },
                { value: 'REPLIED', label: 'Đã phản hồi' },
              ]}
            />
          </Col>
          <Col xs={12} sm={6} md={4}>
            <Select
              value={statusFilter}
              onChange={(val) => setStatusFilter(val)}
              style={{ width: '100%', height: 40 }}
              options={[
                { value: 'ALL', label: 'Mọi trạng thái' },
                { value: 'VISIBLE', label: 'Đang hiển thị' },
                { value: 'HIDDEN', label: 'Đã ẩn vi phạm' },
              ]}
            />
          </Col>
          <Col xs={12} sm={6} md={4}>
            <Select
              value={storeFilter}
              onChange={(val) => setStoreFilter(val)}
              style={{ width: '100%', height: 40 }}
              options={[
                { value: 'ALL', label: 'Mọi chi nhánh' },
                { value: 1, label: 'Nguyễn Trãi' },
                { value: 2, label: 'Phan Văn Trị' },
                { value: 3, label: 'Lê Văn Việt' },
              ]}
            />
          </Col>
        </Row>
      </Card>

      {/* Bảng danh sách đánh giá */}
      <Card
        style={{
          borderRadius: 20,
          background: '#FFFAF3',
          border: '1px solid #E8E2D9',
        }}
      >
        <Table
          columns={columns}
          dataSource={filteredReviews}
          rowKey="id"
          pagination={{ pageSize: 6, showTotal: (t) => `Tổng cộng ${t} đánh giá` }}
          locale={{ emptyText: <Empty description="Không có đánh giá nào phù hợp với bộ lọc." /> }}
        />
      </Card>

      {/* Modal Trả lời Đánh giá (Reply Form) */}
      <Modal
        title={
          <span style={{ fontFamily: 'Fredoka, sans-serif', color: '#16100D', fontSize: 18 }}>
            Phản hồi Đánh giá của Khách hàng
          </span>
        }
        open={replyModalVisible}
        onCancel={() => setReplyModalVisible(false)}
        footer={null}
        destroyOnClose
      >
        {currentReview && (
          <div style={{ marginTop: 12 }}>
            <div
              style={{
                padding: '12px 16px',
                background: '#F5EDE0',
                borderRadius: 12,
                marginBottom: 16,
              }}
            >
              <Flex justify="space-between" align="center" style={{ marginBottom: 4 }}>
                <Text strong style={{ color: '#16100D' }}>
                  {currentReview.customerName}
                </Text>
                <Rate
                  disabled
                  value={currentReview.rating}
                  character={<StarFilled style={{ fontSize: 12 }} />}
                  style={{ color: '#C9A227' }}
                />
              </Flex>
              <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
                Món: <span style={{ fontWeight: 600 }}>{currentReview.productName}</span> ({currentReview.orderCode})
              </Text>
              <Paragraph style={{ margin: 0, fontStyle: 'italic', color: '#16100D' }}>
                "{currentReview.comment}"
              </Paragraph>
            </div>

            {/* Lịch sử các phản hồi trước */}
            {currentReview.replies.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <Text strong style={{ fontSize: 13, color: '#6B6259' }}>
                  Các phản hồi trước đó:
                </Text>
                {currentReview.replies.map((rep) => (
                  <div
                    key={rep.id}
                    style={{
                      background: '#fff',
                      padding: '8px 12px',
                      borderRadius: 8,
                      border: '1px solid #E8E2D9',
                      marginTop: 6,
                    }}
                  >
                    <Flex justify="space-between">
                      <Text strong style={{ fontSize: 12, color: '#8F1216' }}>
                        {rep.responderName} ({rep.responderRole})
                      </Text>
                      <Text type="secondary" style={{ fontSize: 11 }}>
                        {rep.createdAt}
                      </Text>
                    </Flex>
                    <div style={{ fontSize: 13, marginTop: 4 }}>{rep.content}</div>
                  </div>
                ))}
              </div>
            )}

            <Form form={replyForm} layout="vertical" onFinish={handleSendReply}>
              <Form.Item
                name="content"
                label={<Text strong>Nội dung phản hồi mới</Text>}
                rules={[
                  { required: true, message: 'Vui lòng nhập nội dung phản hồi.' },
                  { min: 5, message: 'Nội dung phản hồi tối thiểu 5 ký tự.' },
                ]}
              >
                <TextArea
                  rows={4}
                  placeholder="Gửi lời cảm ơn, giải thích hoặc đưa ra hướng giải quyết chuyên nghiệp cho khách hàng..."
                  maxLength={500}
                  showCount
                  style={{ borderRadius: 10 }}
                />
              </Form.Item>

              <Flex justify="end" gap={10}>
                <Button onClick={() => setReplyModalVisible(false)} style={{ borderRadius: 8 }}>
                  Hủy
                </Button>
                <Button
                  type="primary"
                  htmlType="submit"
                  style={{
                    backgroundColor: '#8F1216',
                    borderColor: '#8F1216',
                    fontWeight: 700,
                    borderRadius: 8,
                  }}
                >
                  Gửi phản hồi
                </Button>
              </Flex>
            </Form>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ReviewsPage;
