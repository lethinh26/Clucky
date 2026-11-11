import axios from 'axios';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  Avatar,
  Button,
  Card,
  Col,
  Empty,
  Flex,
  Form,
  Input,
  Modal,
  Rate,
  Row,
  Select,
  Space,
  Statistic,
  Table,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import type { TableColumnsType } from 'antd';
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  DeleteOutlined,
  EyeInvisibleOutlined,
  MessageOutlined,
  ReloadOutlined,
  SearchOutlined,
  ShopOutlined,
  StarFilled,
} from '@ant-design/icons';
import { message } from '../../components/feedback';
import { ConfirmModal } from '../../components/ui/AdminModal';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { useAuth } from '../../context/AuthContext';
import { useLocaleTools } from '../../i18n/hooks';
import { getErrorMessage } from '../../i18n/core';
import {
  catalogApi,
  reviewsApi,
  storesApi,
  type Product,
  type ReviewDto,
  type ReviewModerationSummaryDto,
  type ReviewReplyDto,
  type ReviewStatus,
  type Store,
} from '../../lib/api';
import { PageIntro } from '../Dashboard';

const { Text, Paragraph } = Typography;
const { TextArea } = Input;

const EMPTY_SUMMARY: ReviewModerationSummaryDto = {
  totalReviews: 0,
  visibleCount: 0,
  averageRating: 0,
  unrepliedVisibleCount: 0,
  hiddenCount: 0,
  deletedCount: 0,
};

function createIdempotencyKey(prefix: string): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export const ReviewsPage: React.FC = () => {
  const { t } = useTranslation();
  const { date, locale, number } = useLocaleTools();
  const { user, isAdmin, isStaff } = useAuth();

  const missingAssignedStore = !isAdmin && (!user.storeId || user.storeId <= 0);

  const [reviews, setReviews] = useState<ReviewDto[]>([]);
  const [totalElements, setTotalElements] = useState(0);
  const [summary, setSummary] = useState<ReviewModerationSummaryDto>(EMPTY_SUMMARY);
  const [stores, setStores] = useState<Store[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [reloadTick, setReloadTick] = useState(0);

  // Filters & pagination (server-driven)
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [ratingFilter, setRatingFilter] = useState<number | 'ALL'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | ReviewStatus>('ALL');
  const [replyFilter, setReplyFilter] = useState<'ALL' | 'REPLIED' | 'UNREPLIED'>('ALL');
  const [storeFilter, setStoreFilter] = useState<number | 'ALL'>('ALL');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  // Reply thread UI expand toggle per review ID
  const [expandedReplies, setExpandedReplies] = useState<Record<number, boolean>>({});

  // Reply modal state
  const [replyTarget, setReplyTarget] = useState<ReviewDto | null>(null);
  const [replySubmitting, setReplySubmitting] = useState(false);
  const replyIdempotencyRef = useRef<string>('');
  const [replyForm] = Form.useForm<{ content: string }>();

  // Hide / Soft-delete confirmation modals
  const [hideTarget, setHideTarget] = useState<ReviewDto | null>(null);
  const [hideReason, setHideReason] = useState('');
  const [hideSubmitting, setHideSubmitting] = useState(false);
  const hideIdempotencyRef = useRef<string>('');

  const [deleteTarget, setDeleteTarget] = useState<ReviewDto | null>(null);
  const [deleteReason, setDeleteReason] = useState('');
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const deleteIdempotencyRef = useRef<string>('');

  // Debounce search text into server query
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const normalized = searchInput.trim();
      setSearchQuery((prev) => {
        if (prev !== normalized) {
          setPage(0);
        }
        return normalized;
      });
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  // Load store and product catalogs for name enrichment (non-fatal fallback to #ID)
  useEffect(() => {
    if (missingAssignedStore) return;
    let active = true;
    const controller = new AbortController();
    Promise.allSettled([
      storesApi.list(false, controller.signal),
      catalogApi.listProducts({ activeOnly: false }),
    ]).then(([storeResult, productResult]) => {
      if (!active) return;
      if (storeResult.status === 'fulfilled') {
        setStores(storeResult.value);
      }
      if (productResult.status === 'fulfilled') {
        setProducts(productResult.value);
      }
    });
    return () => {
      active = false;
      controller.abort();
    };
  }, [missingAssignedStore]);

  const storeMap = useMemo(() => {
    const map = new Map<number, Store>();
    for (const store of stores) {
      map.set(store.id, store);
    }
    return map;
  }, [stores]);

  const productMap = useMemo(() => {
    const map = new Map<number, Product>();
    for (const product of products) {
      map.set(product.id, product);
    }
    return map;
  }, [products]);

  const activeStoreParam = useMemo(() => {
    if (!isAdmin) return undefined;
    return storeFilter === 'ALL' ? undefined : storeFilter;
  }, [isAdmin, storeFilter]);

  // Fetch server-paginated moderation reviews and summary
  useEffect(() => {
    if (missingAssignedStore) {
      setReviews([]);
      setTotalElements(0);
      setSummary(EMPTY_SUMMARY);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    let active = true;
    setLoading(true);
    setLoadError('');

    const params = {
      storeId: activeStoreParam,
      status: statusFilter === 'ALL' ? undefined : statusFilter,
      rating: ratingFilter === 'ALL' ? undefined : ratingFilter,
      hasReply:
        replyFilter === 'REPLIED'
          ? true
          : replyFilter === 'UNREPLIED'
            ? false
            : undefined,
      q: searchQuery || undefined,
      page,
      size: pageSize,
    };

    Promise.all([
      reviewsApi.listModeration(params, controller.signal),
      reviewsApi.summaryModeration(activeStoreParam, controller.signal),
    ])
      .then(([listData, summaryData]) => {
        if (!active) return;
        setReviews(listData.content ?? []);
        setTotalElements(listData.totalElements ?? 0);
        setSummary(summaryData);
      })
      .catch((err) => {
        if (!active || axios.isCancel(err)) return;
        setLoadError(getErrorMessage(err, locale));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [
    activeStoreParam,
    locale,
    missingAssignedStore,
    page,
    pageSize,
    ratingFilter,
    reloadTick,
    replyFilter,
    searchQuery,
    statusFilter,
  ]);

  const triggerReload = useCallback(() => {
    setReloadTick((tick) => tick + 1);
  }, []);

  useEffect(() => {
    if (!isAdmin || replyTarget || hideTarget || deleteTarget) return;
    window.addEventListener('focus', triggerReload);
    return () => window.removeEventListener('focus', triggerReload);
  }, [isAdmin, replyTarget, hideTarget, deleteTarget, triggerReload]);

  const hasActiveFilters = Boolean(
    searchInput.trim() ||
      ratingFilter !== 'ALL' ||
      statusFilter !== 'ALL' ||
      replyFilter !== 'ALL' ||
      (isAdmin && storeFilter !== 'ALL')
  );

  const handleResetFilters = () => {
    setSearchInput('');
    setSearchQuery('');
    setRatingFilter('ALL');
    setStatusFilter('ALL');
    setReplyFilter('ALL');
    setStoreFilter('ALL');
    setPage(0);
  };

  const resolveProductName = useCallback(
    (productId: number) =>
      productMap.get(productId)?.name ||
      t('business:reviews.productNumber', { value1: productId }),
    [productMap, t]
  );

  const resolveStoreName = useCallback(
    (storeId?: number | null) => {
      if (!storeId) return t('business:reviews.storeUnassigned');
      return (
        storeMap.get(storeId)?.name ||
        (!isAdmin && user.storeId === storeId && user.storeName
          ? user.storeName
          : t('business:reviews.storeNumber', { value1: storeId }))
      );
    },
    [isAdmin, storeMap, t, user.storeId, user.storeName]
  );

  const formatResponderLabel = useCallback(
    (reply: ReviewReplyDto) => {
      if (reply.responderRole === 'STORE_MANAGER') {
        return t('business:reviews.roleStoreManager', { value1: reply.responderId });
      }
      if (reply.responderRole === 'ADMIN') {
        return t('business:reviews.roleAdmin', { value1: reply.responderId });
      }
      return t('business:reviews.roleStaff', { value1: reply.responderId });
    },
    [t]
  );

  const formatDateTime = useCallback(
    (iso?: string | null) => {
      if (!iso) return '—';
      return date(iso, {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    },
    [date]
  );

  // Reply modal handlers
  const handleOpenReplyModal = (review: ReviewDto) => {
    if (review.status === 'DELETED') {
      message.warning(t('business:reviews.cannotReplyDeleted'));
      return;
    }
    setReplyTarget(review);
    replyForm.resetFields();
    replyIdempotencyRef.current = createIdempotencyKey('reply');
  };

  const handleCloseReplyModal = () => {
    if (replySubmitting) return;
    setReplyTarget(null);
    replyForm.resetFields();
  };

  const handleSendReply = async (values: { content: string }) => {
    if (!replyTarget) return;
    const trimmed = values.content.trim();
    if (trimmed.length < 5) {
      message.warning(t('business:reviews.repliesMustContainAtLeastCharacters'));
      return;
    }
    try {
      setReplySubmitting(true);
      await reviewsApi.reply(replyTarget.id, trimmed, replyIdempotencyRef.current);
      message.success(t('business:reviews.replySentToTheCustomerSuccessfully'));
      setReplyTarget(null);
      replyForm.resetFields();
      triggerReload();
    } catch (err) {
      message.error(getErrorMessage(err, locale));
      triggerReload();
    } finally {
      setReplySubmitting(false);
    }
  };

  // Hide moderation handlers (STORE_MANAGER / ADMIN only)
  const handleOpenHideModal = (review: ReviewDto) => {
    if (isStaff || review.status !== 'VISIBLE') return;
    setHideTarget(review);
    setHideReason('');
    hideIdempotencyRef.current = createIdempotencyKey('hide');
  };

  const handleConfirmHide = async () => {
    if (!hideTarget) return;
    try {
      setHideSubmitting(true);
      await reviewsApi.hide(
        hideTarget.id,
        {
          reason: hideReason.trim() || undefined,
          version: hideTarget.version,
        },
        hideIdempotencyRef.current
      );
      message.success(t('business:reviews.theViolatingReviewHasBeenHiddenFromTheCustomerApp'));
      setHideTarget(null);
      setHideReason('');
      triggerReload();
    } catch (err) {
      message.error(getErrorMessage(err, locale));
      setHideTarget(null);
      setHideReason('');
      triggerReload();
    } finally {
      setHideSubmitting(false);
    }
  };

  // Soft-delete moderation handlers (ADMIN only)
  const handleOpenDeleteModal = (review: ReviewDto) => {
    if (!isAdmin || review.status === 'DELETED') return;
    setDeleteTarget(review);
    setDeleteReason('');
    deleteIdempotencyRef.current = createIdempotencyKey('softdel');
  };

  const handleConfirmSoftDelete = async () => {
    if (!deleteTarget) return;
    try {
      setDeleteSubmitting(true);
      await reviewsApi.softDelete(
        deleteTarget.id,
        {
          reason: deleteReason.trim() || undefined,
          version: deleteTarget.version,
        },
        deleteIdempotencyRef.current
      );
      message.success(t('business:reviews.softDeleteSuccess'));
      setDeleteTarget(null);
      setDeleteReason('');
      triggerReload();
    } catch (err) {
      message.error(getErrorMessage(err, locale));
      setDeleteTarget(null);
      setDeleteReason('');
      triggerReload();
    } finally {
      setDeleteSubmitting(false);
    }
  };

  const columns: TableColumnsType<ReviewDto> = [
    {
      title: t('business:reviews.customerOrder'),
      key: 'customer',
      width: 220,
      render: (_, r) => (
        <Space align="start">
          <Avatar
            style={{
              backgroundColor: '#8F1216',
              fontFamily: 'Fredoka, sans-serif',
              fontWeight: 600,
              flexShrink: 0,
            }}
          >
            {`#${r.customerId}`}
          </Avatar>
          <div>
            <Text strong style={{ color: '#16100D', display: 'block' }}>
              {t('business:reviews.customerLabel', { value1: r.customerId })}
            </Text>
            <Text type="secondary" style={{ fontSize: 12, color: '#6B6259' }}>
              {t('business:reviews.orderNumber', { value1: r.orderId })}
            </Text>
            <div style={{ fontSize: 11, color: '#6B6259', marginTop: 2 }}>
              {formatDateTime(r.createdAt)}
            </div>
          </div>
        </Space>
      ),
    },
    {
      title: t('business:reviews.dishStore'),
      key: 'product',
      width: 240,
      render: (_, r) => (
        <div>
          <Text strong style={{ color: '#16100D', display: 'block' }}>
            {resolveProductName(r.productId)}
          </Text>
          <Space size={4} style={{ fontSize: 12, color: '#6B6259', marginTop: 2 }}>
            <ShopOutlined />
            <span>{resolveStoreName(r.storeId)}</span>
          </Space>
        </div>
      ),
    },
    {
      title: t('business:reviews.ratingComment'),
      key: 'ratingComment',
      render: (_, r) => {
        const isExpanded = Boolean(expandedReplies[r.id]);
        const visibleReplies = isExpanded ? r.replies : r.replies.slice(0, 1);
        return (
          <div>
            <Space style={{ marginBottom: 4 }}>
              <Rate
                disabled
                value={r.rating}
                character={<StarFilled style={{ fontSize: 14 }} />}
                style={{ color: '#C9A227' }}
              />
              <Text strong style={{ color: '#C9A227', fontSize: 13 }}>
                {r.rating.toFixed(1)}
              </Text>
            </Space>
            <Paragraph
              ellipsis={{
                rows: 3,
                expandable: 'collapsible',
                symbol: t('business:reviews.showMore'),
              }}
              style={{
                margin: 0,
                color: r.status === 'DELETED' ? '#6B6259' : '#16100D',
                fontSize: 13,
              }}
            >
              {r.comment}
            </Paragraph>

            {r.replies.length > 0 && (
              <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {visibleReplies.map((rep) => (
                  <div
                    key={rep.id}
                    style={{
                      padding: '8px 12px',
                      background: '#F5EDE0',
                      borderRadius: 10,
                      borderLeft: '3px solid #8F1216',
                    }}
                  >
                    <Flex justify="space-between" align="center" wrap="wrap" gap={6}>
                      <Text strong style={{ fontSize: 11, color: '#8F1216' }}>
                        {t('business:reviews.replyFrom')} {formatResponderLabel(rep)}
                      </Text>
                      <Text type="secondary" style={{ fontSize: 11 }}>
                        {formatDateTime(rep.createdAt)}
                      </Text>
                    </Flex>
                    <div style={{ fontSize: 12, color: '#16100D', marginTop: 4 }}>
                      {rep.content}
                    </div>
                  </div>
                ))}
                {r.replies.length > 1 && (
                  <Button
                    type="link"
                    size="small"
                    style={{ padding: 0, height: 'auto', alignSelf: 'flex-start', color: '#8F1216' }}
                    onClick={() =>
                      setExpandedReplies((prev) => ({ ...prev, [r.id]: !isExpanded }))
                    }
                  >
                    {isExpanded
                      ? t('business:reviews.collapseReplies')
                      : t('business:reviews.showAllReplies', { value1: r.replies.length })}
                  </Button>
                )}
              </div>
            )}
          </div>
        );
      },
    },
    {
      title: t('business:catalog.status'),
      key: 'status',
      width: 170,
      align: 'center',
      render: (_, r) => (
        <Space direction="vertical" size={6} align="center">
          {r.status === 'VISIBLE' && (
            <StatusBadge status="success" text={t('business:reports.showing')} size="small" />
          )}
          {r.status === 'HIDDEN' && (
            <StatusBadge
              status="error"
              text={t('business:reviews.hiddenForViolation')}
              size="small"
            />
          )}
          {r.status === 'DELETED' && (
            <StatusBadge
              status="default"
              text={t('business:reviews.deletedStatus')}
              size="small"
            />
          )}

          {r.status === 'DELETED' && r.deletedAt && (
            <Text type="secondary" style={{ fontSize: 11 }}>
              {t('business:reviews.deletedAtLabel', {
                value1: formatDateTime(r.deletedAt),
              })}
            </Text>
          )}

          {r.status !== 'DELETED' &&
            (r.replies.length > 0 ? (
              <Text type="secondary" style={{ fontSize: 11, color: '#1E7A46' }}>
                <CheckCircleOutlined />{' '}
                {t('business:reviews.repliesCount', { value1: r.replies.length })}
              </Text>
            ) : (
              <Text type="secondary" style={{ fontSize: 11, color: '#D97706' }}>
                <ClockCircleOutlined /> {t('business:reviews.awaitingReply')}
              </Text>
            ))}
        </Space>
      ),
    },
    {
      title: t('business:catalog.actions'),
      key: 'actions',
      width: isAdmin ? 240 : isStaff ? 120 : 180,
      align: 'center',
      render: (_, r) => {
        const isDeleted = r.status === 'DELETED';
        return (
          <Space size={8} wrap>
            <Tooltip title={t('business:reviews.replyToCustomerFeedback')}>
              <Button
                size="small"
                icon={<MessageOutlined />}
                disabled={isDeleted}
                onClick={() => handleOpenReplyModal(r)}
                aria-label={`${t('business:reviews.reply')} #${r.id}`}
                style={{
                  borderColor: '#C9A227',
                  color: '#8F1216',
                  fontWeight: 600,
                  borderRadius: 8,
                }}
              >
                {t('business:reviews.reply')}
              </Button>
            </Tooltip>

            {!isStaff && r.status === 'VISIBLE' && (
              <Tooltip title={t('business:reviews.hideReview')}>
                <Button
                  size="small"
                  danger
                  icon={<EyeInvisibleOutlined />}
                  onClick={() => handleOpenHideModal(r)}
                  aria-label={`${t('business:reviews.hide')} #${r.id}`}
                  style={{ borderRadius: 8 }}
                >
                  {t('business:reviews.hide')}
                </Button>
              </Tooltip>
            )}

            {isAdmin && !isDeleted && (
              <Tooltip title={t('business:reviews.softDeleteReview')}>
                <Button
                  size="small"
                  danger
                  type="primary"
                  icon={<DeleteOutlined />}
                  onClick={() => handleOpenDeleteModal(r)}
                  aria-label={`${t('business:reviews.softDelete')} #${r.id}`}
                  style={{ borderRadius: 8 }}
                >
                  {t('business:reviews.softDelete')}
                </Button>
              </Tooltip>
            )}
          </Space>
        );
      },
    },
  ];

  const statusOptions = useMemo(() => {
    const base = [
      { value: 'ALL', label: t('business:reviews.anyStatus') },
      { value: 'VISIBLE', label: t('business:reviews.visible') },
      { value: 'HIDDEN', label: t('business:reviews.hiddenForViolation') },
    ];
    if (isAdmin) {
      base.push({ value: 'DELETED', label: t('business:reviews.deletedStatus') });
    }
    return base;
  }, [isAdmin, t]);

  return (
    <div className="reviews-page">
      <PageIntro
        eyebrow={t('business:reviews.eyebrow')}
        title={t('business:reviews.reviewsRepliesManagement')}
        description={t(
          'business:reviews.readCustomerFeedbackAfterCompletedOrdersProvideSupportAndModerateViolatingContent'
        )}
        action={
          <Space wrap>
            {!isAdmin && !missingAssignedStore && user.storeId && (
              <Tag
                color="gold"
                style={{
                  borderRadius: 999,
                  fontWeight: 700,
                  fontSize: 13,
                  padding: '4px 12px',
                  color: '#946C00',
                }}
              >
                <ShopOutlined /> {resolveStoreName(user.storeId)}
              </Tag>
            )}
            {!isAdmin && <Button
              icon={<ReloadOutlined />}
              onClick={triggerReload}
              loading={loading}
              disabled={missingAssignedStore}
              style={{ borderRadius: 10 }}
            >
              {t('business:reviews.refresh')}
            </Button>}
          </Space>
        }
      />

      {missingAssignedStore && (
        <Alert
          type="error"
          showIcon
          role="alert"
          style={{ marginBottom: 20, borderRadius: 16 }}
          message={t('business:reviews.missingStoreAssignment')}
        />
      )}

      {loadError && !missingAssignedStore && (
        <Alert
          type="error"
          showIcon
          role="alert"
          style={{ marginBottom: 20, borderRadius: 16 }}
          message={loadError}
          action={
            <Button size="small" type="primary" danger onClick={triggerReload}>
              {t('common:retry')}
            </Button>
          }
        />
      )}

      {/* Summary Statistics */}
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={24} sm={12} md={6}>
          <Card
            loading={loading && totalElements === 0 && !loadError}
            style={{ background: '#FFFAF3', border: '1px solid #E8E2D9', borderRadius: 16 }}
          >
            <Statistic
              title={
                <span style={{ color: '#6B6259', fontWeight: 600 }}>
                  {t('business:reviews.totalReviews')}
                </span>
              }
              value={summary.totalReviews}
              formatter={(val) => number(Number(val ?? 0))}
              suffix={t('business:reviews.reviews')}
              valueStyle={{
                color: '#8F1216',
                fontFamily: 'Fredoka, sans-serif',
                fontWeight: 700,
              }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card
            loading={loading && totalElements === 0 && !loadError}
            style={{ background: '#FFFAF3', border: '1px solid #E8E2D9', borderRadius: 16 }}
          >
            <Statistic
              title={
                <span style={{ color: '#6B6259', fontWeight: 600 }}>
                  {t('business:reviews.averageRating')}
                </span>
              }
              value={summary.averageRating.toFixed(1)}
              prefix={<StarFilled style={{ color: '#C9A227', fontSize: 20, marginRight: 4 }} />}
              suffix="/ 5.0"
              valueStyle={{
                color: '#C9A227',
                fontFamily: 'Fredoka, sans-serif',
                fontWeight: 700,
              }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card
            loading={loading && totalElements === 0 && !loadError}
            style={{ background: '#FFFAF3', border: '1px solid #E8E2D9', borderRadius: 16 }}
          >
            <Statistic
              title={
                <span style={{ color: '#6B6259', fontWeight: 600 }}>
                  {t('business:reviews.needsAReply')}
                </span>
              }
              value={summary.unrepliedVisibleCount}
              formatter={(val) => number(Number(val ?? 0))}
              suffix={t('business:reviews.reviews')}
              valueStyle={{
                color: '#D97706',
                fontFamily: 'Fredoka, sans-serif',
                fontWeight: 700,
              }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card
            loading={loading && totalElements === 0 && !loadError}
            style={{ background: '#FFFAF3', border: '1px solid #E8E2D9', borderRadius: 16 }}
          >
            <Statistic
              title={
                <span style={{ color: '#6B6259', fontWeight: 600 }}>
                  {t('business:reviews.hiddenForViolation')}
                </span>
              }
              value={summary.hiddenCount}
              formatter={(val) => number(Number(val ?? 0))}
              suffix={
                isAdmin && summary.deletedCount > 0
                  ? `${t('business:reviews.entries')} · ${summary.deletedCount} ${t('business:reviews.deletedCountLabel')}`
                  : t('business:reviews.entries')
              }
              valueStyle={{
                color: '#B42318',
                fontFamily: 'Fredoka, sans-serif',
                fontWeight: 700,
              }}
            />
          </Card>
        </Col>
      </Row>

      {/* Filters */}
      <Card
        style={{
          borderRadius: 20,
          background: '#FFFAF3',
          border: '1px solid #E8E2D9',
          marginBottom: 20,
        }}
      >
        <Row gutter={[12, 12]} align="middle">
          <Col xs={24} md={isAdmin ? 8 : 10}>
            <Input
              aria-label={t('business:reviews.searchCustomersDishesOrderCodesComments')}
              placeholder={t('business:reviews.searchCustomersDishesOrderCodesComments')}
              prefix={<SearchOutlined style={{ color: '#8F1216' }} />}
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onPressEnter={() => {
                setSearchQuery(searchInput.trim());
                setPage(0);
              }}
              allowClear
              disabled={missingAssignedStore}
              style={{ borderRadius: 10, height: 40 }}
            />
          </Col>
          <Col xs={12} sm={6} md={4}>
            <Select
              aria-label={t('business:reviews.allRatings')}
              value={ratingFilter}
              disabled={missingAssignedStore}
              onChange={(val) => {
                setRatingFilter(val);
                setPage(0);
              }}
              style={{ width: '100%', height: 40 }}
              options={[
                { value: 'ALL', label: t('business:reviews.allRatings') },
                { value: 5, label: t('business:reviews.starsOption', { value1: 5 }) },
                { value: 4, label: t('business:reviews.starsOption', { value1: 4 }) },
                { value: 3, label: t('business:reviews.starsOption', { value1: 3 }) },
                { value: 2, label: t('business:reviews.starsOption', { value1: 2 }) },
                { value: 1, label: t('business:reviews.starsOption', { value1: 1 }) },
              ]}
            />
          </Col>
          <Col xs={12} sm={6} md={4}>
            <Select
              aria-label={t('business:reviews.allReplies')}
              value={replyFilter}
              disabled={missingAssignedStore}
              onChange={(val) => {
                setReplyFilter(val);
                setPage(0);
              }}
              style={{ width: '100%', height: 40 }}
              options={[
                { value: 'ALL', label: t('business:reviews.allReplies') },
                { value: 'UNREPLIED', label: t('business:reviews.notReplied') },
                { value: 'REPLIED', label: t('business:reviews.replied') },
              ]}
            />
          </Col>
          <Col xs={12} sm={6} md={4}>
            <Select
              aria-label={t('business:reviews.anyStatus')}
              value={statusFilter}
              disabled={missingAssignedStore}
              onChange={(val) => {
                setStatusFilter(val);
                setPage(0);
              }}
              style={{ width: '100%', height: 40 }}
              options={statusOptions}
            />
          </Col>
          {isAdmin && (
            <Col xs={12} sm={6} md={4}>
              <Select
                aria-label={t('business:reviews.anyStore')}
                value={storeFilter}
                onChange={(val) => {
                  setStoreFilter(val);
                  setPage(0);
                }}
                style={{ width: '100%', height: 40 }}
                options={[
                  { value: 'ALL', label: t('business:reviews.anyStore') },
                  ...stores.map((store) => ({
                    value: store.id,
                    label: store.name,
                  })),
                ]}
              />
            </Col>
          )}
          {hasActiveFilters && (
            <Col xs={24} style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button type="link" onClick={handleResetFilters} style={{ color: '#8F1216', padding: 0 }}>
                {t('business:reviews.clearFilters')}
              </Button>
            </Col>
          )}
        </Row>
      </Card>

      {/* Moderation Table */}
      <Card
        style={{
          borderRadius: 20,
          background: '#FFFAF3',
          border: '1px solid #E8E2D9',
        }}
      >
        <Table
          columns={columns}
          dataSource={reviews}
          rowKey="id"
          loading={loading}
          scroll={{ x: 960 }}
          pagination={{
            current: page + 1,
            pageSize,
            total: totalElements,
            showSizeChanger: true,
            pageSizeOptions: [10, 20, 50],
            showTotal: (total) => t('business:reviews.reviewsInTotal', { value1: total }),
            onChange: (nextPage, nextSize) => {
              if (nextSize !== pageSize) {
                setPageSize(nextSize);
                setPage(0);
              } else {
                setPage(Math.max(0, nextPage - 1));
              }
            },
          }}
          locale={{
            emptyText: (
              <Empty description={t('business:reviews.noReviewsMatchTheFilters')}>
                {hasActiveFilters && (
                  <Button onClick={handleResetFilters}>
                    {t('business:reviews.clearFilters')}
                  </Button>
                )}
              </Empty>
            ),
          }}
        />
      </Card>

      {/* Reply Modal */}
      <Modal
        title={
          <span style={{ fontFamily: 'Fredoka, sans-serif', color: '#16100D', fontSize: 18 }}>
            {t('business:reviews.replyToCustomerReview')}
          </span>
        }
        open={Boolean(replyTarget)}
        onCancel={handleCloseReplyModal}
        footer={null}
        destroyOnClose
        maskClosable={!replySubmitting}
        closable={!replySubmitting}
        keyboard={!replySubmitting}
      >
        {replyTarget && (
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
                  {t('business:reviews.customerLabel', { value1: replyTarget.customerId })}
                </Text>
                <Rate
                  disabled
                  value={replyTarget.rating}
                  character={<StarFilled style={{ fontSize: 12 }} />}
                  style={{ color: '#C9A227' }}
                />
              </Flex>
              <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
                {t('business:reviews.dish')}{' '}
                <span style={{ fontWeight: 600 }}>{resolveProductName(replyTarget.productId)}</span>{' '}
                ({t('business:reviews.orderNumber', { value1: replyTarget.orderId })})
              </Text>
              <Paragraph style={{ margin: 0, fontStyle: 'italic', color: '#16100D' }}>
                &ldquo;{replyTarget.comment}&rdquo;
              </Paragraph>
            </div>

            {replyTarget.replies.length > 0 && (
              <div style={{ marginBottom: 16, maxHeight: 200, overflowY: 'auto' }}>
                <Text strong style={{ fontSize: 13, color: '#6B6259' }}>
                  {t('business:reviews.previousReplies')}
                </Text>
                {replyTarget.replies.map((rep) => (
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
                    <Flex justify="space-between" gap={8}>
                      <Text strong style={{ fontSize: 12, color: '#8F1216' }}>
                        {formatResponderLabel(rep)}
                      </Text>
                      <Text type="secondary" style={{ fontSize: 11 }}>
                        {formatDateTime(rep.createdAt)}
                      </Text>
                    </Flex>
                    <div style={{ fontSize: 13, marginTop: 4 }}>{rep.content}</div>
                  </div>
                ))}
              </div>
            )}

            <Form
              form={replyForm}
              layout="vertical"
              onFinish={handleSendReply}
              onValuesChange={() => {
                replyIdempotencyRef.current = createIdempotencyKey('reply');
              }}
            >
              <Form.Item
                name="content"
                label={<Text strong>{t('business:reviews.newReply')}</Text>}
                rules={[
                  { required: true, message: t('business:reviews.pleaseEnterAReply') },
                  {
                    validator: (_, val: string | undefined) => {
                      const trimmed = (val ?? '').trim();
                      if (!trimmed) {
                        return Promise.reject(new Error(t('business:reviews.pleaseEnterAReply')));
                      }
                      if (trimmed.length < 5) {
                        return Promise.reject(
                          new Error(t('business:reviews.repliesMustContainAtLeastCharacters'))
                        );
                      }
                      if (trimmed.length > 1000) {
                        return Promise.reject(new Error(t('business:reviews.replyMaxChars')));
                      }
                      return Promise.resolve();
                    },
                  },
                ]}
              >
                <TextArea
                  rows={4}
                  placeholder={t(
                    'business:reviews.thankTheCustomerExplainTheSituationOrOfferAProfessionalSolution'
                  )}
                  maxLength={1000}
                  showCount
                  disabled={replySubmitting}
                  style={{ borderRadius: 10 }}
                />
              </Form.Item>

              <Flex justify="end" gap={10}>
                <Button
                  onClick={handleCloseReplyModal}
                  disabled={replySubmitting}
                  style={{ borderRadius: 8 }}
                >
                  {t('business:account.cancel')}
                </Button>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={replySubmitting}
                  style={{
                    backgroundColor: '#8F1216',
                    borderColor: '#8F1216',
                    fontWeight: 700,
                    borderRadius: 8,
                  }}
                >
                  {t('business:reviews.sendReply')}
                </Button>
              </Flex>
            </Form>
          </div>
        )}
      </Modal>

      {/* Hide Confirmation Modal (STORE_MANAGER / ADMIN) */}
      <ConfirmModal
        open={Boolean(hideTarget)}
        title={t('business:reviews.hideThisViolatingReview')}
        danger
        loading={hideSubmitting}
        confirmText={t('business:reviews.hideActionConfirm')}
        onCancel={() => {
          if (hideSubmitting) return;
          setHideTarget(null);
          setHideReason('');
        }}
        onConfirm={() => void handleConfirmHide()}
        content={
          hideTarget && (
            <div style={{ textAlign: 'left' }}>
              <p style={{ marginTop: 0 }}>
                {t('business:reviews.theReviewWillNoLongerAppearOnTheCustomerDishDetailsPage')}
              </p>
              <p style={{ fontSize: 12, color: '#6B6259', marginBottom: 10 }}>
                {t('business:reviews.hideConfirmSubtitle', {
                  value1: hideTarget.id,
                  value2: resolveProductName(hideTarget.productId),
                })}
              </p>
              <label
                htmlFor="hide-review-reason"
                style={{ display: 'block', fontWeight: 600, marginBottom: 6, color: '#16100D' }}
              >
                {t('business:reviews.moderationNoteOptional')}
              </label>
              <TextArea
                id="hide-review-reason"
                rows={3}
                maxLength={500}
                showCount
                disabled={hideSubmitting}
                value={hideReason}
                onChange={(e) => {
                  setHideReason(e.target.value);
                  hideIdempotencyRef.current = createIdempotencyKey('hide');
                }}
                placeholder={t('business:reviews.moderationNotePlaceholder')}
              />
            </div>
          )
        }
      />

      {/* Soft-Delete Confirmation Modal (ADMIN only) */}
      <ConfirmModal
        open={Boolean(deleteTarget)}
        title={t('business:reviews.softDeleteConfirmTitle')}
        danger
        loading={deleteSubmitting}
        confirmText={t('business:reviews.softDeleteActionConfirm')}
        onCancel={() => {
          if (deleteSubmitting) return;
          setDeleteTarget(null);
          setDeleteReason('');
        }}
        onConfirm={() => void handleConfirmSoftDelete()}
        content={
          deleteTarget && (
            <div style={{ textAlign: 'left' }}>
              <p style={{ marginTop: 0 }}>{t('business:reviews.softDeleteConfirmDesc')}</p>
              <p style={{ fontSize: 12, color: '#6B6259', marginBottom: 10 }}>
                {t('business:reviews.hideConfirmSubtitle', {
                  value1: deleteTarget.id,
                  value2: resolveProductName(deleteTarget.productId),
                })}
              </p>
              <label
                htmlFor="soft-delete-review-reason"
                style={{ display: 'block', fontWeight: 600, marginBottom: 6, color: '#16100D' }}
              >
                {t('business:reviews.moderationNoteOptional')}
              </label>
              <TextArea
                id="soft-delete-review-reason"
                rows={3}
                maxLength={500}
                showCount
                disabled={deleteSubmitting}
                value={deleteReason}
                onChange={(e) => {
                  setDeleteReason(e.target.value);
                  deleteIdempotencyRef.current = createIdempotencyKey('softdel');
                }}
                placeholder={t('business:reviews.moderationNotePlaceholder')}
              />
            </div>
          )
        }
      />
    </div>
  );
};

export default ReviewsPage;
