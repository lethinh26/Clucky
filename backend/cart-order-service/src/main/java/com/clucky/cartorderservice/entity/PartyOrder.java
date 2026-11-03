package com.clucky.cartorderservice.entity;

import jakarta.persistence.*;
import java.time.LocalDate;

@Entity
@Table(name = "party_orders", schema = "order_service")
public class PartyOrder {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", nullable = false)
    private Long id;

    @Column(name = "customer_id", nullable = false)
    private Long customerId;

    @Column(name = "store_id", nullable = false)
    private Long storeId;

    @Column(name = "contact_name", nullable = false, length = 160)
    private String contactName;

    @Column(name = "phone", nullable = false, length = 30)
    private String phone;

    @Column(name = "expected_date", nullable = false)
    private LocalDate expectedDate;

    @Column(name = "guest_count", nullable = false)
    private Integer guestCount;

    @Column(name = "content", nullable = false, columnDefinition = "text")
    private String content;

    @Column(name = "status", nullable = false, length = 20)
    private String status = "NEW";

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getCustomerId() { return customerId; }
    public void setCustomerId(Long customerId) { this.customerId = customerId; }

    public Long getStoreId() { return storeId; }
    public void setStoreId(Long storeId) { this.storeId = storeId; }

    public String getContactName() { return contactName; }
    public void setContactName(String contactName) { this.contactName = contactName; }

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }

    public LocalDate getExpectedDate() { return expectedDate; }
    public void setExpectedDate(LocalDate expectedDate) { this.expectedDate = expectedDate; }

    public Integer getGuestCount() { return guestCount; }
    public void setGuestCount(Integer guestCount) { this.guestCount = guestCount; }

    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
}
