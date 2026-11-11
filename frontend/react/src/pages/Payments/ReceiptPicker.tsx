import { useEffect, useState } from 'react';
import { Alert, Button, DatePicker, Empty, Input, Modal, Segmented, Select, Table, Tag } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import { adminFinance, receiptSelectionIssue, type PaymentSnapshot, type Receipt, type ReceiptQuery } from '../../lib/admin-finance';
import { getErrorMessage, type PageResponse } from '../../lib/api';
import { useLocaleTools } from '../../i18n/hooks';
import { orderDate } from '../Orders/presentation';

export function ReceiptPicker({ snapshot, selectedId, onSelect, onClose }: {
  snapshot: PaymentSnapshot; selectedId?: string; onSelect: (receipt: Receipt) => void; onClose: () => void;
}) {
  const { money, locale } = useLocaleTools();
  const { t } = useTranslation('payments');
  const [scope, setScope] = useState<'order' | 'store' | 'all'>('order');
  const [query, setQuery] = useState<ReceiptQuery>({ page: 0, size: 8 });
  const [search, setSearch] = useState('');
  const [page, setPage] = useState<PageResponse<Receipt> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchError, setSearchError] = useState('');
  const order = snapshot.order;
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError(''); setPage(null);
    void adminFinance.receipts({ ...query, search: scope === 'order' ? order.orderCode : query.search,
      storeId: scope === 'store' ? order.storeId : undefined }, controller.signal)
      .then(result => {
        if (controller.signal.aborted) return;
        if (query.page > 0 && result.page.content.length === 0) { setQuery(current => ({ ...current, page: Math.max(0, result.page.totalPages - 1) })); return; }
        setPage(result.page);
      }).catch(failure => { if (!controller.signal.aborted) setError(getErrorMessage(failure)); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [query, scope, order.orderCode, order.storeId]);

  return <Modal open centered className="receipt-picker" width={1040} onCancel={onClose} footer={null}
    title={<div><strong>{t("admin:ui.selectBankTransaction")}</strong><p>{t("admin:ui.order")} {order.orderCode} {t("admin:ui.amountDue")} {money(order.amount)}</p></div>}>
    <div className="receipt-picker-controls">
      <Segmented<'order' | 'store' | 'all'> block value={scope} aria-label={t("admin:ui.transactionSearchScope")} options={[
        { value: 'order', label: t("admin:ui.relatedToThisOrder") }, { value: 'store', label: t("admin:ui.sameBranch") }, { value: 'all', label: t("admin:promotions.scope.all") },
      ]} onChange={value => { setScope(value); setSearch(''); setSearchError(''); setQuery(current => ({ ...current, page: 0, search: undefined })); }} />
      {scope === 'order' ? <p className="receipt-search-hint">{t("admin:ui.searchForTheOrderIdInTransferDescriptions")}</p>
        : <Input.Search value={search} prefix={<SearchOutlined />} aria-label={t("admin:ui.searchBankTransactions")} placeholder={t("admin:ui.bankTransactionIdTransferDescriptionOrOrderId")}
          allowClear maxLength={120} enterButton={t("admin:ui.searchTransactions")} onChange={event => setSearch(event.target.value)} onSearch={value => {
            if (value.includes('\0')) { setSearchError(t("admin:ui.invalidSearchContent")); return; }
            setSearchError(''); setQuery(current => ({ ...current, page: 0, search: value.trim() || undefined }));
          }} />}
      <div className="receipt-picker-filters">
        <Select allowClear value={query.status} aria-label={t("payments:receiptStatus")} placeholder={t("business:paymentspage.allStatuses")} options={
          ['UNMATCHED', 'PENDING_RECONCILIATION', 'MATCHED', 'LATE_RECEIPT', 'IGNORED'].map(status => ({ value: status, label: t(`receiptStatuses.${status}`) }))
        } onChange={status => setQuery(current => ({ ...current, page: 0, status }))} />
        <DatePicker.RangePicker value={query.from && query.to ? [dayjs(query.from.slice(0, 10)), dayjs(query.to.slice(0, 10))] : null}
          format="DD/MM/YYYY" placeholder={[t("admin:ui.receivedFrom"), t("payments:toDate")]} aria-label={t("admin:ui.transactionReceiptDateRange")} onChange={dates => setQuery(current => ({
          ...current, page: 0, from: dates?.[0] ? `${dates[0].format('YYYY-MM-DD')}T00:00:00+07:00` : undefined,
          to: dates?.[1] ? `${dates[1].format('YYYY-MM-DD')}T23:59:59.999+07:00` : undefined,
        }))} />
      </div>
      <small className="order-muted">{t("admin:ui.datesFilterWhenTheSystemReceivedTransactionsIn")}</small>
    </div>
    {error && <Alert type="error" showIcon message={t("admin:ui.unableToLoadBankTransactions")} description={error} />}
    {searchError && <Alert type="error" showIcon message={searchError} />}
    <Table<Receipt> rowKey="id" size="small" loading={loading} dataSource={page?.content ?? []} scroll={{ x: 850 }}
      locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={error ? t("admin:ui.dataCannotBeDisplayedRightNow") : t("admin:ui.noTransactionsMatchYourFilters")}>
        {!error && scope !== 'all' && <Button onClick={() => { setScope('all'); setSearch(''); setQuery({ page: 0, size: 8 }); }}>{t("admin:ui.searchSystemWide")}</Button>}
        {!error && scope === 'all' && <p className="receipt-search-hint">{t("admin:ui.onlyTransactionsReceivedByTheSystemAppearHere")}</p>}
      </Empty> }}
      pagination={{ current: query.page + 1, pageSize: query.size, total: page?.totalElements ?? 0, showSizeChanger: false,
        showTotal: total => t("admin:ui.transactions547", { value1: total }), onChange: next => setQuery(current => ({ ...current, page: next - 1 })) }} columns={[
        { title: t("admin:ui.transactionBank"), width: 250, render: (_, receipt) => <div className="receipt-picker-cell"><strong>{receipt.transactionId}</strong>
          <span>{receipt.bank || t("admin:ui.unknownBank")} · {receipt.maskedAccount || t("admin:ui.noAccountAvailable")}</span>
          <small>{orderDate(receipt.bankOccurredAt || receipt.receivedAt, locale)}{receipt.bankOccurredAt ? '' : t("admin:ui.receiptTime")}</small></div> },
        { title: t("business:paymentspage.amount"), width: 165, align: 'right', render: (_, receipt) => <div className="receipt-picker-cell receipt-picker-amount"><strong>{receipt.direction === 'out' ? '−' : '+'}{money(receipt.amount)}</strong>
          {receipt.direction === 'in' && <small>{receipt.amount === order.amount ? t("admin:ui.equalsTheOrderTotal") : t("admin:ui.theOrderTotalBy", { value1: receipt.amount > order.amount ? t("admin:ui.higherThan552") : t("admin:ui.lowerThan553"), value2: money(Math.abs(receipt.amount - order.amount)) })}</small>}</div> },
        { title: t("admin:ui.descriptionStatus"), render: (_, receipt) => <div className="receipt-picker-cell"><span className="receipt-content">{receipt.content || t("payments:log.noContent")}</span>
          <div><Tag>{t(`receiptStatuses.${receipt.status}`, { defaultValue: receipt.status })}</Tag>{receipt.conflictCount > 0 && <Tag color="warning">{t("admin:ui.hasConflicts")}</Tag>}</div>
          <small>{receipt.matchedOrderCode ? t("admin:ui.allocated", { value1: receipt.matchedOrderCode }) : receipt.candidateOrderCode ? t("admin:ui.reference", { value1: receipt.candidateOrderCode }) : t("admin:ui.notLinkedToAnOrder")}</small>
          {receiptSelectionIssue(receipt, order) && <small className="receipt-selection-error">{receiptSelectionIssue(receipt, order)}</small>}</div> },
        { title: '', width: 135, render: (_, receipt) => <Button size="small" type={receipt.id === selectedId ? 'primary' : 'default'} disabled={loading || !!receiptSelectionIssue(receipt, order)}
          aria-label={t("admin:ui.selectTransaction560", { value1: receipt.transactionId })} onClick={() => onSelect(receipt)}>{receipt.id === selectedId ? t("admin:ui.selected") : t("admin:ui.selectTransaction")}</Button> },
      ]} />
  </Modal>;
}
