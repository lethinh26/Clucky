# Clucky Eureka Discovery Server

## Tổng quan
Discovery Server là thành phần phát hiện dịch vụ (Service Discovery) dựa trên Spring Cloud Netflix Eureka Server, chạy tại cổng **8761**.
Mọi microservice nghiệp vụ trong hệ thống Clucky (bao gồm `catalog-store-service`) sẽ tự động đăng ký với Eureka Server này để API Gateway và các service khác có thể gọi định tuyến động qua `lb://<service-name>`.

---

## 1. Cấu hình Discovery Server
- **Port:** `8761`
- **Dashboard UI:** `http://localhost:8761`
- **Eureka Service URL:** `http://localhost:8761/eureka/`
- **File cấu hình:** `src/main/resources/application.yml`

```yaml
spring:
  application:
    name: discovery-server
server:
  port: ${SERVER_PORT:8761}
eureka:
  instance:
    hostname: localhost
  client:
    register-with-eureka: false
    fetch-registry: false
    service-url:
      defaultZone: http://${eureka.instance.hostname}:${server.port}/eureka/
  server:
    enable-self-preservation: true
    eviction-interval-timer-in-ms: 10000
management:
  endpoints:
    web:
      exposure:
        include: health,info,metrics
```

---

## 2. Cấu hình Client mẫu (Ví dụ: `catalog-store-service`)
Trong `catalog-store-service/src/main/resources/application.yml`:
```yaml
eureka:
  instance:
    prefer-ip-address: true
    instance-id: ${spring.application.name}:${random.value}
    lease-renewal-interval-in-seconds: 10
    lease-expiration-duration-in-seconds: 30
  client:
    service-url:
      defaultZone: ${EUREKA_URL:http://localhost:8761/eureka/}
    register-with-eureka: true
    fetch-registry: true
```

---

## 3. Khởi chạy & Kiểm tra Dashboard
### Khởi chạy:
```bash
# Chạy trực tiếp qua Gradle Wrapper từ thư mục backend
./gradlew :discovery-server:bootRun

# Hoặc build jar và chạy java -jar
./gradlew :discovery-server:bootJar
java -jar discovery-server/build/libs/discovery-server-0.1.0-SNAPSHOT.jar
```

### Kiểm tra Dashboard:
1. Mở trình duyệt truy cập: **`http://localhost:8761`**
2. Quan sát bảng **"Instances currently registered with Eureka"**:
   - Khi `catalog-store-service` khởi động, mục **CATALOG-STORE-SERVICE** sẽ xuất hiện với trạng thái **UP (n) - IP:port**.
3. Kiểm tra Actuator Health:
   - Truy cập **`http://localhost:8761/actuator/health`**
   - Kết quả trả về: `{"status":"UP"}`
