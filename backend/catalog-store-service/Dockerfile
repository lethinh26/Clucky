FROM gradle:8.14-jdk21 AS build
WORKDIR /src
COPY . .
RUN gradle :catalog-store-service:bootJar --no-daemon
FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=build /src/catalog-store-service/build/libs/catalog-store-service-0.1.0-SNAPSHOT.jar app.jar
ENTRYPOINT ["java","-jar","/app/app.jar"]
