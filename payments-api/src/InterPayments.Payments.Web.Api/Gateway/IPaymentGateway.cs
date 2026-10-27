namespace InterPayments.Payments.Web.Api.Gateway;

// Card API of our acquiring gateway. Amounts are in the currency's minor units (cents for USD)
// An idempotency key makes a repeated request return the original result instead of being processed again
public interface IPaymentGateway
{
    Task<ChargeResult> Charge(ChargeRequest request, CancellationToken cancellationToken = default);

    Task<RefundResult> Refund(RefundRequest request, CancellationToken cancellationToken = default);
}

public sealed record ChargeRequest(
    long AmountMinor, string Currency, string CardNumber, int ExpiryMonth, int ExpiryYear, string Cvv, string? IdempotencyKey = null);

public sealed record ChargeResult(bool Approved, string Reference, long CapturedMinor, string? DeclineReason);

public sealed record RefundRequest(string ChargeReference, long AmountMinor, string? IdempotencyKey = null);

public sealed record RefundResult(bool Succeeded, string? Reference, long RefundedMinor, string? FailureReason);

public sealed class GatewayException(string code) : Exception($"Gateway rejected the request: {code}")
{
    public string Code { get; } = code;
}
