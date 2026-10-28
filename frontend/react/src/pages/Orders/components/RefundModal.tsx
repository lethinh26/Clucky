import React, { useEffect, useState } from "react";
import { Modal, Input, Radio, Typography, Space, App as AntApp } from "antd";
import { AdminOrder } from "../../../types/order";

interface RefundModalProps {
  order: AdminOrder | null;
  open: boolean;
  onClose: () => void;
  onConfirmRefund: (
    orderId: string,
    action: "APPROVED" | "REJECTED",
    note: string,
  ) => boolean;
}

export const RefundModal: React.FC<RefundModalProps> = ({
  order,
  open,
  onClose,
  onConfirmRefund,
}) => {
  const { message } = AntApp.useApp();
  const [action, setAction] = useState<"APPROVED" | "REJECTED">("APPROVED");
  const [reviewNote, setReviewNote] = useState("");

  useEffect(() => {
    if (open) {
      setAction("APPROVED");
      setReviewNote("");
    }
  }, [open, order?.id]);

  if (!order) return null;

  const handleOk = () => {
    if (!onConfirmRefund(order.id, action, reviewNote)) {
      message.error(
        "Không thể xử lý yêu cầu hoàn tiền. Kiểm tra quyền và dữ liệu hiện tại.",
      );
      return;
    }
    message.success(
      action === "APPROVED"
        ? `Đã phê duyệt hoàn tiền cho đơn ${order.orderCode}!`
        : `Đã từ chối yêu cầu hoàn tiền cho đơn ${order.orderCode}.`,
    );
    onClose();
  };

  return (
    <Modal
      title={`Xử lý yêu cầu hoàn tiền: ${order.orderCode}`}
      open={open}
      onOk={handleOk}
      onCancel={onClose}
      okText={
        action === "APPROVED" ? "Xác nhận duyệt hoàn tiền" : "Xác nhận từ chối"
      }
      okButtonProps={{
        disabled: action === "REJECTED" && !reviewNote.trim(),
        danger: action === "REJECTED",
      }}
    >
      <div style={{ marginBottom: 16 }}>
        <Typography.Paragraph>
          Khách hàng: <strong>{order.customerName}</strong> (
          {order.customerPhone})
        </Typography.Paragraph>
        <Typography.Paragraph>
          Số tiền yêu cầu hoàn:{" "}
          <strong style={{ color: "#8f1216", fontSize: 16 }}>
            {new Intl.NumberFormat("vi-VN").format(
              order.refundAmount || order.total,
            )}
            đ
          </strong>
        </Typography.Paragraph>
        <Typography.Paragraph
          style={{ background: "#f5ede0", padding: 12, borderRadius: 8 }}
        >
          Lý do từ khách hàng:{" "}
          <em>{order.refundReason || "Không có lý do chi tiết"}</em>
        </Typography.Paragraph>
      </div>

      <div style={{ marginBottom: 16 }}>
        <Typography.Text strong style={{ display: "block", marginBottom: 8 }}>
          Quyết định duyệt:
        </Typography.Text>
        <Radio.Group value={action} onChange={(e) => setAction(e.target.value)}>
          <Space orientation="vertical">
            <Radio value="APPROVED">
              <span style={{ color: "#1e7a46", fontWeight: 600 }}>
                Phê duyệt hoàn tiền
              </span>
            </Radio>
            <Radio value="REJECTED">
              <span style={{ color: "#b42318", fontWeight: 600 }}>
                Từ chối yêu cầu
              </span>
            </Radio>
          </Space>
        </Radio.Group>
      </div>

      <div>
        <Typography.Text strong style={{ display: "block", marginBottom: 8 }}>
          Ghi chú phê duyệt (Lý do):
        </Typography.Text>
        <Input.TextArea
          aria-label="Ghi chú quyết định hoàn tiền"
          rows={3}
          placeholder="Nhập ghi chú cho kế toán / gửi thông báo khách hàng..."
          value={reviewNote}
          onChange={(e) => setReviewNote(e.target.value)}
        />
      </div>
    </Modal>
  );
};
