using InterPayments.Payments.Web.Api.Contracts;
using InterPayments.Payments.Web.Api.Data;
using InterPayments.Payments.Web.Api.Infrastructure.Extensions;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace InterPayments.Payments.Web.Api.Controllers;

[ApiController]
[Route("api/reports")]
public sealed class ReportsController(PaymentsDbContext dbContext) : ControllerBase
{
    // Day totals so merchants can reconcile against the gateway's settlement file
    [HttpGet("settlement")]
    [ProducesResponseType(typeof(SettlementReport), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<SettlementReport>> Settlement(string date)
    {
        if (!DateTime.TryParse(date, out var day))
            return BadRequest();

        var merchant = HttpContext.GetMerchant();
        var payments = await dbContext.Payments.AsNoTracking().ToListAsync();

        var settled = payments
                      .Where(x => x.MerchantId == merchant.Id)
                      .Where(x => x.Status != PaymentStatus.Declined)
                      .Where(x => x.CreatedAtUtc.ToLocalTime().Date == day.Date)
                      .ToList();

        var byNetwork = payments
                        .Where(x => x.Status != PaymentStatus.Declined && x.CreatedAtUtc.ToLocalTime().Date == day.Date)
                        .GroupBy(x => x.CardNetwork)
                        .Select(x => new NetworkTotal(x.Key, x.Count(), Math.Round(x.Sum(y => y.Total), 2)))
                        .OrderByDescending(x => x.Total)
                        .ToList();

        var gross = settled.Sum(x => x.Total);
        var refunds = settled.Sum(x => x.RefundedAmount);

        return new SettlementReport(day.ToString("yyyy-MM-dd"), merchant.Currency, settled.Count, Math.Round(gross, 2),
            Math.Round(settled.Sum(x => x.Surcharge), 2), Math.Round(refunds, 2), Math.Round(gross - refunds, 2), byNetwork);
    }
}
