package com.clucky.reviewreportservice.config;

import com.clucky.reviewreportservice.exception.ForbiddenException;
import jakarta.servlet.http.HttpServletRequest;

public class SecurityContextHelper {

    public static Long getCurrentUserId(HttpServletRequest request) {
        String userIdStr = request.getHeader("X-User-Id");
        if (userIdStr == null || userIdStr.isBlank()) {
            throw new ForbiddenException("Yêu cầu thông tin đăng nhập của người dùng!");
        }
        try {
            return Long.parseLong(userIdStr.trim());
        } catch (NumberFormatException e) {
            throw new ForbiddenException("Mã người dùng không hợp lệ!");
        }
    }

    public static String getCurrentUserRole(HttpServletRequest request) {
        String role = request.getHeader("X-User-Role");
        if (role == null || role.isBlank()) {
            throw new ForbiddenException("Yêu cầu phân quyền người dùng!");
        }
        return role.trim().toUpperCase();
    }

    public static Long getCurrentStoreId(HttpServletRequest request) {
        String storeIdStr = request.getHeader("X-Store-Id");
        if (storeIdStr == null || storeIdStr.isBlank()) {
            return null;
        }
        try {
            return Long.parseLong(storeIdStr.trim());
        } catch (NumberFormatException e) {
            return null;
        }
    }

    public static void requireRole(HttpServletRequest request, String... allowedRoles) {
        String currentRole = getCurrentUserRole(request);
        for (String role : allowedRoles) {
            if (role.equalsIgnoreCase(currentRole)) {
                return;
            }
        }
        throw new ForbiddenException("Bạn không có quyền thực hiện chức năng này!");
    }
}
