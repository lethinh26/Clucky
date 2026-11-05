import { useLocaleTools } from "../../../i18n/hooks";
import { useTranslation } from "react-i18next";
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
  ) => Promise<boolean> | boolean;
}

export const RefundModal: React.FC<RefundModalProps> = ({
  order,
  open,
  onClose,
  onConfirmRefund,
}) => {
  const { t } = useTranslation();
  const { locale } = useLocaleTools();

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

  const handleOk = async () => {
    const ok = await onConfirmRefund(order.id, action, reviewNote);
    if (!ok) {
      message.error(
        t("business:refundmodal.unableToProcessThisRefundCheckYourPermissionsAndTheCurrentData"),
      );
      return;
    }
    message.success(
      action === "APPROVED"
        ? t("business:refundmodal.refundApprovedForOrder", { value1: order.orderCode })
        : t("business:refundmodal.refundRequestRejectedForOrder", { value1: order.orderCode }),
    );
    onClose();
  };

  return (
    <Modal
      title={t("business:refundmodal.reviewRefundRequest", { value1: order.orderCode })}
      open={open}
      onOk={handleOk}
      onCancel={onClose}
      okText={
        action === "APPROVED" ? t("business:refundmodal.confirmRefundApproval") : t("business:refundmodal.confirmRejection")
      }
      okButtonProps={{
        disabled: action === "REJECTED" && !reviewNote.trim(),
        danger: action === "REJECTED",
      }}
    >
      <div style={{ marginBottom: 16 }}>
        <Typography.Paragraph> {t("business:refundmodal.customer")} <strong>{order.customerName}</strong> (
          {order.customerPhone})
        </Typography.Paragraph>
        <Typography.Paragraph> {t("business:refundmodal.requestedRefundAmount")}{" "}
          <strong style={{ color: "#8f1216", fontSize: 16 }}>
            {new Intl.NumberFormat(locale === "en" ? "en-US" : "vi-VN").format(
              order.refundAmount || order.total,
            )} {t("business:orderdetaildrawer.currency")} </strong>
        </Typography.Paragraph>
        <Typography.Paragraph
          style={{ background: "#f5ede0", padding: 12, borderRadius: 8 }}
        > {t("business:refundmodal.customerSReason")}{" "}
          <em>{order.refundReason || t("business:refundmodal.noDetailedReasonProvided")}</em>
        </Typography.Paragraph>
      </div>

      <div style={{ marginBottom: 16 }}>
        <Typography.Text strong style={{ display: "block", marginBottom: 8 }}> {t("business:refundmodal.reviewDecision")} </Typography.Text>
        <Radio.Group value={action} onChange={(e) => setAction(e.target.value)}>
          <Space orientation="vertical">
            <Radio value="APPROVED">
              <span style={{ color: "#1e7a46", fontWeight: 600 }}> {t("business:refundmodal.approveRefund")} </span>
            </Radio>
            <Radio value="REJECTED">
              <span style={{ color: "#b42318", fontWeight: 600 }}> {t("business:refundmodal.rejectRequest")} </span>
            </Radio>
          </Space>
        </Radio.Group>
      </div>

      <div>
        <Typography.Text strong style={{ display: "block", marginBottom: 8 }}> {t("business:refundmodal.reviewNoteReason")} </Typography.Text>
        <Input.TextArea
          aria-label={t("business:refundmodal.refundDecisionNote")}
          rows={3}
          placeholder={t("business:refundmodal.enterNotesForAccountingCustomerNotification")}
          value={reviewNote}
          onChange={(e) => setReviewNote(e.target.value)}
        />
      </div>
    </Modal>
  );
};
