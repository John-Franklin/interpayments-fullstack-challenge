using System.Collections.Concurrent;
using System.Globalization;

namespace InterPayments.Payments.Web.Api.Gateway;

// Stand-in for the gateway's sandbox. Like the real API it captures a charge as soon as the request arrives,
// and the response can take a while after that. Test cards in the README trigger the sandbox behaviours
public sealed class SimulatedGateway(TimeProvider timeProvider, ILogger<SimulatedGateway> logger) : IPaymentGateway
{
    #region Private Fields

    private const string DeclinedCard = "4000000000000002";

    private const string SlowCard = "4000000000000259";

    private static readonly IReadOnlyDictionary<string, int> CurrencyExponents = new Dictionary<string, int>
    {
        ["CAD"] = 2,
        ["EUR"] = 2,
        ["GBP"] = 2,
        ["JPY"] = 0,
        ["MXN"] = 2,
        ["USD"] = 2
    };

    private readonly ConcurrentDictionary<string, IdempotentCall<ChargeRequest, ChargeResult>> _chargeKeys = new();

    private readonly ConcurrentDictionary<string, GatewayCharge> _charges = new();

    private readonly ConcurrentDictionary<string, IdempotentCall<RefundRequest, RefundResult>> _refundKeys = new();

    #endregion


    #region Public Properties

    public IReadOnlyCollection<GatewayCharge> Ledger => _charges.Values.OrderByDescending(x => x.CreatedAt).ToList();

    public TimeSpan MaxLatency { get; init; } = TimeSpan.FromMilliseconds(250);

    public TimeSpan MinLatency { get; init; } = TimeSpan.FromMilliseconds(80);

    public TimeSpan SlowLatency { get; init; } = TimeSpan.FromSeconds(5);

    #endregion


    #region Public Methods

    public Task<ChargeResult> Charge(ChargeRequest request, CancellationToken cancellationToken = default)
    {
        if (request.IdempotencyKey == null)
            return ProcessCharge(request).WaitAsync(cancellationToken);

        var call = _chargeKeys.GetOrAdd(request.IdempotencyKey, _ => new(request, new(() => ProcessCharge(request))));

        if (call.Request != request)
            throw new GatewayException("idempotency_key_reused");

        return call.Result.Value.WaitAsync(cancellationToken);
    }

    public Task<RefundResult> Refund(RefundRequest request, CancellationToken cancellationToken = default)
    {
        if (request.IdempotencyKey == null)
            return ProcessRefund(request).WaitAsync(cancellationToken);

        var call = _refundKeys.GetOrAdd(request.IdempotencyKey, _ => new(request, new(() => ProcessRefund(request))));

        if (call.Request != request)
            throw new GatewayException("idempotency_key_reused");

        return call.Result.Value.WaitAsync(cancellationToken);
    }

    // For charges captured before this process started (seed data)
    public void RegisterSettledCharge(string reference, long capturedMinor, string currency, long refundedMinor) =>
        _charges[reference] = new GatewayCharge(reference, capturedMinor, currency, null, timeProvider.GetUtcNow()) { RefundedMinor = refundedMinor };

    internal static string FormatMinor(long minor, string currency)
    {
        var exponent = CurrencyExponents.GetValueOrDefault(currency, 2);
        var major = minor / (decimal)Math.Pow(10, exponent);

        return $"{currency} {major.ToString($"N{exponent}", CultureInfo.InvariantCulture)}";
    }

    #endregion


    #region Private Methods

    private static string CreateReference(string prefix) => $"{prefix}_{Guid.NewGuid():N}"[..(prefix.Length + 21)];

    private TimeSpan GetLatency() => TimeSpan.FromMilliseconds(Random.Shared.Next((int)MinLatency.TotalMilliseconds, (int)MaxLatency.TotalMilliseconds + 1));

    private async Task<ChargeResult> ProcessCharge(ChargeRequest request)
    {
        if (!CurrencyExponents.ContainsKey(request.Currency))
            throw new GatewayException("unsupported_currency");

        if (request.AmountMinor <= 0)
            throw new GatewayException("invalid_amount");

        var reference = CreateReference("ch");
        var now = timeProvider.GetUtcNow();

        ChargeResult result;

        if (request.CardNumber == DeclinedCard)
        {
            result = new ChargeResult(false, reference, 0, "card_declined");
        }
        else if (new DateTime(request.ExpiryYear, request.ExpiryMonth, 1).AddMonths(1) <= now.UtcDateTime)
        {
            result = new ChargeResult(false, reference, 0, "expired_card");
        }
        else
        {
            var charge = new GatewayCharge(reference, request.AmountMinor, request.Currency, request.CardNumber[^4..], now);

            _charges[reference] = charge;

            logger.LogInformation("Gateway captured {Display} as {Reference}", charge.Display, reference);

            result = new ChargeResult(true, reference, request.AmountMinor, null);
        }

        await Task.Delay(request.CardNumber == SlowCard ? SlowLatency : GetLatency());

        return result;
    }

    private async Task<RefundResult> ProcessRefund(RefundRequest request)
    {
        await Task.Delay(GetLatency());

        if (!_charges.TryGetValue(request.ChargeReference, out var charge))
            return new RefundResult(false, null, 0, "unknown_charge");

        lock (charge)
        {
            if (request.AmountMinor <= 0 || charge.RefundedMinor + request.AmountMinor > charge.CapturedMinor)
                return new RefundResult(false, null, 0, "amount_exceeds_captured");

            charge.RefundedMinor += request.AmountMinor;
        }

        return new RefundResult(true, CreateReference("re"), request.AmountMinor, null);
    }

    #endregion


    private sealed record IdempotentCall<TRequest, TResult>(TRequest Request, Lazy<Task<TResult>> Result);
}

public sealed class GatewayCharge(string reference, long capturedMinor, string currency, string? cardLast4, DateTimeOffset createdAt)
{
    public string Reference { get; } = reference;

    public long CapturedMinor { get; } = capturedMinor;

    public string Currency { get; } = currency;

    public string? CardLast4 { get; } = cardLast4;

    public DateTimeOffset CreatedAt { get; } = createdAt;

    public long RefundedMinor { get; set; }

    public string Display => SimulatedGateway.FormatMinor(CapturedMinor, Currency);
}
