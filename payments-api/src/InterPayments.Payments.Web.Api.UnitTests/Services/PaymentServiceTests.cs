using System.Net;
using System.Net.Http.Json;
using InterPayments.Payments.Web.Api.Contracts;
using InterPayments.Payments.Web.Api.Data;
using InterPayments.Payments.Web.Api.Gateway;
using InterPayments.Payments.Web.Api.Services;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;

namespace InterPayments.Payments.Web.Api.UnitTests.Services;

[TestFixture]
internal sealed class PaymentServiceTests
{
    #region Private Fields

    private static readonly Merchant BlueRidge = new()
    {
        ApiKey = "key_1",
        Currency = "USD",
        Id = "mer_001",
        Name = "Blue Ridge Outfitters",
        SurchargeRate = 3.0
    };

    private static readonly Merchant Harbor = new()
    {
        ApiKey = "key_2",
        Currency = "USD",
        Id = "mer_002",
        Name = "Harbor Dental Group",
        SurchargeRate = 2.5
    };

    private SqliteConnection _connection = null!;

    private PaymentsDbContext _dbContext = null!;

    private SimulatedGateway _gateway = null!;

    #endregion


    #region Setup

    [SetUp]
    public async Task SetUp()
    {
        _connection = new SqliteConnection("Data Source=:memory:");

        await _connection.OpenAsync();

        _dbContext = new PaymentsDbContext(new DbContextOptionsBuilder<PaymentsDbContext>().UseSqlite(_connection).Options);

        await _dbContext.Database.EnsureCreatedAsync();

        _dbContext.Merchants.AddRange(BlueRidge, Harbor);

        await _dbContext.SaveChangesAsync();

        _gateway = new SimulatedGateway(TimeProvider.System, NullLogger<SimulatedGateway>.Instance)
        {
            MaxLatency = TimeSpan.Zero,
            MinLatency = TimeSpan.Zero,
            SlowLatency = TimeSpan.Zero
        };
    }

    [TearDown]
    public async Task TearDown()
    {
        await _dbContext.DisposeAsync();
        await _connection.DisposeAsync();
    }

    #endregion


    #region Public Methods

    [Test]
    public async Task CreatePayment_ChargesTheQuotedTotalAndStoresThePayment()
    {
        var sut = CreatePaymentService(new SurchargeQuote("VISA", "CREDIT", true, 3.0, 100.00, 3.00, 103.00));

        var payment = await sut.CreatePayment(BlueRidge, CreateRequest("4111 1111 1111 1111", 100.00));

        using (Assert.EnterMultipleScope())
        {
            Assert.That(payment.Status, Is.EqualTo(PaymentStatus.Approved));
            Assert.That(payment.Surcharge, Is.EqualTo(3.00));
            Assert.That(payment.Total, Is.EqualTo(103.00));
            Assert.That(payment.GatewayAmountMinor, Is.EqualTo(10300));
            Assert.That(payment.CardNetwork, Is.EqualTo("VISA"));
            Assert.That(payment.CardLast4, Is.EqualTo("1111"));
            Assert.That(await _dbContext.Payments.CountAsync(), Is.EqualTo(1));
        }
    }

    [Test]
    public async Task CreatePayment_WhenCardIsDeclined_StoresADeclinedPayment()
    {
        var sut = CreatePaymentService(new SurchargeQuote("VISA", "CREDIT", true, 3.0, 20.00, 0.60, 20.60));

        var payment = await sut.CreatePayment(BlueRidge, CreateRequest("4000 0000 0000 0002", 20.00));

        using (Assert.EnterMultipleScope())
        {
            Assert.That(payment.Status, Is.EqualTo(PaymentStatus.Declined));
            Assert.That(payment.DeclineReason, Is.EqualTo("card_declined"));
            Assert.That(payment.GatewayAmountMinor, Is.Zero);
        }
    }

    [Test]
    public async Task RefundPayment_RefundsTheFullCapturedAmount()
    {
        var sut = CreatePaymentService(new SurchargeQuote("VISA", "CREDIT", true, 3.0, 50.00, 1.50, 51.50));
        var payment = await sut.CreatePayment(BlueRidge, CreateRequest("4111 1111 1111 1111", 50.00));

        var refunded = await sut.RefundPayment(BlueRidge, payment.Id);

        using (Assert.EnterMultipleScope())
        {
            Assert.That(refunded!.Status, Is.EqualTo(PaymentStatus.Refunded));
            Assert.That(refunded.RefundedAmount, Is.EqualTo(51.50));
        }
    }

    [Test]
    public async Task RefundPayment_WhenAlreadyRefunded_ThrowsPaymentStateException()
    {
        var sut = CreatePaymentService(new SurchargeQuote("VISA", "CREDIT", true, 3.0, 50.00, 1.50, 51.50));
        var payment = await sut.CreatePayment(BlueRidge, CreateRequest("4111 1111 1111 1111", 50.00));

        await sut.RefundPayment(BlueRidge, payment.Id);

        Assert.ThrowsAsync<PaymentStateException>(() => sut.RefundPayment(BlueRidge, payment.Id));
    }

    [Test]
    public async Task RefundPayment_WhenPaymentBelongsToAnotherMerchant_ReturnsNull()
    {
        var sut = CreatePaymentService(new SurchargeQuote("VISA", "CREDIT", true, 3.0, 50.00, 1.50, 51.50));
        var payment = await sut.CreatePayment(BlueRidge, CreateRequest("4111 1111 1111 1111", 50.00));

        var refunded = await sut.RefundPayment(Harbor, payment.Id);

        Assert.That(refunded, Is.Null);
    }

    #endregion


    #region Private Methods

    private static CreatePaymentRequest CreateRequest(string cardNumber, double amount) => new()
    {
        Amount = amount,
        CardNumber = cardNumber,
        CustomerName = "Test Customer",
        Cvv = "123",
        ExpiryMonth = 12,
        ExpiryYear = DateTime.UtcNow.Year + 2
    };

    private PaymentService CreatePaymentService(SurchargeQuote quote)
    {
        var httpClient = new HttpClient(new SurchargeServiceStub(quote)) { BaseAddress = new Uri("http://surcharge.test/") };
        var surchargeClient = new SurchargeClient(httpClient, NullLogger<SurchargeClient>.Instance);

        return new PaymentService(_dbContext, surchargeClient, _gateway, TimeProvider.System, NullLogger<PaymentService>.Instance);
    }

    #endregion


    private sealed class SurchargeServiceStub(SurchargeQuote quote) : HttpMessageHandler
    {
        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken) =>
            Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK) { Content = JsonContent.Create(quote) });
    }
}
