import React, { useEffect, useState } from 'react';
import { useDeferredAction } from '../../components/ui-loader/use-deferred-action';
import {
  Card,
  Row,
  Col,
  Statistic,
  DatePicker,
  Select,
  Button,
  Space,
  Table,
  Tag,
  Segmented,
  Tooltip,
  Typography,
  message,
  Flex,
} from 'antd';
import type { TableColumnsType } from 'antd';
import {
  DollarOutlined,
  ShoppingOutlined,
  RiseOutlined,
  FileExcelOutlined,
  FilePdfOutlined,
  ShopOutlined,
  CalendarOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  PieChartOutlined,
  BarChartOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';
import { PageIntro } from '../Dashboard';
import { useAuth } from '../../context/AuthContext';

const { RangePicker } = DatePicker;
const { Text, Title } = Typography;

export interface RevenueRecord {
  key: string;
  date: string;
  storeId: number;
  storeName: string;
  orderCount: number;
  grossRevenue: number; // Doanh thu gộp
  discountAmount: number; // Giảm giá voucher
  netRevenue: number; // Doanh thu thuần
  codRevenue: number;
  bankRevenue: number;
}

export interface StorePerformance {
  storeId: number;
  storeName: string;
  orderCount: number;
  revenue: number;
  percentage: number;
  growth: number;
}

export const mockRevenueData: RevenueRecord[] = [
  {
    key: '1',
    date: '2026-10-27',
    storeId: 1,
    storeName: 'Nguyễn Trãi (Q.5)',
    orderCount: 142,
    grossRevenue: 28500000,
    discountAmount: 2100000,
    netRevenue: 26400000,
    codRevenue: 10560000,
    bankRevenue: 15840000,
  },
  {
    key: '2',
    date: '2026-10-27',
    storeId: 2,
    storeName: 'Phan Văn Trị (Gò Vấp)',
    orderCount: 118,
    grossRevenue: 22600000,
    discountAmount: 1400000,
    netRevenue: 21200000,
    codRevenue: 8480000,
    bankRevenue: 12720000,
  },
  {
    key: '3',
    date: '2026-10-27',
    storeId: 3,
    storeName: 'Lê Văn Việt (TP. Thủ Đức)',
    orderCount: 95,
    grossRevenue: 18200000,
    discountAmount: 1100000,
    netRevenue: 17100000,
    codRevenue: 6840000,
    bankRevenue: 10260000,
  },
  {
    key: '4',
    date: '2026-10-26',
    storeId: 1,
    storeName: 'Nguyễn Trãi (Q.5)',
    orderCount: 135,
    grossRevenue: 27100000,
    discountAmount: 1900000,
    netRevenue: 25200000,
    codRevenue: 10080000,
    bankRevenue: 15120000,
  },
  {
    key: '5',
    date: '2026-10-26',
    storeId: 2,
    storeName: 'Phan Văn Trị (Gò Vấp)',
    orderCount: 110,
    grossRevenue: 21000000,
    discountAmount: 1300000,
    netRevenue: 19700000,
    codRevenue: 7880000,
    bankRevenue: 11820000,
  },
  {
    key: '6',
    date: '2026-10-26',
    storeId: 3,
    storeName: 'Lê Văn Việt (TP. Thủ Đức)',
    orderCount: 88,
    grossRevenue: 16900000,
    discountAmount: 950000,
    netRevenue: 15950000,
    codRevenue: 6380000,
    bankRevenue: 9570000,
  },
  {
    key: '7',
    date: '2026-10-25',
    storeId: 1,
    storeName: 'Nguyễn Trãi (Q.5)',
    orderCount: 160,
    grossRevenue: 32000000,
    discountAmount: 2400000,
    netRevenue: 29600000,
    codRevenue: 11840000,
    bankRevenue: 17760000,
  },
  {
    key: '8',
    date: '2026-10-25',
    storeId: 2,
    storeName: 'Phan Văn Trị (Gò Vấp)',
    orderCount: 130,
    grossRevenue: 25500000,
    discountAmount: 1800000,
    netRevenue: 23700000,
    codRevenue: 9480000,
    bankRevenue: 14220000,
  },
];

export const storePerformances: StorePerformance[] = [
  {
    storeId: 1,
    storeName: 'Nguyễn Trãi (Q.5)',
    orderCount: 437,
    revenue: 81200000,
    percentage: 42.5,
    growth: 14.8,
  },
  {
    storeId: 2,
    storeName: 'Phan Văn Trị (Gò Vấp)',
    orderCount: 358,
    revenue: 64600000,
    percentage: 33.8,
    growth: 9.2,
  },
  {
    storeId: 3,
    storeName: 'Lê Văn Việt (TP. Thủ Đức)',
    orderCount: 255,
    revenue: 45250000,
    percentage: 23.7,
    growth: -3.5,
  },
];

export const ReportsPage: React.FC = () => {
  const startDeferredExport = useDeferredAction();
  useEffect(() => () => { message.destroy('exportMsg'); }, []);
  const { user } = useAuth();

  // Mặc định 7 ngày gần nhất
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs]>([
    dayjs().subtract(6, 'day'),
    dayjs(),
  ]);

  // Bộ lọc chi nhánh (Manager bị lock vào quán mình quản lý theo RBAC)
  const [selectedStore, setSelectedStore] = useState<number | 'ALL'>(() => {
    if (user.role === 'STORE_MANAGER' && user.storeId) {
      return user.storeId;
    }
    return 'ALL';
  });

  const [chartView, setChartView] = useState<'revenue' | 'orders'>('revenue');

  // Lọc bản ghi báo cáo
  const filteredRecords = mockRevenueData.filter((r) => {
    // Ép buộc theo storeId nếu là Store Manager
    if (user.role === 'STORE_MANAGER' && user.storeId && r.storeId !== user.storeId) {
      return false;
    }

    // Lọc theo store đã chọn
    if (selectedStore !== 'ALL' && r.storeId !== selectedStore) {
      return false;
    }

    // Lọc theo ngày
    if (dateRange && dateRange[0] && dateRange[1]) {
      const recDate = dayjs(r.date);
      if (recDate.isBefore(dateRange[0], 'day') || recDate.isAfter(dateRange[1], 'day')) {
        return false;
      }
    }

    return true;
  });

  // Tính tổng
  const totalNetRevenue = filteredRecords.reduce((acc, r) => acc + r.netRevenue, 0);
  const totalGrossRevenue = filteredRecords.reduce((acc, r) => acc + r.grossRevenue, 0);
  const totalDiscounts = filteredRecords.reduce((acc, r) => acc + r.discountAmount, 0);
  const totalOrders = filteredRecords.reduce((acc, r) => acc + r.orderCount, 0);
  const averageOrderValue = totalOrders > 0 ? Math.round(totalNetRevenue / totalOrders) : 0;

  // Xử lý xuất file (Export Excel / PDF)
  const handleExport = (format: 'xlsx' | 'pdf') => {
    const task = startDeferredExport();
    const storeLabel =
      selectedStore === 'ALL' ? 'Toan_He_Thong' : `Chi_Nhanh_${selectedStore}`;
    const fromStr = dateRange[0].format('YYYY-MM-DD');
    const toStr = dateRange[1].format('YYYY-MM-DD');
    const fileName = `Bao_Cao_Doanh_Thu_Clucky_${storeLabel}_${fromStr}_${toStr}.${format}`;

    message.loading({ content: `Đang kết xuất báo cáo ${format.toUpperCase()}...`, key: 'exportMsg' });
    task.schedule(() => {
      message.success({
        content: `Đã xuất báo cáo thành công: ${fileName}`,
        key: 'exportMsg',
        duration: 3,
      });
    }, 1200);
  };

  const columns: TableColumnsType<RevenueRecord> = [
    {
      title: 'Ngày',
      dataIndex: 'date',
      key: 'date',
      width: 120,
      render: (val: string) => (
        <Space size={4}>
          <CalendarOutlined style={{ color: '#8F1216' }} />
          <Text strong>{dayjs(val).format('DD/MM/YYYY')}</Text>
        </Space>
      ),
    },
    {
      title: 'Chi nhánh',
      dataIndex: 'storeName',
      key: 'storeName',
      width: 200,
      render: (val: string) => (
        <Space size={4}>
          <ShopOutlined style={{ color: '#C9A227' }} />
          <span>{val}</span>
        </Space>
      ),
    },
    {
      title: 'Số đơn',
      dataIndex: 'orderCount',
      key: 'orderCount',
      align: 'right',
      render: (val: number) => <Text strong>{val} đơn</Text>,
    },
    {
      title: 'Doanh thu gộp',
      dataIndex: 'grossRevenue',
      key: 'grossRevenue',
      align: 'right',
      render: (val: number) => <span>{val.toLocaleString('vi-VN')}đ</span>,
    },
    {
      title: 'Khuyến mãi',
      dataIndex: 'discountAmount',
      key: 'discountAmount',
      align: 'right',
      render: (val: number) => (
        <span style={{ color: '#B42318' }}>-{val.toLocaleString('vi-VN')}đ</span>
      ),
    },
    {
      title: 'Doanh thu thuần',
      dataIndex: 'netRevenue',
      key: 'netRevenue',
      align: 'right',
      render: (val: number) => (
        <Text strong style={{ color: '#8F1216', fontFamily: 'Fredoka, sans-serif', fontSize: 15 }}>
          {val.toLocaleString('vi-VN')}đ
        </Text>
      ),
    },
    {
      title: 'Phương thức',
      key: 'methodSplit',
      align: 'center',
      render: (_, r) => (
        <Space size={4}>
          <Tag color="orange" style={{ borderRadius: 6 }}>
            COD: {Math.round((r.codRevenue / r.netRevenue) * 100)}%
          </Tag>
          <Tag color="blue" style={{ borderRadius: 6 }}>
            CK: {Math.round((r.bankRevenue / r.netRevenue) * 100)}%
          </Tag>
        </Space>
      ),
    },
  ];

  // Chuẩn bị dữ liệu hiển thị biểu đồ Chart Bar Placeholder
  const chartDays = ['21/10', '22/10', '23/10', '24/10', '25/10', '26/10', '27/10'];
  const chartHeights = chartView === 'revenue' ? [45, 60, 52, 75, 95, 78, 86] : [40, 55, 48, 70, 92, 72, 82];
  const chartValues =
    chartView === 'revenue'
      ? ['42,5 tr', '51,2 tr', '48,0 tr', '62,8 tr', '79,5 tr', '66,1 tr', '71,8 tr']
      : ['220 đơn', '265 đơn', '240 đơn', '310 đơn', '390 đơn', '333 đơn', '355 đơn'];

  return (
    <div className="reports-page">
      <PageIntro
        eyebrow="Review & Report"
        title="Báo cáo Doanh thu & Hiệu suất"
        description="Theo dõi chi tiết số liệu doanh thu, số lượng đơn hàng, voucher khuyến mãi và kết xuất dữ liệu cho quản trị."
      />

      {/* Thanh điều khiển: Date Picker, Store Filter & Nút Export */}
      <Card
        style={{
          borderRadius: 20,
          background: '#FFFAF3',
          border: '1px solid #E8E2D9',
          marginBottom: 20,
        }}
      >
        <Row gutter={[16, 12]} justify="space-between" align="middle">
          {/* Bộ lọc Date Picker & Store */}
          <Col xs={24} lg={16}>
            <Flex wrap="wrap" gap={12} align="center">
              {/* Khoảng thời gian */}
              <Space>
                <Text strong style={{ color: '#16100D' }}>
                  Thời gian:
                </Text>
                <RangePicker
                  value={dateRange}
                  onChange={(dates) => {
                    if (dates && dates[0] && dates[1]) {
                      setDateRange([dates[0], dates[1]]);
                    }
                  }}
                  format="DD/MM/YYYY"
                  allowClear={false}
                  style={{
                    borderRadius: 10,
                    height: 40,
                    borderColor: '#E8E2D9',
                  }}
                />
              </Space>

              {/* Lọc chi nhánh */}
              <Space>
                <Text strong style={{ color: '#16100D' }}>
                  Chi nhánh:
                </Text>
                <Select
                  value={selectedStore}
                  onChange={(val) => setSelectedStore(val)}
                  disabled={user.role === 'STORE_MANAGER' && !!user.storeId}
                  style={{ width: 220, height: 40 }}
                  options={[
                    { value: 'ALL', label: 'Tất cả chi nhánh' },
                    { value: 1, label: 'Nguyễn Trãi (Q.5)' },
                    { value: 2, label: 'Phan Văn Trị (Gò Vấp)' },
                    { value: 3, label: 'Lê Văn Việt (TP. Thủ Đức)' },
                  ]}
                />
              </Space>
            </Flex>
          </Col>

          {/* Các nút Export */}
          <Col xs={24} lg={8}>
            <Flex justify="end" gap={8} wrap="wrap">
              <Button
                icon={<FileExcelOutlined style={{ color: '#1E7A46' }} />}
                onClick={() => handleExport('xlsx')}
                style={{
                  height: 40,
                  borderRadius: 10,
                  fontWeight: 600,
                  borderColor: '#1E7A46',
                  color: '#1E7A46',
                }}
              >
                Xuất Excel (.xlsx)
              </Button>
              <Button
                icon={<FilePdfOutlined style={{ color: '#8F1216' }} />}
                onClick={() => handleExport('pdf')}
                style={{
                  height: 40,
                  borderRadius: 10,
                  fontWeight: 600,
                  borderColor: '#8F1216',
                  color: '#8F1216',
                }}
              >
                Xuất PDF (.pdf)
              </Button>
            </Flex>
          </Col>
        </Row>
      </Card>

      {/* Thẻ chỉ số tổng kết (Metric Cards) */}
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={24} sm={12} xl={6}>
          <Card style={{ background: '#FFFAF3', border: '1px solid #E8E2D9', borderRadius: 16 }}>
            <Statistic
              title={<span style={{ color: '#6B6259', fontWeight: 600 }}>Doanh thu thuần</span>}
              value={totalNetRevenue.toLocaleString('vi-VN')}
              suffix="đ"
              prefix={<DollarOutlined style={{ color: '#8F1216' }} />}
              valueStyle={{ color: '#8F1216', fontFamily: 'Fredoka, sans-serif', fontWeight: 700 }}
            />
            <div style={{ marginTop: 8, fontSize: 12, color: '#1E7A46' }}>
              <ArrowUpOutlined /> +11.4% so với kỳ trước
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <Card style={{ background: '#FFFAF3', border: '1px solid #E8E2D9', borderRadius: 16 }}>
            <Statistic
              title={<span style={{ color: '#6B6259', fontWeight: 600 }}>Tổng đơn hàng</span>}
              value={totalOrders}
              suffix="đơn"
              prefix={<ShoppingOutlined style={{ color: '#C9A227' }} />}
              valueStyle={{ color: '#16100D', fontFamily: 'Fredoka, sans-serif', fontWeight: 700 }}
            />
            <div style={{ marginTop: 8, fontSize: 12, color: '#1E7A46' }}>
              <ArrowUpOutlined /> +8.2% đơn hoàn thành
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <Card style={{ background: '#FFFAF3', border: '1px solid #E8E2D9', borderRadius: 16 }}>
            <Statistic
              title={<span style={{ color: '#6B6259', fontWeight: 600 }}>Giá trị đơn trung bình (AOV)</span>}
              value={averageOrderValue.toLocaleString('vi-VN')}
              suffix="đ"
              prefix={<RiseOutlined style={{ color: '#22577A' }} />}
              valueStyle={{ color: '#22577A', fontFamily: 'Fredoka, sans-serif', fontWeight: 700 }}
            />
            <div style={{ marginTop: 8, fontSize: 12, color: '#6B6259' }}>
              Trung bình mỗi giao dịch thành công
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <Card style={{ background: '#FFFAF3', border: '1px solid #E8E2D9', borderRadius: 16 }}>
            <Statistic
              title={<span style={{ color: '#6B6259', fontWeight: 600 }}>Chi phí khuyến mãi</span>}
              value={totalDiscounts.toLocaleString('vi-VN')}
              suffix="đ"
              valueStyle={{ color: '#B42318', fontFamily: 'Fredoka, sans-serif', fontWeight: 700 }}
            />
            <div style={{ marginTop: 8, fontSize: 12, color: '#6B6259' }}>
              Tương đương {totalGrossRevenue > 0 ? ((totalDiscounts / totalGrossRevenue) * 100).toFixed(1) : 0}% tổng doanh thu gộp
            </div>
          </Card>
        </Col>
      </Row>

      {/* Biểu đồ trực quan hóa doanh thu (Chart Placeholder) & Tỷ trọng chi nhánh */}
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        {/* Biểu đồ cột xu hướng */}
        <Col xs={24} xl={16}>
          <Card
            title={
              <Space>
                <BarChartOutlined style={{ color: '#8F1216' }} />
                <span>Xu hướng doanh thu theo ngày</span>
              </Space>
            }
            extra={
              <Segmented
                options={[
                  { value: 'revenue', label: 'Doanh thu (VNĐ)' },
                  { value: 'orders', label: 'Số lượng đơn' },
                ]}
                value={chartView}
                onChange={(val) => setChartView(val as 'revenue' | 'orders')}
                size="small"
              />
            }
            style={{ borderRadius: 20, background: '#FFFAF3', border: '1px solid #E8E2D9' }}
          >
            <div className="revenue-chart" style={{ padding: '10px 0' }}>
              <div
                className="chart-bars"
                style={{
                  height: 240,
                  display: 'flex',
                  alignItems: 'flex-end',
                  justifyContent: 'space-around',
                  padding: '20px 8px 0',
                  borderBottom: '1px solid #E8E2D9',
                  background: 'repeating-linear-gradient(to bottom, transparent 0, transparent 43px, #F5EDE0 44px)',
                }}
              >
                {chartDays.map((day, idx) => (
                  <Tooltip key={day} title={`${day}: ${chartValues[idx]}`}>
                    <div
                      style={{
                        height: '100%',
                        display: 'flex',
                        flex: 1,
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'flex-end',
                        gap: 8,
                      }}
                    >
                      <div
                        style={{
                          width: '100%',
                          maxWidth: 36,
                          height: `${chartHeights[idx]}%`,
                          borderRadius: '8px 8px 0 0',
                          background: 'linear-gradient(180deg, #C9A227 0%, #8F1216 100%)',
                          transition: 'height 0.3s ease',
                          cursor: 'pointer',
                        }}
                      />
                      <Text style={{ fontSize: 12, color: '#6B6259' }}>{day}</Text>
                    </div>
                  </Tooltip>
                ))}
              </div>
              <Flex justify="space-between" align="center" style={{ marginTop: 16 }}>
                <Text type="secondary" style={{ color: '#6B6259', fontSize: 13 }}>
                  Dữ liệu ghi nhận từ các giao dịch hoàn thành trong kỳ chọn
                </Text>
                <Text strong style={{ color: '#8F1216', fontFamily: 'Fredoka, sans-serif', fontSize: 16 }}>
                  Tổng cộng: {totalNetRevenue.toLocaleString('vi-VN')}đ
                </Text>
              </Flex>
            </div>
          </Card>
        </Col>

        {/* Tỷ trọng doanh thu theo chi nhánh */}
        <Col xs={24} xl={8}>
          <Card
            title={
              <Space>
                <PieChartOutlined style={{ color: '#C9A227' }} />
                <span>Hiệu suất các chi nhánh</span>
              </Space>
            }
            style={{ borderRadius: 20, background: '#FFFAF3', border: '1px solid #E8E2D9', height: '100%' }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 8 }}>
              {storePerformances.map((st) => (
                <div
                  key={st.storeId}
                  style={{
                    padding: '12px 14px',
                    borderRadius: 12,
                    background: '#F5EDE0',
                    border: '1px solid #E8E2D9',
                  }}
                >
                  <Flex justify="space-between" align="center">
                    <Text strong style={{ color: '#16100D', fontSize: 14 }}>
                      {st.storeName}
                    </Text>
                    <Tag
                      color={st.growth >= 0 ? 'green' : 'red'}
                      bordered={false}
                      style={{ fontWeight: 600, borderRadius: 6 }}
                    >
                      {st.growth >= 0 ? <ArrowUpOutlined /> : <ArrowDownOutlined />} {Math.abs(st.growth)}%
                    </Tag>
                  </Flex>

                  <Flex justify="space-between" align="baseline" style={{ marginTop: 6 }}>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {st.orderCount} đơn hàng
                    </Text>
                    <Text strong style={{ color: '#8F1216', fontFamily: 'Fredoka, sans-serif' }}>
                      {st.revenue.toLocaleString('vi-VN')}đ ({st.percentage}%)
                    </Text>
                  </Flex>
                </div>
              ))}
            </div>
          </Card>
        </Col>
      </Row>

      {/* Bảng kê chi tiết doanh thu */}
      <Card
        title={
          <Flex justify="space-between" align="center">
            <span style={{ fontFamily: 'Fredoka, sans-serif', fontSize: 18, color: '#16100D' }}>
              Chi tiết giao dịch doanh thu theo ngày
            </span>
            <Text type="secondary" style={{ fontSize: 13, fontWeight: 'normal' }}>
              Hiển thị {filteredRecords.length} bản ghi
            </Text>
          </Flex>
        }
        style={{
          borderRadius: 20,
          background: '#FFFAF3',
          border: '1px solid #E8E2D9',
        }}
      >
        <Table
          columns={columns}
          dataSource={filteredRecords}
          pagination={{ pageSize: 8 }}
          scroll={{ x: 750 }}
        />
      </Card>
    </div>
  );
};

export default ReportsPage;
