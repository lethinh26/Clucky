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
  storeName = "",
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
  const params = new URLSearchParams({
    acc: bank.accountNo.trim(),
    bank: bank.bankCode.trim(),
    amount: String(amount),
    des: transferReference(description),
    template: "qr_only",
    download: "false",
    showinfo: "false",
    fullacc: "true",
    holder: bank.accountName.trim(),
    store: storeName.trim(),
  });
  return `https://vietqr.app/img?${params.toString()}`;
}
