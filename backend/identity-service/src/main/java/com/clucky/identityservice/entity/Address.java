package com.clucky.identityservice.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "addresses", schema = "identity_service")
public class Address {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", nullable = false)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "receiver_name", nullable = false, length = 160)
    private String receiverName;

    @Column(name = "phone", nullable = false, length = 30)
    private String phone;

    @Column(name = "province", nullable = false, length = 100)
    private String province;

    @Column(name = "district", nullable = false, length = 100)
    private String district;

    @Column(name = "ward", nullable = false, length = 100)
    private String ward;

    @Column(name = "detail", nullable = false, length = 255)
    private String detail;

    @Column(name = "is_default", nullable = false)
    private Boolean isDefault = false;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }

    public String getReceiverName() { return receiverName; }
    public void setReceiverName(String receiverName) { this.receiverName = receiverName; }

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }

    public String getProvince() { return province; }
    public void setProvince(String province) { this.province = province; }

    public String getDistrict() { return district; }
    public void setDistrict(String district) { this.district = district; }

    public String getWard() { return ward; }
    public void setWard(String ward) { this.ward = ward; }

    public String getDetail() { return detail; }
    public void setDetail(String detail) { this.detail = detail; }

    public Boolean getIsDefault() { return isDefault; }
    public void setIsDefault(Boolean isDefault) { this.isDefault = isDefault; }
}
