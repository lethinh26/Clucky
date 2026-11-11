import { useEffect, useRef, useState } from 'react';
import { Alert, Button, DatePicker, Form, Input, InputNumber, Modal, Progress, Select, Switch } from 'antd';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import dayjs, { type Dayjs } from 'dayjs';
import { getErrorMessage, type Product } from '../../lib/api';
import type { AdminCombo, ComboPayload } from '../../lib/catalog-administration';
import { CatalogImage, ImageField } from './ImageField';
import { matchesCatalogSearch } from './presentation';

type Values = Omit<ComboPayload, 'startAt' | 'endAt'> & { startAt?: Dayjs | null; endAt?: Dayjs | null };

export function ComboForm({ open, combo, products, onClose, onSave }: {
  open: boolean; combo: AdminCombo | null; products: Product[]; onClose: () => void;
  onSave: (data: ComboPayload, file?: File, progress?: (percent: number) => void) => Promise<void>;
}) {
  const [form] = Form.useForm<Values>();
  const items = Form.useWatch('items', form) as Values['items'] | undefined;
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const lock = useRef(false);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    if (!open) return;
    form.resetFields();
    form.setFieldsValue(combo ? { ...structuredClone(combo), startAt: combo.startAt ? dayjs(combo.startAt) : null, endAt: combo.endAt ? dayjs(combo.endAt) : null }
      : { name: '', description: '', comboPrice: 0, isActive: true, items: [] });
    setFile(null); setError(''); setProgress(0);
  }, [open, combo, form]);
  const save = async (values: Values) => {
    if (lock.current) return;
    lock.current = true; setSaving(true); setError('');
    try {
      await onSave({ ...values, startAt: values.startAt?.toISOString() ?? null, endAt: values.endAt?.toISOString() ?? null,
        items: values.items.map(item => ({ ...item, optionId: item.optionId ?? null, productName: products.find(product => product.id === item.productId)?.name ?? '' })) }, file ?? undefined, setProgress);
      onClose();
    } catch (failure) {
      if (!(failure && typeof failure === 'object' && 'errorFields' in failure)) setError(getErrorMessage(failure));
    } finally { lock.current = false; setSaving(false); }
  };
  return <Modal className="catalog-modal" open={open} width={1040} centered
    title={<div className="catalog-modal-heading"><span className="catalog-eyebrow">THỰC ĐƠN / COMBO</span><h3>{combo ? 'Chỉnh sửa combo' : 'Tạo combo mới'}</h3><p>Kết hợp món ăn, số lượng và lựa chọn trong một mức giá.</p></div>}
    okText={combo ? 'Lưu thay đổi' : 'Tạo combo'} cancelText="Hủy" confirmLoading={saving} cancelButtonProps={{ disabled: saving }} keyboard={!saving}
    onOk={() => form.submit()} onCancel={() => { if (!lock.current) onClose(); }} maskClosable={false} closable={!saving}>
    {error && <Alert type="error" showIcon title={error} description="Nếu dữ liệu đã thay đổi, đóng biểu mẫu và mở lại từ danh sách mới. Nếu lỗi tải ảnh, thông tin combo đã được lưu; thử lưu lại để tải ảnh, không tạo thêm combo." />}
    <Form name="catalog-combo" form={form} layout="vertical" disabled={saving} scrollToFirstError={{ focus: true }} onFinish={values => void save(values)}>
      <div className="catalog-editor"><div className="catalog-editor-main">
      <section className="catalog-section">
        <div className="catalog-section-heading"><span>01</span><h4>Thông tin combo</h4></div>
        <Form.Item name="name" label="Tên combo" rules={[{ required: true, whitespace: true, message: 'Nhập tên combo.' }, { max: 180 }]}><Input size="large" maxLength={180} placeholder="Tên combo hiển thị trên thực đơn" /></Form.Item>
        <Form.Item name="description" label="Mô tả combo" rules={[{ required: true, whitespace: true, message: 'Thêm mô tả cho combo.' }]}><Input.TextArea rows={3} placeholder="Giới thiệu các món và khẩu phần trong combo…" /></Form.Item>
        <Form.Item name="comboPrice" label="Giá bán combo (₫)" rules={[{ required: true }, { type: 'integer', min: 0, max: 999999999999 }]}><InputNumber<number> min={0} max={999999999999} precision={0} formatter={value => `${value ?? ''}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.')} parser={value => Number(value?.replace(/\./g, ''))} /></Form.Item>
      </section>
      <section className="catalog-section">
      <div className="catalog-section-heading"><span>02</span><h4>Món ăn trong combo</h4></div>
      <Form.List name="items" rules={[{ validator: async (_, rows) => { if (!rows?.length) throw new Error('Combo phải có ít nhất một món.'); } }]}>
        {(fields, { add, remove }, meta) => <>
          {!fields.length && <div className="catalog-empty-note">{products.length ? 'Chọn các món có trong combo, sau đó đặt số lượng và lựa chọn đi kèm.' : 'Chưa có món ăn. Hãy tạo món ăn trong thực đơn trước khi tạo combo.'}</div>}
          {fields.map(field => {
            const product = products.find(candidate => candidate.id === items?.[field.name]?.productId);
            const options = product?.options?.flatMap(group => group.choices.map(choice => ({ value: Number(choice.id.replace(/^opt-/, '')), label: `${group.name}: ${choice.name}` }))) ?? [];
            return <div key={field.key} className="catalog-option-card">
              <div className="catalog-option-header"><span>Món {field.name + 1}</span><Button size="small" type="text" danger icon={<DeleteOutlined />} disabled={saving} onClick={() => remove(field.name)} aria-label={`Xóa món ${field.name + 1} khỏi combo`}>Bỏ món</Button></div>
              <Form.Item name={[field.name, 'id']} hidden><InputNumber /></Form.Item>
              <div className="catalog-combo-product">
              <div className="catalog-thumb"><CatalogImage url={product?.imageUrl} name={product?.name || 'Chưa chọn món'} /></div>
              <Form.Item name={[field.name, 'productId']} label="Món ăn" rules={[{ required: true, message: 'Chọn món ăn.' }]}><Select showSearch placeholder="Tìm và chọn món ăn" optionFilterProp="label"
                filterOption={(input, option) => matchesCatalogSearch([option?.label], input)}
                onChange={() => form.setFieldValue(['items', field.name, 'optionId'], null)}
                optionRender={option => <div className="catalog-select-option"><div className="catalog-thumb"><CatalogImage url={option.data.imageUrl} name={option.data.label} preview={false} /></div><span>{option.data.label}</span></div>}
                options={products.map(candidate => ({ value: candidate.id, label: `${candidate.name}${candidate.isActive ? '' : ' (ngừng bán)'}`, imageUrl: candidate.imageUrl }))} /></Form.Item>
              </div>
              <div className="catalog-field-grid">
              <Form.Item name={[field.name, 'quantity']} label="Số lượng" rules={[{ required: true }, { type: 'integer', min: 1, max: 2147483647 }]}><InputNumber min={1} max={2147483647} precision={0} /></Form.Item>
              <Form.Item name={[field.name, 'optionId']} label="Lựa chọn" rules={[{ validator: async (_, selected) => {
                if (selected != null && !options.some(option => option.value === selected)) throw new Error('Lựa chọn không thuộc món ăn này.');
              } }]}><Select allowClear disabled={!product || !options.length || saving} placeholder={product && !options.length ? 'Món không có tùy chọn' : 'Không cố định lựa chọn'} options={options} /></Form.Item>
              </div>
            </div>;
          })}
          <Form.ErrorList errors={meta.errors} />
          <Button className="catalog-add-row" icon={<PlusOutlined />} disabled={saving || !products.length} onClick={() => add({ quantity: 1, optionId: null })}>Thêm món vào combo</Button>
        </>}
      </Form.List>
      </section>
      <section className="catalog-section">
        <div className="catalog-section-heading"><span>03</span><h4>Thời gian áp dụng</h4></div>
        <div className="catalog-field-grid">
          <Form.Item name="startAt" label="Bắt đầu"><DatePicker showTime placeholder="Không giới hạn bắt đầu" format="DD/MM/YYYY HH:mm" /></Form.Item>
          <Form.Item name="endAt" label="Kết thúc" dependencies={['startAt']} rules={[({ getFieldValue }) => ({ validator: async (_, end) => {
            const start = getFieldValue('startAt') as Dayjs | null;
            if (end && start && !end.isAfter(start)) throw new Error('Kết thúc phải sau thời gian bắt đầu.');
          } })]}><DatePicker showTime placeholder="Không giới hạn kết thúc" format="DD/MM/YYYY HH:mm" /></Form.Item>
        </div><p className="catalog-hint">Để trống mốc thời gian nếu không giới hạn. Trạng thái cho phép bán được quản lý riêng.</p>
      </section>
      </div><aside className="catalog-editor-aside">
        <h4>Hình ảnh combo</h4>
        <ImageField file={file} url={combo?.imageUrl} name={combo?.name || 'Combo mới'} disabled={saving} onChange={setFile} />
        {saving && file && <Progress percent={progress} size="small" />}
        <div className="catalog-publication"><div><strong>Cho phép bán</strong><p>Combo còn chịu thời gian áp dụng và khả năng phục vụ của chi nhánh.</p></div><Form.Item name="isActive" valuePropName="checked"><Switch aria-label="Cho phép bán combo" /></Form.Item></div>
      </aside></div>
    </Form>
  </Modal>;
}
