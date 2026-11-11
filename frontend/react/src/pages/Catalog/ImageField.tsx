import { useTranslation } from "react-i18next";
import i18n from "../../i18n/index.ts";
import { useEffect, useState } from 'react';
import { Alert, Button, Image, Upload } from 'antd';
import { EyeOutlined, PictureOutlined, UploadOutlined } from '@ant-design/icons';
import { isCatalogImage } from './presentation';

export function CatalogImage({ url, name, preview = true }: { url?: string | null; name: string; preview?: boolean }) {
  const { t } = useTranslation();
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  if (!url || failedUrl === url) return <div className="catalog-image-empty" role="img" aria-label={`${name}: ${url ? t("admin:ui.unableToLoadImage") : t("admin:ui.noImageYet")}`}>
    <PictureOutlined aria-hidden /><span>{url ? t("admin:ui.imageUnavailable") : t("admin:ui.noImageYet")}</span>
  </div>;
  return <Image src={url} alt={name} width="100%" height="100%" loading="lazy" style={{ objectFit: 'cover' }}
    onError={() => setFailedUrl(url)} tabIndex={preview ? 0 : undefined}
    onKeyDown={event => { if (preview && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); setOpen(true); } }}
    preview={preview ? { open, onOpenChange: setOpen, cover: <EyeOutlined aria-label={t("admin:ui.viewFullImage")} /> } : false} />;
}

export function ImageField({ file, url, name = i18n.t("admin:ui.menuImage"), disabled, onChange }: {
  file: File | null; url?: string | null; name?: string; disabled: boolean; onChange: (file: File | null) => void;
}) {
  const { t } = useTranslation();
  const [preview, setPreview] = useState('');
  const [error, setError] = useState('');
  useEffect(() => { setError(''); }, [file, url]);
  useEffect(() => {
    if (!file) { setPreview(''); return; }
    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);
  return <div className="catalog-image-field">
    <div className="catalog-image-preview"><CatalogImage url={preview || url} name={name} /></div>
    <Upload.Dragger accept="image/png,image/jpeg,image/webp" disabled={disabled} showUploadList={false} multiple={false} beforeUpload={selected => {
      if (!isCatalogImage(selected)) {
        setError(t("admin:ui.chooseANonEmptyPngJpegOrWebp"));
        return Upload.LIST_IGNORE;
      }
      setError(''); onChange(selected); return false;
    }}>
      <UploadOutlined className="catalog-upload-icon" />
      <strong>{url || file ? t("admin:ui.chooseAReplacementImage") : t("admin:ui.chooseADishImage")}</strong>
      <span>{t("admin:ui.dragAnImageHereOrClickToSelect")}</span>
      <small>{t("admin:ui.jpgPngWebpUpTo5Mib")}</small>
    </Upload.Dragger>
    {file && <div className="catalog-file-info"><span title={file.name}>{file.name}</span><small>{(file.size / 1024).toFixed(0)} {t("admin:ui.kbPendingSave")}</small>
      <Button size="small" type="text" disabled={disabled} onClick={() => onChange(null)}>{t("admin:ui.removeSelectedImage")}</Button>
    </div>}
    <p className="catalog-hint">{t("admin:ui.theImageUpdatesOnlyWhenYouSaveChoose")}</p>
    {error && <Alert type="error" showIcon message={error} />}
  </div>;
}
