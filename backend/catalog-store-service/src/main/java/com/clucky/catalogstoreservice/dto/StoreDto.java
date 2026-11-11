package com.clucky.catalogstoreservice.dto;

import com.clucky.catalogstoreservice.entity.StoreStatus;
import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;

public class StoreDto {

    private static final DateTimeFormatter TIME_FORMAT = DateTimeFormatter.ofPattern("HH:mm");

    public static class Response {
        private java.math.BigDecimal deliveryRadiusKm;
        private long version;
        public java.math.BigDecimal getDeliveryRadiusKm() { return deliveryRadiusKm; }
        public void setDeliveryRadiusKm(java.math.BigDecimal radius) { this.deliveryRadiusKm = radius; }
        public long getVersion() { return version; }
        public void setVersion(long version) { this.version = version; }
        private String accountReadiness;
        public String getAccountReadiness() { return accountReadiness; }
        public void setAccountReadiness(String readiness) { this.accountReadiness = readiness; }
        private Long id;
        private String name;
        private String address;
        private String district;
        private String city;
        private String phone;
        private String openTime;
        private String closeTime;
        private String status;
        private String deliveryArea;
        private Boolean isOpenNow;
        private Integer lowStockThreshold;
        public Integer getLowStockThreshold() { return lowStockThreshold; }
        public void setLowStockThreshold(Integer lowStockThreshold) { this.lowStockThreshold = lowStockThreshold; }

    private Double latitude;
    private Double longitude;
    public Double getLatitude() { return latitude; }
    public void setLatitude(Double latitude) { this.latitude = latitude; }
    public Double getLongitude() { return longitude; }
    public void setLongitude(Double longitude) { this.longitude = longitude; }

        public Response() {}

        public Response(Long id, String name, String address, String district, String city, String phone,
                        LocalTime openTime, LocalTime closeTime, StoreStatus status, String deliveryArea) {
            this(id, name, address, district, city, phone, openTime, closeTime, status, deliveryArea, null);
        }

        public Response(Long id, String name, String address, String district, String city, String phone,
                        LocalTime openTime, LocalTime closeTime, StoreStatus status, String deliveryArea, Boolean isOpenNow) {
            this.id = id;
            this.name = name;
            this.address = address;
            this.district = district;
            this.city = city;
            this.phone = phone;
            this.openTime = openTime != null ? openTime.format(TIME_FORMAT) : null;
            this.closeTime = closeTime != null ? closeTime.format(TIME_FORMAT) : null;
            this.status = status != null ? status.name() : null;
            this.deliveryArea = deliveryArea;
            this.isOpenNow = isOpenNow;
        }

        public Long getId() { return id; }
        public void setId(Long id) { this.id = id; }

        public String getName() { return name; }
        public void setName(String name) { this.name = name; }

        public String getAddress() { return address; }
        public void setAddress(String address) { this.address = address; }

        public String getDistrict() { return district; }
        public void setDistrict(String district) { this.district = district; }

        public String getCity() { return city; }
        public void setCity(String city) { this.city = city; }

        public String getPhone() { return phone; }
        public void setPhone(String phone) { this.phone = phone; }

        public String getOpenTime() { return openTime; }
        public void setOpenTime(String openTime) { this.openTime = openTime; }

        public String getCloseTime() { return closeTime; }
        public void setCloseTime(String closeTime) { this.closeTime = closeTime; }

        public String getStatus() { return status; }
        public void setStatus(String status) { this.status = status; }

        public String getDeliveryArea() { return deliveryArea; }
        public void setDeliveryArea(String deliveryArea) { this.deliveryArea = deliveryArea; }

        public Boolean getIsOpenNow() { return isOpenNow; }
        public void setIsOpenNow(Boolean isOpenNow) { this.isOpenNow = isOpenNow; }
    }

    public static class Request {
        @jakarta.validation.constraints.PositiveOrZero
        private Long expectedVersion;
        public Long getExpectedVersion() { return expectedVersion; }
        public void setExpectedVersion(Long expectedVersion) { this.expectedVersion = expectedVersion; }
        @jakarta.validation.constraints.Email @jakarta.validation.constraints.Size(max = 255)
        private String recoveryEmail;
        public String getRecoveryEmail() { return recoveryEmail; }
        public void setRecoveryEmail(String email) { this.recoveryEmail = email; }
        @jakarta.validation.constraints.DecimalMin("-90") @jakarta.validation.constraints.DecimalMax("90")
        private Double latitude;
        @jakarta.validation.constraints.DecimalMin("-180") @jakarta.validation.constraints.DecimalMax("180")
        private Double longitude;
        public Double getLatitude() { return latitude; }
        public void setLatitude(Double latitude) { this.latitude = latitude; }
        public Double getLongitude() { return longitude; }
        public void setLongitude(Double longitude) { this.longitude = longitude; }
        @jakarta.validation.constraints.AssertTrue
        public boolean isCoordinatePairValid() {
            return (latitude == null && longitude == null) || (latitude != null && longitude != null
                    && Double.isFinite(latitude) && Double.isFinite(longitude));
        }

        @NotBlank(message = "Tên chi nhánh không được để trống")
        private String name;

        @NotBlank(message = "Địa chỉ không được để trống")
        private String address;

        @NotBlank(message = "Số điện thoại không được để trống")
        private String phone;

        @NotBlank(message = "Quận/huyện không được để trống")
        private String district;

        @NotBlank(message = "Tỉnh/thành phố không được để trống")
        private String city;

        @NotBlank
        @Pattern(regexp = "^(?:[01]\\d|2[0-3]):[0-5]\\d$")
        private String openTime;

        @NotBlank
        @Pattern(regexp = "^(?:[01]\\d|2[0-3]):[0-5]\\d$")
        private String closeTime;

        private String status;
        private String deliveryArea;

        public String getName() { return name; }
        public void setName(String name) { this.name = name; }

        public String getAddress() { return address; }
        public void setAddress(String address) { this.address = address; }

        public String getPhone() { return phone; }
        public void setPhone(String phone) { this.phone = phone; }

        public String getOpenTime() { return openTime; }
        public void setOpenTime(String openTime) { this.openTime = openTime; }

        public String getCloseTime() { return closeTime; }
        public void setCloseTime(String closeTime) { this.closeTime = closeTime; }

        public String getStatus() { return status; }
        public void setStatus(String status) {
            this.status = status != null ? StoreStatus.fromString(status).name() : null;
        }

        public String getDeliveryArea() { return deliveryArea; }
        public void setDeliveryArea(String deliveryArea) { this.deliveryArea = deliveryArea; }

        public String getDistrict() { return district; }
        public void setDistrict(String district) { this.district = district; }

        public String getCity() { return city; }
        public void setCity(String city) { this.city = city; }
    }

    public record LocationRequest(
            @jakarta.validation.constraints.DecimalMin("-90") @jakarta.validation.constraints.DecimalMax("90") Double latitude,
            @jakarta.validation.constraints.DecimalMin("-180") @jakarta.validation.constraints.DecimalMax("180") Double longitude,
            @jakarta.validation.constraints.PositiveOrZero Long expectedVersion) {
        public LocationRequest(Double latitude, Double longitude) { this(latitude, longitude, null); }
        @jakarta.validation.constraints.AssertTrue
        public boolean isCoordinatePairValid() {
            return (latitude == null && longitude == null) || (latitude != null && longitude != null
                    && Double.isFinite(latitude) && Double.isFinite(longitude));
        }
    }

    public record DeliverySettingsRequest(
            @jakarta.validation.constraints.DecimalMin(value = "0", inclusive = false)
            @jakarta.validation.constraints.Digits(integer = 5, fraction = 2) java.math.BigDecimal radiusKm,
            @jakarta.validation.constraints.NotNull @jakarta.validation.constraints.PositiveOrZero Long version) {}

    public static class OperationRequest {
        @jakarta.validation.constraints.PositiveOrZero
        private Long expectedVersion;
        public Long getExpectedVersion() { return expectedVersion; }
        public void setExpectedVersion(Long expectedVersion) { this.expectedVersion = expectedVersion; }
        @com.fasterxml.jackson.annotation.JsonAnySetter
        public void rejectUnknown(String field, Object value) { throw new IllegalArgumentException("Unsupported field: " + field); }
        @Pattern(regexp = "^(?:[01]\\d|2[0-3]):[0-5]\\d$", message = "Giờ mở cửa phải có định dạng HH:mm")
        private String openTime;
        @Pattern(regexp = "^(?:[01]\\d|2[0-3]):[0-5]\\d$", message = "Giờ đóng cửa phải có định dạng HH:mm")
        private String closeTime;
        private String status; // 'OPEN', 'CLOSED_TEMP', 'INACTIVE'
        @Pattern(regexp = "^(0|\\+84)[0-9]{8,11}$", message = "Số điện thoại không hợp lệ")
        private String phone;
        @jakarta.validation.constraints.DecimalMin("-90") @jakarta.validation.constraints.DecimalMax("90")
        private Double latitude;
        @jakarta.validation.constraints.DecimalMin("-180") @jakarta.validation.constraints.DecimalMax("180")
        private Double longitude;
        private String deliveryArea;
        @jakarta.validation.constraints.Min(0)
        private Integer lowStockThreshold;

        public String getOpenTime() { return openTime; }
        public void setOpenTime(String openTime) { this.openTime = openTime; }

        public String getCloseTime() { return closeTime; }
        public void setCloseTime(String closeTime) { this.closeTime = closeTime; }

        public String getStatus() { return status; }
        public void setStatus(String status) {
            this.status = status != null ? StoreStatus.fromString(status).name() : null;
        }

        public String getPhone() { return phone; }
        public void setPhone(String phone) { this.phone = phone; }

        public Double getLatitude() { return latitude; }
        public void setLatitude(Double latitude) { this.latitude = latitude; }

        public Double getLongitude() { return longitude; }
        public void setLongitude(Double longitude) { this.longitude = longitude; }

        public String getDeliveryArea() { return deliveryArea; }
        public void setDeliveryArea(String deliveryArea) { this.deliveryArea = deliveryArea; }

        public Integer getLowStockThreshold() { return lowStockThreshold; }
        public void setLowStockThreshold(Integer lowStockThreshold) { this.lowStockThreshold = lowStockThreshold; }
    }

    public static class StoreThresholdRequest {
        @jakarta.validation.constraints.PositiveOrZero
        private Long expectedVersion;
        public Long getExpectedVersion() { return expectedVersion; }
        public void setExpectedVersion(Long expectedVersion) { this.expectedVersion = expectedVersion; }
        private Integer threshold;
        private Integer lowStockThreshold;

        public StoreThresholdRequest() {}

        public StoreThresholdRequest(Integer threshold) {
            this.threshold = threshold;
        }

        @JsonIgnore
        @jakarta.validation.constraints.AssertTrue(message = "Ngưỡng không được để trống")
        public boolean isPresent() {
            return getEffectiveThreshold() != null;
        }

        @JsonIgnore
        @jakarta.validation.constraints.AssertTrue(message = "Ngưỡng phải là số nguyên không âm")
        public boolean isNonNegative() {
            Integer val = getEffectiveThreshold();
            return val == null || val >= 0;
        }

        @JsonIgnore
        public Integer getEffectiveThreshold() {
            return threshold != null ? threshold : lowStockThreshold;
        }

        @JsonIgnore
        public Integer threshold() {
            return getEffectiveThreshold();
        }

        public Integer getThreshold() { return threshold; }
        public void setThreshold(Integer threshold) { this.threshold = threshold; }
        public Integer getLowStockThreshold() { return lowStockThreshold; }
        public void setLowStockThreshold(Integer lowStockThreshold) { this.lowStockThreshold = lowStockThreshold; }
    }
}
