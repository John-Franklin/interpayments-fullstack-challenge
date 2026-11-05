# Notes

## Payments API (.NET) changes needed but not made

I took the Scala track, so these are described here rather than made (per INSTRUCTIONS.md). Each
one is needed for what the customer is shown, what the receipt says and what the gateway captures
to agree (docs/surcharging.md rule 4).

### 1. The gateway captures a cent less than the receipt (INC-4478)

The primary cause for this specific error was Scala code in SurchargeCalculator.scala, which used the wrong rounding parameter. The fix makes it use the correct issue.
**File:** `payments-api/src/InterPayments.Payments.Web.Api/Services/PaymentService.cs`, `CreatePayment`

**Bug:** the quoted total is converted to minor units with `(long)(quote.Total * 100)`. `Total` is a
double, so 79.99 is really 79.98999…, and the cast truncates it to 7998. The surcharge service used
to add amount and surcharge as doubles too, so totals like `132.29999999999998` came through. It now
adds them in decimal, but a clean double like 79.99 still truncates here. The receipt rounds for
display; the gateway gets the truncated value.

**Evidence:** 26 of the 487 non-declined seed payments were captured exactly 1¢ below their
receipt total: 18 for Blue Ridge (`mer_001`, the merchant in INC-4478), 3 for Harbor Dental and
5 for Sakura. For example, `pay_01a05da670807be3ae22d4f9d1cd2f63` has a total of 132.30 and a
capture of 13229. Across $0.01–$999.99 at 2.5% and 3%, about 20,000 possible totals are affected.

**Change:**

```csharp
AmountMinor: ToMinorUnits(quote.Total, merchant.Currency),

// decimal recovers the shortest representation (79.99), and rounding rather than truncating makes the
// gateway charge exactly the total the customer was shown
internal static long ToMinorUnits(double amount, string currency) =>
    (long)Math.Round((decimal)amount * Factor(currency), MidpointRounding.AwayFromZero);
```

**Test** (`PaymentServiceTests.cs`): with a stubbed quote, assert that the payment's
`GatewayAmountMinor` and the simulated gateway's ledger entry both equal the expected minor units,
for totals 79.99 → 7999, 640.4599999999999 → 64046, 132.29999999999998 → 13230 and 0.3 → 30.

A longer-term fix is to carry money as `decimal` (or as integer minor units) end to end instead
of `double`, starting with `SurchargeQuote`, `CreatePaymentRequest` and the `Payment` entity.

### 2. JPY payments are sent to the gateway at 100× the amount

**File:** same line as above.

**Bug:** the `* 100` assumes every currency has cents. The simulated gateway treats JPY as having
no minor unit (`SimulatedGateway.CurrencyExponents`), so a ¥17,937 sale is sent as 1,793,745 and
read as ¥1,793,745. The Sakura Imports (`mer_003`) seed payments show this pattern:
`gatewayAmountMinor` is the total × 100 (17937.45 → 1793745).

**Change:** use the currency's exponent (`Factor(currency)` above: 1 for JPY, 100 for USD), from the
same table the gateway uses. That table is private to `SimulatedGateway` today, so move it somewhere
shared rather than keeping a second copy. Add JPY cases to the test above.

The decimals in those totals came from the surcharge service not rounding JPY surcharges to whole
yen (rule 3). That's now fixed on the Scala side, but the `* 100` is still wrong for JPY.

### 3. If only one of the two quote calls fails, the terminal and the charge disagree

**File:** `payments-api/src/InterPayments.Payments.Web.Api/Services/SurchargeClient.cs`, `GetQuote`

**Current behaviour:** if the quote fails, the payments API charges with no surcharge
(`SurchargeQuote.NotSurcharged`). That's right under rule 2 ("if the lookup fails, don't surcharge"),
and the terminal now does the same: when it can't get a quote it shows the plain amount and says the
payment will be taken without a surcharge. When the service is down for both, they agree.

**Bug:** the two calls fail independently. The BFF gives up after 1.5 s (the terminal after 2 s), but the payments API's
`HttpClient` uses the 100 s default. If the service is slow, the terminal can show $185.00 while the
payments API waits, gets a quote and charges $189.63. Or the reverse happens: the terminal shows
$189.63 and the payments API's call fails, so it charges $185.00.

**Change:** give the surcharge `HttpClient` an explicit timeout in `Program.cs` that matches the
terminal's. That narrows the gap, but only 4 below closes it.

### 4. The preview and the charge come from two separate quotes

**Files:** `Contracts/Payments.cs` (`CreatePaymentRequest`), `Services/PaymentService.cs`

**Bug:** the terminal shows the quote it got from the BFF, and the payments API gets its own new
quote when it charges. If they differ (a rate change in between, or one of the two calls failing as
in 3), the customer is charged an amount they weren't shown.

**Change:** add the total the customer saw (e.g. `expectedTotal`) to `CreatePaymentRequest`. Compare it
with the payments API's own quote before calling the gateway, and reject a mismatch (e.g. 409 with the
new quote) so the terminal can show the new total and ask again. This is what actually enforces
rule 4. Fixes 1–3 make the two numbers agree; this makes it impossible to charge if they don't.

### 5. A quote the surcharge service rejects is charged anyway

**File:** `Services/SurchargeClient.cs`, `GetQuote`

**Bug:** any failed quote, including a 4xx, falls back to `NotSurcharged` and the payment goes ahead.
The surcharge service now returns 422 for an amount finer than the currency allows (¥100.5, $10.005),
so the payments API would charge that amount unsurcharged instead of rejecting it.

**Change:** only fall back on a network error, timeout or 5xx. Pass a 4xx back to the caller as a
400, before the gateway is called.

### 6. Partial refunds (rule 5)

Refunds are full only (`PaymentService.RefundPayment`). Proportional surcharge refunds, and the cap on
the total surcharge refunded, need the .NET partial refunds work (Part B .NET Task 3). The seed data
has 26 refunds, all for the full total, so there's nothing broken there yet.

## Task 1: surcharging rules against the seed data

I checked every seed payment (504) against each rule in `docs/surcharging.md`, using its stored card
type and the merchant's rate. Each finding has seed payments both as examples and counterexamples,
and they're used as test cases in `QuoteServiceSpec` and `SurchargeCalculatorSpec`.

| Rule | Seed payments that break it | Cause | Status |
| --- | --- | --- | --- |
| 1 credit only | 40 prepaid surcharged (e.g. `pay_01a04a1a0b80710e9cc9e55ce22aa365`); debit 0 of 107 | `isSurchargeable` only excluded debit | Fixed (surcharge service) |
| 2 if in doubt, don't | none in the seed data, but unknown BINs were surcharged | as above. Also, BINs under 8 digits were padded with zeros, which picks a card type for 40% of 6-digit prefixes | Fixed. A BIN under 8 digits, or a lookup that throws, counts as unknown |
| 3 half up | 53 half-cent ties rounded half even (e.g. INC-4471's `pay_01a15f0586407084beccb042d5037e53`) | `RoundingMode.HALF_EVEN` | Fixed |
| 3 whole yen | 26 JPY credit surcharges with fractional yen (e.g. ¥1,425.45 on `pay_01a04daf098074f1bd48244282b7a479`) | always rounded to 2 places | Fixed: scale from the currency (`java.util.Currency`). Amounts finer than the currency allows get a 422, and the terminal's amount field follows the currency |
| 4 shown = charged | 58 totals with float noise (e.g. `640.4599999999999`); 21 captured 1¢ short; JPY sent ×100 | doubles in the surcharge service; truncation and `* 100` in the payments API | Total fixed in the surcharge service. The terminal shows only the service's quote. Payments API: items 1–5 above |
| 5 refunds | none (no partial refunds exist) | — | Item 6 above |
| 6 opt-out | none (Lakeside, 55 payments, never surcharged) | — | Works; tested with an opted-out merchant that has a rate configured |

The BIN table itself is clean. There are no malformed rows, and no overlapping ranges of equal width
with different card types, so "the narrowest matching range wins" always has a single answer. Every
test card in the README resolves to the type listed for it.

**Where the number should come from:** the surcharge service, once per payment. The terminal shows
that service's quote and never works out its own: that's how the debit patient in INC-4471 was shown
a surcharge. Item 4 above, the payments API checking the total the customer saw, is what makes it
impossible to charge anything else.

## INC-4493: every terminal goes down at once

**Cause:** Express 4 doesn't catch a rejected promise from an `async` route handler. `quoteSurcharge`
had no try/catch, so when `fetch` failed (the ticket's `ENOTFOUND surcharge-service` during a deploy,
or the payments API being unreachable during the merchant lookup) the rejection went unhandled.
Since Node 15 that ends the process, so one failed quote restarted the container and every terminal
using it got errors. That's why it usually, but not always, lined up with surcharge-service deploys.
Nothing had a timeout either, so a slow dependency held requests open indefinitely.

**Fix (BFF only, no .NET changes needed):**

- Every route goes through `asyncHandler`, so rejections reach the error handler.
- Every outbound call goes through `upstreamFetch`. It has a timeout (1.5 s for the surcharge service,
  which is under the terminal's 2 s; 15 s for the payments API, enough for a slow gateway charge). If
  the dependency is unreachable, returns an error page instead of JSON, or times out, that one
  request fails with a 502 or 504.
- A timed-out charge or refund tells the clerk to check the payments list before retrying, because
  it may have gone through.
- The error handler copes with headers already being sent.
- Process-level last resort: an unhandled rejection is logged as an ERROR instead of exiting. An
  uncaught exception still exits, because the process state is unknown, but it lets in-flight
  requests finish first.

**Rule 4 when the surcharge service is slow or down:** the BFF answers 502 or 504 within 1.5 s. The
terminal then shows the plain amount ("This payment will be taken without a surcharge"), which is
what the payments API charges when its own quote fails (rule 2). Item 3 above covers the case where
only one of them fails.

**Tests:** `bff/src/resilience.test.ts` runs every route with the payments API unreachable, timing
out and returning non-JSON, and the quote with the surcharge service in each of those states. Each
time it checks that the BFF keeps serving. Before the fix these requests hung and never got a
response.

**Finding out before a merchant does:**

- Alert on the BFF's 502/504 rate per upstream. The request log already has the status, and
  `upstreamFetch` logs `<service> unreachable|timed out` with the error cause.
- Alert on any `unhandledRejection` or `uncaughtException` log line, and on container restarts.
- Alert on the share of quotes falling back to no surcharge; it's lost revenue for merchants.
- Have deploys of the surcharge service drain connections, with readiness checks so it doesn't
  receive traffic before it's up. A synthetic quote every minute catches the rest.

