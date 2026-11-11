export interface Account {
  id: number; storeId: number | null; login: string; role: string; status: string; activated: boolean; current: boolean;
}

export function accountRole(role: string) {
  return ({ ADMIN: 'Quản trị viên', STORE_MANAGER: 'Quản lý chi nhánh', STAFF: 'Tài khoản tác nghiệp', CUSTOMER: 'Khách hàng' } as Record<string, string>)[role] ?? role;
}

export function accountReadiness(readiness?: string) {
  return ({ READY: 'Sẵn sàng sử dụng', PROVISIONED: 'Chờ kích hoạt', PENDING: 'Đang cấp tài khoản', UNPROVISIONED: 'Chưa có tài khoản' } as Record<string, string>)[readiness ?? ''] ?? 'Chưa xác định';
}

export function accountAuditAction(action: string) {
  return ({ BRANCH_PROVISIONED: 'Cấp tài khoản chi nhánh', ACCOUNT_ACTIVATE: 'Kích hoạt tài khoản', ACCOUNT_RESET: 'Đặt lại mật khẩu',
    ACCOUNT_ADMIN_RESET: 'Admin đặt lại mật khẩu', ACCOUNT_RECOVERY: 'Đổi email khôi phục', ACCOUNT_ADMIN_RECOVERY: 'Admin đổi email khôi phục',
    ACCOUNT_LOCKED: 'Khóa tài khoản', ACCOUNT_UNLOCKED: 'Mở khóa tài khoản', MIGRATION_RETAINED: 'Giữ tài khoản khi chuyển đổi',
    MIGRATION_RETIRED: 'Ngừng dùng tài khoản cũ', LOGIN_SUCCESS: 'Đăng nhập thành công', LOGIN_FAILED: 'Đăng nhập thất bại', LOGOUT: 'Đăng xuất',
  } as Record<string, string>)[action] ?? action;
}
