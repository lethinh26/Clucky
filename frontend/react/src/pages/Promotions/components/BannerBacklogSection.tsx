import React, { useState } from 'react';
import {
  Alert,
  Card,
  Row,
  Col,
  Tag,
  Button,
  Switch,
  Typography,
  Space,
  Modal,
  Image,
} from 'antd';
import {
  PictureOutlined,
  PlusOutlined,
  InfoCircleOutlined,
  CalendarOutlined,
  LinkOutlined,
  BulbOutlined,
} from '@ant-design/icons';
import { MOCK_BANNERS } from '../../../mocks/promotionData';
import type { PromoBanner } from '../../../types/promotion';

const { Text, Title, Paragraph } = Typography;

export const BannerBacklogSection: React.FC = () => {
  const [banners, setBanners] = useState<PromoBanner[]>(MOCK_BANNERS);
  const [modalOpen, setModalOpen] = useState(false);

  const toggleBanner = (id: string | number) => {
    setBanners((prev) =>
      prev.map((b) => (b.id === id ? { ...b, isActive: !b.isActive } : b))
    );
  };

  const getPositionTag = (pos: PromoBanner['position']) => {
    switch (pos) {
      case 'HERO_HOME':
        return <Tag color="blue">Banner Trang Chủ (Hero)</Tag>;
      case 'POPUP':
        return <Tag color="purple">Cửa sổ Popup (Modal)</Tag>;
      case 'PROMO_STRIP':
        return <Tag color="gold">Dải thông báo ưu đãi</Tag>;
      default:
        return <Tag>{pos}</Tag>;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Explicit Backlog Status Alert */}
      <Alert
        message={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontWeight: 800, fontSize: 15 }}>
              Quản lý Banner Khuyến mại & Chiến dịch Quảng bá
            </span>
            <Tag color="orange" style={{ fontWeight: 700, borderRadius: 999 }}>
              BACKLOG / PHASE 2
            </Tag>
            <Tag color="default" style={{ borderRadius: 999 }}>
              Chưa tích hợp backend thật
            </Tag>
          </div>
        }
        description={
          <div style={{ marginTop: 6, fontSize: 13, lineHeight: 1.6 }}>
            Khu vực cấu hình hình ảnh banner, sự kiện truyền thông hiển thị trên ứng dụng khách hàng (Customer Next.js).
            Theo tài liệu kỹ thuật UI-28, tính năng này được xếp vào danh mục phát triển Phase 2 (chưa nối Cloudinary & API Gateway chính thức). Giao diện dưới đây hiển thị bố cục chuẩn bị sẵn để đội ngũ kiểm thử trải nghiệm xem trước.
          </div>
        }
        type="warning"
        showIcon
        icon={<BulbOutlined style={{ color: '#D97706' }} />}
        style={{
          borderRadius: 16,
          border: '1px solid #FDE68A',
          backgroundColor: '#FFFBEB',
        }}
      />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Title level={5} style={{ margin: 0, fontFamily: 'Baloo 2, sans-serif' }}>
            Danh sách Banner hiện tại
          </Title>
          <Text type="secondary" style={{ fontSize: 13 }}>
            Hiển thị trên Trang chủ & Ứng dụng khách hàng
          </Text>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          style={{
            backgroundColor: '#8F1216',
            borderColor: '#8F1216',
            borderRadius: 999,
            fontWeight: 700,
          }}
          onClick={() => setModalOpen(true)}
        >
          Thêm Banner mới
        </Button>
      </div>

      <Row gutter={[20, 20]}>
        {banners.map((banner) => (
          <Col xs={24} md={12} lg={8} key={banner.id}>
            <Card
              hoverable
              style={{
                borderRadius: 18,
                overflow: 'hidden',
                border: '1px solid #E8E2D9',
                background: '#FFFAF3',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
              }}
              styles={{
                body: { padding: 18, display: 'flex', flexDirection: 'column', flexGrow: 1 },
              }}
              cover={
                <div style={{ height: 160, overflow: 'hidden', position: 'relative', background: '#F5EDE0' }}>
                  <Image
                    alt={banner.title}
                    src={banner.imageUrl}
                    style={{ width: '100%', height: 160, objectFit: 'cover' }}
                    fallback="https://placehold.co/600x300?text=Clucky+Banner"
                  />
                  <div style={{ position: 'absolute', top: 12, right: 12 }}>
                    <Tag color={banner.isActive ? 'success' : 'default'} style={{ fontWeight: 700 }}>
                      {banner.isActive ? 'ĐANG HIỂN THỊ' : 'TẠM TẮT'}
                    </Tag>
                  </div>
                </div>
              }
            >
              <div style={{ marginBottom: 10 }}>{getPositionTag(banner.position)}</div>

              <Title level={5} style={{ fontSize: 15, margin: '0 0 8px 0', fontFamily: 'Baloo 2, sans-serif' }}>
                {banner.title}
              </Title>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, color: '#6B6259', flexGrow: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <CalendarOutlined />
                  <span>
                    {banner.startAt} → {banner.endAt}
                  </span>
                </div>
                {banner.targetUrl && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <LinkOutlined />
                    <span>Đường dẫn: <b>{banner.targetUrl}</b></span>
                  </div>
                )}
              </div>

              <div
                style={{
                  marginTop: 16,
                  paddingTop: 12,
                  borderTop: '1px solid #F0E8DC',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span style={{ fontSize: 13, fontWeight: 600 }}>Bật / Tắt hiển thị</span>
                <Switch
                  checked={banner.isActive}
                  onChange={() => toggleBanner(banner.id)}
                  style={{ backgroundColor: banner.isActive ? '#1E7A46' : undefined }}
                />
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      {/* Info modal for Banner Creation */}
      <Modal
        open={modalOpen}
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <InfoCircleOutlined style={{ color: '#D97706' }} />
            <span>Chức năng thuộc Kế hoạch Phase 2</span>
          </div>
        }
        onOk={() => setModalOpen(false)}
        onCancel={() => setModalOpen(false)}
        okText="Đã hiểu"
        cancelButtonProps={{ style: { display: 'none' } }}
        styles={{ body: { background: '#FFFAF3', padding: '16px 0' } }}
      >
        <Paragraph style={{ fontSize: 14, color: '#16100D', lineHeight: 1.6 }}>
          Theo hợp đồng kỹ thuật UI-28, nghiệp vụ tải ảnh lên Cloudinary và lưu cấu hình Banner quảng cáo được lên kế hoạch trong Backlog Phase 2. Giao diện này phục vụ nghiệm thu hiển thị, hiện chưa kết nối dịch vụ lưu trữ media.
        </Paragraph>
      </Modal>
    </div>
  );
};

