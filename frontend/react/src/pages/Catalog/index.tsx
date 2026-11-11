import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Button, Empty, Form, Input, InputNumber, Modal, Result, Select, Space, Switch, Table, Tabs, Tag, Tooltip } from 'antd';
import { AppstoreOutlined, DeleteOutlined, EditOutlined, PlusOutlined, SearchOutlined, ShopOutlined, TagsOutlined } from '@ant-design/icons';
import type { TableColumnsType } from 'antd';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { useLocaleTools } from '../../i18n/hooks';
import { getErrorMessage, type Product } from '../../lib/api';
import { catalogAdministration as administration, type AdminProduct, type AdminCombo, type AdminCategory, type CategoryPayload, type ComboPayload } from '../../lib/catalog-administration';
import { ProductForm } from './ProductForm';
import { ComboForm } from './ComboForm';
import { CatalogImage } from './ImageField';
import { matchesCatalogSearch } from './presentation';
import './catalog.css';

export const CatalogPage: React.FC = () => {
  const { t } = useTranslation();
  const { money, date } = useLocaleTools();
  const { isAdmin } = useAuth();
  const [catalog, setCatalog] = useState<{ products: AdminProduct[]; combos: AdminCombo[]; categories: AdminCategory[] }>({ products: [], combos: [], categories: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const request = useRef<AbortController | null>(null);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('products');
  const [categoryId, setCategoryId] = useState<number>();
  const [status, setStatus] = useState('ALL');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [productOpen, setProductOpen] = useState(false);
  const [product, setProduct] = useState<AdminProduct | null>(null);
  const productDraft = useRef<AdminProduct | null>(null);
  const [comboOpen, setComboOpen] = useState(false);
  const [combo, setCombo] = useState<AdminCombo | null>(null);
  const comboDraft = useRef<AdminCombo | null>(null);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [category, setCategory] = useState<AdminCategory | null>(null);
  const [categoryError, setCategoryError] = useState('');
  const [categoryForm] = Form.useForm<CategoryPayload>();
  const [deletion, setDeletion] = useState<{ kind: 'products' | 'combos' | 'categories'; row: AdminProduct | AdminCombo | AdminCategory } | null>(null);
  const [deleteError, setDeleteError] = useState('');
  const text = (key: string, defaultValue: string) => t(`business:catalogAdmin.${key}`, { defaultValue });

  const refetch = useCallback(async () => {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setLoading(true);
    try {
      const data = await administration.list(controller.signal);
      if (!controller.signal.aborted) { setCatalog(data); setError(''); }
    } catch (failure) {
      if (!controller.signal.aborted) setError(getErrorMessage(failure));
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) void refetch();
    return () => { request.current?.abort(); };
  }, [isAdmin, refetch]);

  const mutate = async (operation: () => Promise<void>) => {
    if (!isAdmin || lock.current) throw new Error(t("admin:ui.thisActionIsNotReadyPleaseTryAgain"));
    lock.current = true; setBusy(true);
    try { await operation(); } finally { await refetch(); lock.current = false; setBusy(false); }
  };

  const saveProduct = async (data: Partial<Product>, file?: File, progress?: (percent: number) => void) => {
    await mutate(async () => {
      productDraft.current = await administration.saveProduct(data, productDraft.current);
      if (file) productDraft.current = await administration.upload('products', productDraft.current, file, progress);
    });
  };
  const saveCombo = async (data: ComboPayload, file?: File, progress?: (percent: number) => void) => {
    await mutate(async () => {
      comboDraft.current = await administration.saveCombo(data, comboDraft.current);
      if (file) comboDraft.current = await administration.upload('combos', comboDraft.current, file, progress);
    });
  };
  const openProduct = (current: AdminProduct | null) => { setProduct(current); productDraft.current = current; setProductOpen(true); };
  const openCombo = (current: AdminCombo | null) => { setCombo(current); comboDraft.current = current; setComboOpen(true); };
  const openCategory = (current: AdminCategory | null) => {
    setCategory(current); setCategoryError(''); categoryForm.resetFields();
    categoryForm.setFieldsValue(current ?? { name: '', sortOrder: 0, isActive: true }); setCategoryOpen(true);
  };
  const remove = (kind: 'products' | 'combos' | 'categories', row: AdminProduct | AdminCombo | AdminCategory) => {
    setDeleteError(''); setDeletion({ kind, row });
  };
  const toggle = async (kind: 'products' | 'combos', row: AdminProduct | AdminCombo, active: boolean) => {
    try { await mutate(async () => { await administration.status(kind, row, active); }); }
    catch (failure) { setError(getErrorMessage(failure)); }
  };
  const actions = (kind: 'products' | 'combos' | 'categories', row: AdminProduct | AdminCombo | AdminCategory, edit: () => void) => <Space size={4}>
    <Button type="text" icon={<EditOutlined />} disabled={busy || loading} onClick={edit} aria-label={`${text('edit', t("business:account.edit"))} ${row.name}`}>{text('edit', t("business:account.edit"))}</Button>
    <Tooltip title={text('delete', t("admin:ui.delete"))}><Button type="text" danger icon={<DeleteOutlined />} disabled={busy || loading} onClick={() => remove(kind, row)} aria-label={`${text('delete', t("admin:ui.delete"))} ${row.name}`} /></Tooltip>
  </Space>;
  const identity = (row: AdminProduct | AdminCombo, edit: () => void) => <div className="catalog-item">
    <div className="catalog-thumb"><CatalogImage url={row.imageUrl} name={row.name} /></div>
    <div className="catalog-item-copy"><button type="button" className="catalog-item-name" disabled={busy || loading} onClick={edit}>{row.name}</button>
      <p className="catalog-item-description">{row.description}</p><span className="catalog-item-meta">#{row.id}{'basePrice' in row && row.options?.length ? t("admin:ui.optionGroups", { value1: row.options.length }) : ''}</span>
    </div>
  </div>;
  const saleStatus = (kind: 'products' | 'combos', row: AdminProduct | AdminCombo) => <div className={`catalog-status ${row.isActive ? 'is-active' : ''}`}>
    <Switch size="small" checked={row.isActive} disabled={busy || loading} aria-label={t("admin:ui.allowSalesOf", { value1: row.name })} onChange={active => void toggle(kind, row, active)} />
    <span>{row.isActive ? t("admin:ui.enableSales") : t("business:stores.salesStopped")}</span>
  </div>;
  const productColumns: TableColumnsType<AdminProduct> = [
    { title: text('dish', t("business:catalog.dish")), key: 'name', width: 380, sorter: (first, second) => first.name.localeCompare(second.name, 'vi'), render: (_, row) => identity(row, () => openProduct(row)) },
    { title: text('category', t("business:catalog.category")), dataIndex: 'categoryName', width: 170, render: name => <span className="catalog-category-tag">{name || t("payments:unclassified")}</span> },
    { title: text('price', t("admin:ui.salePrice")), dataIndex: 'basePrice', width: 150, sorter: (first, second) => first.basePrice - second.basePrice, render: value => <span className="catalog-price">{money(value)}</span> },
    { title: t("admin:ui.availableForSale"), key: 'status', width: 150, render: (_, row) => saleStatus('products', row) },
    { title: text('actions', t("accounts:action")), key: 'actions', width: 130, fixed: 'right', render: (_, row) => actions('products', row, () => openProduct(row)) },
  ];
  const comboColumns: TableColumnsType<AdminCombo> = [
    { title: 'Combo', key: 'name', width: 350, sorter: (first, second) => first.name.localeCompare(second.name, 'vi'), render: (_, row) => identity(row, () => openCombo(row)) },
    { title: text('items', t("admin:ui.contents")), key: 'items', width: 240, render: (_, row) => <div className="catalog-items-summary">{row.items.slice(0, 3).map((item, index) => <Tag key={item.id ?? index}>{item.quantity} × {item.productName}</Tag>)}{row.items.length > 3 && <Tag>+{row.items.length - 3} {t("business:orderspage.items")}</Tag>}</div> },
    { title: t("admin:ui.comboPrice122"), dataIndex: 'comboPrice', width: 145, sorter: (first, second) => first.comboPrice - second.comboPrice, render: value => <span className="catalog-price">{money(value)}</span> },
    { title: t("admin:ui.availabilityPeriod"), key: 'schedule', width: 165, render: (_, row) => <div className="catalog-hint">{!row.startAt && !row.endAt ? t("admin:ui.unlimited") : <>{row.startAt && <div>{t("admin:ui.from")} {date(row.startAt, { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>}{row.endAt && <div>{t("admin:ui.to")} {date(row.endAt, { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>}</>}</div> },
    { title: t("admin:ui.availableForSale"), key: 'status', width: 145, render: (_, row) => saleStatus('combos', row) },
    { title: text('actions', t("accounts:action")), key: 'actions', width: 130, fixed: 'right', render: (_, row) => actions('combos', row, () => openCombo(row)) },
  ];
  const categoryColumns: TableColumnsType<AdminCategory> = [
    { title: t("business:catalog.category"), dataIndex: 'name', width: 300, render: (_, row) => <div><button type="button" className="catalog-item-name" disabled={busy || loading} onClick={() => openCategory(row)}>{row.name}</button><span className="catalog-item-meta">#{row.id}</span></div> },
    { title: t("admin:ui.dishesInCategory"), key: 'products', width: 180, render: (_, row) => <span>{catalog.products.filter(item => item.categoryId === row.id).length} {t("business:orderspage.items")}</span> },
    { title: t("admin:ui.displayOrder"), dataIndex: 'sortOrder', width: 160, sorter: (first, second) => first.sortOrder - second.sortOrder },
    { title: t("accounts:status"), dataIndex: 'isActive', width: 160, render: value => <Tag color={value ? 'green' : 'default'}>{value ? t("admin:ui.active") : t("business:stores.inactive")}</Tag> },
    { title: text('actions', t("accounts:action")), key: 'actions', width: 130, fixed: 'right', render: (_, row) => actions('categories', row, () => openCategory(row)) },
  ];
  const matchesStatus = (row: { isActive: boolean }) => status === 'ALL' || row.isActive === (status === 'ACTIVE');
  const products = catalog.products.filter(row => matchesStatus(row) && (!categoryId || row.categoryId === categoryId) && matchesCatalogSearch([row.name, row.categoryName], search));
  const combos = catalog.combos.filter(row => matchesStatus(row) && matchesCatalogSearch([row.name, ...row.items.map(item => item.productName)], search));
  const categories = catalog.categories.filter(row => matchesStatus(row) && matchesCatalogSearch([row.name], search));
  const total = tab === 'products' ? products.length : tab === 'combos' ? combos.length : categories.length;
  const filtered = Boolean(search || status !== 'ALL' || (tab === 'products' && categoryId));
  const resetFilters = () => { setSearch(''); setStatus('ALL'); setCategoryId(undefined); setPage(1); };
  const empty = { emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={filtered ? t("admin:ui.noMatchingResultsTryChangingYourFilters") : t("admin:ui.noDataYetUseTheAddButtonAbove")} /> };
  const pagination = { current: Math.min(page, Math.max(1, Math.ceil(total / pageSize))), pageSize, total, showSizeChanger: true, pageSizeOptions: [10, 20, 50], hideOnSinglePage: false,
    onChange: (next: number, size: number) => { setPage(size === pageSize ? next : 1); setPageSize(size); } };
  const panel = <>
    <div className="catalog-toolbar">
      <Input className="catalog-search" size="large" prefix={<SearchOutlined />} allowClear aria-label={t("admin:ui.searchMenu")} placeholder={tab === 'combos' ? t("admin:ui.searchCombosOrDishesInACombo") : tab === 'categories' ? t("admin:ui.searchCategories") : t("admin:ui.searchDishNamesOrCategories")} value={search} onChange={event => { setSearch(event.target.value); setPage(1); }} />
      {tab === 'products' && <Select className="catalog-filter" size="large" allowClear placeholder={t("admin:ui.allCategories")} aria-label={t("admin:ui.filterCategories")} value={categoryId} onChange={value => { setCategoryId(value); setPage(1); }} options={catalog.categories.map(row => ({ value: row.id, label: row.name }))} />}
      <Select className="catalog-filter" size="large" aria-label={t("admin:ui.filterStatus")} value={status} onChange={value => { setStatus(value); setPage(1); }} options={[{ value: 'ALL', label: t("business:paymentspage.allStatuses") }, { value: 'ACTIVE', label: tab === 'categories' ? t("admin:ui.active") : t("admin:ui.availableForSale") }, { value: 'INACTIVE', label: tab === 'categories' ? t("business:stores.inactive") : t("business:stores.salesStopped") }]} />
    </div>
    <div className="catalog-table-caption"><span>{loading ? t("admin:ui.loadingMenu") : `${total} ${tab === 'products' ? t("admin:ui.dishes") : tab === 'combos' ? 'combo' : t("admin:ui.categories")}`}{!loading && filtered ? t("admin:ui.matching") : ''}</span>{filtered ? <Button type="link" size="small" onClick={resetFilters}>{t("business:orderspage.clearFilters")}</Button> : <span>{t("admin:ui.systemWideManagement")}</span>}</div>
    {tab === 'products' ? <Table<AdminProduct> className="catalog-table" rowKey="id" loading={loading} columns={productColumns} dataSource={products} pagination={pagination} locale={empty} scroll={{ x: 980 }} />
      : tab === 'combos' ? <Table<AdminCombo> className="catalog-table" rowKey="id" loading={loading} columns={comboColumns} dataSource={combos} pagination={pagination} locale={empty} scroll={{ x: 1210 }}
        expandable={{ rowExpandable: row => row.items.length > 0, expandedRowRender: row => <div className="catalog-expand">{row.items.map((item, index) => {
          const dish = catalog.products.find(candidate => candidate.id === item.productId);
          const choice = dish?.options?.flatMap(group => group.choices).find(option => Number(option.id.replace(/^opt-/, '')) === item.optionId);
          return <div key={item.id ?? index} className="catalog-expand-item"><div className="catalog-thumb"><CatalogImage url={dish?.imageUrl} name={item.productName} /></div><div><strong>{item.quantity} × {item.productName}</strong><p>{choice?.name ?? (item.optionId ? t("admin:ui.option146", { value1: item.optionId }) : t("admin:ui.noFixedOption147"))}</p></div></div>;
        })}</div> }} />
        : <Table<AdminCategory> className="catalog-table" rowKey="id" loading={loading} columns={categoryColumns} dataSource={categories} pagination={pagination} locale={empty} scroll={{ x: 850 }} />}
  </>;
  if (!isAdmin) return <Result status="403" title="403" subTitle={text('adminOnly', t("admin:ui.onlyAdministratorsCanManageTheCatalog"))} />;

  return <section className="catalog-page" aria-busy={loading || busy}>
    <div className="catalog-page-header"><div><span className="catalog-eyebrow">{t("admin:ui.menuAdministration")}</span><h2>{text('title', t("admin:ui.menuCombos150"))}</h2><p>{t("admin:ui.manageEveryDishItsPriceAndHowIt")}</p></div>
      <Button type="primary" icon={<PlusOutlined />} disabled={busy || loading} onClick={() => tab === 'products' ? openProduct(null) : tab === 'combos' ? openCombo(null) : openCategory(null)}>{tab === 'products' ? t("admin:ui.addDish") : tab === 'combos' ? t("admin:ui.createCombo") : t("admin:ui.addCategory")}</Button>
    </div>
    {error && <Alert type="error" showIcon message={error} action={<Button onClick={() => void refetch()} disabled={loading}>{text('retry', t("business:dashboard.retry"))}</Button>} />}
    <div className="catalog-panel"><Tabs activeKey={tab} onChange={value => { setTab(value); resetFilters(); }} items={[
      { key: 'products', label: <span className="catalog-tab-label"><ShopOutlined />{text('products', t("business:catalog.dish"))}<span className="catalog-count">{catalog.products.length}</span></span>, children: tab === 'products' ? panel : null },
      { key: 'combos', label: <span className="catalog-tab-label"><AppstoreOutlined />{text('combos', 'Combo')}<span className="catalog-count">{catalog.combos.length}</span></span>, children: tab === 'combos' ? panel : null },
      { key: 'categories', label: <span className="catalog-tab-label"><TagsOutlined />{text('categories', t("business:catalog.category"))}<span className="catalog-count">{catalog.categories.length}</span></span>, children: tab === 'categories' ? panel : null },
    ]} /></div>
    <ProductForm open={productOpen} initialProduct={product} onClose={() => { if (!lock.current) setProductOpen(false); }} categories={catalog.categories} onSaveProduct={saveProduct} />
    <ComboForm open={comboOpen} combo={combo} products={catalog.products} onClose={() => { if (!lock.current) setComboOpen(false); }} onSave={saveCombo} />
    <Modal className="catalog-modal" centered width={520} maskClosable={false} closable={!busy} keyboard={!busy} cancelButtonProps={{ disabled: busy }}
      title={<div className="catalog-modal-heading"><span className="catalog-eyebrow">{t("admin:ui.menuCategories")}</span><h3>{category ? text('editCategory', t("admin:ui.editCategory")) : text('createCategory', t("admin:ui.addCategory"))}</h3><p>{t("admin:ui.groupDishesToHelpCustomersFindAndChoose")}</p></div>} open={categoryOpen} confirmLoading={busy}
      onCancel={() => { if (!busy) setCategoryOpen(false); }} okText={text('save', t("payments:save"))} cancelText={text('cancel', t("business:account.cancel"))} onOk={async () => {
        try {
          const values = await categoryForm.validateFields();
          await mutate(async () => { await administration.saveCategory(values, category); });
          setCategoryOpen(false);
        } catch (failure) { if (!(failure && typeof failure === 'object' && 'errorFields' in failure)) setCategoryError(getErrorMessage(failure)); }
      }}>
      {categoryError && <Alert type="error" showIcon message={categoryError} />}
      <Form name="catalog-category" form={categoryForm} layout="vertical" disabled={busy}>
        <Form.Item name="name" label={text('name', t("admin:ui.name"))} rules={[{ required: true, whitespace: true }, { max: 120 }]}><Input maxLength={120} /></Form.Item>
        <Form.Item name="sortOrder" label={t("admin:ui.displayOrder")} extra={t("admin:ui.lowerNumbersAppearFirst")} rules={[{ required: true }, { type: 'integer', min: 0 }]}><InputNumber min={0} precision={0} /></Form.Item>
        <div className="catalog-publication"><div><strong>{t("admin:ui.activeCategory")}</strong><p>{t("admin:ui.showThisCategoryOnTheMenu")}</p></div><Form.Item name="isActive" valuePropName="checked"><Switch aria-label={t("admin:ui.activeCategory")} /></Form.Item></div>
      </Form>
    </Modal>
    <Modal className="catalog-modal" centered width={480} maskClosable={false} closable={!busy} keyboard={!busy} cancelButtonProps={{ disabled: busy }} open={Boolean(deletion)} title={text('confirmDelete', t("admin:ui.confirmDeletion"))} confirmLoading={busy} okButtonProps={{ danger: true }} okText={text('delete', t("admin:ui.delete"))} cancelText={text('cancel', t("business:account.cancel"))}
      onCancel={() => { if (!busy) setDeletion(null); }} onOk={async () => {
        if (!deletion) return;
        try { await mutate(async () => { await administration.remove(deletion.kind, deletion.row); }); setDeletion(null); }
        catch (failure) { setDeleteError(getErrorMessage(failure)); }
      }}>
      {deletion && <div className="catalog-delete-summary">{deletion.kind !== 'categories' && <div className="catalog-thumb"><CatalogImage url={deletion.row.imageUrl} name={deletion.row.name} preview={false} /></div>}<div><strong>{deletion.row.name}</strong><p className="catalog-hint">#{deletion.row.id}</p></div></div>}
      <p>{text('references', t("admin:ui.referencedDataCannotBeDeletedYouCanStop"))}</p>
      {deleteError && <Alert type="error" showIcon message={deleteError} />}
    </Modal>
  </section>;
};

export default CatalogPage;
