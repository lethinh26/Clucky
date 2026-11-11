import { useEffect, useRef, useState } from 'react';
import { Alert, Button, Form, Input, InputNumber, Modal, Progress, Select, Switch } from 'antd';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { getErrorMessage, type CatalogCategory, type Product } from '../../lib/api';
import { ImageField } from './ImageField';

export function ProductForm({ open, onClose, initialProduct, categories, onSaveProduct }: {
  open: boolean; onClose: () => void; initialProduct?: Product | null; categories: CatalogCategory[];
  onSaveProduct: (product: Partial<Product>, file?: File, progress?: (percent: number) => void) => Promise<void>;
}) {
  const [form] = Form.useForm<Product>();
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const lock = useRef(false);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    if (!open) return;
    form.resetFields();
    form.setFieldsValue(initialProduct ? structuredClone(initialProduct) : { isActive: true, basePrice: 0, kcal: 0, spicyLevel: 0, options: [], toppings: [] });
    setFile(null); setError(''); setProgress(0);
  }, [open, initialProduct, form]);

  const save = async (values: Product) => {
    if (lock.current) return;
    lock.current = true; setSaving(true); setError('');
    try {
      await onSaveProduct(values, file ?? undefined, setProgress);
      onClose();
    } catch (failure) {
      if (!(failure && typeof failure === 'object' && 'errorFields' in failure)) setError(getErrorMessage(failure));
    } finally { lock.current = false; setSaving(false); }
  };
  return <Modal className="catalog-modal" open={open} width={1040} centered
    title={<div className="catalog-modal-heading"><span className="catalog-eyebrow">THỰC ĐƠN / MÓN ĂN</span><h3>{initialProduct ? 'Chỉnh sửa món ăn' : 'Thêm món ăn mới'}</h3><p>Thông tin, hình ảnh và các lựa chọn khi khách đặt món.</p></div>}
    okText={initialProduct ? 'Lưu thay đổi' : 'Tạo món ăn'} cancelText="Hủy"
    confirmLoading={saving} cancelButtonProps={{ disabled: saving }} keyboard={!saving}
    onOk={() => form.submit()} onCancel={() => { if (!lock.current) onClose(); }} maskClosable={false} closable={!saving}>
    {error && <Alert type="error" showIcon title={error} description="Nếu dữ liệu đã thay đổi, đóng biểu mẫu và mở lại từ danh sách mới. Nếu lỗi tải ảnh, thông tin món đã được lưu; thử lưu lại để tải ảnh, không tạo thêm món." />}
    <Form name="catalog-product" form={form} layout="vertical" disabled={saving} scrollToFirstError={{ focus: true }} onFinish={values => void save(values)}>
      <div className="catalog-editor"><div className="catalog-editor-main">
      <section className="catalog-section">
        <div className="catalog-section-heading"><span>01</span><h4>Thông tin món ăn</h4></div>
        <Form.Item name="name" label="Tên món" rules={[{ required: true, whitespace: true, message: 'Nhập tên món ăn.' }, { max: 180 }]}><Input size="large" maxLength={180} placeholder="Tên món hiển thị trên thực đơn" /></Form.Item>
        <div className="catalog-field-grid">
          <Form.Item name="categoryId" label="Danh mục" rules={[{ required: true, message: 'Chọn danh mục cho món ăn.' }]}><Select showSearch placeholder="Chọn danh mục" optionFilterProp="label" options={categories.map(category => ({ value: category.id, label: `${category.name}${category.isActive ? '' : ' (ngừng bán)'}` }))} /></Form.Item>
          <Form.Item name="basePrice" label="Giá bán (₫)" rules={[{ required: true }, { type: 'integer', min: 0, max: 999999999999 }]}><InputNumber<number> min={0} max={999999999999} precision={0} formatter={value => `${value ?? ''}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.')} parser={value => Number(value?.replace(/\./g, ''))} /></Form.Item>
        </div>
        <Form.Item name="description" label="Mô tả món ăn" rules={[{ required: true, whitespace: true, message: 'Thêm mô tả món ăn.' }]}><Input.TextArea rows={3} placeholder="Giới thiệu hương vị, thành phần và khẩu phần của món…" /></Form.Item>
        <div className="catalog-field-grid">
          <Form.Item name="kcal" label="Năng lượng (kcal)" rules={[{ type: 'integer', min: 0 }]}><InputNumber min={0} precision={0} /></Form.Item>
          <Form.Item name="spicyLevel" label="Độ cay" rules={[{ type: 'integer', min: 0, max: 3 }]}><Select options={[{ value: 0, label: 'Không cay' }, { value: 1, label: 'Cay nhẹ' }, { value: 2, label: 'Cay vừa' }, { value: 3, label: 'Cay nhiều' }]} /></Form.Item>
        </div>
      </section>
      <section className="catalog-section">
      <div className="catalog-section-heading"><span>02</span><h4>Tùy chọn món ăn</h4></div>
      <Form.List name="options">
        {(groups, { add, remove }) => <>
          {!groups.length && <div className="catalog-empty-note">Chưa có nhóm tùy chọn. Thêm nhóm khi khách cần chọn kích cỡ, hương vị hoặc một biến thể của món.</div>}
          {groups.map(group => <div key={group.key} className="catalog-option-card">
            <div className="catalog-option-header"><span>Nhóm {group.name + 1}</span><Button type="text" size="small" danger icon={<DeleteOutlined />} disabled={saving} onClick={() => remove(group.name)}>Xóa nhóm</Button></div>
            <div className="catalog-field-grid">
              <Form.Item name={[group.name, 'name']} label="Tên nhóm" rules={[{ required: true, whitespace: true }, { max: 80 }]}><Input maxLength={80} placeholder="Tên nhóm lựa chọn" /></Form.Item>
              <Form.Item name={[group.name, 'required']} label="Khách bắt buộc chọn" valuePropName="checked"><Switch /></Form.Item>
            </div>
            <Form.List name={[group.name, 'choices']} rules={[{ validator: async (_, choices) => { if (!choices?.length) throw new Error('Thêm ít nhất một lựa chọn.'); } }]}>
              {(choices, controls, meta) => <>
                {choices.map(choice => <div key={choice.key} className="catalog-option-row">
                  <Form.Item name={[choice.name, 'id']} hidden><Input /></Form.Item>
                  <Form.Item name={[choice.name, 'name']} label="Lựa chọn" rules={[{ required: true, whitespace: true }, { max: 100 }]}><Input maxLength={100} /></Form.Item>
                  <Form.Item name={[choice.name, 'priceAdjustment']} label="Giá thêm (₫)" rules={[{ required: true }, { type: 'integer', min: 0, max: 999999999999 }]}><InputNumber min={0} max={999999999999} precision={0} /></Form.Item>
                  <Button type="text" danger icon={<DeleteOutlined />} aria-label={`Xóa lựa chọn ${choice.name + 1} của nhóm ${group.name + 1}`} disabled={saving} onClick={() => controls.remove(choice.name)} />
                </div>)}
                <Form.ErrorList errors={meta.errors} />
                <Button size="small" type="text" icon={<PlusOutlined />} disabled={saving} onClick={() => controls.add({ id: `new-${crypto.randomUUID()}`, name: '', priceAdjustment: 0 })}>Thêm lựa chọn</Button>
              </>}
            </Form.List>
          </div>)}
          <Button className="catalog-add-row" icon={<PlusOutlined />} disabled={saving} onClick={() => add({ name: '', required: true, choices: [{ id: `new-${crypto.randomUUID()}`, name: '', priceAdjustment: 0 }] })}>Thêm nhóm tùy chọn</Button>
        </>}
      </Form.List>
      </section>
      <section className="catalog-section">
      <div className="catalog-section-heading"><span>03</span><h4>Topping bán kèm</h4></div>
      <Form.List name="toppings">
        {(toppings, { add, remove }) => <>
          {!toppings.length && <div className="catalog-empty-note">Chưa có topping. Chỉ thêm các phần bán kèm thực tế của món.</div>}
          {toppings.map(topping => <div key={topping.key} className="catalog-option-row">
            <Form.Item name={[topping.name, 'id']} hidden><Input /></Form.Item>
            <Form.Item name={[topping.name, 'name']} label="Tên topping" rules={[{ required: true, whitespace: true }, { max: 120 }]}><Input maxLength={120} /></Form.Item>
            <Form.Item name={[topping.name, 'price']} label="Giá (₫)" rules={[{ required: true }, { type: 'integer', min: 0, max: 999999999999 }]}><InputNumber min={0} max={999999999999} precision={0} /></Form.Item>
            <Button type="text" danger icon={<DeleteOutlined />} aria-label={`Xóa topping ${topping.name + 1}`} disabled={saving} onClick={() => remove(topping.name)} />
          </div>)}
          <Button className="catalog-add-row" icon={<PlusOutlined />} disabled={saving} onClick={() => add({ id: `new-${crypto.randomUUID()}`, name: '', price: 0 })}>Thêm topping</Button>
        </>}
      </Form.List>
      </section>
      </div><aside className="catalog-editor-aside">
        <h4>Hình ảnh món ăn</h4>
        <ImageField file={file} url={initialProduct?.imageUrl} name={initialProduct?.name || 'Món ăn mới'} disabled={saving} onChange={setFile} />
        {saving && file && <Progress percent={progress} size="small" />}
        <div className="catalog-publication"><div><strong>Cho phép bán</strong><p>Khả năng đặt món còn phụ thuộc tồn kho và trạng thái từng chi nhánh.</p></div><Form.Item name="isActive" valuePropName="checked"><Switch aria-label="Cho phép bán món ăn" /></Form.Item></div>
      </aside></div>
    </Form>
  </Modal>;
}
