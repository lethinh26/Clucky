package com.clucky.catalogstoreservice.dto;

import com.clucky.catalogstoreservice.entity.StoreStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;

public class StoreDto {

    private static final DateTimeFormatter TIME_FORMAT = DateTimeFormatter.ofPattern("HH:mm");

    public static class Response {
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

    public static class OperationRequest {
        @Pattern(regexp = "^(?:[01]\\d|2[0-3]):[0-5]\\d$", message = "Giờ mở cửa phải có định dạng HH:mm")
        private String openTime;
        @Pattern(regexp = "^(?:[01]\\d|2[0-3]):[0-5]\\d$", message = "Giờ đóng cửa phải có định dạng HH:mm")
        private String closeTime;
        private String status; // 'OPEN', 'CLOSED_TEMP', 'INACTIVE'

        public String getOpenTime() { return openTime; }
        public void setOpenTime(String openTime) { this.openTime = openTime; }

        public String getCloseTime() { return closeTime; }
        public void setCloseTime(String closeTime) { this.closeTime = closeTime; }

        public String getStatus() { return status; }
        public void setStatus(String status) {
            this.status = status != null ? StoreStatus.fromString(status).name() : null;
        }
    }
}
