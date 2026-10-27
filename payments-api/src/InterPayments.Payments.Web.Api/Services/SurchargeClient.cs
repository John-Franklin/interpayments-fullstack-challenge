namespace InterPayments.Payments.Web.Api.Services;

public sealed class SurchargeClient(HttpClient httpClient, ILogger<SurchargeClient> logger)
{
    public async Task<SurchargeQuote> GetQuote(string merchantId, double amount, string bin, CancellationToken cancellationToken = default)
    {
        try
        {
            using var response = await httpClient.PostAsJsonAsync("v1/quotes", new { merchantId, amount, bin }, cancellationToken);

            response.EnsureSuccessStatusCode();

            return await response.Content.ReadFromJsonAsync<SurchargeQuote>(cancellationToken) ?? SurchargeQuote.NotSurcharged(amount);
        }
        catch (Exception exception)
        {
            logger.LogWarning(exception, "Surcharge quote failed for merchant {MerchantId}, charging without a surcharge", merchantId);

            return SurchargeQuote.NotSurcharged(amount);
        }
    }
}

public sealed record SurchargeQuote(string Network, string CardType, bool Surchargeable, double Rate, double Amount, double Surcharge, double Total)
{
    public static SurchargeQuote NotSurcharged(double amount) => new("UNKNOWN", "UNKNOWN", false, 0, amount, 0, amount);
}
