using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace InterPayments.Payments.Web.Api.Data;

public sealed class Payment
{
    public double Amount { get; set; }

    public required string CardLast4 { get; set; }

    public required string CardNetwork { get; set; }

    public required string CardType { get; set; }

    public DateTime CreatedAtUtc { get; set; }

    public required string Currency { get; set; }

    public string? CustomerName { get; set; }

    public string? DeclineReason { get; set; }

    // What the gateway actually captured, in minor units of the currency
    public long GatewayAmountMinor { get; set; }

    public string? GatewayReference { get; set; }

    public required string Id { get; init; }

    public required string MerchantId { get; init; }

    public double RefundedAmount { get; set; }

    public PaymentStatus Status { get; set; }

    public double Surcharge { get; set; }

    public double Total { get; set; }
}

public static class PaymentExtensions
{
    public static void ConfigureTable(this EntityTypeBuilder<Payment> entity)
    {
        entity.HasIndex(e => new { e.MerchantId, e.CreatedAtUtc }, "IX_Payment_MerchantId_CreatedAtUtc");

        entity.Property(e => e.Status).HasConversion<string>();
    }
}
