FROM eclipse-temurin:21-jdk AS build

ARG SBT_VERSION=1.11.2
RUN curl -fsSL "https://github.com/sbt/sbt/releases/download/v${SBT_VERSION}/sbt-${SBT_VERSION}.tgz" | tar -xz -C /opt
ENV PATH="/opt/sbt/bin:${PATH}"

WORKDIR /src
COPY project/build.properties project/plugins.sbt project/
COPY build.sbt .
RUN sbt -batch update

COPY app app
COPY conf conf
RUN sbt -batch stage

FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=build /src/target/universal/stage .
EXPOSE 9000
ENTRYPOINT ["bin/surcharge-service", "-Dpidfile.path=/dev/null"]
