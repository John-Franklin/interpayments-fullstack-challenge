using InterPayments.Payments.Web.Api.Data;

namespace InterPayments.Payments.Web.Api.Contracts;

public sealed record MerchantResponse(string Id, string Name, string Currency, double SurchargeRate)
{
    public static MerchantResponse From(Merchant merchant) => new(merchant.Id, merchant.Name, merchant.Currency, merchant.SurchargeRate);
}
