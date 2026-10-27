using System.Net;
using System.Net.Http.Json;
using InterPayments.Payments.Web.Api.Contracts;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;

namespace InterPayments.Payments.Web.Api.UnitTests;

[TestFixture]
internal sealed class ApiTests
{
    #region Private Fields

    private const string BlueRidgeApiKey = "sk_test_blueridge_4f9c2a71e0";

    private const string HarborApiKey = "sk_test_harbor_8d1e6b03c7";

    private string _databasePath = null!;

    private WebApplicationFactory<Program> _factory = null!;

    #endregion


    #region Setup

    [OneTimeSetUp]
    public void OneTimeSetUp()
    {
        _databasePath = Path.Combine(Path.GetTempPath(), $"payments-tests-{Guid.NewGuid():N}.db");

        // Nothing listens on port 1, so quotes fail fast
        _factory = new WebApplicationFactory<Program>().WithWebHostBuilder(builder =>
        {
            builder.UseEnvironment("Development");
            builder.UseSetting("ConnectionStrings:Payments", $"Data Source={_databasePath}");
            builder.UseSetting("SurchargeService:BaseUrl", "http://127.0.0.1:1/");
        });
    }

    [OneTimeTearDown]
    public async Task OneTimeTearDown()
    {
        await _factory.DisposeAsync();

        File.Delete(_databasePath);
    }

    #endregion


    #region Public Methods

    [Test]
    public async Task Create_WhenCardNumberIsInvalid_ReturnsBadRequest()
    {
        var response = await CreateClient(BlueRidgeApiKey).PostAsJsonAsync("/api/payments", new
        {
            amount = 25.00,
            cardNumber = "4111 1111 1111 1112",
            expiryMonth = 12,
            expiryYear = 2030,
            cvv = "123"
        });

        Assert.That(response.StatusCode, Is.EqualTo(HttpStatusCode.BadRequest));
    }

    [Test]
    public async Task List_ReturnsOnlyTheCallersPayments()
    {
        var blueRidge = await CreateClient(BlueRidgeApiKey).GetFromJsonAsync<PagedResult<PaymentResponse>>("/api/payments?pageSize=100");
        var harbor = await CreateClient(HarborApiKey).GetFromJsonAsync<PagedResult<PaymentResponse>>("/api/payments?pageSize=100");

        Assert.That(blueRidge!.Items.Select(x => x.Id).Intersect(harbor!.Items.Select(x => x.Id)), Is.Empty);
    }

    [Test]
    public async Task List_ReturnsRequestedPageNewestFirst()
    {
        var page = await CreateClient(BlueRidgeApiKey).GetFromJsonAsync<PagedResult<PaymentResponse>>("/api/payments?page=2&pageSize=10");

        using (Assert.EnterMultipleScope())
        {
            Assert.That(page!.Items, Has.Count.EqualTo(10));
            Assert.That(page.Page, Is.EqualTo(2));
            Assert.That(page.TotalCount, Is.GreaterThan(10));
            Assert.That(page.Items.Select(x => x.CreatedAt), Is.Ordered.Descending);
        }
    }

    [Test]
    public async Task List_WhenApiKeyIsMissing_ReturnsUnauthorized()
    {
        var response = await _factory.CreateClient().GetAsync("/api/payments");

        Assert.That(response.StatusCode, Is.EqualTo(HttpStatusCode.Unauthorized));
    }

    [Test]
    public async Task Me_ReturnsTheMerchantForTheApiKey()
    {
        var merchant = await CreateClient(HarborApiKey).GetFromJsonAsync<MerchantResponse>("/api/merchants/me");

        using (Assert.EnterMultipleScope())
        {
            Assert.That(merchant!.Name, Is.EqualTo("Harbor Dental Group"));
            Assert.That(merchant.SurchargeRate, Is.EqualTo(2.5));
        }
    }

    #endregion


    #region Private Methods

    private HttpClient CreateClient(string apiKey)
    {
        var client = _factory.CreateClient();

        client.DefaultRequestHeaders.Add("X-Api-Key", apiKey);

        return client;
    }

    #endregion
}
