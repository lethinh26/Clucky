package com.clucky.cartorderservice.cart;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.util.List;

@JsonIgnoreProperties(ignoreUnknown = true)
public class UpdateCartItemRequest {
    private Integer quantity;
    private String note;
    private List<Long> optionIds;
    private List<Long> toppingIds;

    public UpdateCartItemRequest() {}

    public UpdateCartItemRequest(Integer quantity, String note) {
        this.quantity = quantity;
        this.note = note;
    }

    public Integer getQuantity() { return quantity; }
    public void setQuantity(Integer quantity) { this.quantity = quantity; }

    public String getNote() { return note; }
    public void setNote(String note) { this.note = note; }

    public List<Long> getOptionIds() { return optionIds; }
    public void setOptionIds(List<Long> optionIds) { this.optionIds = optionIds; }

    public List<Long> getToppingIds() { return toppingIds; }
    public void setToppingIds(List<Long> toppingIds) { this.toppingIds = toppingIds; }
}
