FROM gradle:8.14-jdk21 AS build
WORKDIR /src
COPY . .
RUN gradle :promotion-loyalty-service:bootJar --no-daemon
FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=build /src/promotion-loyalty-service/build/libs/promotion-loyalty-service-0.1.0-SNAPSHOT.jar app.jar
ENTRYPOINT ["java","-jar","/app/app.jar"]
