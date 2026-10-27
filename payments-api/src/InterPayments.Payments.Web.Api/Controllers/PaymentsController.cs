using InterPayments.Payments.Web.Api.Contracts;
using InterPayments.Payments.Web.Api.Infrastructure.Extensions;
using InterPayments.Payments.Web.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace InterPayments.Payments.Web.Api.Controllers;

[ApiController]
[Route("api/payments")]
public sealed class PaymentsController(PaymentService paymentService) : ControllerBase
{
    [HttpPost]
    [ProducesResponseType(typeof(PaymentResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<PaymentResponse>> Create(CreatePaymentRequest request)
    {
        var payment = await paymentService.CreatePayment(HttpContext.GetMerchant(), request);

        return CreatedAtAction(nameof(Get), new { id = payment.Id }, PaymentResponse.From(payment));
    }

    [HttpGet("{id}")]
    [ProducesResponseType(typeof(PaymentResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<PaymentResponse>> Get(string id, CancellationToken cancellationToken)
    {
        var payment = await paymentService.GetPayment(id, cancellationToken);

        return payment == null ? NotFound() : PaymentResponse.From(payment);
    }

    [HttpGet]
    [ProducesResponseType(typeof(PagedResult<PaymentResponse>), StatusCodes.Status200OK)]
    public async Task<PagedResult<PaymentResponse>> List(int page = 1, int pageSize = 25, CancellationToken cancellationToken = default)
    {
        page = Math.Max(page, 1);
        pageSize = Math.Clamp(pageSize, 1, 100);

        var result = await paymentService.GetPaymentList(HttpContext.GetMerchant(), page, pageSize, cancellationToken);

        return new PagedResult<PaymentResponse>(result.Items.Select(PaymentResponse.From).ToList(), result.Page, result.PageSize, result.TotalCount);
    }

    [HttpPost("{id}/refund")]
    [ProducesResponseType(typeof(PaymentResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<PaymentResponse>> Refund(string id)
    {
        try
        {
            var payment = await paymentService.RefundPayment(HttpContext.GetMerchant(), id);

            return payment == null ? NotFound() : PaymentResponse.From(payment);
        }
        catch (PaymentStateException exception)
        {
            return Problem(exception.Message, statusCode: StatusCodes.Status409Conflict);
        }
    }
}
