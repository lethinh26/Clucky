import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Button, Input, Modal, Space, Tag, Upload, type UploadFile } from "antd";
import { InboxOutlined, UploadOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../../context/AuthContext";
import { getErrorMessage, paymentsApi } from "../../../lib/api";

type Evidence = Awaited<ReturnType<typeof paymentsApi.getCodEvidence>>;

export function CodEvidencePanel({ orderId, onCollect }: {
  orderId: string;
  onCollect: () => Promise<boolean> | boolean;
}) {
  const { t } = useTranslation();
  const { user, isAdmin, isStoreManager } = useAuth();
  const [evidence, setEvidence] = useState<Evidence | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [readError, setReadError] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [preview, setPreview] = useState<string>();
  const currentOrder = useRef(orderId);
  currentOrder.current = orderId;
  const pending = useRef(false);
  const dialogOpen = useRef(uploadOpen);
  dialogOpen.current = uploadOpen;
  const readRequest = useRef<AbortController | null>(null);

  const refresh = useCallback(async () => {
    readRequest.current?.abort();
    const controller = new AbortController();
    readRequest.current = controller;
    try {
      const result = await paymentsApi.getCodEvidence(orderId, controller.signal);
      if (!controller.signal.aborted && currentOrder.current === orderId) { setEvidence(result); setReadError(""); }
    } catch (failure) {
      if (!controller.signal.aborted && currentOrder.current === orderId) setReadError(getErrorMessage(failure));
    }
  }, [orderId]);

  useEffect(() => {
    setEvidence(null); setError(""); setReadError(""); setFiles([]); setUploadOpen(false); setImageUrl(null);
    void refresh();
    const timer = window.setInterval(() => { if (!pending.current && !dialogOpen.current && !document.hidden) void refresh(); }, 5000);
    return () => { window.clearInterval(timer); readRequest.current?.abort(); };
  }, [refresh]);
  useEffect(() => {
    const file = files[0]?.originFileObj;
    if (!file) { setPreview(undefined); return; }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [files]);
  useEffect(() => () => { if (imageUrl) URL.revokeObjectURL(imageUrl); }, [imageUrl]);

  const run = async (action: () => Promise<unknown>) => {
    if (pending.current) return false;
    pending.current = true; setBusy(true); setError("");
    readRequest.current?.abort();
    try {
      await action();
      if (currentOrder.current !== orderId) return false;
      await refresh();
      return true;
    } catch (failure) {
      if (currentOrder.current === orderId) setError(getErrorMessage(failure));
      return false;
    } finally { pending.current = false; setBusy(false); }
  };

  const view = async () => {
    if (pending.current) return;
    await run(async () => {
      const blob = await paymentsApi.getCodEvidenceImage(orderId);
      if (currentOrder.current === orderId) setImageUrl(URL.createObjectURL(blob));
    });
  };
  const canReview = (isAdmin || isStoreManager) && Number(user.id) !== Number(evidence?.uploaded_by);

  return <div style={{ width: "100%", display: "grid", gap: 10 }}>
    <strong>{t("business:orderdemo.codEvidenceTitle")}</strong>
    <span>{t("business:orderdemo.codEvidenceHint")}</span>
    {!uploadOpen && (error || readError) && <Alert type="error" showIcon message={error || readError} />}
    <Space wrap>
      <Tag color={evidence?.status === "APPROVED" ? "success" : evidence?.status === "REJECTED" ? "error" : "default"}>
        {evidence ? t(`business:orderdemo.codEvidence${evidence.status}`) : t("business:orderdemo.codEvidenceLoading")}
      </Tag>
      {evidence && evidence.status !== "MISSING" && <Button disabled={busy} onClick={() => void view()}>{t("business:orderdemo.codViewEvidence")}</Button>}
      {evidence?.status !== "APPROVED" && <Button disabled={busy} icon={<UploadOutlined />} onClick={() => { setError(""); setUploadOpen(true); }}>{t("business:orderdemo.codUploadEvidence")}</Button>}
    </Space>
    {evidence?.review_reason && <span>{evidence.review_reason}</span>}
    {evidence?.status === "PENDING" && canReview && <Space wrap>
      <Button loading={busy} type="primary" onClick={() => void run(() => paymentsApi.approveCodEvidence(orderId))}>{t("business:orderdemo.codApproveEvidence")}</Button>
      <Input value={rejectReason} onChange={event => setRejectReason(event.target.value)} maxLength={500}
        placeholder={t("business:orderdemo.codRejectReason")} style={{ width: 220 }} />
      <Button loading={busy} danger disabled={!rejectReason.trim()} onClick={() => void run(async () => {
        await paymentsApi.rejectCodEvidence(orderId, rejectReason.trim()); setRejectReason("");
      })}>{t("business:orderdemo.codRejectEvidence")}</Button>
    </Space>}
    <Button type="primary" disabled={evidence?.status !== "APPROVED"} loading={busy} onClick={() => void run(async () => {
      if (!await onCollect()) throw new Error(t("business:orderdemo.codCollectionNotCompleted"));
    })}>{t("business:orderdetaildrawer.confirmCodCollection")}</Button>
    <Modal open={uploadOpen} zIndex={1200} title={t("business:orderdemo.codUploadEvidence")} confirmLoading={busy}
      okText={t("business:codUpload.submit")} cancelText={t("business:account.cancel")} okButtonProps={{ disabled: !files[0]?.originFileObj }}
      cancelButtonProps={{ disabled: busy }} closable={!busy} maskClosable={!busy} keyboard={!busy}
      onCancel={() => { if (!pending.current) { setUploadOpen(false); setFiles([]); } }}
      onOk={async () => {
        const file = files[0]?.originFileObj;
        if (file && await run(() => paymentsApi.uploadCodEvidence(orderId, file))) { setUploadOpen(false); setFiles([]); }
      }}>
      {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
      <Upload.Dragger accept="image/jpeg,image/png,image/webp" multiple={false} maxCount={1} fileList={files} disabled={busy}
        beforeUpload={file => {
          if (!file.size || file.size > 2 * 1024 * 1024 || !["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
            setFiles([]); setError(t("business:orderdemo.codInvalidEvidence")); return Upload.LIST_IGNORE;
          }
          setError(""); setFiles([{ uid: file.uid, name: file.name, originFileObj: file }]); return false;
        }} onRemove={() => { setFiles([]); }}>
        <p className="ant-upload-drag-icon"><InboxOutlined /></p>
        <p className="ant-upload-text">{t("business:codUpload.drop")}</p>
        <p className="ant-upload-hint">{t("business:codUpload.formats")}</p>
      </Upload.Dragger>
      {preview && <img src={preview} alt={t("business:codUpload.preview")} style={{ display: "block", width: "100%", maxHeight: 260, objectFit: "contain", marginTop: 16, borderRadius: 12 }} />}
    </Modal>
    <Modal open={Boolean(imageUrl)} zIndex={1200} footer={null} title={t("business:orderdemo.codEvidenceTitle")} onCancel={() => setImageUrl(null)}>
      {imageUrl && <img src={imageUrl} alt={t("business:orderdemo.codEvidenceTitle")} style={{ width: "100%" }} />}
    </Modal>
  </div>;
}
