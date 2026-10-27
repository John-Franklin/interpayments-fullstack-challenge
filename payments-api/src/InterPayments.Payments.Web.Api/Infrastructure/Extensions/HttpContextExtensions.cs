using InterPayments.Payments.Web.Api.Data;

namespace InterPayments.Payments.Web.Api.Infrastructure.Extensions;

public static class HttpContextExtensions
{
    #region Private Fields

    private const string MerchantKey = "Merchant";

    #endregion


    #region Public Methods

    public static Merchant GetMerchant(this HttpContext context) =>
        context.Items[MerchantKey] as Merchant ?? throw new InvalidOperationException("Merchant cannot be retrieved.");

    public static void SetMerchant(this HttpContext context, Merchant merchant) => context.Items[MerchantKey] = merchant;

    #endregion
}
