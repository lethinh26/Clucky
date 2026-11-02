import { useLocaleTools } from "../../i18n/hooks";
import { useTranslation } from "react-i18next";
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
} from 'antd';
import type { UploadProps, UploadFile } from 'antd';
import {
  InboxOutlined,
  PlusOutlined,
  DeleteOutlined,
  FireOutlined,
  PictureOutlined,
  SaveOutlined,
} from '@ant-design/icons';
import { AdminDrawer } from '../../components/ui/AdminDrawer';
import { CategoryIcon } from '../../components/ui/CategoryIcon';
import { Product, Combo, ProductOptionGroup, ProductTopping, mockProducts } from '../../mocks/catalogData';

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
  const { t } = useTranslation();
  const { locale } = useLocaleTools();

  const [form] = Form.useForm();
  const [comboForm] = Form.useForm();
  const [activeTab, setActiveTab] = useState<'product' | 'combo'>('product');
  const [imageUrl, setImageUrl] = useState<string>('');
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [optionGroups, setOptionGroups] = useState<ProductOptionGroup[]>([]);
  const [toppings, setToppings] = useState<ProductTopping[]>([]);

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
  const beforeUpload = (file: File) => {
    const isAcceptedFormat = ['image/jpeg', 'image/png', 'image/webp'].includes(file.type);
    if (!isAcceptedFormat) {
      message.error(t("business:productform.onlyPngJpgAndWebpImagesAreAccepted"));
      return Upload.LIST_IGNORE;
    }
    const isLt5M = file.size / 1024 / 1024 < 5;
    if (!isLt5M) {
      message.error(t("business:productform.imagesMustNotExceedMb"));
      return Upload.LIST_IGNORE;
    }

    // Create local preview URL
    const reader = new FileReader();
    reader.onload = (e) => {
      const url = e.target?.result as string;
      setImageUrl(url);
    };
    reader.readAsDataURL(file);

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
        name: t("business:productform.newOptionGroup"),
        required: true,
        choices: [{ id: `choice-${Date.now()}-1`, name: t("business:account.default"), priceAdjustment: 0 }],
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
      message.success(initialProduct ? t("business:productform.dishUpdatedSuccessfully") : t("business:productform.newDishAddedToTheMenu"));
      onClose();
    } catch {
      message.error(t("business:productform.pleaseCheckTheRequiredFields"));
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
      message.success(t("business:productform.newComboCreatedSuccessfully"));
      onClose();
    } catch {
      message.error(t("business:productform.pleaseCompleteTheComboDetails"));
    }
  };

  return (
    <AdminDrawer
      open={open}
      onClose={onClose}
      title={initialProduct ? t("business:catalog.editDish") : t("business:productform.addToMenu")}
      subtitle={t("business:productform.managePortionsOptionsAndToppingsToCluckyStandards")}
      width={720}
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
          <Button onClick={onClose} style={{ borderRadius: 999, height: 40, padding: '0 20px' }}> {t("business:account.cancel")} </Button>
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
            {initialProduct ? t("business:productform.updateDish") : t("business:productform.saveToMenu")}
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
                <CategoryIcon name="chicken" size={16} /> {t("business:productform.individualDish")} </span>
            ),
          },
          {
            key: 'combo',
            label: (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <CategoryIcon name="combo" size={16} /> {t("business:productform.configurePromotionalCombo")} </span>
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
            title={t("business:productform.generalDishInformation")}
            style={{ marginBottom: 20, borderRadius: 16, background: '#FFFFFF', border: '1px solid #E8E2D9' }}
          >
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <Form.Item
                name="name"
                label={t("business:productform.dishName")}
                rules={[{ required: true, message: t("business:productform.pleaseEnterADishName") }]}
              >
                <Input
                  placeholder={t("business:productform.forExampleSpicyHoneyFriedChicken")}
                  onChange={handleNameChange}
                  style={{ borderRadius: 10, height: 40 }}
                />
              </Form.Item>

              <Form.Item
                name="slug"
                label={t("business:productform.urlSlug")}
                rules={[{ required: true, message: t("business:productform.pleaseEnterASlug") }]}
              >
                <Input placeholder="ga-ran-sot-mat-ong-cay" style={{ borderRadius: 10, height: 40 }} />
              </Form.Item>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
              <Form.Item
                name="categoryId"
                label={t("business:productform.dishCategory")}
                rules={[{ required: true, message: t("business:productform.selectCategory") }]}
              >
                <Select
                  style={{ height: 40 }}
                  options={[
                    {
                      value: 1,
                      label: (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                          <CategoryIcon id={1} size={16} /> {t("business:catalog.friedChicken")} </span>
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
                          <CategoryIcon id={4} size={16} /> {t("business:catalog.sides")} </span>
                      ),
                    },
                    {
                      value: 5,
                      label: (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                          <CategoryIcon id={5} size={16} /> {t("business:catalog.drinks")} </span>
                      ),
                    },
                  ]}
                />
              </Form.Item>

              <Form.Item
                name="basePrice"
                label={t("business:productform.basePriceVnd")}
                rules={[{ required: true, message: t("business:productform.enterSellingPrice") }]}
              >
                <InputNumber<number>
                  style={{ width: '100%', height: 40, borderRadius: 10 }}
                  formatter={(val) => (val ? `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : '')}
                  parser={(val) => (val ? Number(val.replace(/\D/g, '')) : 0)}
                  min={1000}
                  step={5000}
                />
              </Form.Item>

              <Form.Item name="kcal" label={t("business:productform.energyKcal")}>
                <InputNumber style={{ width: '100%', height: 40, borderRadius: 10 }} min={0} step={10} />
              </Form.Item>
            </div>

            <Form.Item name="spicyLevel" label={t("business:productform.spiceLevel")}>
              <Radio.Group>
                <Radio.Button value={0}>{t("business:productform.notSpicy")}</Radio.Button>
                <Radio.Button value={1}>
                  <FireOutlined style={{ color: '#D97706' }} /> {t("business:productform.medium")} </Radio.Button>
                <Radio.Button value={2}>
                  <FireOutlined style={{ color: '#B42318' }} /> {t("business:productform.hot")} </Radio.Button>
                <Radio.Button value={3}>
                  <FireOutlined style={{ color: '#8F1216' }} /> {t("business:productform.extraHot")} </Radio.Button>
              </Radio.Group>
            </Form.Item>

            <Form.Item
              name="description"
              label={t("business:productform.customerFacingDescription")}
              rules={[{ required: true, message: t("business:productform.pleaseEnterADishDescription") }]}
            >
              <Input.TextArea
                rows={3}
                placeholder={t("business:productform.describeTheFlavourCrispinessAndDistinctiveIngredients")}
                style={{ borderRadius: 10 }}
              />
            </Form.Item>

            <Form.Item name="isActive" label={t("business:productform.salesStatus")} valuePropName="checked">
              <Switch checkedChildren={t("business:catalog.available")} unCheckedChildren={t("business:catalog.salesPaused")} />
            </Form.Item>
          </Card>

          {/* Image Upload */}
          <Card
            title={t("business:productform.dishImageMediaCloudinaryPreview")}
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
              <p style={{ fontFamily: 'Baloo 2, sans-serif', fontSize: 16, color: '#16100D', margin: 0 }}> {t("business:productform.dragAnImageHereOrClickToChooseAFile")} </p>
              <p style={{ fontFamily: 'Quicksand, sans-serif', fontSize: 12, color: '#6B6259', margin: '4px 0 0' }}> {t("business:productform.pngJpgAndWebpSupportedUpToMbAutomaticallyCompressedAndUploaded")} </p>
            </Upload.Dragger>

            {imageUrl && (
              <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 16 }}>
                <img
                  src={imageUrl}
                  alt={t("business:productform.dishImagePreview")}
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
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#1E7A46' }}> {t("business:productform.imageReadyToDisplay")} </span>
                  <div style={{ fontSize: 12, color: '#6B6259', marginTop: 4 }}> {t("business:productform.optimisedForClarityOnTheCluckyCreamBackground")} </div>
                </div>
              </div>
            )}
          </Card>

          {/* Dynamic Options Management */}
          <Card
            title={
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>{t("business:productform.optionsSizeBread")}</span>
                <Button
                  size="small"
                  icon={<PlusOutlined />}
                  onClick={addOptionGroup}
                  style={{ borderRadius: 999 }}
                > {t("business:productform.addOptionGroup")} </Button>
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
                    placeholder={t("business:productform.groupNameEGSize")}
                    value={group.name}
                    onChange={(e) => {
                      const updated = [...optionGroups];
                      updated[groupIdx].name = e.target.value;
                      setOptionGroups(updated);
                    }}
                    style={{ fontWeight: 700, width: 220 }}
                  />
                  <Switch
                    checkedChildren={t("business:productform.required")}
                    unCheckedChildren={t("business:party.custom")}
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
                      placeholder={t("business:productform.optionNameEGLarge")}
                      value={choice.name}
                      onChange={(e) => {
                        const updated = [...optionGroups];
                        updated[groupIdx].choices[choiceIdx].name = e.target.value;
                        setOptionGroups(updated);
                      }}
                      style={{ width: 220 }}
                    />
                    <InputNumber
                      placeholder={t("business:productform.priceAdjustmentVnd")}
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
                > {t("business:productform.addOptionToGroup")} </Button>
              </div>
            ))}
          </Card>

          {/* Dynamic Toppings */}
          <Card
            title={
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>{t("business:productform.extraToppings")}</span>
                <Button size="small" icon={<PlusOutlined />} onClick={addTopping} style={{ borderRadius: 999 }}> {t("business:productform.addTopping")} </Button>
              </div>
            }
            style={{ borderRadius: 16, background: '#FFFFFF', border: '1px solid #E8E2D9' }}
          >
            {toppings.map((top, idx) => (
              <div key={top.id} style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 10 }}>
                <Input
                  placeholder={t("business:productform.toppingNameEGSpicyCheeseSauce")}
                  value={top.name}
                  onChange={(e) => {
                    const updated = [...toppings];
                    updated[idx].name = e.target.value;
                    setToppings(updated);
                  }}
                  style={{ flex: 1 }}
                />
                <InputNumber
                  placeholder={t("business:productform.additionalPriceVnd")}
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
              label={t("business:productform.promotionalComboName")}
              rules={[{ required: true, message: t("business:productform.enterComboName") }]}
            >
              <Input placeholder={t("business:productform.forExampleCluckySuperSaverCombo")} style={{ height: 40 }} />
            </Form.Item>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <Form.Item
                name="comboPrice"
                label={t("business:productform.packagePriceVnd")}
                rules={[{ required: true, message: t("business:productform.enterComboPrice") }]}
              >
                <InputNumber
                  style={{ width: '100%', height: 40 }}
                  min={10000}
                  step={10000}
                />
              </Form.Item>

              <Form.Item name="items" label={t("business:productform.dishesIncludedInCombo")}>
                <Select
                  mode="multiple"
                  placeholder={t("business:productform.selectComboDishes")}
                  options={mockProducts.map((p) => ({ value: p.id, label: t("business:productform.vnd", { value1: p.name, value2: p.basePrice.toLocaleString(locale === "en" ? "en-US" : "vi-VN") }) }))}
                />
              </Form.Item>
            </div>

            <Form.Item
              name="description"
              label={t("business:productform.comboBenefitsDescription")}
              rules={[{ required: true, message: t("business:productform.enterComboDescription") }]}
            >
              <Input.TextArea rows={3} placeholder={t("business:productform.includesFriedChickenFriesSoftDrink")} />
            </Form.Item>
          </Card>
        </Form>
      )}
    </AdminDrawer>
  );
};

export default ProductForm;
