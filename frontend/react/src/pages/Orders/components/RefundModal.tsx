import { message } from "../../../components/feedback";
import { useLocaleTools } from "../../../i18n/hooks";
import { useTranslation } from "react-i18next";
import React, { useEffect, useState, useRef, useCallback } from "react";
import { Modal, Input, Radio, Typography, Space, Tag, Button, Alert, Spin, Upload } from "antd";
import { AdminOrder } from "../../../types/order";
import { refundsApi, getErrorMessage, type BackendRefund } from "../../../lib/api";
import { useOrders } from "../../../context/OrderContext";
import { CheckCircle2, AlertTriangle, Eye, UploadCloud, RefreshCw, XCircle } from "lucide-react";

interface RefundModalProps {
  order: AdminOrder | null;
  open: boolean;
  onClose: () => void;
  onConfirmRefund?: (
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
  const { refreshOrders } = useOrders();

  const [refund, setRefund] = useState<BackendRefund | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // PENDING state fields
  const [action, setAction] = useState<"APPROVED" | "REJECTED">("APPROVED");
  const [reviewNote, setReviewNote] = useState("");

  // Sub-modals
  const [invalidModalOpen, setInvalidModalOpen] = useState(false);
  const [invalidReason, setInvalidReason] = useState("");

  const [bankModalOpen, setBankModalOpen] = useState(false);
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountHolderName, setAccountHolderName] = useState("");

  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [confirmNote, setConfirmNote] = useState("");

  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const [uploadingEvidence, setUploadingEvidence] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchRefundDetails = useCallback(async (refundId: number) => {
    try {
      setLoading(true);
      const data = await refundsApi.get(refundId);
      setRefund(data);
      setBankName(data.bankName || "");
      setAccountNumber(data.accountNumber || data.bankAccountNo || "");
      setAccountHolderName(data.accountHolderName || data.bankAccountName || "");
    } catch (err) {
      // Fallback to order-embedded refund data if available
      if (order?.refundData) {
        setRefund(order.refundData);
        setBankName(order.refundData.bankName || "");
        setAccountNumber(order.refundData.accountNumber || order.refundData.bankAccountNo || "");
        setAccountHolderName(order.refundData.accountHolderName || order.refundData.bankAccountName || "");
      }
    } finally {
      setLoading(false);
    }
  }, [order?.refundData]);

  useEffect(() => {
    if (open && order?.refundRequestId) {
      setAction("APPROVED");
      setReviewNote("");
      setEvidenceFile(null);
      void fetchRefundDetails(order.refundRequestId);
    } else if (open && order?.refundData) {
      setRefund(order.refundData);
    }
  }, [open, order?.refundRequestId, order?.refundData, fetchRefundDetails]);

  if (!order) return null;

  const currentStatus = refund?.status || order.refundStatus || "PENDING";
  const hasEvidence = Boolean(refund?.evidencePublicId);

  // 1. Review action for PENDING
  const handleReviewSubmit = async () => {
    if (!order.refundRequestId) return;
    try {
      setSubmitting(true);
      if (onConfirmRefund) {
        const ok = await onConfirmRefund(order.id, action, reviewNote);
        if (!ok) return;
      } else {
        await refundsApi.review(
          order.refundRequestId,
          action === "APPROVED" ? "APPROVE" : "REJECT",
          reviewNote
        );
      }
      message.success(
        action === "APPROVED"
          ? t("business:refundmodal.refundApprovedForOrder", { value1: order.orderCode })
          : t("business:refundmodal.refundRequestRejectedForOrder", { value1: order.orderCode })
      );
      await refreshOrders();
      await fetchRefundDetails(order.refundRequestId);
    } catch (err) {
      message.error(getErrorMessage(err, t("business:refundmodal.unableToProcessThisRefundCheckYourPermissionsAndTheCurrentData")));
    } finally {
      setSubmitting(false);
    }
  };

  // 2. Claim processing for APPROVED
  const handleClaimProcessing = async () => {
    if (!order.refundRequestId) return;
    try {
      setSubmitting(true);
      const updated = await refundsApi.claimProcessing(order.refundRequestId);
      setRefund(updated);
      message.success(t("business:refundmodal.claimProcessingSuccess"));
      await refreshOrders();
    } catch (err) {
      message.error(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  // 3. Mark invalid bank details for PROCESSING
  const handleReportInvalidBank = async () => {
    if (!order.refundRequestId || !invalidReason.trim()) return;
    try {
      setSubmitting(true);
      const updated = await refundsApi.requestBankDetails(order.refundRequestId, invalidReason.trim());
      setRefund(updated);
      setInvalidModalOpen(false);
      setInvalidReason("");
      message.success(t("business:refundmodal.invalidBankDetailsSuccess"));
      await refreshOrders();
    } catch (err) {
      message.error(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  // 4. Update bank details for WAITING_BANK_DETAILS / APPROVED
  const handleUpdateBankDetails = async () => {
    if (!order.refundRequestId || !bankName.trim() || !accountNumber.trim() || !accountHolderName.trim()) {
      message.warning(t("business:stores.pleaseCheckTheStoreInformationFields"));
      return;
    }
    try {
      setSubmitting(true);
      const updated = await refundsApi.updateBankDetails(order.refundRequestId, {
        bankName: bankName.trim(),
        accountNumber: accountNumber.trim(),
        accountHolderName: accountHolderName.trim(),
      });
      setRefund(updated);
      setBankModalOpen(false);
      message.success(t("business:refundmodal.updateBankDetailsSuccess"));
      await refreshOrders();
    } catch (err) {
      message.error(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  // 5. Upload evidence for PROCESSING
  const handleUploadEvidence = async (fileToUpload?: File) => {
    const file = fileToUpload || evidenceFile;
    if (!order.refundRequestId || !file) return;
    try {
      setUploadingEvidence(true);
      const updated = await refundsApi.uploadEvidence(order.refundRequestId, file);
      setRefund(updated);
      setEvidenceFile(null);
      message.success(t("business:refundmodal.uploadEvidenceSuccess"));
      await refreshOrders();
    } catch (err) {
      message.error(getErrorMessage(err));
    } finally {
      setUploadingEvidence(false);
    }
  };

  // 6. View evidence
  const handleViewEvidence = async () => {
    if (!order.refundRequestId) return;
    try {
      const access = await refundsApi.getEvidenceAccess(order.refundRequestId);
      if (access?.accessUrl) {
        window.open(access.accessUrl, "_blank", "noopener,noreferrer");
      } else {
        message.warning(t("business:refundmodal.unableToProcessThisRefundCheckYourPermissionsAndTheCurrentData"));
      }
    } catch (err) {
      message.error(getErrorMessage(err));
    }
  };

  // 7. Confirm refund
  const handleConfirmRefundSubmit = async () => {
    if (!order.refundRequestId) return;
    try {
      setSubmitting(true);
      const updated = await refundsApi.confirmRefund(order.refundRequestId, confirmNote);
      setRefund(updated);
      setConfirmModalOpen(false);
      message.success(t("business:refundmodal.confirmRefundSuccess"));
      await refreshOrders();
    } catch (err) {
      message.error(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const statusColorMap: Record<string, string> = {
    PENDING: "gold",
    APPROVED: "blue",
    PROCESSING: "cyan",
    WAITING_BANK_DETAILS: "orange",
    REFUNDED: "green",
    REJECTED: "red",
  };

  const statusLabelMap: Record<string, string> = {
    PENDING: t("business:refundmodal.statePending"),
    APPROVED: t("business:refundmodal.stateApproved"),
    PROCESSING: t("business:refundmodal.stateProcessing"),
    WAITING_BANK_DETAILS: t("business:refundmodal.stateWaitingBank"),
    REFUNDED: t("business:refundmodal.stateRefunded"),
    REJECTED: t("business:refundmodal.stateRejected"),
  };

  return (
    <>
      <Modal
        title={t("business:refundmodal.reviewRefundRequest", { value1: order.orderCode })}
        open={open}
        onCancel={onClose}
        footer={null}
        width={620}
      >
        <Spin spinning={loading}>
          {/* Summary Information */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <Typography.Paragraph style={{ margin: 0 }}>
                {t("business:refundmodal.customer")} <strong>{order.customerName}</strong> ({order.customerPhone})
              </Typography.Paragraph>
              <Tag color={statusColorMap[currentStatus] || "default"}>
                {statusLabelMap[currentStatus] || currentStatus}
              </Tag>
            </div>
            <Typography.Paragraph style={{ margin: "4px 0" }}>
              {t("business:refundmodal.requestedRefundAmount")}{" "}
              <strong style={{ color: "#8f1216", fontSize: 16 }}>
                {new Intl.NumberFormat(locale === "en" ? "en-US" : "vi-VN").format(
                  refund?.amount || order.refundAmount || order.total,
                )}{" "}
                {t("business:orderdetaildrawer.currency")}
              </strong>
            </Typography.Paragraph>
            <Typography.Paragraph style={{ background: "#f5ede0", padding: 12, borderRadius: 8, margin: "8px 0" }}>
              {t("business:refundmodal.customerSReason")}{" "}
              <em>{refund?.reason || order.refundReason || t("business:refundmodal.noDetailedReasonProvided")}</em>
            </Typography.Paragraph>
          </div>

          {/* Bank details card if available */}
          {["APPROVED", "PROCESSING", "WAITING_BANK_DETAILS", "REFUNDED"].includes(currentStatus) && (
            <div style={{ background: "#fafafa", border: "1px solid #e8e8e8", borderRadius: 8, padding: 12, marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <Typography.Text strong>{t("business:refundmodal.bankInfo")}</Typography.Text>
                {refund?.bankDetailsVersion && (
                  <Tag style={{ fontSize: 11 }}>v{refund.bankDetailsVersion}</Tag>
                )}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 13 }}>
                <div>
                  <span style={{ color: "#888" }}>{t("business:refundmodal.bankName")}:</span>{" "}
                  <strong>{refund?.bankName || t("business:refundmodal.noBankInfo")}</strong>
                </div>
                <div>
                  <span style={{ color: "#888" }}>{t("business:refundmodal.accountNumber")}:</span>{" "}
                  <strong>{refund?.accountNumber || refund?.bankAccountNo || t("business:refundmodal.noBankInfo")}</strong>
                </div>
                <div style={{ gridColumn: "1 / -1" }}>
                  <span style={{ color: "#888" }}>{t("business:refundmodal.accountHolderName")}:</span>{" "}
                  <strong>{refund?.accountHolderName || refund?.bankAccountName || t("business:refundmodal.noBankInfo")}</strong>
                </div>
              </div>
              {["APPROVED", "WAITING_BANK_DETAILS"].includes(currentStatus) && (
                <div style={{ marginTop: 8 }}>
                  <Button size="small" onClick={() => setBankModalOpen(true)}>
                    {t("business:refundmodal.updateBankDetails")}
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Workflow specific operations */}

          {/* A. PENDING */}
          {currentStatus === "PENDING" && (
            <div style={{ borderTop: "1px solid #f0f0f0", paddingTop: 16 }}>
              <Typography.Text strong style={{ display: "block", marginBottom: 8 }}>
                {t("business:refundmodal.reviewDecision")}
              </Typography.Text>
              <Radio.Group value={action} onChange={(e) => setAction(e.target.value)} style={{ marginBottom: 16 }}>
                <Space orientation="vertical">
                  <Radio value="APPROVED">
                    <span style={{ color: "#1e7a46", fontWeight: 600 }}>
                      {t("business:refundmodal.approveRefund")}
                    </span>
                  </Radio>
                  <Radio value="REJECTED">
                    <span style={{ color: "#b42318", fontWeight: 600 }}>
                      {t("business:refundmodal.rejectRequest")}
                    </span>
                  </Radio>
                </Space>
              </Radio.Group>

              <div style={{ marginBottom: 16 }}>
                <Typography.Text strong style={{ display: "block", marginBottom: 8 }}>
                  {t("business:refundmodal.reviewNoteReason")}
                </Typography.Text>
                <Input.TextArea
                  rows={3}
                  placeholder={t("business:refundmodal.enterNotesForAccountingCustomerNotification")}
                  value={reviewNote}
                  onChange={(e) => setReviewNote(e.target.value)}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                <Button onClick={onClose}>{t("account:cancel")}</Button>
                <Button
                  type="primary"
                  danger={action === "REJECTED"}
                  disabled={action === "REJECTED" && !reviewNote.trim()}
                  loading={submitting}
                  onClick={handleReviewSubmit}
                >
                  {action === "APPROVED"
                    ? t("business:refundmodal.confirmRefundApproval")
                    : t("business:refundmodal.confirmRejection")}
                </Button>
              </div>
            </div>
          )}

          {/* B. APPROVED */}
          {currentStatus === "APPROVED" && (
            <div style={{ borderTop: "1px solid #f0f0f0", paddingTop: 16 }}>
              <Alert
                type="info"
                showIcon
                message={t("business:refundmodal.stateApproved")}
                description={t("business:refundmodal.stateApprovedDesc")}
                style={{ marginBottom: 16 }}
              />
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                <Button onClick={onClose}>{t("account:cancel")}</Button>
                <Button
                  type="primary"
                  loading={submitting}
                  onClick={handleClaimProcessing}
                >
                  {t("business:refundmodal.claimProcessing")}
                </Button>
              </div>
            </div>
          )}

          {/* C. PROCESSING */}
          {currentStatus === "PROCESSING" && (
            <div style={{ borderTop: "1px solid #f0f0f0", paddingTop: 16 }}>
              <Alert
                type="warning"
                showIcon
                message={t("business:refundmodal.stateProcessing")}
                description={t("business:refundmodal.stateProcessingDesc")}
                style={{ marginBottom: 16 }}
              />

              {/* Evidence Section */}
              <div style={{ background: "#f8fafc", padding: 14, borderRadius: 10, marginBottom: 16, border: "1px dashed #cbd5e1" }}>
                <Typography.Text strong style={{ display: "block", marginBottom: 10, color: "#1e293b" }}>
                  {t("business:refundmodal.uploadEvidence")}
                </Typography.Text>

                <Upload.Dragger
                  accept="image/jpeg,image/png,image/webp"
                  multiple={false}
                  beforeUpload={(file) => {
                    const isImg = ["image/jpeg", "image/png", "image/webp"].includes(file.type);
                    if (!isImg) {
                      message.error(t("business:refundmodal.invalidFormatError"));
                      return Upload.LIST_IGNORE;
                    }
                    const isLt5M = file.size / 1024 / 1024 < 5;
                    if (!isLt5M) {
                      message.error(t("business:refundmodal.fileTooLargeError"));
                      return Upload.LIST_IGNORE;
                    }
                    setEvidenceFile(file);
                    return false;
                  }}
                  showUploadList={false}
                  style={{ background: "#fff", borderRadius: 8, padding: "12px 0" }}
                >
                  <p className="ant-upload-drag-icon" style={{ marginBottom: 6 }}>
                    <UploadCloud size={30} style={{ color: "#8f1216" }} />
                  </p>
                  <p className="ant-upload-text" style={{ fontSize: 13, fontWeight: 500, margin: "0 0 2px" }}>
                    {t("business:refundmodal.dragDropHint")}
                  </p>
                  <p className="ant-upload-hint" style={{ fontSize: 11, color: "#64748b", margin: 0 }}>
                    {t("business:refundmodal.supportedFormatsHint")}
                  </p>
                </Upload.Dragger>

                {evidenceFile && (
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#f1f5f9", padding: "8px 12px", borderRadius: 6, marginTop: 10 }}>
                    <span style={{ fontSize: 13, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "330px" }}>
                      📁 {evidenceFile.name} ({(evidenceFile.size / 1024).toFixed(1)} KB)
                    </span>
                    <Button
                      type="primary"
                      size="small"
                      icon={<UploadCloud size={14} />}
                      loading={uploadingEvidence}
                      onClick={() => handleUploadEvidence(evidenceFile)}
                    >
                      {t("business:refundmodal.uploadEvidence")}
                    </Button>
                  </div>
                )}

                {hasEvidence && (
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#f0fdf4", border: "1px solid #bbf7d0", padding: "10px 14px", borderRadius: 8, marginTop: 10 }}>
                    <Space>
                      <CheckCircle2 size={16} color="#16a34a" />
                      <span style={{ fontSize: 13, color: "#166534", fontWeight: 600 }}>
                        {t("business:refundmodal.evidenceUploaded")}
                      </span>
                    </Space>
                    <Button size="small" icon={<Eye size={14} />} onClick={handleViewEvidence}>
                      {t("business:refundmodal.viewEvidence")}
                    </Button>
                  </div>
                )}
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Button
                  danger
                  onClick={() => {
                    setInvalidReason("");
                    setInvalidModalOpen(true);
                  }}
                >
                  {t("business:refundmodal.invalidBankDetails")}
                </Button>
                <Space>
                  <Button onClick={onClose}>{t("account:cancel")}</Button>
                  <Button
                    type="primary"
                    disabled={!hasEvidence}
                    onClick={() => {
                      setConfirmNote("");
                      setConfirmModalOpen(true);
                    }}
                  >
                    {t("business:refundmodal.confirmRefund")}
                  </Button>
                </Space>
              </div>
            </div>
          )}

          {/* D. WAITING_BANK_DETAILS */}
          {currentStatus === "WAITING_BANK_DETAILS" && (
            <div style={{ borderTop: "1px solid #f0f0f0", paddingTop: 16 }}>
              <Alert
                type="warning"
                showIcon
                message={t("business:refundmodal.stateWaitingBank")}
                description={t("business:refundmodal.stateWaitingBankDesc")}
                style={{ marginBottom: 16 }}
              />
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                <Button onClick={onClose}>{t("account:cancel")}</Button>
                <Button
                  type="primary"
                  onClick={() => setBankModalOpen(true)}
                >
                  {t("business:refundmodal.updateBankDetails")}
                </Button>
              </div>
            </div>
          )}

          {/* E. REFUNDED */}
          {currentStatus === "REFUNDED" && (
            <div style={{ borderTop: "1px solid #f0f0f0", paddingTop: 16 }}>
              <Alert
                type="success"
                showIcon
                message={t("business:refundmodal.stateRefunded")}
                description={t("business:refundmodal.stateRefundedDesc")}
                style={{ marginBottom: 16 }}
              />
              {hasEvidence && (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#f0fdf4", border: "1px solid #bbf7d0", padding: "10px 14px", borderRadius: 8, marginBottom: 16 }}>
                  <Space>
                    <CheckCircle2 size={16} color="#16a34a" />
                    <span style={{ fontSize: 13, color: "#166534", fontWeight: 600 }}>
                      {t("business:refundmodal.evidenceSecured")}
                    </span>
                  </Space>
                  <Button icon={<Eye size={14} />} onClick={handleViewEvidence}>
                    {t("business:refundmodal.viewEvidence")}
                  </Button>
                </div>
              )}
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <Button onClick={onClose}>{t("account:cancel")}</Button>
              </div>
            </div>
          )}

          {/* F. REJECTED */}
          {currentStatus === "REJECTED" && (
            <div style={{ borderTop: "1px solid #f0f0f0", paddingTop: 16 }}>
              <Alert
                type="error"
                showIcon
                message={t("business:refundmodal.stateRejected")}
                description={refund?.reviewNote || t("business:refundmodal.stateRejectedDefault")}
                style={{ marginBottom: 16 }}
              />
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <Button onClick={onClose}>{t("account:cancel")}</Button>
              </div>
            </div>
          )}
        </Spin>
      </Modal>

      {/* Sub-modal: Report Invalid Bank Details */}
      <Modal
        title={t("business:refundmodal.invalidBankDetails")}
        open={invalidModalOpen}
        onCancel={() => setInvalidModalOpen(false)}
        onOk={handleReportInvalidBank}
        okButtonProps={{ danger: true, disabled: !invalidReason.trim(), loading: submitting }}
        okText={t("adminmodal:confirmAction")}
      >
        <Typography.Paragraph>
          {t("business:refundmodal.invalidBankDetailsPrompt")}
        </Typography.Paragraph>
        <Input.TextArea
          rows={3}
          value={invalidReason}
          onChange={(e) => setInvalidReason(e.target.value)}
          placeholder={t("business:refundmodal.invalidBankPlaceholder")}
        />
      </Modal>

      {/* Sub-modal: Update Bank Details */}
      <Modal
        title={t("business:refundmodal.updateBankDetails")}
        open={bankModalOpen}
        onCancel={() => setBankModalOpen(false)}
        onOk={handleUpdateBankDetails}
        okButtonProps={{
          disabled: !bankName.trim() || !accountNumber.trim() || !accountHolderName.trim(),
          loading: submitting,
        }}
        okText={t("account:saveChanges")}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <label style={{ display: "block", marginBottom: 4, fontWeight: 600 }}>
              {t("business:refundmodal.bankName")} *
            </label>
            <Input
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
              placeholder={t("business:refundmodal.bankNamePlaceholder")}
            />
          </div>
          <div>
            <label style={{ display: "block", marginBottom: 4, fontWeight: 600 }}>
              {t("business:refundmodal.accountNumber")} *
            </label>
            <Input
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value)}
              placeholder={t("business:refundmodal.accountNumberPlaceholder")}
            />
          </div>
          <div>
            <label style={{ display: "block", marginBottom: 4, fontWeight: 600 }}>
              {t("business:refundmodal.accountHolderName")} *
            </label>
            <Input
              value={accountHolderName}
              onChange={(e) => setAccountHolderName(e.target.value)}
              placeholder={t("business:refundmodal.accountHolderPlaceholder")}
            />
          </div>
        </div>
      </Modal>

      {/* Sub-modal: Confirm Refund */}
      <Modal
        title={t("business:refundmodal.confirmRefund")}
        open={confirmModalOpen}
        onCancel={() => setConfirmModalOpen(false)}
        onOk={handleConfirmRefundSubmit}
        okButtonProps={{ loading: submitting }}
        okText={t("adminmodal:confirmAction")}
      >
        <Typography.Paragraph>
          {t("business:refundmodal.confirmRefundPrompt")}
        </Typography.Paragraph>
        <label style={{ display: "block", marginBottom: 4, fontWeight: 600 }}>
          {t("business:refundmodal.confirmNoteLabel")}
        </label>
        <Input.TextArea
          rows={2}
          value={confirmNote}
          onChange={(e) => setConfirmNote(e.target.value)}
          placeholder={t("business:refundmodal.confirmNotePlaceholder")}
        />
      </Modal>
    </>
  );
};
