namespace InterPayments.Payments.Web.Api.Services;

public sealed class PaymentStateException(string message) : Exception(message);
