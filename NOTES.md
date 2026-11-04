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

### 3. During a surcharge-service outage, the terminal and the charge disagree

**File:** `payments-api/src/InterPayments.Payments.Web.Api/Services/SurchargeClient.cs`, `GetQuote`

**Bug:** if the quote fails, the payments API charges with no surcharge
(`SurchargeQuote.NotSurcharged`). When the terminal can't get a quote, it now falls back to its own
calculation at the merchant's rate. So during an outage a $185.00 Harbor Dental payment shows
$189.63 on the terminal but is charged, and receipted, at $185.00. That's INC-4471 in reverse.

**Options:**

- **A. Match the terminal:** on failure, apply `merchant.SurchargeRate` with the same half-up rounding.
  The two would then agree, but debit and prepaid cards would really be surcharged during outages,
  which breaks rules 1 and 2.
- **B. Don't guess:** on failure, refuse the payment with a clear error instead of charging. This
  never charges an amount the customer wasn't shown, but payments stop while the service is down.

Either way, give the `HttpClient` an explicit timeout (it currently uses the 100 s default) that
agrees with the terminal's 2 s quote timeout. Otherwise a slow service can time out at the terminal
but still succeed at the payments API.

### 4. The preview and the charge come from two separate quotes

**Files:** `Contracts/Payments.cs` (`CreatePaymentRequest`), `Services/PaymentService.cs`

**Bug:** the terminal shows the quote it got from the BFF, and the payments API gets its own new
quote when it charges. If they differ (a rate change in between, or one of the two calls failing as
in 3), the customer is charged an amount they weren't shown.

**Change:** add the total the customer saw (e.g. `expectedTotal`) to `CreatePaymentRequest`. Compare it
with the payments API's own quote before calling the gateway, and reject a mismatch (e.g. 409 with the
new quote) so the terminal can show the new total and ask again. This is what actually enforces
rule 4. Fixes 1–3 make the two numbers agree; this makes it impossible to charge if they don't.
