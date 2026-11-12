"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { useEffect, useId, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { getErrorMessage, vietQrApi, type VietQrBank } from "@/lib/api";
import styles from "./refund-bank-fields.module.css";

interface RefundBankFieldsProps {
  active: boolean;
  bankBin: string;
  bankName?: string;
  accountNumber: string;
  accountHolderName: string;
  onBankBinChange: (bin: string, bankName: string) => void;
  onAccountNumberChange: (value: string) => void;
  onAccountHolderNameChange: (value: string) => void;
}

function normalizeSearch(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase();
}

export function RefundBankFields({
  active,
  bankBin,
  bankName,
  accountNumber,
  accountHolderName,
  onBankBinChange,
  onAccountNumberChange,
  onAccountHolderNameChange,
}: RefundBankFieldsProps) {
  const t = useTranslations();
  const fieldId = useId();
  const bankLabelId = `${fieldId}-bank-label`;
  const bankOptionsId = `${fieldId}-bank-options`;
  const accountNumberId = `${fieldId}-account-number`;
  const accountHolderId = `${fieldId}-account-holder`;
  const [banks, setBanks] = useState<VietQrBank[]>([]);
  const [loadingBanks, setLoadingBanks] = useState(false);
  const [bankLoadError, setBankLoadError] = useState("");
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [failedLogos, setFailedLogos] = useState<Set<string>>(() => new Set());
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!active || banks.length > 0) return;
    let mounted = true;
    setLoadingBanks(true);
    setBankLoadError("");
    vietQrApi.banks()
      .then((items) => {
        if (mounted) setBanks(items);
      })
      .catch((error: unknown) => {
        if (mounted) setBankLoadError(getErrorMessage(error));
      })
      .finally(() => {
        if (mounted) setLoadingBanks(false);
      });
    return () => {
      mounted = false;
    };
  }, [active, banks.length]);

  useEffect(() => {
    if (open) searchInput.current?.focus();
    else setSearch("");
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  const selectedBank = banks.find((bank) => bank.bin === bankBin);
  const currentBankName = selectedBank ? (selectedBank.shortName || selectedBank.name) : (bankName || "");
  const filteredBanks = banks.filter((bank) =>
    normalizeSearch(`${bank.shortName ?? ""} ${bank.name ?? ""} ${bank.bin}`).includes(normalizeSearch(search)),
  );

  const chooseBank = (bank: VietQrBank) => {
    onBankBinChange(bank.bin, bank.shortName || bank.name || bank.bin);
    setOpen(false);
  };

  const renderLogo = (bank: VietQrBank) => {
    if (!bank.logo || failedLogos.has(bank.bin)) {
      return <span className={styles.logoFallback}>{(bank.shortName || bank.bin).slice(0, 3)}</span>;
    }
    return (
      <Image
        src={bank.logo}
        alt=""
        width={32}
        height={32}
        unoptimized
        className={styles.logo}
        onError={() => setFailedLogos((previous) => new Set(previous).add(bank.bin))}
      />
    );
  };

  return (
    <div className={styles.fields}>
      <div className={styles.field} ref={dropdownRef}>
        <label className={styles.label} id={bankLabelId}>
          {t("business.id.bankName")} *
        </label>
        <div className={styles.selector}>
          <button
            type="button"
            className={styles.selectButton}
            role="combobox"
            aria-labelledby={bankLabelId}
            aria-expanded={open}
            aria-controls={bankOptionsId}
            disabled={loadingBanks || (banks.length === 0 && !bankName)}
            onClick={() => setOpen((value) => !value)}
          >
            <div className={styles.selectValue}>
              {selectedBank ? (
                <>
                  {renderLogo(selectedBank)}
                  <span className={styles.bankNameText}>{selectedBank.shortName || selectedBank.name}</span>
                  <span className={styles.bankCode}>{selectedBank.bin}</span>
                </>
              ) : currentBankName ? (
                <>
                  <span className={styles.bankNameText}>{currentBankName}</span>
                  {bankBin && <span className={styles.bankCode}>{bankBin}</span>}
                </>
              ) : (
                <span className={styles.placeholder}>
                  {loadingBanks ? t("business.id.loadingBanks") : t("business.id.searchAndChooseBank")}
                </span>
              )}
            </div>
            <ChevronDown
              size={18}
              className={`${styles.chevron} ${open ? styles.chevronOpen : ""}`}
              aria-hidden="true"
            />
          </button>
          {open && (
            <div className={styles.dropdown}>
              <input
                ref={searchInput}
                className={styles.search}
                role="searchbox"
                aria-label={t("business.id.searchBanks")}
                placeholder={t("business.id.searchBanks")}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Escape") setOpen(false);
                }}
              />
              <div id={bankOptionsId} className={styles.options} role="listbox" aria-labelledby={bankLabelId}>
                {filteredBanks.map((bank) => (
                  <button
                    type="button"
                    role="option"
                    aria-selected={bank.bin === bankBin}
                    className={styles.option}
                    key={bank.bin}
                    onClick={() => chooseBank(bank)}
                  >
                    {renderLogo(bank)}
                    <span className={styles.bankNameText}>{bank.shortName || bank.name}</span>
                    <span className={styles.bankCode}>{bank.bin}</span>
                  </button>
                ))}
                {filteredBanks.length === 0 && (
                  <p className={styles.empty}>{t("business.id.noMatchingBanks")}</p>
                )}
              </div>
            </div>
          )}
        </div>
        {bankLoadError && <p className={styles.error} role="alert">{bankLoadError}</p>}
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor={accountNumberId}>
          {t("business.id.accountNumber")} *
        </label>
        <input
          id={accountNumberId}
          className={styles.input}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          maxLength={80}
          value={accountNumber}
          onChange={(event) => onAccountNumberChange(event.target.value.replace(/\s+/g, ""))}
          placeholder={t("business.id.enterAccountNumber")}
        />
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor={accountHolderId}>
          {t("business.id.accountHolderName")} *
        </label>
        <input
          id={accountHolderId}
          className={styles.input}
          type="text"
          autoComplete="name"
          maxLength={160}
          value={accountHolderName}
          onChange={(event) => onAccountHolderNameChange(event.target.value.toUpperCase())}
          placeholder={t("business.id.enterAccountHolderName")}
        />
      </div>
    </div>
  );
}
