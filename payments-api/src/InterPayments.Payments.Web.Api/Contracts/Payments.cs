using System.ComponentModel.DataAnnotations;
using InterPayments.Payments.Web.Api.Data;

namespace InterPayments.Payments.Web.Api.Contracts;

public sealed record CreatePaymentRequest
{
    [Range(0.01, 1_000_000)]
    public required double Amount { get; init; }

    [Required]
    [CreditCard]
    public required string CardNumber { get; init; }

    [MaxLength(100)]
    public string? CustomerName { get; init; }

    [Required]
    [RegularExpression(@"^\d{3,4}$")]
    public required string Cvv { get; init; }

    [Range(1, 12)]
    public required int ExpiryMonth { get; init; }

    [Range(2000, 2100)]
    public required int ExpiryYear { get; init; }
}

public sealed record PaymentResponse(string Id, double Amount, double Surcharge, double Total, string Currency, string Status, string? DeclineReason,
    CardSummary Card, string? CustomerName, GatewaySummary Gateway, double RefundedAmount, DateTime CreatedAt)
{
    public static PaymentResponse From(Payment payment) => new(payment.Id, payment.Amount, payment.Surcharge, payment.Total, payment.Currency,
        payment.Status.ToString().ToUpperInvariant(), payment.DeclineReason, new CardSummary(payment.CardNetwork, payment.CardType, payment.CardLast4),
        payment.CustomerName, new GatewaySummary(payment.GatewayReference, payment.GatewayAmountMinor), payment.RefundedAmount,
        DateTime.SpecifyKind(payment.CreatedAtUtc, DateTimeKind.Utc));
}

public sealed record CardSummary(string Network, string Type, string Last4);

public sealed record GatewaySummary(string? Reference, long CapturedAmountMinor);

public sealed record PagedResult<T>(IReadOnlyList<T> Items, int Page, int PageSize, int TotalCount);
