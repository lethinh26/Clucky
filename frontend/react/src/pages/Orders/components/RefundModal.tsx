import { message } from "../../../components/feedback";
import { useLocaleTools } from "../../../i18n/hooks";
import { useTranslation } from "react-i18next";
import React, { useEffect, useState, useRef, useCallback } from "react";
import { Modal, Input, Radio, Typography, Space, Tag, Button, Alert, Spin, Upload, Checkbox, Select } from "antd";
import { AdminOrder } from "../../../types/order";
import { refundsApi, vietQrApi, getErrorMessage, type BackendRefund, type VietQrBank } from "../../../lib/api";
import { useOrders } from "../../../context/OrderContext";
import { useAuth } from "../../../context/AuthContext";

import { CheckCircle2, AlertTriangle, Eye, UploadCloud, XCircle } from "lucide-react";
import "../admin-orders.css";

type RefundDetails = BackendRefund & { paymentOperation?: string | null; paymentError?: string | null };

interface RefundModalProps {
  order: AdminOrder | null;
  open: boolean;
  onClose: () => void;
  onChanged?: () => void;
  onConfirmRefund?: (
    orderId: string,
    action: "APPROVED" | "REJECTED",
    note: string,
  ) => Promise<boolean> | boolean;
}

export const RefundModal: React.FC<RefundModalProps> = ({
  order,
  open,
  onClose: requestClose,
  onChanged,
  onConfirmRefund,
}) => {
  const { t } = useTranslation();
  const { user, isAdmin } = useAuth();
  const { locale } = useLocaleTools();
  const { refreshOrders } = useOrders();


  const [refund, setRefund] = useState<RefundDetails | null>(null);
  const loadedStatus = useRef("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loadError, setLoadError] = useState("");
  const detailRequest = useRef<AbortController | null>(null);
  const operationLock = useRef(false);
  const activeRefund = useRef<number | undefined>(undefined);
  activeRefund.current = open ? order?.refundRequestId : undefined;
  const [confirmationPending, setConfirmationPending] = useState(false);
  const syncParent = useCallback(() => {
    if (onChanged) onChanged();
    else void refreshOrders();
  }, [onChanged, refreshOrders]);
  const parentSync = useRef(syncParent);
  parentSync.current = syncParent;

  // PENDING state fields
  const [action, setAction] = useState<"APPROVED" | "REJECTED">("APPROVED");
  const [reviewNote, setReviewNote] = useState("");

  // Sub-modals
  const [invalidModalOpen, setInvalidModalOpen] = useState(false);
  const [invalidReason, setInvalidReason] = useState("");
  const [transferNotCompleted, setTransferNotCompleted] = useState(false);

  const [bankModalOpen, setBankModalOpen] = useState(false);
  const [bankBin, setBankBin] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountHolderName, setAccountHolderName] = useState("");
  const [banks, setBanks] = useState<VietQrBank[]>([]);
  const [banksLoading, setBanksLoading] = useState(false);
  const [banksError, setBanksError] = useState("");

  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [confirmNote, setConfirmNote] = useState("");

  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const [uploadingEvidence, setUploadingEvidence] = useState(false);
  const onClose = () => { if (!operationLock.current) requestClose(); };


  const fetchRefundDetails = useCallback(async (refundId: number) => {
    detailRequest.current?.abort();
    const controller = new AbortController();
    detailRequest.current = controller;
    try {
      setLoading(true); setLoadError("");
      const data: RefundDetails = await refundsApi.get(refundId, controller.signal);
      if (controller.signal.aborted || activeRefund.current !== refundId) return;
      const state = `${data.id}:${data.status}:${data.paymentOperation || ''}`;
      if (loadedStatus.current && loadedStatus.current !== state) parentSync.current();
      loadedStatus.current = state;
      setRefund(data);
      setConfirmationPending(!!data.paymentOperation);
      setBankBin(data.bankBin || "");
      setBankName(data.bankName || "");
      setAccountNumber(data.accountNumber || data.bankAccountNo || "");
      setAccountHolderName(data.accountHolderName || data.bankAccountName || "");
    } catch (err) {
      if (!controller.signal.aborted) { setRefund(null); setLoadError(getErrorMessage(err)); }
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    activeRefund.current = open ? order?.refundRequestId : undefined;
    loadedStatus.current = "";
    setRefund(null); setConfirmationPending(false);
    setInvalidModalOpen(false); setBankModalOpen(false); setConfirmModalOpen(false);
    if (open && order?.refundRequestId) {
      setAction("APPROVED");
      setReviewNote("");
      setEvidenceFile(null);
      void fetchRefundDetails(order.refundRequestId);
    }
    return () => { detailRequest.current?.abort(); activeRefund.current = undefined; };
  }, [open, order?.refundRequestId, fetchRefundDetails]);

  useEffect(() => {
    if (!bankModalOpen || banks.length > 0) return;
    let active = true;
    setBanksLoading(true);
    setBanksError("");
    vietQrApi.banks()
      .then(items => { if (active) setBanks(items); })
      .catch(error => { if (active) setBanksError(getErrorMessage(error)); })
      .finally(() => { if (active) setBanksLoading(false); });
    return () => { active = false; };
  }, [bankModalOpen, banks.length]);

  useEffect(() => {
    if (!open || !order?.refundRequestId || submitting || uploadingEvidence || loading || bankModalOpen || invalidModalOpen || confirmModalOpen) return;
    const timer = window.setTimeout(() => void fetchRefundDetails(order.refundRequestId!), confirmationPending || loadError ? 5000 : 15000);
    return () => window.clearTimeout(timer);
  }, [open, order?.refundRequestId, confirmationPending, submitting, uploadingEvidence, loading, loadError, bankModalOpen, invalidModalOpen, confirmModalOpen, refund, fetchRefundDetails, syncParent]);

  if (!order) return null;

  const currentStatus = refund?.status || order.refundStatus || "PENDING";
  const hasEvidence = Boolean(refund?.evidencePublicId);
  const currentAttempt = refund?.attempts?.find(attempt => attempt.attemptId === refund.currentAttemptId);
  const ownsAttempt = currentAttempt?.createdBy === Number(user.id);
  const hasBankDetails = Boolean(refund?.bankName && (refund.bankAccountNo || refund.accountNumber) && (refund.bankAccountName || refund.accountHolderName));

  // 1. Review action for PENDING
  const handleReviewSubmit = async () => {
    if (!order.refundRequestId || operationLock.current) return;
    operationLock.current = true; detailRequest.current?.abort();
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
      message.info(t("admin:ui.theReviewRequestHasBeenReceivedMonitorThe"));
      
      syncParent();
      if (activeRefund.current === order.refundRequestId) await fetchRefundDetails(order.refundRequestId);
    } catch (err) {
      message.error(getErrorMessage(err, t("business:refundmodal.unableToProcessThisRefundCheckYourPermissionsAndTheCurrentData")));
    } finally {
      operationLock.current = false;
      setSubmitting(false);
    }
  };

  // 2. Claim processing for APPROVED
  const handleClaimProcessing = async () => {
    if (!order.refundRequestId || operationLock.current) return;
    operationLock.current = true; detailRequest.current?.abort();
    try {
      setSubmitting(true);
      const updated = await refundsApi.claimProcessing(order.refundRequestId);
      syncParent();
      if (activeRefund.current !== updated.id) return;
      setRefund(updated);
      message.success(t("business:refundmodal.claimProcessingSuccess"));
      
    } catch (err) {
      message.error(getErrorMessage(err));
    } finally {
      operationLock.current = false;
      setSubmitting(false);
    }
  };

  // 3. Mark invalid bank details for PROCESSING
  const handleReportInvalidBank = async () => {
    if (!order.refundRequestId || !invalidReason.trim() || operationLock.current) return;
    if (currentStatus === "PROCESSING" && (!transferNotCompleted || hasEvidence || !ownsAttempt)) return;
    operationLock.current = true; detailRequest.current?.abort();
    try {
      setSubmitting(true);
      const updated = await refundsApi.requestBankDetails(order.refundRequestId, invalidReason.trim(), transferNotCompleted);
      syncParent();
      if (activeRefund.current !== updated.id) return;
      setRefund(updated);
      setInvalidModalOpen(false);
      setInvalidReason("");
      message.success(t("business:refundmodal.invalidBankDetailsSuccess"));
      
    } catch (err) {
      message.error(getErrorMessage(err));
    } finally {
      operationLock.current = false;
      setSubmitting(false);
    }
  };

  // 4. Update bank details for WAITING_BANK_DETAILS / APPROVED
  const handleUpdateBankDetails = async () => {
    if (operationLock.current) return;
    if (!order.refundRequestId || !bankBin || !/^\d{1,80}$/.test(accountNumber) || !accountHolderName.trim()) {
      message.warning(t("business:refundmodal.pleaseCheckBankDetails"));
      return;
    }
    operationLock.current = true; detailRequest.current?.abort();
    try {
      setSubmitting(true);
      const updated = await refundsApi.updateBankDetails(order.refundRequestId, {
        bankBin,
        bankName,
        bankAccountNo: accountNumber.trim(),
        bankAccountName: accountHolderName.trim(),
        expectedBankDetailsVersion: refund?.bankDetailsVersion,
      });
      syncParent();
      if (activeRefund.current !== updated.id) return;
      setRefund(updated);
      setBankModalOpen(false);
      message.success(t("business:refundmodal.updateBankDetailsSuccess"));
      
    } catch (err) {
      message.error(getErrorMessage(err));
    } finally {
      operationLock.current = false;
      setSubmitting(false);
    }
  };

  const openBankDetailsModal = () => {
    setBankBin(refund?.bankBin || "");
    setBankName(refund?.bankName || "");
    setAccountNumber(refund?.accountNumber || refund?.bankAccountNo || "");
    setAccountHolderName(refund?.accountHolderName || refund?.bankAccountName || "");
    setBankModalOpen(true);
  };

  // 5. Upload evidence for PROCESSING
  const handleUploadEvidence = async (fileToUpload?: File) => {
    const file = fileToUpload || evidenceFile;
    if (!order.refundRequestId || !file || operationLock.current) return;
    operationLock.current = true; detailRequest.current?.abort();
    try {
      setUploadingEvidence(true);
      const updated = await refundsApi.uploadEvidence(order.refundRequestId, file);
      syncParent();
      if (activeRefund.current !== updated.id) return;
      setRefund(updated);
      setEvidenceFile(null);
      message.success(t("business:refundmodal.uploadEvidenceSuccess"));
      
    } catch (err) {
      message.error(getErrorMessage(err));
    } finally {
      operationLock.current = false;
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
    if (!order.refundRequestId || operationLock.current) return;
    operationLock.current = true; detailRequest.current?.abort();
    try {
      setSubmitting(true);
      const updated = await refundsApi.confirmRefund(order.refundRequestId, isAdmin ? undefined : confirmNote);
      syncParent();
      if (activeRefund.current !== updated.id) return;
      setRefund(updated);
      setConfirmModalOpen(false);
      setConfirmationPending(updated.status !== "REFUNDED");
      if (updated.status === "REFUNDED") message.success(t("business:refundmodal.confirmRefundSuccess"));
      else message.info(t("admin:ui.theConfirmationRequestHasBeenReceivedAndIs"));
      
    } catch (err) {
      message.error(getErrorMessage(err));
    } finally {
      operationLock.current = false;
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
        className={isAdmin ? 'admin-order-modal' : undefined}
        centered={isAdmin}
        title={t("business:refundmodal.reviewRefundRequest", { value1: order.orderCode })}
        open={open}
        onCancel={onClose}
        footer={null}
        width={isAdmin ? 660 : 620}
        closable={!submitting && !uploadingEvidence}
        maskClosable={!submitting && !uploadingEvidence}
        keyboard={!submitting && !uploadingEvidence}
      >
        {loadError && <Alert type="error" showIcon message={loadError} />}
        {confirmationPending && <Alert type="info" showIcon message={t("admin:ui.waitingForPaymentToProcessCurrentStatusThe", { value1: refund?.paymentOperation || 'CONFIRM', value2: refund?.status })} />}
        {refund?.paymentError && <Alert type="warning" showIcon message={refund.paymentError} description={t("admin:ui.theBackendHasSavedTheRequestForRetry")} />}
        <Spin spinning={loading || submitting || uploadingEvidence}>
          {refund && <>
          {/* Summary Information */}
          <div className={isAdmin ? 'refund-summary' : undefined} style={{ marginBottom: 16 }}>
            <div className="refund-summary-top" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
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
          {["PENDING", "APPROVED", "PROCESSING", "WAITING_BANK_DETAILS", "REFUNDED"].includes(currentStatus) && (
            <div className={isAdmin ? 'refund-bank' : undefined} style={{ background: "#fafafa", border: "1px solid #e8e8e8", borderRadius: 8, padding: 12, marginBottom: 16 }}>
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
                  {refund?.bankBin && <span style={{ color: "#888", marginLeft: 4 }}>({refund.bankBin})</span>}
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
              {!refund?.paymentOperation && ["PENDING", "WAITING_BANK_DETAILS"].includes(currentStatus) && (
                <div style={{ marginTop: 8 }}>
                  <Button size="small" onClick={openBankDetailsModal}>
                    {t("business:refundmodal.updateBankDetails")}
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Workflow specific operations */}

          {/* A. PENDING */}
          {!refund?.paymentOperation && currentStatus === "PENDING" && (
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
          {!refund?.paymentOperation && currentStatus === "APPROVED" && (
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
                <Button onClick={() => { setInvalidReason(""); setTransferNotCompleted(false); setInvalidModalOpen(true); }}>
                  {t("business:refundmodal.invalidBankDetails")}
                </Button>
                <Button
                  type="primary"
                  loading={submitting}
                  disabled={!hasBankDetails}
                  onClick={handleClaimProcessing}
                >
                  {t("business:refundmodal.claimProcessing")}
                </Button>
              </div>
            </div>
          )}

          {/* C. PROCESSING */}
          {currentStatus === "PROCESSING" && !ownsAttempt && <Alert type="info" showIcon
            message={t("admin:ui.accountIsHandlingThisTransferAttemptDoNot", { value1: currentAttempt?.createdBy ?? "—" })} />}
          {!refund?.paymentOperation && !confirmationPending && currentStatus === "PROCESSING" && ownsAttempt && (
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
                  accept="image/jpeg,image/png"
                  multiple={false}
                  beforeUpload={(file) => {
                    const isImg = ["image/jpeg", "image/png"].includes(file.type);
                    if (!isImg) {
                      message.error(t("business:refundmodal.invalidFormatError"));
                      return Upload.LIST_IGNORE;
                    }
                    const isLt5M = file.size > 0 && file.size / 1024 / 1024 <= 5;
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
                    disabled={hasEvidence}
                    title={hasEvidence ? t("admin:ui.transferEvidenceAlreadyExistsReconcileTheResultInstead") : undefined}
                  onClick={() => {
                    setInvalidReason("");
                    setInvalidModalOpen(true);
                    setTransferNotCompleted(false);
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
          {!refund?.paymentOperation && currentStatus === "WAITING_BANK_DETAILS" && (
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
                  onClick={openBankDetailsModal}
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
          </>}
        </Spin>
      </Modal>

      {/* Sub-modal: Report Invalid Bank Details */}
      <Modal
        title={t("business:refundmodal.invalidBankDetails")}
        className={isAdmin ? 'admin-order-modal' : undefined}
        centered={isAdmin}
        closable={!submitting}
        maskClosable={!submitting}
        keyboard={!submitting}
        cancelButtonProps={{ disabled: submitting }}
        open={invalidModalOpen}
        onCancel={() => setInvalidModalOpen(false)}
        onOk={handleReportInvalidBank}
        okButtonProps={{ danger: true, disabled: !invalidReason.trim() || (currentStatus === "PROCESSING" && (!transferNotCompleted || hasEvidence)), loading: submitting }}
        okText={t("business:adminmodal.confirmAction")}
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
        {currentStatus === "PROCESSING" && <Checkbox checked={transferNotCompleted} onChange={event => setTransferNotCompleted(event.target.checked)} style={{ marginTop: 16 }}>{t("admin:ui.iHaveCheckedTheBankNoSuccessfulTransfer")} </Checkbox>}
      </Modal>

      {/* Sub-modal: Update Bank Details */}
      <Modal
        title={t("business:refundmodal.updateBankDetails")}
        className={isAdmin ? 'admin-order-modal' : undefined}
        centered={isAdmin}
        closable={!submitting}
        maskClosable={!submitting}
        keyboard={!submitting}
        cancelButtonProps={{ disabled: submitting }}
        open={bankModalOpen}
        onCancel={() => setBankModalOpen(false)}
        onOk={handleUpdateBankDetails}
        okButtonProps={{
          disabled: !bankBin || !/^\d{1,80}$/.test(accountNumber.trim()) || !accountHolderName.trim(),
          loading: submitting,
        }}
        okText={t("business:account.saveChanges")}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <label style={{ display: "block", marginBottom: 4, fontWeight: 600 }}>
              {t("business:refundmodal.bankName")} *
            </label>
            <Select
              showSearch
              loading={banksLoading}
              value={bankBin || undefined}
              placeholder={t("business:refundmodal.searchAndChooseBank")}
              optionFilterProp="label"
              options={banks.map(bank => ({
                value: bank.bin,
                label: `${bank.shortName || bank.name || bank.bin} (${bank.bin})`,
              }))}
              onChange={(value: string) => {
                setBankBin(value);
                const selected = banks.find(b => b.bin === value);
                setBankName(selected ? (selected.shortName || selected.name || selected.bin) : "");
              }}
            />
            {banksError && <Alert type="error" showIcon message={banksError} style={{ marginTop: 8 }} />}
          </div>
          <div>
            <label style={{ display: "block", marginBottom: 4, fontWeight: 600 }}>
              {t("business:refundmodal.accountNumber")} *
            </label>
            <Input
              type="text"
              inputMode="numeric"
              autoComplete="off"
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value.replace(/\s+/g, ""))}
              placeholder={t("business:refundmodal.accountNumberPlaceholder")}
            />
          </div>
          <div>
            <label style={{ display: "block", marginBottom: 4, fontWeight: 600 }}>
              {t("business:refundmodal.accountHolderName")} *
            </label>
            <Input
              value={accountHolderName}
              onChange={(e) => setAccountHolderName(e.target.value.toUpperCase())}
              placeholder="NGUYEN VAN A"
            />
          </div>
        </div>
      </Modal>

      {/* Sub-modal: Confirm Refund */}
      <Modal
        title={t("business:refundmodal.confirmRefund")}
        className={isAdmin ? 'admin-order-modal' : undefined}
        centered={isAdmin}
        closable={!submitting}
        maskClosable={!submitting}
        keyboard={!submitting}
        cancelButtonProps={{ disabled: submitting }}
        open={confirmModalOpen}
        onCancel={() => setConfirmModalOpen(false)}
        onOk={handleConfirmRefundSubmit}
        okButtonProps={{ loading: submitting }}
        okText={t("business:adminmodal.confirmAction")}
      >
        <Typography.Paragraph>
          {t("business:refundmodal.confirmRefundPrompt")}
        </Typography.Paragraph>
        {!isAdmin && <><label style={{ display: "block", marginBottom: 4, fontWeight: 600 }}>
          {t("business:refundmodal.confirmNoteLabel")}
        </label>
        <Input.TextArea
          rows={2}
          value={confirmNote}
          onChange={(e) => setConfirmNote(e.target.value)}
          placeholder={t("business:refundmodal.confirmNotePlaceholder")}
        /></>}
      </Modal>
    </>
  );
};
