import React, { useState, useEffect } from 'react';
import {
  Form,
  Input,
  InputNumber,
  Select,
  Radio,
  Button,
  Space,
  Upload,
  Divider,
  Card,
  Tabs,
  Typography,
  message,
  Switch,
  DatePicker,
  Progress,
  Alert,
} from 'antd';
import type { UploadProps, UploadFile } from 'antd';
import {
  InboxOutlined,
  PlusOutlined,
  DeleteOutlined,
  FireOutlined,
  PictureOutlined,
  SaveOutlined,
  LoadingOutlined,
} from '@ant-design/icons';
import { AdminDrawer } from '../../components/ui/AdminDrawer';
import { CategoryIcon } from '../../components/ui/CategoryIcon';
import { Product, Combo, ProductOptionGroup, ProductTopping, mockProducts } from '../../mocks/catalogData';
import { catalogApi, getErrorMessage } from '../../lib/api';

interface ProductFormProps {
  open: boolean;
  onClose: () => void;
  initialProduct?: Product | null;
  onSaveProduct: (product: Partial<Product>) => void;
  onSaveCombo?: (combo: Partial<Combo>) => void;
}

export const ProductForm: React.FC<ProductFormProps> = ({
  open,
  onClose,
  initialProduct,
  onSaveProduct,
  onSaveCombo,
}) => {
  const [form] = Form.useForm();
  const [comboForm] = Form.useForm();
  const [activeTab, setActiveTab] = useState<'product' | 'combo'>('product');
  const [imageUrl, setImageUrl] = useState<string>('');
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [optionGroups, setOptionGroups] = useState<ProductOptionGroup[]>([]);
  const [toppings, setToppings] = useState<ProductTopping[]>([]);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploading, setUploading] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  useEffect(() => {
    if (initialProduct) {
      form.setFieldsValue({
        name: initialProduct.name,
        slug: initialProduct.slug,
        categoryId: initialProduct.categoryId,
        basePrice: initialProduct.basePrice,
        kcal: initialProduct.kcal,
        spicyLevel: initialProduct.spicyLevel,
        description: initialProduct.description,
        isActive: initialProduct.isActive,
      });
      setImageUrl(initialProduct.imageUrl || '');
      setOptionGroups(initialProduct.options || []);
      setToppings(initialProduct.toppings || []);
      if (initialProduct.imageUrl) {
        setFileList([
          {
            uid: '-1',
            name: 'product-image.png',
            status: 'done',
            url: initialProduct.imageUrl,
          },
        ]);
      }
    } else {
      form.resetFields();
      setImageUrl('');
      setFileList([]);
      setOptionGroups([
        {
          id: 'opt-size',
          name: 'Kích thước',
          required: true,
          choices: [
            { id: 'size-m', name: 'Tiêu chuẩn (Vừa)', priceAdjustment: 0 },
            { id: 'size-l', name: 'Lớn (+30% khẩu phần)', priceAdjustment: 20000 },
          ],
        },
      ]);
      setToppings([
        { id: 'top-cheese', name: 'Sốt phô mai cay', price: 15000 },
        { id: 'top-snow', name: 'Bột phô mai tuyết', price: 10000 },
      ]);
    }
  }, [initialProduct, open, form]);

  // Auto-generate slug from name
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    const slug = name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[đĐ]/g, 'd')
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-');
    form.setFieldsValue({ slug });
  };

  // Image Upload Validator according to SRS / task guidelines (< 5MB, MIME png/jpeg/webp)
  const beforeUpload = async (file: File) => {
    setUploadError(null);
    setUploadProgress(0);
    const isAcceptedFormat = ['image/jpeg', 'image/png', 'image/webp'].includes(file.type);
    if (!isAcceptedFormat) {
      const err = 'Chỉ chấp nhận file ảnh định dạng PNG, JPG hoặc WEBP!';
      setUploadError(err);
      message.error(err);
      return Upload.LIST_IGNORE;
    }
    const isLt5M = file.size / 1024 / 1024 < 5;
    if (!isLt5M) {
      const err = 'Dung lượng ảnh tối đa là 5MB!';
      setUploadError(err);
      message.error(err);
      return Upload.LIST_IGNORE;
    }

    setSelectedFile(file);

    // Instant local preview (INT-72)
    const reader = new FileReader();
    reader.onload = (e) => {
      const url = e.target?.result as string;
      setImageUrl(url);
    };
    reader.readAsDataURL(file);

    // If editing an existing product, upload to Cloudinary immediately with live progress
    if (initialProduct?.id) {
      try {
        setUploading(true);
        setUploadProgress(10);
        const updated = await catalogApi.uploadProductImage(
          initialProduct.id,
          file,
          (percent) => setUploadProgress(percent)
        );
        setImageUrl(updated.imageUrl);
        setUploadProgress(100);
        message.success('Đã tải ảnh lên Cloudinary thành công!');
      } catch (err) {
        const errMsg = getErrorMessage(err, 'Lỗi tải ảnh lên Cloudinary!');
        setUploadError(errMsg);
        message.error(errMsg);
      } finally {
        setUploading(false);
      }
    }

    return false; // Prevent automatic HTTP post
  };

  const handleUploadChange: UploadProps['onChange'] = (info) => {
    setFileList(info.fileList.slice(-1));
  };

  // Dynamic Options Management
  const addOptionChoice = (groupIndex: number) => {
    const updated = [...optionGroups];
    updated[groupIndex].choices.push({
      id: `choice-${Date.now()}`,
      name: '',
      priceAdjustment: 0,
    });
    setOptionGroups(updated);
  };

  const removeOptionChoice = (groupIndex: number, choiceIndex: number) => {
    const updated = [...optionGroups];
    updated[groupIndex].choices.splice(choiceIndex, 1);
    setOptionGroups(updated);
  };

  const addOptionGroup = () => {
    setOptionGroups([
      ...optionGroups,
      {
        id: `opt-${Date.now()}`,
        name: 'Nhóm tùy chọn mới',
        required: true,
        choices: [{ id: `choice-${Date.now()}-1`, name: 'Mặc định', priceAdjustment: 0 }],
      },
    ]);
  };

  const removeOptionGroup = (index: number) => {
    const updated = [...optionGroups];
    updated.splice(index, 1);
    setOptionGroups(updated);
  };

  // Dynamic Toppings Management
  const addTopping = () => {
    setToppings([
      ...toppings,
      { id: `top-${Date.now()}`, name: '', price: 10000 },
    ]);
  };

  const removeTopping = (index: number) => {
    const updated = [...toppings];
    updated.splice(index, 1);
    setToppings(updated);
  };

  const handleProductSubmit = async () => {
    try {
      const values = await form.validateFields();
      const payload: Partial<Product> = {
        ...values,
        id: initialProduct?.id || Date.now(),
        imageUrl: imageUrl || 'https://images.unsplash.com/photo-1562967916-eb82221dfb92?w=600',
        options: optionGroups,
        toppings: toppings,
        isAvailable: true,
        isSoldOut: false,
      };
      onSaveProduct(payload);
      message.success(initialProduct ? 'Đã cập nhật món ăn thành công!' : 'Đã thêm món ăn mới vào thực đơn!');
      onClose();
    } catch {
      message.error('Vui lòng kiểm tra lại các trường thông tin bắt buộc.');
    }
  };

  const handleComboSubmit = async () => {
    try {
      const values = await comboForm.validateFields();
      if (onSaveCombo) {
        onSaveCombo({
          id: Date.now(),
          ...values,
          imageUrl: imageUrl || 'https://images.unsplash.com/photo-1513639776629-7b61b0ac49cb?w=600',
          isActive: true,
        });
      }
      message.success('Đã tạo gói Combo mới thành công!');
      onClose();
    } catch {
      message.error('Vui lòng điền đầy đủ thông tin combo.');
    }
  };

  return (
    <AdminDrawer
      open={open}
      onClose={onClose}
      title={initialProduct ? 'Chỉnh sửa món ăn' : 'Thêm mới vào Thực đơn'}
      subtitle="Quản lý thông tin định lượng, tùy chọn options và toppings chuẩn Clucky"
      width={720}
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
          <Button onClick={onClose} style={{ borderRadius: 999, height: 40, padding: '0 20px' }}>
            Hủy bỏ
          </Button>
          <Button
            type="primary"
            icon={<SaveOutlined />}
            onClick={activeTab === 'product' ? handleProductSubmit : handleComboSubmit}
            style={{
              backgroundColor: '#8F1216',
              borderColor: '#8F1216',
              borderRadius: 999,
              height: 40,
              padding: '0 24px',
              fontWeight: 700,
            }}
          >
            {initialProduct ? 'Cập nhật món' : 'Lưu vào thực đơn'}
          </Button>
        </div>
      }
    >
      <Tabs
        activeKey={activeTab}
        onChange={(k) => setActiveTab(k as 'product' | 'combo')}
        items={[
          {
            key: 'product',
            label: (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <CategoryIcon name="chicken" size={16} /> Món ăn thông thường
              </span>
            ),
          },
          {
            key: 'combo',
            label: (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <CategoryIcon name="combo" size={16} /> Thiết lập Combo ưu đãi
              </span>
            ),
          },
        ]}
        style={{ marginBottom: 20 }}
      />

      {activeTab === 'product' ? (
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            categoryId: 1,
            spicyLevel: 1,
            isActive: true,
            basePrice: 89000,
            kcal: 500,
          }}
        >
          {/* Main Info */}
          <Card
            title="1. Thông tin chung món ăn"
            style={{ marginBottom: 20, borderRadius: 16, background: '#FFFFFF', border: '1px solid #E8E2D9' }}
          >
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <Form.Item
                name="name"
                label="Tên món ăn"
                rules={[{ required: true, message: 'Vui lòng nhập tên món' }]}
              >
                <Input
                  placeholder="Ví dụ: Gà rán sốt mật ong cay"
                  onChange={handleNameChange}
                  style={{ borderRadius: 10, height: 40 }}
                />
              </Form.Item>

              <Form.Item
                name="slug"
                label="Đường dẫn URL (Slug)"
                rules={[{ required: true, message: 'Vui lòng nhập slug' }]}
              >
                <Input placeholder="ga-ran-sot-mat-ong-cay" style={{ borderRadius: 10, height: 40 }} />
              </Form.Item>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
              <Form.Item
                name="categoryId"
                label="Danh mục món"
                rules={[{ required: true, message: 'Chọn danh mục' }]}
              >
                <Select
                  style={{ height: 40 }}
                  options={[
                    {
                      value: 1,
                      label: (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                          <CategoryIcon id={1} size={16} /> Gà rán
                        </span>
                      ),
                    },
                    {
                      value: 2,
                      label: (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                          <CategoryIcon id={2} size={16} /> Burger
                        </span>
                      ),
                    },
                    {
                      value: 3,
                      label: (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                          <CategoryIcon id={3} size={16} /> Combo
                        </span>
                      ),
                    },
                    {
                      value: 4,
                      label: (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                          <CategoryIcon id={4} size={16} /> Món phụ
                        </span>
                      ),
                    },
                    {
                      value: 5,
                      label: (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                          <CategoryIcon id={5} size={16} /> Đồ uống
                        </span>
                      ),
                    },
                  ]}
                />
              </Form.Item>

              <Form.Item
                name="basePrice"
                label="Giá gốc (VNĐ)"
                rules={[{ required: true, message: 'Nhập giá bán' }]}
              >
                <InputNumber<number>
                  style={{ width: '100%', height: 40, borderRadius: 10 }}
                  formatter={(val) => (val ? `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : '')}
                  parser={(val) => (val ? Number(val.replace(/\D/g, '')) : 0)}
                  min={1000}
                  step={5000}
                />
              </Form.Item>

              <Form.Item name="kcal" label="Năng lượng (Kcal)">
                <InputNumber style={{ width: '100%', height: 40, borderRadius: 10 }} min={0} step={10} />
              </Form.Item>
            </div>

            <Form.Item name="spicyLevel" label="Mức độ cay đặc trưng">
              <Radio.Group>
                <Radio.Button value={0}>Không cay (0/3)</Radio.Button>
                <Radio.Button value={1}>
                  <FireOutlined style={{ color: '#D97706' }} /> Cay vừa (1/3)
                </Radio.Button>
                <Radio.Button value={2}>
                  <FireOutlined style={{ color: '#B42318' }} /> Cay nồng (2/3)
                </Radio.Button>
                <Radio.Button value={3}>
                  <FireOutlined style={{ color: '#8F1216' }} /> Siêu cay (3/3)
                </Radio.Button>
              </Radio.Group>
            </Form.Item>

            <Form.Item
              name="description"
              label="Mô tả hấp dẫn khách hàng"
              rules={[{ required: true, message: 'Vui lòng nhập mô tả món ăn' }]}
            >
              <Input.TextArea
                rows={3}
                placeholder="Mô tả mùi vị, độ giòn và nguyên liệu đặc sắc của món ăn..."
                style={{ borderRadius: 10 }}
              />
            </Form.Item>

            <Form.Item name="isActive" label="Trạng thái kinh doanh" valuePropName="checked">
              <Switch checkedChildren="Đang phục vụ" unCheckedChildren="Tạm dừng bán" />
            </Form.Item>
          </Card>

          {/* Image Upload */}
          <Card
            title="2. Hình ảnh món ăn (Media & Cloudinary Preview)"
            style={{ marginBottom: 20, borderRadius: 16, background: '#FFFFFF', border: '1px solid #E8E2D9' }}
          >
            <Upload.Dragger
              name="files"
              fileList={fileList}
              beforeUpload={beforeUpload}
              onChange={handleUploadChange}
              maxCount={1}
              accept="image/png,image/jpeg,image/webp"
              style={{
                borderRadius: 14,
                borderColor: '#E8E2D9',
                background: '#FFFAF3',
                padding: '16px 0',
              }}
            >
              <p className="ant-upload-drag-icon">
                <InboxOutlined style={{ color: '#8F1216', fontSize: 36 }} />
              </p>
              <p style={{ fontFamily: 'Baloo 2, sans-serif', fontSize: 16, color: '#16100D', margin: 0 }}>
                Kéo thả ảnh món ăn vào đây hoặc nhấp để chọn tệp
              </p>
              <p style={{ fontFamily: 'Quicksand, sans-serif', fontSize: 12, color: '#6B6259', margin: '4px 0 0' }}>
                Hỗ trợ PNG, JPG, WEBP (tối đa 5MB). Tự động nén và tải lên Cloudinary.
              </p>
            </Upload.Dragger>

            {uploading && (
              <div style={{ marginTop: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#6B6259', marginBottom: 4 }}>
                  <span><LoadingOutlined spin /> Đang tải ảnh lên Cloudinary...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <Progress percent={uploadProgress} status="active" strokeColor="#8F1216" />
              </div>
            )}

            {uploadError && (
              <Alert
                type="error"
                showIcon
                message="Tải ảnh thất bại"
                description={uploadError}
                style={{ marginTop: 12, borderRadius: 10 }}
              />
            )}

            {imageUrl && (
              <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 16 }}>
                <img
                  src={imageUrl}
                  alt="Xem trước ảnh món"
                  style={{
                    width: 110,
                    height: 110,
                    objectFit: 'cover',
                    borderRadius: 14,
                    border: '1px solid #E8E2D9',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
                  }}
                />
                <div>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#1E7A46' }}>
                    ✓ Ảnh đã sẵn sàng hiển thị
                  </span>
                  <div style={{ fontSize: 12, color: '#6B6259', marginTop: 4 }}>
                    Được tối ưu cho độ sắc nét cao trên nền Kem Clucky
                  </div>
                </div>
              </div>
            )}
          </Card>

          {/* Dynamic Options Management */}
          <Card
            title={
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>3. Quản lý Options (Kích cỡ, Bánh...)</span>
                <Button
                  size="small"
                  icon={<PlusOutlined />}
                  onClick={addOptionGroup}
                  style={{ borderRadius: 999 }}
                >
                  Thêm nhóm Option
                </Button>
              </div>
            }
            style={{ marginBottom: 20, borderRadius: 16, background: '#FFFFFF', border: '1px solid #E8E2D9' }}
          >
            {optionGroups.map((group, groupIdx) => (
              <div
                key={group.id}
                style={{
                  padding: 16,
                  borderRadius: 12,
                  background: '#FFFAF3',
                  border: '1px solid #F0E8DC',
                  marginBottom: 16,
                }}
              >
                <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12 }}>
                  <Input
                    placeholder="Tên nhóm (VD: Kích thước)"
                    value={group.name}
                    onChange={(e) => {
                      const updated = [...optionGroups];
                      updated[groupIdx].name = e.target.value;
                      setOptionGroups(updated);
                    }}
                    style={{ fontWeight: 700, width: 220 }}
                  />
                  <Switch
                    checkedChildren="Bắt buộc"
                    unCheckedChildren="Tùy chọn"
                    checked={group.required}
                    onChange={(val) => {
                      const updated = [...optionGroups];
                      updated[groupIdx].required = val;
                      setOptionGroups(updated);
                    }}
                  />
                  <Button
                    type="text"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => removeOptionGroup(groupIdx)}
                  />
                </div>

                {group.choices.map((choice, choiceIdx) => (
                  <div
                    key={choice.id}
                    style={{
                      display: 'flex',
                      gap: 12,
                      alignItems: 'center',
                      marginBottom: 8,
                      paddingLeft: 12,
                    }}
                  >
                    <Input
                      placeholder="Tên lựa chọn (VD: Cỡ lớn)"
                      value={choice.name}
                      onChange={(e) => {
                        const updated = [...optionGroups];
                        updated[groupIdx].choices[choiceIdx].name = e.target.value;
                        setOptionGroups(updated);
                      }}
                      style={{ width: 220 }}
                    />
                    <InputNumber
                      placeholder="Giá chênh lệch (+VNĐ)"
                      value={choice.priceAdjustment}
                      min={0}
                      step={5000}
                      onChange={(val) => {
                        const updated = [...optionGroups];
                        updated[groupIdx].choices[choiceIdx].priceAdjustment = val || 0;
                        setOptionGroups(updated);
                      }}
                      style={{ width: 170 }}
                    />
                    <Button
                      type="text"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={() => removeOptionChoice(groupIdx, choiceIdx)}
                    />
                  </div>
                ))}

                <Button
                  type="dashed"
                  size="small"
                  icon={<PlusOutlined />}
                  onClick={() => addOptionChoice(groupIdx)}
                  style={{ marginTop: 6, marginLeft: 12 }}
                >
                  Thêm lựa chọn trong nhóm
                </Button>
              </div>
            ))}
          </Card>

          {/* Dynamic Toppings */}
          <Card
            title={
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>4. Quản lý Topping thêm</span>
                <Button size="small" icon={<PlusOutlined />} onClick={addTopping} style={{ borderRadius: 999 }}>
                  Thêm Topping
                </Button>
              </div>
            }
            style={{ borderRadius: 16, background: '#FFFFFF', border: '1px solid #E8E2D9' }}
          >
            {toppings.map((top, idx) => (
              <div key={top.id} style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 10 }}>
                <Input
                  placeholder="Tên topping (VD: Sốt phô mai cay)"
                  value={top.name}
                  onChange={(e) => {
                    const updated = [...toppings];
                    updated[idx].name = e.target.value;
                    setToppings(updated);
                  }}
                  style={{ flex: 1 }}
                />
                <InputNumber
                  placeholder="Giá thêm (VNĐ)"
                  value={top.price}
                  min={0}
                  step={5000}
                  onChange={(val) => {
                    const updated = [...toppings];
                    updated[idx].price = val || 0;
                    setToppings(updated);
                  }}
                  style={{ width: 180 }}
                />
                <Button type="text" danger icon={<DeleteOutlined />} onClick={() => removeTopping(idx)} />
              </div>
            ))}
          </Card>
        </Form>
      ) : (
        /* Combo Form */
        <Form form={comboForm} layout="vertical">
          <Card style={{ borderRadius: 16, background: '#FFFFFF', border: '1px solid #E8E2D9' }}>
            <Form.Item
              name="name"
              label="Tên Combo ưu đãi"
              rules={[{ required: true, message: 'Nhập tên combo' }]}
            >
              <Input placeholder="Ví dụ: Combo Siêu Tiết Kiệm Clucky" style={{ height: 40 }} />
            </Form.Item>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <Form.Item
                name="comboPrice"
                label="Giá bán trọn gói (VNĐ)"
                rules={[{ required: true, message: 'Nhập giá bán combo' }]}
              >
                <InputNumber
                  style={{ width: '100%', height: 40 }}
                  min={10000}
                  step={10000}
                />
              </Form.Item>

              <Form.Item name="items" label="Các món cấu thành combo">
                <Select
                  mode="multiple"
                  placeholder="Chọn các món trong combo"
                  options={mockProducts.map((p) => ({ value: p.id, label: `${p.name} (${p.basePrice.toLocaleString()}đ)` }))}
                />
              </Form.Item>
            </div>

            <Form.Item
              name="description"
              label="Mô tả quyền lợi combo"
              rules={[{ required: true, message: 'Nhập mô tả combo' }]}
            >
              <Input.TextArea rows={3} placeholder="Bao gồm: 1 Gà rán + 1 Khoai tây + 1 Nước ngọt..." />
            </Form.Item>
          </Card>
        </Form>
      )}
    </AdminDrawer>
  );
};

export default ProductForm;
