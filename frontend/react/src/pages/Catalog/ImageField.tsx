import { useEffect, useState } from 'react';
import { Alert, Button, Image, Upload } from 'antd';
import { EyeOutlined, PictureOutlined, UploadOutlined } from '@ant-design/icons';
import { isCatalogImage } from './presentation';

export function CatalogImage({ url, name, preview = true }: { url?: string | null; name: string; preview?: boolean }) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  if (!url || failedUrl === url) return <div className="catalog-image-empty" role="img" aria-label={`${name}: ${url ? 'Không tải được ảnh' : 'Chưa có ảnh'}`}>
    <PictureOutlined aria-hidden /><span>{url ? 'Ảnh không khả dụng' : 'Chưa có ảnh'}</span>
  </div>;
  return <Image src={url} alt={name} width="100%" height="100%" loading="lazy" style={{ objectFit: 'cover' }}
    onError={() => setFailedUrl(url)} tabIndex={preview ? 0 : undefined}
    onKeyDown={event => { if (preview && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); setOpen(true); } }}
    preview={preview ? { open, onOpenChange: setOpen, cover: <EyeOutlined aria-label="Xem ảnh lớn" /> } : false} />;
}

export function ImageField({ file, url, name = 'Ảnh thực đơn', disabled, onChange }: {
  file: File | null; url?: string | null; name?: string; disabled: boolean; onChange: (file: File | null) => void;
}) {
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
        setError('Chọn ảnh PNG, JPEG hoặc WebP không rỗng, tối đa 5 MiB.');
        return Upload.LIST_IGNORE;
      }
      setError(''); onChange(selected); return false;
    }}>
      <UploadOutlined className="catalog-upload-icon" />
      <strong>{url || file ? 'Chọn ảnh thay thế' : 'Chọn ảnh món ăn'}</strong>
      <span>Kéo thả hoặc bấm để chọn ảnh</span>
      <small>JPG, PNG, WebP · tối đa 5 MiB</small>
    </Upload.Dragger>
    {file && <div className="catalog-file-info"><span title={file.name}>{file.name}</span><small>{(file.size / 1024).toFixed(0)} KB · Chờ lưu</small>
      <Button size="small" type="text" disabled={disabled} onClick={() => onChange(null)}>Bỏ ảnh đã chọn</Button>
    </div>}
    <p className="catalog-hint">Ảnh chỉ được cập nhật khi lưu. Nên chọn ảnh rõ nét, món ăn nằm giữa khung hình.</p>
    {error && <Alert type="error" showIcon message={error} />}
  </div>;
}
