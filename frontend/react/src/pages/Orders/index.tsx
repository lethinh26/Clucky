import React from 'react';
import { Card, Button, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { OrdersTable, PageIntro } from '../Dashboard';

export const OrdersPage: React.FC = () => {
  return (
    <div>
      <PageIntro
        eyebrow="Operations"
        title="Quản lý Đơn hàng"
        description="Theo dõi trạng thái, chuẩn bị món và điều phối giao hàng cho các đơn hàng trong ngày."
        action={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => message.success('Đã mở biểu mẫu tạo đơn hàng thủ công.')}
            style={{
              backgroundColor: '#8F1216',
              borderColor: '#8F1216',
              borderRadius: 999,
              height: 42,
              padding: '0 20px',
              fontWeight: 700,
            }}
          >
            Tạo đơn thủ công
          </Button>
        }
      />
      <Card
        style={{
          borderRadius: 20,
          background: '#FFFAF3',
          border: '1px solid #E8E2D9',
          marginTop: 20,
        }}
      >
        <OrdersTable />
      </Card>
    </div>
  );
};

export default OrdersPage;
