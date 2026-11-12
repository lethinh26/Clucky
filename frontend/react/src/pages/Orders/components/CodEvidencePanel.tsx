import { useEffect, useState } from "react";
import { Button, Input, Modal, Space, Tag } from "antd";
import { useTranslation } from "react-i18next";
import { message } from "../../../components/feedback";
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
  const [rejectReason, setRejectReason] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setEvidence(null);
    paymentsApi.getCodEvidence(orderId).then((result) => {
      if (active) setEvidence(result);
    }).catch((error) => {
      if (active) message.error(getErrorMessage(error));
    });
    return () => { active = false; };
  }, [orderId]);

  const run = async (action: () => Promise<unknown>) => {
    setBusy(true);
    try {
      await action();
      setEvidence(await paymentsApi.getCodEvidence(orderId));
    } catch (error) {
      message.error(getErrorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  const upload = (file: File) => {
    if (file.size === 0 || file.size > 2 * 1024 * 1024 || !["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      message.error(t("business:orderdemo.codInvalidEvidence"));
      return;
    }
    void run(() => paymentsApi.uploadCodEvidence(orderId, file));
  };

  const view = async () => {
    try {
      const blob = await paymentsApi.getCodEvidenceImage(orderId);
      setImageUrl(URL.createObjectURL(blob));
    } catch (error) {
      message.error(getErrorMessage(error));
    }
  };

  const canReview = (isAdmin || isStoreManager) && Number(user.id) !== Number(evidence?.uploaded_by);

  return <div style={{ width: "100%", display: "grid", gap: 8 }}>
    <strong>{t("business:orderdemo.codEvidenceTitle")}</strong>
    <span>{t("business:orderdemo.codEvidenceHint")}</span>
    <Space wrap>
      <Tag>{evidence ? t(`business:orderdemo.codEvidence${evidence.status}`) : t("business:orderdemo.codEvidenceLoading")}</Tag>
      {evidence && evidence.status !== "MISSING" && <Button onClick={() => void view()}>{t("business:orderdemo.codViewEvidence")}</Button>}
      {evidence?.status !== "APPROVED" && <label>
        <input type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} style={{ display: "none" }}
          onChange={(event) => { const file = event.target.files?.[0]; if (file) upload(file); event.target.value = ""; }} />
        <Button loading={busy} onClick={(event) => event.currentTarget.previousElementSibling instanceof HTMLInputElement && event.currentTarget.previousElementSibling.click()}>
          {t("business:orderdemo.codUploadEvidence")}
        </Button>
      </label>}
    </Space>
    {evidence?.review_reason && <span>{evidence.review_reason}</span>}
    {evidence?.status === "PENDING" && canReview && <Space wrap>
      <Button loading={busy} type="primary" onClick={() => void run(() => paymentsApi.approveCodEvidence(orderId))}>
        {t("business:orderdemo.codApproveEvidence")}
      </Button>
      <Input value={rejectReason} onChange={(event) => setRejectReason(event.target.value)} maxLength={500}
        placeholder={t("business:orderdemo.codRejectReason")} style={{ width: 220 }} />
      <Button loading={busy} danger disabled={!rejectReason.trim()} onClick={() => void run(async () => {
        await paymentsApi.rejectCodEvidence(orderId, rejectReason.trim());
        setRejectReason("");
      })}>{t("business:orderdemo.codRejectEvidence")}</Button>
    </Space>}
    <Button type="primary" disabled={evidence?.status !== "APPROVED"} loading={busy} onClick={() => void run(async () => {
      if (!await onCollect()) throw new Error(t("business:orderdemo.codCollectionNotCompleted"));
    })}>{t("business:orderdetaildrawer.confirmCodCollection")}</Button>
    <Modal open={Boolean(imageUrl)} footer={null} onCancel={() => { if (imageUrl) URL.revokeObjectURL(imageUrl); setImageUrl(null); }}>
      {imageUrl && <img src={imageUrl} alt={t("business:orderdemo.codEvidenceTitle")} style={{ width: "100%" }} />}
    </Modal>
  </div>;
}
