package com.clucky.cartorderservice.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import java.util.List;

@JsonIgnoreProperties(ignoreUnknown = true)
public record CreateCounterOrderRequest(
        Long storeId,
        String diningOption,
        String paymentMethod,
        @Size(max = 1000) String note,
        @NotEmpty(message = "Items list cannot be empty") @Valid List<CounterOrderItemRequest> items
) {
    public CreateCounterOrderRequest(Long storeId, String diningOption, String paymentMethod, String note, List<CounterOrderItemRequest> items) {
        this.storeId = storeId;
        this.diningOption = (diningOption != null && !diningOption.isBlank()) ? diningOption.trim().toUpperCase() : "TAKE_AWAY";
        this.paymentMethod = (paymentMethod != null && !paymentMethod.isBlank()) ? paymentMethod.trim().toUpperCase() : "CASH";
        this.note = note;
        this.items = items != null ? items : List.of();
    }
}
