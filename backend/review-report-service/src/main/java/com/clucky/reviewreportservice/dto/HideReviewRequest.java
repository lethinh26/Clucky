package com.clucky.reviewreportservice.dto;

import jakarta.validation.constraints.Size;

public record HideReviewRequest(
    @Size(max = 500, message = "Lý do ẩn đánh giá tối đa 500 ký tự!")
    String reason
) {}
