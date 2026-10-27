using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace InterPayments.Payments.Web.Api.Data;

public sealed class Merchant
{
    public required string ApiKey { get; set; }

    public required string Currency { get; set; }

    public required string Id { get; init; }

    public required string Name { get; set; }

    // Percent (3.0 = 3%), shown in the terminal
    public double SurchargeRate { get; set; }
}

public static class MerchantExtensions
{
    public static void ConfigureTable(this EntityTypeBuilder<Merchant> entity) => entity.HasIndex(e => e.ApiKey, "UQ_Merchant_ApiKey").IsUnique();
}
