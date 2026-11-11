package com.clucky.cartorderservice.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "orders", schema = "order_service")
public class Order {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", nullable = false)
    private Long id;

    @Column(name = "order_code", nullable = false, length = 40, unique = true)
    private String orderCode;

    @Column(name = "customer_id")
    private Long customerId;

    @Column(name = "order_source", nullable = false, length = 20)
    private String orderSource = "WEB";

    @Column(name = "dining_option", nullable = false, length = 20)
    private String diningOption = "TAKE_AWAY";

    @Column(name = "queue_number")
    private Integer queueNumber;

    @Column(name = "store_id", nullable = false)
    private Long storeId;

    @Column(name = "type", nullable = false, length = 20)
    private String type;

    @Column(name = "status", nullable = false, length = 30)
    private String status;

    @Column(name = "subtotal", nullable = false, precision = 12, scale = 0)
    private BigDecimal subtotal;

    @Column(name = "discount_amount", nullable = false, precision = 12, scale = 0)
    private BigDecimal discountAmount = new BigDecimal("0");

    @Column(name = "points_used", nullable = false)
    private Integer pointsUsed = 0;

    @Column(name = "points_amount", nullable = false, precision = 12, scale = 0)
    private BigDecimal pointsAmount = new BigDecimal("0");

    @Column(name = "shipping_fee", nullable = false, precision = 12, scale = 0)
    private BigDecimal shippingFee = new BigDecimal("0");

    @Column(name = "total_amount", nullable = false, precision = 12, scale = 0)
    private BigDecimal totalAmount;

    @Column(name = "voucher_code", nullable = true, length = 80)
    private String voucherCode;

    @Column(name = "receiver_name", nullable = true, length = 160)
    private String receiverName;

    @Column(name = "receiver_phone", nullable = true, length = 30)
    private String receiverPhone;

    @Column(name = "delivery_address", nullable = true, columnDefinition = "text")
    private String deliveryAddress;

    @Column(name = "note", nullable = true, columnDefinition = "text")
    private String note;

    @Column(name = "payment_method", nullable = false, length = 20)
    private String paymentMethod = "COD";

    @Column(name = "payment_status", nullable = false, length = 20)
    private String paymentStatus = "PENDING";

    private String collectionMethod;
    private BigDecimal collectedCash;
    private BigDecimal declaredTransfer;
    public String getCollectionMethod() { return collectionMethod; }
    public void setCollectionMethod(String method) { this.collectionMethod = method; }
    public BigDecimal getCollectedCash() { return collectedCash; }
    public void setCollectedCash(BigDecimal amount) { this.collectedCash = amount; }
    public BigDecimal getDeclaredTransfer() { return declaredTransfer; }
    public void setDeclaredTransfer(BigDecimal amount) { this.declaredTransfer = amount; }

    public String getPaymentStatus() { return paymentStatus; }
    public void setPaymentStatus(String paymentStatus) { this.paymentStatus = paymentStatus; }

    @Column(name = "payment_expires_at")
    private Instant paymentExpiresAt;
    public Instant getPaymentExpiresAt() { return paymentExpiresAt; }
    public void setPaymentExpiresAt(Instant paymentExpiresAt) { this.paymentExpiresAt = paymentExpiresAt; }

    @Column(name = "scheduled_at", nullable = true)
    private Instant scheduledAt;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    @Version
    @Column(name = "version", nullable = false)
    private Long version = 0L;

    public Long getVersion() { return version; }
    public void setVersion(Long version) { this.version = version; }

    private Double latitude;
    private Double longitude;
    public Double getLatitude() { return latitude; }
    public void setLatitude(Double latitude) { this.latitude = latitude; }
    public Double getLongitude() { return longitude; }
    public void setLongitude(Double longitude) { this.longitude = longitude; }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getOrderCode() { return orderCode; }
    public void setOrderCode(String orderCode) { this.orderCode = orderCode; }

    public Long getCustomerId() { return customerId; }
    public void setCustomerId(Long customerId) { this.customerId = customerId; }

    public String getOrderSource() { return orderSource; }
    public void setOrderSource(String orderSource) { this.orderSource = orderSource; }

    public String getDiningOption() { return diningOption; }
    public void setDiningOption(String diningOption) { this.diningOption = diningOption; }

    public Integer getQueueNumber() { return queueNumber; }
    public void setQueueNumber(Integer queueNumber) { this.queueNumber = queueNumber; }

    public Long getStoreId() { return storeId; }
    public void setStoreId(Long storeId) { this.storeId = storeId; }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public BigDecimal getSubtotal() { return subtotal; }
    public void setSubtotal(BigDecimal subtotal) { this.subtotal = subtotal; }

    public BigDecimal getDiscountAmount() { return discountAmount; }
    public void setDiscountAmount(BigDecimal discountAmount) { this.discountAmount = discountAmount; }

    public Integer getPointsUsed() { return pointsUsed; }
    public void setPointsUsed(Integer pointsUsed) { this.pointsUsed = pointsUsed; }

    public BigDecimal getPointsAmount() { return pointsAmount; }
    public void setPointsAmount(BigDecimal pointsAmount) { this.pointsAmount = pointsAmount; }

    public BigDecimal getShippingFee() { return shippingFee; }
    public void setShippingFee(BigDecimal shippingFee) { this.shippingFee = shippingFee; }

    public BigDecimal getTotalAmount() { return totalAmount; }
    public void setTotalAmount(BigDecimal totalAmount) { this.totalAmount = totalAmount; }

    public String getVoucherCode() { return voucherCode; }
    public void setVoucherCode(String voucherCode) { this.voucherCode = voucherCode; }

    public String getReceiverName() { return receiverName; }
    public void setReceiverName(String receiverName) { this.receiverName = receiverName; }

    public String getReceiverPhone() { return receiverPhone; }
    public void setReceiverPhone(String receiverPhone) { this.receiverPhone = receiverPhone; }

    public String getDeliveryAddress() { return deliveryAddress; }
    public void setDeliveryAddress(String deliveryAddress) { this.deliveryAddress = deliveryAddress; }

    public String getNote() { return note; }
    public void setNote(String note) { this.note = note; }

    public String getPaymentMethod() { return paymentMethod; }
    public void setPaymentMethod(String paymentMethod) { this.paymentMethod = paymentMethod; }

    public Instant getScheduledAt() { return scheduledAt; }
    public void setScheduledAt(Instant scheduledAt) { this.scheduledAt = scheduledAt; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }

    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
}
