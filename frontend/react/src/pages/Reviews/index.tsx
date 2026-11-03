import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();

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
      message.error(t("business:reviews.staffCannotHideReviewsOnlyManagersAndAdminsHaveThisPermission"));
      return;
    }

    if (user.role === 'STORE_MANAGER' && user.storeId && target.storeId !== user.storeId) {
      message.warning(t("business:reviews.youCanOnlyHideReviewsBelongingToYourStore"));
      return;
    }

    const nextStatus = target.status === 'VISIBLE' ? 'HIDDEN' : 'VISIBLE';
    setReviews((prev) =>
      prev.map((r) => (r.id === reviewId ? { ...r, status: nextStatus } : r))
    );

    if (nextStatus === 'HIDDEN') {
      message.success(t("business:reviews.theViolatingReviewHasBeenHiddenFromTheCustomerApp"));
    } else {
      message.success(t("business:reviews.theReviewIsVisibleAgainInTheCustomerApp"));
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
      responderName: user.fullName || t("business:reviews.cluckyAdministration"),
      responderRole: user.role,
      content: values.content.trim(),
      createdAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
    };

    setReviews((prev) =>
      prev.map((r) =>
        r.id === currentReview.id ? { ...r, replies: [...r.replies, newReply] } : r
      )
    );

    message.success(t("business:reviews.replySentToTheCustomerSuccessfully"));
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
      title: t("business:reviews.customerOrder"),
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
            <Text type="secondary" style={{ fontSize: 12, color: '#6B6259' }}> {t("business:reviews.order")} <span style={{ fontWeight: 600, color: '#8F1216' }}>{r.orderCode}</span>
            </Text>
            <div style={{ fontSize: 11, color: '#8c8c8c' }}>{r.createdAt}</div>
          </div>
        </Space>
      ),
    },
    {
      title: t("business:reviews.dishStore"),
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
      title: t("business:reviews.ratingComment"),
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
            ellipsis={{ rows: 2, expandable: true, symbol: t("business:reviews.showMore") }}
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
              <Text strong style={{ fontSize: 11, color: '#8F1216' }}> {t("business:reviews.replyFrom")} {r.replies[0].responderName}:
              </Text>
              <div style={{ fontSize: 12, color: '#16100D' }}>{r.replies[0].content}</div>
            </div>
          )}
        </div>
      ),
    },
    {
      title: t("business:catalog.status"),
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
            > {t("business:reports.showing")} </Tag>
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
            > {t("business:reviews.hiddenForViolation")} </Tag>
          )}

          {r.replies.length > 0 ? (
            <Text type="secondary" style={{ fontSize: 11, color: '#1E7A46' }}>
              <CheckCircleOutlined /> {t("business:reviews.replied")} </Text>
          ) : (
            <Text type="secondary" style={{ fontSize: 11, color: '#D97706' }}>
              <ClockCircleOutlined /> {t("business:reviews.awaitingReply")} </Text>
          )}
        </Space>
      ),
    },
    {
      title: t("business:catalog.actions"),
      key: 'actions',
      width: 170,
      align: 'center',
      render: (_, r) => (
        <Space size={8}>
          {/* Nút phản hồi (Reply Form) */}
          <Tooltip title={t("business:reviews.replyToCustomerFeedback")}>
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
            > {t("business:reviews.reply")} </Button>
          </Tooltip>

          {/* Nút Ẩn / Hiện (Hide Button) */}
          {user.role !== 'STAFF' && (
            <Popconfirm
              title={
                r.status === 'VISIBLE'
                  ? t("business:reviews.hideThisViolatingReview")
                  : t("business:reviews.unhideAndRepublishThisReview")
              }
              description={
                r.status === 'VISIBLE'
                  ? t("business:reviews.theReviewWillNoLongerAppearOnTheCustomerDishDetailsPage")
                  : t("business:reviews.theReviewWillBePubliclyVisibleAgain")
              }
              onConfirm={() => handleToggleHide(r.id)}
              okText={r.status === 'VISIBLE' ? t("business:reviews.hideNow") : t("business:reviews.publish")}
              cancelText={t("business:account.cancel")}
              okButtonProps={{ danger: r.status === 'VISIBLE' }}
            >
              <Tooltip title={r.status === 'VISIBLE' ? t("business:reviews.hideReview") : t("business:reviews.unhide")}>
                <Button
                  size="small"
                  danger={r.status === 'VISIBLE'}
                  icon={r.status === 'VISIBLE' ? <EyeInvisibleOutlined /> : <EyeOutlined />}
                  style={{ borderRadius: 8 }}
                >
                  {r.status === 'VISIBLE' ? t("business:reviews.hide") : t("business:reviews.show")}
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
        title={t("business:reviews.reviewsRepliesManagement")}
        description={t("business:reviews.readCustomerFeedbackAfterCompletedOrdersProvideSupportAndModerateViolatingContent")}
      />

      {/* Thống kê nhanh */}
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={24} sm={12} md={6}>
          <Card style={{ background: '#FFFAF3', border: '1px solid #E8E2D9', borderRadius: 16 }}>
            <Statistic
              title={<span style={{ color: '#6B6259', fontWeight: 600 }}>{t("business:reviews.totalReviews")}</span>}
              value={totalReviews}
              suffix={t("business:reviews.reviews")}
              valueStyle={{ color: '#8F1216', fontFamily: 'Fredoka, sans-serif', fontWeight: 700 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card style={{ background: '#FFFAF3', border: '1px solid #E8E2D9', borderRadius: 16 }}>
            <Statistic
              title={<span style={{ color: '#6B6259', fontWeight: 600 }}>{t("business:reviews.averageRating")}</span>}
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
              title={<span style={{ color: '#6B6259', fontWeight: 600 }}>{t("business:reviews.needsAReply")}</span>}
              value={unrepliedCount}
              suffix={t("business:reviews.reviews")}
              valueStyle={{ color: '#D97706', fontFamily: 'Fredoka, sans-serif', fontWeight: 700 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card style={{ background: '#FFFAF3', border: '1px solid #E8E2D9', borderRadius: 16 }}>
            <Statistic
              title={<span style={{ color: '#6B6259', fontWeight: 600 }}>{t("business:reviews.hiddenForViolation")}</span>}
              value={hiddenCount}
              suffix={t("business:reviews.entries")}
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
              placeholder={t("business:reviews.searchCustomersDishesOrderCodesComments")}
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
                { value: 'ALL', label: t("business:reviews.allRatings") },
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
                { value: 'ALL', label: t("business:reviews.allReplies") },
                { value: 'UNREPLIED', label: t("business:reviews.notReplied") },
                { value: 'REPLIED', label: t("business:reviews.replied") },
              ]}
            />
          </Col>
          <Col xs={12} sm={6} md={4}>
            <Select
              value={statusFilter}
              onChange={(val) => setStatusFilter(val)}
              style={{ width: '100%', height: 40 }}
              options={[
                { value: 'ALL', label: t("business:reviews.anyStatus") },
                { value: 'VISIBLE', label: t("business:reviews.visible") },
                { value: 'HIDDEN', label: t("business:reviews.hiddenForViolation") },
              ]}
            />
          </Col>
          <Col xs={12} sm={6} md={4}>
            <Select
              value={storeFilter}
              onChange={(val) => setStoreFilter(val)}
              style={{ width: '100%', height: 40 }}
              options={[
                { value: 'ALL', label: t("business:reviews.anyStore") },
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
          pagination={{ pageSize: 6, showTotal: (total) => t("business:reviews.reviewsInTotal", { value1: total }) }}
          locale={{ emptyText: <Empty description={t("business:reviews.noReviewsMatchTheFilters")} /> }}
        />
      </Card>

      {/* Modal Trả lời Đánh giá (Reply Form) */}
      <Modal
        title={
          <span style={{ fontFamily: 'Fredoka, sans-serif', color: '#16100D', fontSize: 18 }}> {t("business:reviews.replyToCustomerReview")} </span>
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
              <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}> {t("business:reviews.dish")} <span style={{ fontWeight: 600 }}>{currentReview.productName}</span> ({currentReview.orderCode})
              </Text>
              <Paragraph style={{ margin: 0, fontStyle: 'italic', color: '#16100D' }}>
                "{currentReview.comment}"
              </Paragraph>
            </div>

            {/* Lịch sử các phản hồi trước */}
            {currentReview.replies.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <Text strong style={{ fontSize: 13, color: '#6B6259' }}> {t("business:reviews.previousReplies")} </Text>
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
                label={<Text strong>{t("business:reviews.newReply")}</Text>}
                rules={[
                  { required: true, message: t("business:reviews.pleaseEnterAReply") },
                  { min: 5, message: t("business:reviews.repliesMustContainAtLeastCharacters") },
                ]}
              >
                <TextArea
                  rows={4}
                  placeholder={t("business:reviews.thankTheCustomerExplainTheSituationOrOfferAProfessionalSolution")}
                  maxLength={500}
                  showCount
                  style={{ borderRadius: 10 }}
                />
              </Form.Item>

              <Flex justify="end" gap={10}>
                <Button onClick={() => setReplyModalVisible(false)} style={{ borderRadius: 8 }}> {t("business:account.cancel")} </Button>
                <Button
                  type="primary"
                  htmlType="submit"
                  style={{
                    backgroundColor: '#8F1216',
                    borderColor: '#8F1216',
                    fontWeight: 700,
                    borderRadius: 8,
                  }}
                > {t("business:reviews.sendReply")} </Button>
              </Flex>
            </Form>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ReviewsPage;
