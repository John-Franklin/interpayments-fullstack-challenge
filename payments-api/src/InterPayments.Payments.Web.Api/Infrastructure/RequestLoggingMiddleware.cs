using System.Diagnostics;

namespace InterPayments.Payments.Web.Api.Infrastructure;

// Logs every request with its body so support can see exactly what a merchant sent us
public sealed class RequestLoggingMiddleware(RequestDelegate next, ILogger<RequestLoggingMiddleware> logger)
{
    public async Task InvokeAsync(HttpContext context)
    {
        var body = string.Empty;

        if (context.Request.ContentLength > 0)
        {
            context.Request.EnableBuffering();

            using var reader = new StreamReader(context.Request.Body, leaveOpen: true);

            body = await reader.ReadToEndAsync();

            context.Request.Body.Position = 0;
        }

        var stopwatch = Stopwatch.StartNew();

        await next(context);

        logger.LogInformation("{Method} {Path}{Query} {Body} -> {StatusCode} in {ElapsedMs}ms", context.Request.Method, context.Request.Path,
            context.Request.QueryString, body, context.Response.StatusCode, stopwatch.ElapsedMilliseconds);
    }
}
