import type { BankInfo } from "../vietqr";

// Same sample recipient as MOCK_BANK_CONFIG in the admin UI. No real payment setup.
export const MOCK_PAYMENT_BANK: BankInfo = {
  bankCode: "MB",
  bankName: "MB Bank",
  accountNo: "0909123456789",
  accountName: "CLUCKY VIETNAM",
};
