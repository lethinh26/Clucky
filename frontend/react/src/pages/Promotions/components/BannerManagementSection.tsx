import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Empty,
  Input,
  Popconfirm,
  Select,
  Space,
  Spin,
  Switch,
  Tag,
  Typography,
  message,
} from 'antd';
import {
  CalendarOutlined,
  DeleteOutlined,
  EditOutlined,
  LinkOutlined,
  PictureOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import { promotionsApi } from '../../../lib/api';
import type { BannerEffectiveStatus, BannerPosition, PromoBanner } from '../../../types/promotion';
import { BANNER_POSITIONS, BannerModal } from './BannerModal';

const { Title, Text } = Typography;

const STATUS_TAG_COLORS: Record<BannerEffectiveStatus, string> = {
  ACTIVE: 'green',
  UPCOMING: 'gold',
  EXPIRED: 'default',
  DISABLED: 'red',
};

const ALL_STATUSES: BannerEffectiveStatus[] = ['ACTIVE', 'UPCOMING', 'EXPIRED', 'DISABLED'];

export const BannerManagementSection: React.FC = () => {
  const { t } = useTranslation(['admin']);
  const [banners, setBanners] = useState<PromoBanner[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState<string | null>(null);

  const [positionFilter, setPositionFilter] = useState<BannerPosition | 'ALL'>('ALL');
  const [statusFilter, setStatusFilter] = useState<BannerEffectiveStatus | 'ALL'>('ALL');
  const [searchText, setSearchText] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<PromoBanner | null>(null);
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const loadBanners = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setErrorText(null);
    try {
      const data = await promotionsApi.listBanners(
        {
          position: positionFilter === 'ALL' ? undefined : positionFilter,
        },
        signal,
      );
      setBanners(data);
    } catch (err: unknown) {
      if ((err as { name?: string })?.name === 'AbortError') {
        return;
      }
      setErrorText(err instanceof Error ? err.message : t('admin:promotions.banner.loadError'));
    } finally {
      setLoading(false);
    }
  }, [positionFilter, t]);

  useEffect(() => {
    const controller = new AbortController();
    void loadBanners(controller.signal);
    return () => controller.abort();
  }, [loadBanners]);

  const handleOpenCreate = () => {
    setEditingBanner(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (banner: PromoBanner) => {
    setEditingBanner(banner);
    setModalOpen(true);
  };

  const handleModalSuccess = (saved: PromoBanner, mode: 'create' | 'edit') => {
    setModalOpen(false);
    setEditingBanner(null);
    message.success(
      mode === 'create'
        ? t('admin:promotions.banner.saveSuccessCreate')
        : t('admin:promotions.banner.saveSuccessUpdate'),
    );
    setBanners((prev) => {
      if (mode === 'create') {
        return [saved, ...prev];
      }
      return prev.map((item) => (item.id === saved.id ? saved : item));
    });
    void loadBanners();
  };

  const handleToggleActive = async (banner: PromoBanner, nextActive: boolean) => {
    setTogglingId(banner.id);
    try {
      const updated = await promotionsApi.updateBanner(banner.id, {
        title: banner.title,
        linkUrl: banner.linkUrl ?? null,
        position: banner.position,
        displayOrder: banner.displayOrder,
        startAt: banner.startAt ?? null,
        endAt: banner.endAt ?? null,
        isActive: nextActive,
        expectedVersion: banner.version,
      });
      setBanners((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      message.success(t('admin:promotions.banner.saveSuccessUpdate'));
    } catch (err: unknown) {
      message.error(err instanceof Error ? err.message : t('admin:promotions.banner.loadError'));
      void loadBanners();
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async (banner: PromoBanner) => {
    setDeletingId(banner.id);
    try {
      await promotionsApi.deleteBanner(banner.id, banner.version);
      setBanners((prev) => prev.filter((item) => item.id !== banner.id));
      message.success(t('admin:promotions.banner.deleteSuccess'));
    } catch (err: unknown) {
      message.error(err instanceof Error ? err.message : t('admin:promotions.banner.loadError'));
      void loadBanners();
    } finally {
      setDeletingId(null);
    }
  };

  const formatSchedule = (banner: PromoBanner) => {
    const startLabel = banner.startAt ? dayjs(banner.startAt).format('DD/MM/YYYY HH:mm') : null;
    const endLabel = banner.endAt ? dayjs(banner.endAt).format('DD/MM/YYYY HH:mm') : null;
    if (startLabel && endLabel) {
      return t('admin:promotions.banner.fields.scheduleRange', { start: startLabel, end: endLabel });
    }
    if (startLabel) {
      return t('admin:promotions.banner.fields.fromDate', { date: startLabel });
    }
    if (endLabel) {
      return t('admin:promotions.banner.fields.untilDate', { date: endLabel });
    }
    return t('admin:promotions.banner.fields.noSchedule');
  };

  const normalizedQuery = searchText.trim().toLowerCase();
  const filteredBanners = banners.filter((banner) => {
    const effective = banner.effectiveStatus ?? (banner.isActive ? 'ACTIVE' : 'DISABLED');
    if (statusFilter !== 'ALL' && effective !== statusFilter) {
      return false;
    }
    if (!normalizedQuery) {
      return true;
    }
    return (
      banner.title.toLowerCase().includes(normalizedQuery)
      || (banner.linkUrl ?? '').toLowerCase().includes(normalizedQuery)
    );
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Card
        bordered={false}
        style={{
          borderRadius: 16,
          background: '#FFFAF3',
          border: '1px solid rgba(143, 18, 22, 0.12)',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 16,
            flexWrap: 'wrap',
          }}
        >
          <div>
            <Title level={4} style={{ margin: 0, color: '#16100D', display: 'flex', alignItems: 'center', gap: 8 }}>
              <PictureOutlined style={{ color: '#8F1216' }} />
              {t('admin:promotions.banner.title')}
            </Title>
            <Text type="secondary">{t('admin:promotions.banner.subtitle')}</Text>
          </div>
          <Space wrap>
            <Button icon={<ReloadOutlined />} onClick={() => void loadBanners()} loading={loading}>
              {t('admin:promotions.banner.retry')}
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleOpenCreate}
              style={{
                backgroundColor: '#8F1216',
                borderColor: '#8F1216',
                borderRadius: 999,
                fontWeight: 700,
              }}
            >
              {t('admin:promotions.banner.create')}
            </Button>
          </Space>
        </div>

        <div
          style={{
            marginTop: 16,
            display: 'flex',
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          <Input
            allowClear
            prefix={<SearchOutlined style={{ color: '#8C7A6B' }} />}
            placeholder={t('admin:promotions.banner.searchPlaceholder')}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ maxWidth: 280 }}
          />
          <Select
            value={positionFilter}
            onChange={(val) => setPositionFilter(val)}
            style={{ minWidth: 210 }}
            options={[
              { value: 'ALL', label: t('admin:promotions.banner.allPositions') },
              ...BANNER_POSITIONS.map((pos) => ({
                value: pos,
                label: t(`admin:promotions.banner.positions.${pos}`),
              })),
            ]}
          />
          <Select
            value={statusFilter}
            onChange={(val) => setStatusFilter(val)}
            style={{ minWidth: 190 }}
            options={[
              { value: 'ALL', label: t('admin:promotions.banner.allStatuses') },
              ...ALL_STATUSES.map((st) => ({
                value: st,
                label: t(`admin:promotions.banner.statuses.${st}`),
              })),
            ]}
          />
        </div>
      </Card>

      {errorText && (
        <Alert
          type="error"
          showIcon
          message={errorText}
          action={
            <Button size="small" onClick={() => void loadBanners()}>
              {t('admin:promotions.banner.retry')}
            </Button>
          }
        />
      )}

      {loading && banners.length === 0 ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
          <Spin size="large" />
        </div>
      ) : filteredBanners.length === 0 ? (
        <Card bordered={false} style={{ borderRadius: 16 }}>
          <Empty description={t('admin:promotions.banner.empty')} />
        </Card>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: 16,
          }}
        >
          {filteredBanners.map((banner) => {
            const effectiveStatus = banner.effectiveStatus ?? (banner.isActive ? 'ACTIVE' : 'DISABLED');
            return (
              <Card
                key={banner.id}
                hoverable
                style={{
                  borderRadius: 16,
                  overflow: 'hidden',
                  border: '1px solid rgba(143, 18, 22, 0.12)',
                  background: '#FFFFFF',
                }}
                cover={
                  <div style={{ position: 'relative', height: 170, background: '#F5EDE0' }}>
                    <img
                      src={banner.imageUrl}
                      alt={banner.title}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                    />
                    <div
                      style={{
                        position: 'absolute',
                        top: 10,
                        left: 10,
                        display: 'flex',
                        gap: 6,
                        flexWrap: 'wrap',
                      }}
                    >
                      <Tag color={STATUS_TAG_COLORS[effectiveStatus]} style={{ margin: 0, fontWeight: 700 }}>
                        {t(`admin:promotions.banner.statuses.${effectiveStatus}`)}
                      </Tag>
                      <Tag color="volcano" style={{ margin: 0 }}>
                        {t('admin:promotions.banner.fields.orderShort', { order: banner.displayOrder })}
                      </Tag>
                    </div>
                  </div>
                }
                actions={[
                  <Button
                    key="edit"
                    type="text"
                    icon={<EditOutlined />}
                    onClick={() => handleOpenEdit(banner)}
                  >
                    {t('admin:promotions.banner.actions.edit')}
                  </Button>,
                  <Popconfirm
                    key="delete"
                    title={t('admin:promotions.banner.deleteConfirmTitle')}
                    description={t('admin:promotions.banner.deleteConfirmDesc', { title: banner.title })}
                    onConfirm={() => void handleDelete(banner)}
                    okButtonProps={{ danger: true, loading: deletingId === banner.id }}
                  >
                    <Button
                      type="text"
                      danger
                      icon={<DeleteOutlined />}
                      loading={deletingId === banner.id}
                    >
                      {t('admin:promotions.banner.actions.delete')}
                    </Button>
                  </Popconfirm>,
                ]}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                    <Title level={5} style={{ margin: 0, color: '#16100D' }} ellipsis={{ rows: 2 }}>
                      {banner.title}
                    </Title>
                    <Switch
                      size="small"
                      checked={banner.isActive}
                      loading={togglingId === banner.id}
                      onChange={(checked) => void handleToggleActive(banner, checked)}
                    />
                  </div>

                  <div>
                    <Tag color="gold" style={{ margin: 0 }}>
                      {t(`admin:promotions.banner.positions.${banner.position}`)}
                    </Tag>
                  </div>

                  <Text type="secondary" style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <CalendarOutlined />
                    <span>{formatSchedule(banner)}</span>
                  </Text>

                  <Text
                    type="secondary"
                    style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}
                    ellipsis
                  >
                    <LinkOutlined />
                    <span>{banner.linkUrl || t('admin:promotions.banner.fields.noLink')}</span>
                  </Text>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <BannerModal
        open={modalOpen}
        banner={editingBanner}
        onCancel={() => {
          setModalOpen(false);
          setEditingBanner(null);
        }}
        onSuccess={handleModalSuccess}
      />
    </div>
  );
};
