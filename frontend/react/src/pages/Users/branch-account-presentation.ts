import i18n from "../../i18n/index.ts";
export interface Account {
  id: number; storeId: number | null; login: string; role: string; status: string; activated: boolean; current: boolean;
}

export function accountRole(role: string) {
  return ({ get ADMIN() { return i18n.t("admin:roles.admin"); }, get STORE_MANAGER() { return i18n.t("admin:roles.manager"); }, get STAFF() { return i18n.t("admin:ui.operationsAccount"); }, get CUSTOMER() { return i18n.t("admin:nav.customers"); } } as Record<string, string>)[role] ?? role;
}

export function accountReadiness(readiness?: string) {
  return ({ get READY() { return i18n.t("admin:ui.readyToUse"); }, get PROVISIONED() { return i18n.t("admin:ui.awaitingActivation"); }, get PENDING() { return i18n.t("admin:ui.provisioningAccounts"); }, get UNPROVISIONED() { return i18n.t("admin:ui.noAccountAvailable"); } } as Record<string, string>)[readiness ?? ''] ?? i18n.t("admin:ui.unknown");
}

export function accountAuditAction(action: string) {
  return ({ get BRANCH_PROVISIONED() { return i18n.t("admin:ui.provisionBranchAccounts"); }, get ACCOUNT_ACTIVATE() { return i18n.t("admin:ui.activateAccount"); }, get ACCOUNT_RESET() { return i18n.t("accounts:reset"); },
    get ACCOUNT_ADMIN_RESET() { return i18n.t("admin:ui.adminPasswordReset"); }, get ACCOUNT_RECOVERY() { return i18n.t("accounts:changeRecovery"); }, get ACCOUNT_ADMIN_RECOVERY() { return i18n.t("admin:ui.adminRecoveryEmailChange"); },
    get ACCOUNT_LOCKED() { return i18n.t("business:users.lockAccount"); }, get ACCOUNT_UNLOCKED() { return i18n.t("business:users.unlockAccount"); }, get MIGRATION_RETAINED() { return i18n.t("admin:ui.accountRetainedDuringMigration"); },
    get MIGRATION_RETIRED() { return i18n.t("admin:ui.legacyAccountRetired"); }, get LOGIN_SUCCESS() { return i18n.t("admin:ui.successfulSignIn"); }, get LOGIN_FAILED() { return i18n.t("admin:ui.failedSignIn"); }, get LOGOUT() { return i18n.t("common:signOut"); },
  } as Record<string, string>)[action] ?? action;
}
