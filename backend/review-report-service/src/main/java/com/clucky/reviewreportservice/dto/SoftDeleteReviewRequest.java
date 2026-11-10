package com.clucky.reviewreportservice.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;

public record SoftDeleteReviewRequest(
    @Size(max = 500, message = "Lý do xóa đánh giá tối đa 500 ký tự!")
    String reason,

    @Min(value = 0, message = "Phiên bản đánh giá không hợp lệ")
    Long version
) {
    public SoftDeleteReviewRequest(String reason) {
        this(reason, null);
    }
}
