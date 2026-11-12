import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Button,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Modal,
  Progress,
  Select,
  Space,
  Switch,
  Typography,
  Upload,
} from 'antd';
import { DeleteOutlined, InboxOutlined } from '@ant-design/icons';
import dayjs, { type Dayjs } from 'dayjs';
import { useTranslation } from 'react-i18next';
import { promotionsApi } from '../../../lib/api';
import type { BannerPayload, BannerPosition, PromoBanner } from '../../../types/promotion';

const { Text } = Typography;

const MAX_BANNER_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_BANNER_MIME_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);
const ALLOWED_BANNER_EXT_RE = /\.(png|jpe?g|webp)$/i;

export const BANNER_POSITIONS: BannerPosition[] = ['HERO_HOME', 'POPUP'];

export function isValidBannerLinkUrl(value?: string | null): boolean {
  const trimmed = (value ?? '').trim();
  if (!trimmed) {
    return true;
  }
  if (trimmed.startsWith('/')) {
    return !trimmed.startsWith('//');
  }
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export function validateBannerImageFile(file: File): 'type' | 'size' | null {
  const mime = (file.type || '').toLowerCase();
  const hasValidType = ALLOWED_BANNER_MIME_TYPES.has(mime) || (!mime && ALLOWED_BANNER_EXT_RE.test(file.name));
  if (!hasValidType) {
    return 'type';
  }
  if (file.size <= 0 || file.size > MAX_BANNER_IMAGE_BYTES) {
    return 'size';
  }
  return null;
}

interface BannerFormValues {
  title: string;
  position: BannerPosition;
  displayOrder: number;
  linkUrl?: string;
  startAt?: Dayjs | null;
  endAt?: Dayjs | null;
  isActive: boolean;
}

interface BannerModalProps {
  open: boolean;
  banner: PromoBanner | null;
  onCancel: () => void;
  onSuccess: (saved: PromoBanner, mode: 'create' | 'edit') => void;
}

export const BannerModal: React.FC<BannerModalProps> = ({ open, banner, onCancel, onSuccess }) => {
  const { t } = useTranslation(['admin']);
  const [form] = Form.useForm<BannerFormValues>();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadPercent, setUploadPercent] = useState<number>(0);
  const [submitting, setSubmitting] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  const lockRef = useRef(false);
  const savedBannerRef = useRef<PromoBanner | null>(null);

  useEffect(() => {
    if (!selectedFile) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(selectedFile);
    setPreviewUrl(url);
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [selectedFile]);

  useEffect(() => {
    if (!open) {
      return;
    }
    savedBannerRef.current = banner;
    setSelectedFile(null);
    setUploadPercent(0);
    setErrorText(null);
    setFileError(null);

    if (banner) {
      form.setFieldsValue({
        title: banner.title,
        position: banner.position,
        displayOrder: banner.displayOrder ?? 0,
        linkUrl: banner.linkUrl ?? '',
        startAt: banner.startAt ? dayjs(banner.startAt) : null,
        endAt: banner.endAt ? dayjs(banner.endAt) : null,
        isActive: banner.isActive,
      });
    } else {
      form.setFieldsValue({
        title: '',
        position: 'HERO_HOME',
        displayOrder: 0,
        linkUrl: '',
        startAt: null,
        endAt: null,
        isActive: true,
      });
    }
  }, [open, banner, form]);

  const handleFileChoose = (file: File) => {
    const validationError = validateBannerImageFile(file);
    if (validationError === 'type') {
      setFileError(t('admin:promotions.banner.validation.imageTypeInvalid'));
      return Upload.LIST_IGNORE;
    }
    if (validationError === 'size') {
      setFileError(t('admin:promotions.banner.validation.imageTooLarge'));
      return Upload.LIST_IGNORE;
    }
    setFileError(null);
    setSelectedFile(file);
    setUploadPercent(0);
    return false;
  };

  const handleSubmit = async () => {
    if (lockRef.current) {
      return;
    }
    setErrorText(null);
    setFileError(null);

    let values: BannerFormValues;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }

    const currentBanner = savedBannerRef.current ?? banner;
    const isCreate = !currentBanner;
    if (isCreate && !selectedFile) {
      setFileError(t('admin:promotions.banner.validation.imageRequired'));
      return;
    }

    const payload: BannerPayload = {
      title: values.title.trim(),
      position: values.position,
      displayOrder: values.displayOrder ?? 0,
      linkUrl: values.linkUrl?.trim() ? values.linkUrl.trim() : null,
      startAt: values.startAt ? values.startAt.toISOString() : null,
      endAt: values.endAt ? values.endAt.toISOString() : null,
      isActive: Boolean(values.isActive),
      expectedVersion: currentBanner?.version,
    };

    lockRef.current = true;
    setSubmitting(true);
    setUploadPercent(0);

    try {
      if (isCreate && selectedFile) {
        const created = await promotionsApi.createBanner(payload, selectedFile, setUploadPercent);
        savedBannerRef.current = created;
        onSuccess(created, 'create');
        return;
      }

      if (currentBanner) {
        let updated = await promotionsApi.updateBanner(currentBanner.id, payload);
        savedBannerRef.current = updated;
        if (selectedFile) {
          updated = await promotionsApi.uploadBannerImage(
            updated.id,
            updated.version,
            selectedFile,
            setUploadPercent,
          );
          savedBannerRef.current = updated;
        }
        onSuccess(updated, 'edit');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t('admin:promotions.banner.loadError');
      setErrorText(msg);
    } finally {
      lockRef.current = false;
      setSubmitting(false);
    }
  };

  const displayImageSrc = previewUrl || banner?.imageUrl || null;
  const isEditing = Boolean(banner);

  return (
    <Modal
      open={open}
      title={isEditing ? t('admin:promotions.banner.edit') : t('admin:promotions.banner.create')}
      onCancel={submitting ? undefined : onCancel}
      maskClosable={!submitting}
      closable={!submitting}
      width={680}
      footer={[
        <Button key="cancel" onClick={onCancel} disabled={submitting}>
          {t('admin:promotions.banner.actions.cancel')}
        </Button>,
        <Button
          key="submit"
          type="primary"
          loading={submitting}
          onClick={handleSubmit}
          style={{ backgroundColor: '#8F1216', borderColor: '#8F1216' }}
        >
          {isEditing
            ? t('admin:promotions.banner.actions.saveUpdate')
            : t('admin:promotions.banner.actions.saveCreate')}
        </Button>,
      ]}
    >
      <Form form={form} layout="vertical" style={{ marginTop: 12 }}>
        {errorText && (
          <Alert
            type="error"
            showIcon
            message={errorText}
            style={{ marginBottom: 16 }}
          />
        )}

        <Form.Item
          name="title"
          label={t('admin:promotions.banner.fields.title')}
          rules={[
            { required: true, whitespace: true, message: t('admin:promotions.banner.validation.titleRequired') },
            { max: 180, message: t('admin:promotions.banner.validation.titleMax') },
          ]}
        >
          <Input
            maxLength={180}
            placeholder={t('admin:promotions.banner.fields.titlePlaceholder')}
          />
        </Form.Item>

        <Space size={16} style={{ display: 'flex', width: '100%' }} wrap>
          <Form.Item
            name="position"
            label={t('admin:promotions.banner.fields.position')}
            rules={[{ required: true, message: t('admin:promotions.banner.validation.positionRequired') }]}
            style={{ minWidth: 240, flex: 1 }}
          >
            <Select
              options={BANNER_POSITIONS.map((pos) => ({
                value: pos,
                label: t(`admin:promotions.banner.positions.${pos}`),
              }))}
            />
          </Form.Item>

          <Form.Item
            name="displayOrder"
            label={t('admin:promotions.banner.fields.displayOrder')}
            rules={[
              { required: true, message: t('admin:promotions.banner.validation.orderRequired') },
              {
                validator: (_, val) =>
                  typeof val === 'number' && val >= 0
                    ? Promise.resolve()
                    : Promise.reject(new Error(t('admin:promotions.banner.validation.orderMin'))),
              },
            ]}
            style={{ width: 170 }}
          >
            <InputNumber min={0} max={9999} style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            name="isActive"
            label={t('admin:promotions.banner.fields.isActive')}
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
        </Space>

        <Form.Item
          name="linkUrl"
          label={t('admin:promotions.banner.fields.linkUrl')}
          rules={[
            {
              validator: (_, value) =>
                isValidBannerLinkUrl(value)
                  ? Promise.resolve()
                  : Promise.reject(new Error(t('admin:promotions.banner.validation.linkInvalid'))),
            },
          ]}
        >
          <Input
            maxLength={1024}
            placeholder={t('admin:promotions.banner.fields.linkUrlPlaceholder')}
          />
        </Form.Item>

        <Space size={16} style={{ display: 'flex', width: '100%' }} wrap>
          <Form.Item
            name="startAt"
            label={t('admin:promotions.banner.fields.startAt')}
            style={{ minWidth: 250, flex: 1 }}
          >
            <DatePicker showTime style={{ width: '100%' }} allowClear />
          </Form.Item>

          <Form.Item
            name="endAt"
            label={t('admin:promotions.banner.fields.endAt')}
            dependencies={['startAt']}
            rules={[
              ({ getFieldValue }) => ({
                validator(_, value: Dayjs | null | undefined) {
                  const startAt = getFieldValue('startAt') as Dayjs | null | undefined;
                  if (startAt && value && !value.isAfter(startAt)) {
                    return Promise.reject(new Error(t('admin:promotions.banner.validation.endAfterStart')));
                  }
                  return Promise.resolve();
                },
              }),
            ]}
            style={{ minWidth: 250, flex: 1 }}
          >
            <DatePicker showTime style={{ width: '100%' }} allowClear />
          </Form.Item>
        </Space>

        <Form.Item
          label={t('admin:promotions.banner.fields.image')}
          required={!isEditing}
          validateStatus={fileError ? 'error' : undefined}
          help={fileError || undefined}
        >
          {displayImageSrc && (
            <div
              style={{
                marginBottom: 12,
                borderRadius: 12,
                overflow: 'hidden',
                border: '1px solid rgba(143, 18, 22, 0.16)',
                background: '#FFFAF3',
              }}
            >
              <img
                src={displayImageSrc}
                alt={t('admin:promotions.banner.upload.previewAlt')}
                style={{
                  width: '100%',
                  maxHeight: 190,
                  objectFit: 'cover',
                  display: 'block',
                }}
              />
            </div>
          )}

          <Upload.Dragger
            accept="image/png,image/jpeg,image/webp"
            maxCount={1}
            showUploadList={false}
            beforeUpload={handleFileChoose}
            disabled={submitting}
          >
            <p className="ant-upload-drag-icon">
              <InboxOutlined style={{ color: '#8F1216' }} />
            </p>
            <p className="ant-upload-text">
              {t('admin:promotions.banner.upload.dragHint')}
            </p>
            <p className="ant-upload-hint">
              {t('admin:promotions.banner.upload.formatHint')}
              {isEditing ? ` (${t('admin:promotions.banner.upload.replaceHint')})` : ''}
            </p>
          </Upload.Dragger>

          {selectedFile && (
            <div
              style={{
                marginTop: 8,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 8,
              }}
            >
              <Text type="secondary" ellipsis>
                {selectedFile.name} ({Math.round(selectedFile.size / 1024)} KB)
              </Text>
              <Button
                size="small"
                type="text"
                danger
                icon={<DeleteOutlined />}
                disabled={submitting}
                onClick={() => setSelectedFile(null)}
              >
                {t('admin:promotions.banner.upload.removeSelected')}
              </Button>
            </div>
          )}

          {submitting && selectedFile && (
            <div style={{ marginTop: 10 }}>
              <Text type="secondary">{t('admin:promotions.banner.upload.uploading')}</Text>
              <Progress percent={uploadPercent} size="small" strokeColor="#8F1216" />
            </div>
          )}
        </Form.Item>
      </Form>
    </Modal>
  );
};

