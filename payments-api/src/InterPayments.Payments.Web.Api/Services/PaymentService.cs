using InterPayments.Payments.Web.Api.Contracts;
using InterPayments.Payments.Web.Api.Data;
using InterPayments.Payments.Web.Api.Gateway;
using Microsoft.EntityFrameworkCore;

namespace InterPayments.Payments.Web.Api.Services;

public sealed class PaymentService(
    PaymentsDbContext dbContext, SurchargeClient surchargeClient, IPaymentGateway paymentGateway, TimeProvider timeProvider, ILogger<PaymentService> logger)
{
    public async Task<Payment> CreatePayment(Merchant merchant, CreatePaymentRequest request, CancellationToken cancellationToken = default)
    {
        var cardNumber = new string(request.CardNumber.Where(char.IsAsciiDigit).ToArray());
        var quote = await surchargeClient.GetQuote(merchant.Id, request.Amount, cardNumber[..8], cancellationToken);

        var charge = await paymentGateway.Charge(new ChargeRequest(
            AmountMinor: (long)(quote.Total * 100),
            Currency: merchant.Currency,
            CardNumber: cardNumber,
            ExpiryMonth: request.ExpiryMonth,
            ExpiryYear: request.ExpiryYear,
            Cvv: request.Cvv), cancellationToken);

        var payment = new Payment
        {
            Id = $"pay_{Guid.CreateVersion7():N}",
            MerchantId = merchant.Id,
            Amount = request.Amount,
            Surcharge = quote.Surcharge,
            Total = quote.Total,
            Currency = merchant.Currency,
            Status = charge.Approved ? PaymentStatus.Approved : PaymentStatus.Declined,
            DeclineReason = charge.DeclineReason,
            CardNetwork = quote.Network,
            CardType = quote.CardType,
            CardLast4 = cardNumber[^4..],
            CustomerName = request.CustomerName,
            GatewayReference = charge.Reference,
            GatewayAmountMinor = charge.CapturedMinor,
            CreatedAtUtc = timeProvider.GetUtcNow().UtcDateTime
        };

        dbContext.Payments.Add(payment);

        await dbContext.SaveChangesAsync(cancellationToken);

        logger.LogInformation("Payment {PaymentId} {Status} for {MerchantId}: {Total} {Currency}", payment.Id, payment.Status, merchant.Id, payment.Total,
            payment.Currency);

        return payment;
    }

    public Task<Payment?> GetPayment(string paymentId, CancellationToken cancellationToken = default) =>
        dbContext.Payments.AsNoTracking().SingleOrDefaultAsync(x => x.Id == paymentId, cancellationToken);

    public async Task<PagedResult<Payment>> GetPaymentList(Merchant merchant, int page, int pageSize, CancellationToken cancellationToken = default)
    {
        var query = dbContext.Payments
                             .AsNoTracking()
                             .Where(x => x.MerchantId == merchant.Id)
                             .OrderByDescending(x => x.CreatedAtUtc);

        var totalCount = await query.CountAsync(cancellationToken);
        var items = await query.Skip((page - 1) * pageSize).Take(pageSize).ToListAsync(cancellationToken);

        return new PagedResult<Payment>(items, page, pageSize, totalCount);
    }

    public async Task<Payment?> RefundPayment(Merchant merchant, string paymentId, CancellationToken cancellationToken = default)
    {
        var payment = await dbContext.Payments.SingleOrDefaultAsync(x => x.Id == paymentId && x.MerchantId == merchant.Id, cancellationToken);

        if (payment == null)
            return null;

        if (payment.Status != PaymentStatus.Approved)
            throw new PaymentStateException($"A {payment.Status.ToString().ToLowerInvariant()} payment can't be refunded.");

        var refund = await paymentGateway.Refund(new RefundRequest(payment.GatewayReference!, payment.GatewayAmountMinor), cancellationToken);

        if (!refund.Succeeded)
            throw new PaymentStateException($"The gateway rejected the refund: {refund.FailureReason}.");

        payment.Status = PaymentStatus.Refunded;
        payment.RefundedAmount = payment.Total;

        await dbContext.SaveChangesAsync(cancellationToken);

        logger.LogInformation("Payment {PaymentId} refunded in full", payment.Id);

        return payment;
    }
}
