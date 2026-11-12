export interface BankInfo {
  bankName: string;
  bankCode: string;
  accountNo: string;
  accountName: string;
}

export function buildVietQrUrl(bank: BankInfo | null | undefined, amount: number, reference: string): string | null {
  if (!bank || !bank.bankCode?.trim() || !/^\d+$/.test(bank.accountNo)
    || !bank.accountName?.trim() || !/^[A-Z0-9]{1,70}$/.test(reference)
    || !Number.isSafeInteger(amount) || amount <= 0) return null;
  const params = new URLSearchParams({ amount: String(amount), addInfo: reference, accountName: bank.accountName });
  return `https://img.vietqr.io/image/${encodeURIComponent(bank.bankCode)}-${bank.accountNo}-qr_only.svg?${params}`;
}
