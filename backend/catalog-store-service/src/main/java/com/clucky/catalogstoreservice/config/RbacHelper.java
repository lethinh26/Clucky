package com.clucky.catalogstoreservice.config;

import com.clucky.catalogstoreservice.exception.ForbiddenException;
import jakarta.servlet.http.HttpServletRequest;

public class RbacHelper {

    public static void checkStoreAccess(HttpServletRequest request, Long targetStoreId) {
        if (targetStoreId == null) return;

        String role = request.getHeader("X-User-Role");
        String storeIdHeader = request.getHeader("X-Store-Id");

        // Admin has universal store access
        if ("ADMIN".equalsIgnoreCase(role)) {
            return;
        }

        // Store Manager and Staff are strictly restricted to their assigned storeId
        if ("STORE_MANAGER".equalsIgnoreCase(role) || "STAFF".equalsIgnoreCase(role)) {
            if (storeIdHeader == null || storeIdHeader.isBlank()) {
                throw new ForbiddenException("Không tìm thấy thông tin chi nhánh của tài khoản!");
            }
            try {
                Long userStoreId = Long.parseLong(storeIdHeader.trim());
                if (!userStoreId.equals(targetStoreId)) {
                    throw new ForbiddenException("Bạn không có quyền truy cập hoặc chỉnh sửa dữ liệu của chi nhánh khác!");
                }
            } catch (NumberFormatException e) {
                throw new ForbiddenException("Mã chi nhánh trong phiên đăng nhập không hợp lệ!");
            }
        }
    }
}
