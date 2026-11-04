package com.clucky.reviewreportservice.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record UpdateReviewRequest(
    @NotNull(message = "Số sao đánh giá không được để trống")
    @Min(value = 1, message = "Số sao đánh giá tối thiểu là 1")
    @Max(value = 5, message = "Số sao đánh giá tối đa là 5")
    Integer rating,

    @NotBlank(message = "Nội dung đánh giá không được để trống")
    @Size(min = 5, max = 1000, message = "Nội dung đánh giá từ 5 đến 1000 ký tự")
    String comment
) {}
