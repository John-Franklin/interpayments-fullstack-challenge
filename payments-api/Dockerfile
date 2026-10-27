FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

COPY nuget.config InterPayments.Payments.sln ./
COPY src/InterPayments.Payments.Web.Api/InterPayments.Payments.Web.Api.csproj src/InterPayments.Payments.Web.Api/
RUN dotnet restore src/InterPayments.Payments.Web.Api/InterPayments.Payments.Web.Api.csproj

COPY src/ src/
RUN dotnet publish src/InterPayments.Payments.Web.Api/InterPayments.Payments.Web.Api.csproj -c Release -o /app --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:10.0
WORKDIR /app
COPY --from=build /app .
ENV ASPNETCORE_URLS=http://+:5080 \
    ASPNETCORE_ENVIRONMENT=Development
EXPOSE 5080
ENTRYPOINT ["dotnet", "InterPayments.Payments.Web.Api.dll"]
