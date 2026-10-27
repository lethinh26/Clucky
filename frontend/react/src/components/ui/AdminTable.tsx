import React from 'react';
import { Table, Input, Space, Empty, Skeleton, Card } from 'antd';
import type { TableProps } from 'antd';
import { SearchOutlined, InboxOutlined } from '@ant-design/icons';

export interface AdminTableProps<T> extends TableProps<T> {
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (val: string) => void;
  toolbarExtra?: React.ReactNode;
  filterNodes?: React.ReactNode;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: React.ReactNode;
}

export function AdminTable<T extends object>({
  columns,
  dataSource,
  loading = false,
  searchPlaceholder = 'Tìm kiếm dữ liệu...',
  searchValue,
  onSearchChange,
  toolbarExtra,
  filterNodes,
  emptyTitle = 'Không tìm thấy dữ liệu',
  emptyDescription = 'Thử điều chỉnh từ khóa tìm kiếm hoặc bộ lọc để xem kết quả khác.',
  emptyAction,
  pagination,
  ...restProps
}: AdminTableProps<T>) {
  const hasToolbar = onSearchChange || toolbarExtra || filterNodes;

  return (
    <Card
      styles={{ body: { padding: '20px 24px' } }}
      style={{
        background: '#FFFAF3',
        borderRadius: 20,
        border: '1px solid #E8E2D9',
        boxShadow: '0 4px 20px rgba(22, 16, 13, 0.03)',
      }}
    >
      {hasToolbar && (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 16,
            marginBottom: 20,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            {onSearchChange && (
              <Input
                prefix={<SearchOutlined style={{ color: '#6B6259' }} />}
                placeholder={searchPlaceholder}
                value={searchValue}
                onChange={(e) => onSearchChange(e.target.value)}
                allowClear
                style={{
                  width: 280,
                  borderRadius: 999,
                  background: '#FFFFFF',
                  borderColor: '#E8E2D9',
                  fontFamily: 'Quicksand, sans-serif',
                  height: 40,
                }}
              />
            )}
            {filterNodes}
          </div>
          {toolbarExtra && <Space wrap>{toolbarExtra}</Space>}
        </div>
      )}

      {loading ? (
        <div style={{ padding: '24px 0' }}>
          <Skeleton active paragraph={{ rows: 6 }} />
        </div>
      ) : (
        <Table<T>
          columns={columns}
          dataSource={dataSource}
          locale={{
            emptyText: (
              <Empty
                image={<InboxOutlined style={{ fontSize: 48, color: '#C9A227' }} />}
                description={
                  <div style={{ marginTop: 8 }}>
                    <div
                      style={{
                        fontFamily: 'Fredoka, sans-serif',
                        fontWeight: 600,
                        fontSize: 16,
                        color: '#16100D',
                      }}
                    >
                      {emptyTitle}
                    </div>
                    <div style={{ color: '#6B6259', fontSize: 13, marginTop: 4 }}>
                      {emptyDescription}
                    </div>
                  </div>
                }
              >
                {emptyAction}
              </Empty>
            ),
          }}
          pagination={
            pagination === false
              ? false
              : {
                  pageSize: 10,
                  showSizeChanger: true,
                  pageSizeOptions: ['5', '10', '20', '50'],
                  showTotal: (total, range) =>
                    `Hiển thị ${range[0]} - ${range[1]} trên tổng số ${total} mục`,
                  style: { fontFamily: 'Quicksand, sans-serif', fontWeight: 600 },
                  ...pagination,
                }
          }
          className="admin-custom-table"
          {...restProps}
        />
      )}
    </Card>
  );
}

export default AdminTable;
