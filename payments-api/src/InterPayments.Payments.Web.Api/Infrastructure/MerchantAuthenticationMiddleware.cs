using InterPayments.Payments.Web.Api.Data;
using InterPayments.Payments.Web.Api.Infrastructure.Extensions;
using Microsoft.EntityFrameworkCore;

namespace InterPayments.Payments.Web.Api.Infrastructure;

public sealed class MerchantAuthenticationMiddleware(RequestDelegate next)
{
    #region Private Fields

    private const string ApiKeyHeader = "X-Api-Key";

    #endregion


    #region Public Methods

    public async Task InvokeAsync(HttpContext context, PaymentsDbContext dbContext)
    {
        if (!context.Request.Path.StartsWithSegments("/api"))
        {
            await next(context);

            return;
        }

        var apiKey = context.Request.Headers[ApiKeyHeader].ToString();

        var merchant = string.IsNullOrEmpty(apiKey)
            ? null
            : await dbContext.Merchants.AsNoTracking().SingleOrDefaultAsync(x => x.ApiKey == apiKey, context.RequestAborted);

        if (merchant == null)
        {
            context.Response.StatusCode = StatusCodes.Status401Unauthorized;

            await context.Response.WriteAsJsonAsync(new { error = "invalid_api_key" });

            return;
        }

        context.SetMerchant(merchant);

        await next(context);
    }

    #endregion
}
