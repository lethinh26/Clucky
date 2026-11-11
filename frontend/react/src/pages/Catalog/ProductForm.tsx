import { useTranslation } from "react-i18next";
import { useEffect, useRef, useState } from 'react';
import { Alert, Button, Form, Input, InputNumber, Modal, Progress, Select, Switch } from 'antd';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { getErrorMessage, type CatalogCategory, type Product } from '../../lib/api';
import { ImageField } from './ImageField';
import { LanguageSwitcher } from '../../i18n/language-switcher';

export function ProductForm({ open, onClose, initialProduct, categories, onSaveProduct }: {
  open: boolean; onClose: () => void; initialProduct?: Product | null; categories: CatalogCategory[];
  onSaveProduct: (product: Partial<Product>, file?: File, progress?: (percent: number) => void) => Promise<void>;
}) {
  const { t } = useTranslation();
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
    footer={buttons => <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}><LanguageSwitcher /><div>{buttons}</div></div>}
    title={<div className="catalog-modal-heading"><span className="catalog-eyebrow">{t("admin:ui.menuDishes")}</span><h3>{initialProduct ? t("admin:ui.editDish") : t("business:catalog.addANewDish")}</h3><p>{t("admin:ui.informationImagesAndOptionsForCustomersOrderingThis")}</p></div>}
    okText={initialProduct ? t("business:account.saveChanges") : t("admin:ui.createDish")} cancelText={t("business:account.cancel")}
    confirmLoading={saving} cancelButtonProps={{ disabled: saving }} keyboard={!saving}
    onOk={() => form.submit()} onCancel={() => { if (!lock.current) onClose(); }} maskClosable={false} closable={!saving}>
    {error && <Alert type="error" showIcon title={error} description={t("admin:ui.ifTheDataHasChangedCloseThisForm169")} />}
    <Form name="catalog-product" form={form} layout="vertical" disabled={saving} scrollToFirstError={{ focus: true }} onFinish={values => void save(values)}>
      <div className="catalog-editor"><div className="catalog-editor-main">
      <section className="catalog-section">
        <div className="catalog-section-heading"><span>01</span><h4>{t("admin:ui.dishInformation")}</h4></div>
        <Form.Item name="name" label={t("admin:ui.dishName")} rules={[{ required: true, whitespace: true, message: t("admin:ui.enterADishName") }, { max: 180 }]}><Input size="large" maxLength={180} placeholder={t("admin:ui.dishNameShownOnTheMenu")} /></Form.Item>
        <div className="catalog-field-grid">
          <Form.Item name="categoryId" label={t("business:catalog.category")} rules={[{ required: true, message: t("admin:ui.selectACategoryForThisDish") }]}><Select showSearch placeholder={t("business:productform.selectCategory")} optionFilterProp="label" options={categories.map(category => ({ value: category.id, label: `${category.name}${category.isActive ? '' : t("admin:ui.notForSale")}` }))} /></Form.Item>
          <Form.Item name="basePrice" label={t("admin:ui.salePrice176")} rules={[{ required: true }, { type: 'integer', min: 0, max: 999999999999 }]}><InputNumber<number> min={0} max={999999999999} precision={0} formatter={value => `${value ?? ''}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.')} parser={value => Number(value?.replace(/\./g, ''))} /></Form.Item>
        </div>
        <Form.Item name="description" label={t("admin:ui.dishDescription")} rules={[{ required: true, whitespace: true, message: t("admin:ui.addADishDescription") }]}><Input.TextArea rows={3} placeholder={t("admin:ui.describeTheFlavorIngredientsAndPortionSize")} /></Form.Item>
        <div className="catalog-field-grid">
          <Form.Item name="kcal" label={t("admin:ui.energyKcal")} rules={[{ type: 'integer', min: 0 }]}><InputNumber min={0} precision={0} /></Form.Item>
          <Form.Item name="spicyLevel" label={t("admin:ui.spiceLevel")} rules={[{ type: 'integer', min: 0, max: 3 }]}><Select options={[{ value: 0, label: t("business:catalog.notSpicy") }, { value: 1, label: t("admin:ui.mild") }, { value: 2, label: t("business:catalog.medium") }, { value: 3, label: t("admin:ui.hot") }]} /></Form.Item>
        </div>
      </section>
      <section className="catalog-section">
      <div className="catalog-section-heading"><span>02</span><h4>{t("admin:ui.dishOptions")}</h4></div>
      <Form.List name="options">
        {(groups, { add, remove }) => <>
          {!groups.length && <div className="catalog-empty-note">{t("admin:ui.noOptionGroupsYetAddAGroupWhen")}</div>}
          {groups.map(group => <div key={group.key} className="catalog-option-card">
            <div className="catalog-option-header"><span>{t("admin:ui.group")} {group.name + 1}</span><Button type="text" size="small" danger icon={<DeleteOutlined />} disabled={saving} onClick={() => remove(group.name)}>{t("admin:ui.removeGroup")}</Button></div>
            <div className="catalog-field-grid">
              <Form.Item name={[group.name, 'name']} label={t("admin:ui.groupName")} rules={[{ required: true, whitespace: true }, { max: 80 }]}><Input maxLength={80} placeholder={t("admin:ui.optionGroupName")} /></Form.Item>
              <Form.Item name={[group.name, 'required']} label={t("admin:ui.selectionRequired")} valuePropName="checked"><Switch /></Form.Item>
            </div>
            <Form.List name={[group.name, 'choices']} rules={[{ validator: async (_, choices) => { if (!choices?.length) throw new Error(t("admin:ui.addAtLeastOneOption")); } }]}>
              {(choices, controls, meta) => <>
                {choices.map(choice => <div key={choice.key} className="catalog-option-row">
                  <Form.Item name={[choice.name, 'id']} hidden><Input /></Form.Item>
                  <Form.Item name={[choice.name, 'name']} label={t("admin:ui.option")} rules={[{ required: true, whitespace: true }, { max: 100 }]}><Input maxLength={100} /></Form.Item>
                  <Form.Item name={[choice.name, 'priceAdjustment']} label={t("admin:ui.additionalPrice")} rules={[{ required: true }, { type: 'integer', min: 0, max: 999999999999 }]}><InputNumber min={0} max={999999999999} precision={0} /></Form.Item>
                  <Button type="text" danger icon={<DeleteOutlined />} aria-label={t("admin:ui.removeOptionFromGroup", { value1: choice.name + 1, value2: group.name + 1 })} disabled={saving} onClick={() => controls.remove(choice.name)} />
                </div>)}
                <Form.ErrorList errors={meta.errors} />
                <Button size="small" type="text" icon={<PlusOutlined />} disabled={saving} onClick={() => controls.add({ id: `new-${crypto.randomUUID()}`, name: '', priceAdjustment: 0 })}>{t("admin:ui.addOption")}</Button>
              </>}
            </Form.List>
          </div>)}
          <Button className="catalog-add-row" icon={<PlusOutlined />} disabled={saving} onClick={() => add({ name: '', required: true, choices: [{ id: `new-${crypto.randomUUID()}`, name: '', priceAdjustment: 0 }] })}>{t("admin:ui.addOptionGroup")}</Button>
        </>}
      </Form.List>
      </section>
      <section className="catalog-section">
      <div className="catalog-section-heading"><span>03</span><h4>{t("admin:ui.addOnToppings")}</h4></div>
      <Form.List name="toppings">
        {(toppings, { add, remove }) => <>
          {!toppings.length && <div className="catalog-empty-note">{t("admin:ui.noToppingsYetOnlyAddToppingsActuallyOffered")}</div>}
          {toppings.map(topping => <div key={topping.key} className="catalog-option-row">
            <Form.Item name={[topping.name, 'id']} hidden><Input /></Form.Item>
            <Form.Item name={[topping.name, 'name']} label={t("admin:ui.toppingName")} rules={[{ required: true, whitespace: true }, { max: 120 }]}><Input maxLength={120} /></Form.Item>
            <Form.Item name={[topping.name, 'price']} label={t("admin:ui.price")} rules={[{ required: true }, { type: 'integer', min: 0, max: 999999999999 }]}><InputNumber min={0} max={999999999999} precision={0} /></Form.Item>
            <Button type="text" danger icon={<DeleteOutlined />} aria-label={t("admin:ui.removeTopping", { value1: topping.name + 1 })} disabled={saving} onClick={() => remove(topping.name)} />
          </div>)}
          <Button className="catalog-add-row" icon={<PlusOutlined />} disabled={saving} onClick={() => add({ id: `new-${crypto.randomUUID()}`, name: '', price: 0 })}>{t("admin:ui.addTopping")}</Button>
        </>}
      </Form.List>
      </section>
      </div><aside className="catalog-editor-aside">
        <h4>{t("admin:ui.dishImage")}</h4>
        <ImageField file={file} url={initialProduct?.imageUrl} name={initialProduct?.name || t("admin:ui.newDish")} disabled={saving} onChange={setFile} />
        {saving && file && <Progress percent={progress} size="small" />}
        <div className="catalog-publication"><div><strong>{t("admin:ui.availableForSale")}</strong><p>{t("admin:ui.orderingAvailabilityAlsoDependsOnEachBranchS")}</p></div><Form.Item name="isActive" valuePropName="checked"><Switch aria-label={t("admin:ui.allowDishSales")} /></Form.Item></div>
      </aside></div>
    </Form>
  </Modal>;
}
