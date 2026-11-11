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
    title={<div><strong>Chọn giao dịch ngân hàng</strong><p>Đơn {order.orderCode} · Tổng thanh toán {money(order.amount)}</p></div>}>
    <div className="receipt-picker-controls">
      <Segmented<'order' | 'store' | 'all'> block value={scope} aria-label="Phạm vi tìm giao dịch" options={[
        { value: 'order', label: 'Liên quan đơn này' }, { value: 'store', label: 'Cùng chi nhánh' }, { value: 'all', label: 'Toàn hệ thống' },
      ]} onChange={value => { setScope(value); setSearch(''); setSearchError(''); setQuery(current => ({ ...current, page: 0, search: undefined })); }} />
      {scope === 'order' ? <p className="receipt-search-hint">Tìm mã đơn trong nội dung chuyển khoản và tham chiếu đã lưu. Đây là gợi ý tìm kiếm, không phải xác nhận tiền đã khớp.</p>
        : <Input.Search value={search} prefix={<SearchOutlined />} aria-label="Tìm giao dịch ngân hàng" placeholder="Mã giao dịch ngân hàng, nội dung chuyển khoản hoặc mã đơn"
          allowClear maxLength={120} enterButton="Tìm giao dịch" onChange={event => setSearch(event.target.value)} onSearch={value => {
            if (value.includes('\0')) { setSearchError('Nội dung tìm kiếm không hợp lệ.'); return; }
            setSearchError(''); setQuery(current => ({ ...current, page: 0, search: value.trim() || undefined }));
          }} />}
      <div className="receipt-picker-filters">
        <Select allowClear value={query.status} aria-label="Trạng thái giao dịch" placeholder="Tất cả trạng thái" options={
          ['UNMATCHED', 'PENDING_RECONCILIATION', 'MATCHED', 'LATE_RECEIPT', 'IGNORED'].map(status => ({ value: status, label: t(`receiptStatuses.${status}`) }))
        } onChange={status => setQuery(current => ({ ...current, page: 0, status }))} />
        <DatePicker.RangePicker value={query.from && query.to ? [dayjs(query.from.slice(0, 10)), dayjs(query.to.slice(0, 10))] : null}
          format="DD/MM/YYYY" placeholder={['Nhận từ ngày', 'Đến ngày']} aria-label="Khoảng ngày hệ thống nhận giao dịch" onChange={dates => setQuery(current => ({
          ...current, page: 0, from: dates?.[0] ? `${dates[0].format('YYYY-MM-DD')}T00:00:00+07:00` : undefined,
          to: dates?.[1] ? `${dates[1].format('YYYY-MM-DD')}T23:59:59.999+07:00` : undefined,
        }))} />
      </div>
      <small className="order-muted">Ngày lọc theo thời điểm hệ thống nhận giao dịch · giờ Việt Nam. Không tìm thấy? Mở rộng sang toàn hệ thống để tìm cả giao dịch chưa xác định chi nhánh.</small>
    </div>
    {error && <Alert type="error" showIcon message="Chưa tải được giao dịch ngân hàng" description={error} />}
    {searchError && <Alert type="error" showIcon message={searchError} />}
    <Table<Receipt> rowKey="id" size="small" loading={loading} dataSource={page?.content ?? []} scroll={{ x: 850 }}
      locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={error ? 'Không thể hiển thị dữ liệu lúc này' : 'Không có giao dịch phù hợp bộ lọc'}>
        {!error && scope !== 'all' && <Button onClick={() => { setScope('all'); setSearch(''); setQuery({ page: 0, size: 8 }); }}>Tìm trên toàn hệ thống</Button>}
        {!error && scope === 'all' && <p className="receipt-search-hint">Chỉ giao dịch đã được hệ thống tiếp nhận mới xuất hiện ở đây. Không tạo biên nhận thủ công để thay thế bằng chứng ngân hàng.</p>}
      </Empty> }}
      pagination={{ current: query.page + 1, pageSize: query.size, total: page?.totalElements ?? 0, showSizeChanger: false,
        showTotal: total => `${total} giao dịch`, onChange: next => setQuery(current => ({ ...current, page: next - 1 })) }} columns={[
        { title: 'Giao dịch / ngân hàng', width: 250, render: (_, receipt) => <div className="receipt-picker-cell"><strong>{receipt.transactionId}</strong>
          <span>{receipt.bank || 'Chưa rõ ngân hàng'} · {receipt.maskedAccount || 'Chưa có tài khoản'}</span>
          <small>{orderDate(receipt.bankOccurredAt || receipt.receivedAt, locale)}{receipt.bankOccurredAt ? '' : ' · Giờ tiếp nhận'}</small></div> },
        { title: 'Số tiền', width: 165, align: 'right', render: (_, receipt) => <div className="receipt-picker-cell receipt-picker-amount"><strong>{receipt.direction === 'out' ? '−' : '+'}{money(receipt.amount)}</strong>
          {receipt.direction === 'in' && <small>{receipt.amount === order.amount ? 'Bằng tổng tiền đơn' : `${receipt.amount > order.amount ? 'Cao hơn' : 'Thấp hơn'} tổng đơn ${money(Math.abs(receipt.amount - order.amount))}`}</small>}</div> },
        { title: 'Nội dung & trạng thái', render: (_, receipt) => <div className="receipt-picker-cell"><span className="receipt-content">{receipt.content || 'Không có nội dung chuyển khoản'}</span>
          <div><Tag>{t(`receiptStatuses.${receipt.status}`, { defaultValue: receipt.status })}</Tag>{receipt.conflictCount > 0 && <Tag color="warning">Có xung đột</Tag>}</div>
          <small>{receipt.matchedOrderCode ? `Đã phân bổ: ${receipt.matchedOrderCode}` : receipt.candidateOrderCode ? `Tham chiếu: ${receipt.candidateOrderCode}` : 'Chưa gắn với đơn hàng'}</small>
          {receiptSelectionIssue(receipt, order) && <small className="receipt-selection-error">{receiptSelectionIssue(receipt, order)}</small>}</div> },
        { title: '', width: 135, render: (_, receipt) => <Button size="small" type={receipt.id === selectedId ? 'primary' : 'default'} disabled={loading || !!receiptSelectionIssue(receipt, order)}
          aria-label={`Chọn giao dịch ${receipt.transactionId}`} onClick={() => onSelect(receipt)}>{receipt.id === selectedId ? 'Đang chọn' : 'Chọn giao dịch'}</Button> },
      ]} />
  </Modal>;
}
