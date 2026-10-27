using System.Text.Json.Serialization;
using InterPayments.Payments.Web.Api.Data;
using InterPayments.Payments.Web.Api.Gateway;
using InterPayments.Payments.Web.Api.Infrastructure;
using InterPayments.Payments.Web.Api.Services;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);


#region Web Application Builder - Services

builder.Services.AddControllers().AddJsonOptions(options => options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter()));

builder.Services.AddDbContext<PaymentsDbContext>(options => options.UseSqlite(builder.Configuration.GetConnectionString("Payments")));

builder.Services.AddHttpClient<SurchargeClient>(client => client.BaseAddress = new Uri(builder.Configuration["SurchargeService:BaseUrl"]!));

builder.Services.AddSingleton(TimeProvider.System);
builder.Services.AddSingleton<SimulatedGateway>();
builder.Services.AddSingleton<IPaymentGateway>(serviceProvider => serviceProvider.GetRequiredService<SimulatedGateway>());

builder.Services.AddScoped<PaymentService>();

#endregion


#region Web Application - Host

var app = builder.Build();

app.UseMiddleware<RequestLoggingMiddleware>();
app.UseMiddleware<MerchantAuthenticationMiddleware>();

app.MapControllers();

app.MapGet("/health", () => Results.Ok(new { status = "ok" }));

// The simulated gateway's ledger, every charge it has captured
if (app.Environment.IsDevelopment())
    app.MapGet("/dev/gateway/charges", (SimulatedGateway gateway) => gateway.Ledger);

if (app.Configuration.GetValue<bool>("Database:ResetOnStartup"))
{
    using var scope = app.Services.CreateScope();

    await SeedData.Reset(scope.ServiceProvider.GetRequiredService<PaymentsDbContext>(), scope.ServiceProvider.GetRequiredService<SimulatedGateway>(),
        Path.Combine(AppContext.BaseDirectory, "Data", "seed.json"));
}

app.Run();

#endregion
