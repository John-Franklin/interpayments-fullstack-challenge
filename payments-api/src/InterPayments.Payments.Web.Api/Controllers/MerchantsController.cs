using InterPayments.Payments.Web.Api.Contracts;
using InterPayments.Payments.Web.Api.Infrastructure.Extensions;
using Microsoft.AspNetCore.Mvc;

namespace InterPayments.Payments.Web.Api.Controllers;

[ApiController]
[Route("api/merchants")]
public sealed class MerchantsController : ControllerBase
{
    [HttpGet("me")]
    [ProducesResponseType(typeof(MerchantResponse), StatusCodes.Status200OK)]
    public MerchantResponse Me() => MerchantResponse.From(HttpContext.GetMerchant());
}
