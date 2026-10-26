FROM gradle:8.14-jdk21 AS build
WORKDIR /src
COPY . .
RUN gradle :identity-service:bootJar --no-daemon
FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=build /src/identity-service/build/libs/identity-service-0.1.0-SNAPSHOT.jar app.jar
ENTRYPOINT ["java","-jar","/app/app.jar"]
