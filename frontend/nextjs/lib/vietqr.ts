export interface BankInfo {
  bankCode: string;
  bankName: string;
  accountNo: string;
  accountName: string;
}

// VietQR removes separators from the bank transfer reference. Keep the text
// shown beside the QR identical to the value encoded in the bank payload.
export function transferReference(orderCode: string): string {
  return orderCode.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[đĐ]/g, 'D').replace(/[^A-Za-z0-9]/g, '');
}

export function buildVietQrUrl({
  bank,
  amount,
  description,
}: {
  bank: BankInfo;
  amount: number;
  description: string;
  storeName?: string;
}): string | null {
  if (
    !/^\d+$/.test(bank.accountNo.trim()) ||
    !bank.bankCode.trim() ||
    !bank.accountName.trim() ||
    !transferReference(description) ||
    !Number.isSafeInteger(amount) ||
    amount <= 0
  )
    return null;
  const bankCode = encodeURIComponent(bank.bankCode.trim());
  const accountNo = encodeURIComponent(bank.accountNo.trim());
  const params = new URLSearchParams({
    amount: String(amount),
    addInfo: transferReference(description),
    accountName: bank.accountName.trim(),
  });
  return `https://img.vietqr.io/image/${bankCode}-${accountNo}-qr_only.svg?${params.toString()}`;
}
