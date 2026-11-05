namespace InterPayments.Payments.Web.Api.Contracts;

public sealed record SettlementReport(string Date, string Currency, int PaymentCount, double Gross, double SurchargeCollected, double Refunds, double Net,
    IReadOnlyList<NetworkTotal> ByNetwork);

public sealed record NetworkTotal(string Network, int Count, double Total);
