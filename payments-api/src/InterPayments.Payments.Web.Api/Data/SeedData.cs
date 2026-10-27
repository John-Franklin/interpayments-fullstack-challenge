using System.Text.Json;
using System.Text.Json.Serialization;
using InterPayments.Payments.Web.Api.Gateway;

namespace InterPayments.Payments.Web.Api.Data;

public static class SeedData
{
    #region Private Fields

    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web)
    {
        Converters = { new JsonStringEnumConverter() }
    };

    #endregion


    #region Public Methods

    public static async Task Reset(PaymentsDbContext dbContext, SimulatedGateway gateway, string seedPath)
    {
        await dbContext.Database.EnsureDeletedAsync();
        await dbContext.Database.EnsureCreatedAsync();

        var seed = JsonSerializer.Deserialize<SeedFile>(await File.ReadAllTextAsync(seedPath), JsonOptions) ??
                   throw new InvalidOperationException($"Seed file {seedPath} is empty.");

        dbContext.Merchants.AddRange(seed.Merchants);
        dbContext.Payments.AddRange(seed.Payments);

        await dbContext.SaveChangesAsync();

        // Seed payments were captured before this process started, register them so they can still be refunded
        foreach (var payment in seed.Payments.Where(x => x.GatewayReference != null && x.GatewayAmountMinor > 0))
        {
            var refundedMinor = payment.Status == PaymentStatus.Refunded ? payment.GatewayAmountMinor : 0;

            gateway.RegisterSettledCharge(payment.GatewayReference!, payment.GatewayAmountMinor, payment.Currency, refundedMinor);
        }
    }

    #endregion


    private sealed record SeedFile(List<Merchant> Merchants, List<Payment> Payments);
}
