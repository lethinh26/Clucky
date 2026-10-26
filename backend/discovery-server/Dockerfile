FROM gradle:8.14-jdk21 AS build
WORKDIR /src
COPY . .
RUN gradle :discovery-server:bootJar --no-daemon
FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=build /src/discovery-server/build/libs/discovery-server-0.1.0-SNAPSHOT.jar app.jar
ENTRYPOINT ["java","-jar","/app/app.jar"]
