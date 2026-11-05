package com.clucky.cartorderservice.cart;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

@JsonIgnoreProperties(ignoreUnknown = true)
public class CartDto {
    private List<CartItemDto> items = new ArrayList<>();
    private int totalQuantity;
    private BigDecimal subtotal = BigDecimal.ZERO;

    public CartDto() {}

    public CartDto(List<CartItemDto> items, int totalQuantity, BigDecimal subtotal) {
        this.items = items != null ? items : new ArrayList<>();
        this.totalQuantity = totalQuantity;
        this.subtotal = subtotal != null ? subtotal : BigDecimal.ZERO;
    }

    public static CartDto of(List<CartItemDto> items) {
        if (items == null || items.isEmpty()) {
            return new CartDto(new ArrayList<>(), 0, BigDecimal.ZERO);
        }
        int totalQty = items.stream()
                .mapToInt(it -> it.getQuantity() != null ? it.getQuantity() : 0)
                .sum();
        BigDecimal subtotal = items.stream()
                .map(it -> {
                    if (it.getUnitPrice() != null && it.getQuantity() != null) {
                        return it.getUnitPrice().multiply(BigDecimal.valueOf(it.getQuantity()));
                    }
                    return BigDecimal.ZERO;
                })
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        return new CartDto(items, totalQty, subtotal);
    }

    public List<CartItemDto> getItems() { return items; }
    public void setItems(List<CartItemDto> items) { this.items = items != null ? items : new ArrayList<>(); }

    public int getTotalQuantity() { return totalQuantity; }
    public void setTotalQuantity(int totalQuantity) { this.totalQuantity = totalQuantity; }

    @JsonProperty("totalCount")
    public int getTotalCount() { return totalQuantity; }

    public BigDecimal getSubtotal() { return subtotal; }
    public void setSubtotal(BigDecimal subtotal) { this.subtotal = subtotal != null ? subtotal : BigDecimal.ZERO; }
}
