# Notes

## Payments API (.NET) changes needed but not made

I took the Scala track, so these are described here rather than made (per INSTRUCTIONS.md). Each
one is needed for what the customer is shown, what the receipt says and what the gateway captures
to agree (docs/surcharging.md rule 4).

### 1. The gateway captures a cent less than the receipt (INC-4478)

**File:** `payments-api/src/InterPayments.Payments.Web.Api/Services/PaymentService.cs`, `CreatePayment`

**Bug:** the quoted total is converted to minor units with `(long)(quote.Total * 100)`. `Total` is a
double, so 79.99 is really 79.98999…, and the cast truncates it to 7998. The surcharge service also
adds amount and surcharge as doubles, so totals like `132.29999999999998` come through. The receipt
rounds them for display; the gateway gets the truncated value.

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

The surcharge service doesn't round JPY surcharges to whole yen yet (rule 3), which is why these
totals have decimals at all. That's a Scala fix, still open.

### 3. If only one of the two quote calls fails, the terminal and the charge disagree

**File:** `payments-api/src/InterPayments.Payments.Web.Api/Services/SurchargeClient.cs`, `GetQuote`

**Current behaviour:** if the quote fails, the payments API charges with no surcharge
(`SurchargeQuote.NotSurcharged`). That's right under rule 2 ("if the lookup fails, don't surcharge"),
and the terminal now does the same: when it can't get a quote it shows the plain amount and says the
payment will be taken without a surcharge. When the service is down for both, they agree.

**Bug:** the two calls fail independently. The terminal gives up after 2 s, but the payments API's
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
