package com.clucky.catalogstoreservice.dto;

import jakarta.validation.constraints.NotBlank;
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

        public Response() {}

        public Response(Long id, String name, String address, String phone, LocalTime openTime, LocalTime closeTime, String status, String deliveryArea) {
            this.id = id;
            this.name = name;
            this.address = address;
            this.phone = phone;
            this.openTime = openTime != null ? openTime.format(TIME_FORMAT) : "09:00";
            this.closeTime = closeTime != null ? closeTime.format(TIME_FORMAT) : "22:00";
            this.status = status;
            this.deliveryArea = deliveryArea;
            extractDistrictAndCity(address);
        }

        private void extractDistrictAndCity(String addr) {
            this.city = "TP. Hồ Chí Minh";
            if (addr == null) {
                this.district = "Quận 1";
                return;
            }
            String lower = addr.toLowerCase();
            if (lower.contains("gò vấp") || lower.contains("go vap")) this.district = "Gò Vấp";
            else if (lower.contains("bình thạnh") || lower.contains("binh thanh")) this.district = "Bình Thạnh";
            else if (lower.contains("thủ đức") || lower.contains("thu duc") || lower.contains("quận 9")) this.district = "Thủ Đức";
            else if (lower.contains("quận 5") || lower.contains("quan 5")) this.district = "Quận 5";
            else if (lower.contains("quận 3") || lower.contains("quan 3")) this.district = "Quận 3";
            else if (lower.contains("quận 10") || lower.contains("quan 10")) this.district = "Quận 10";
            else if (lower.contains("quận 7") || lower.contains("quan 7")) this.district = "Quận 7";
            else this.district = "Quận 1";
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
    }

    public static class Request {
        @NotBlank(message = "Tên chi nhánh không được để trống")
        private String name;

        @NotBlank(message = "Địa chỉ không được để trống")
        private String address;

        @NotBlank(message = "Số điện thoại không được để trống")
        private String phone;

        private String openTime; // "09:00"
        private String closeTime; // "22:00"
        private String status = "ACTIVE";
        private String deliveryArea;
        private String district;
        private String city;

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
        public void setStatus(String status) { this.status = status; }

        public String getDeliveryArea() { return deliveryArea; }
        public void setDeliveryArea(String deliveryArea) { this.deliveryArea = deliveryArea; }

        public String getDistrict() { return district; }
        public void setDistrict(String district) { this.district = district; }

        public String getCity() { return city; }
        public void setCity(String city) { this.city = city; }
    }

    public static class OperationRequest {
        private String openTime;
        private String closeTime;
        private String status; // 'OPEN' or 'ACTIVE' or 'CLOSED_TEMP'

        public String getOpenTime() { return openTime; }
        public void setOpenTime(String openTime) { this.openTime = openTime; }

        public String getCloseTime() { return closeTime; }
        public void setCloseTime(String closeTime) { this.closeTime = closeTime; }

        public String getStatus() { return status; }
        public void setStatus(String status) { this.status = status; }
    }
}
