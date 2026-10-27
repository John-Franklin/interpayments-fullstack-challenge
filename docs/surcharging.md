# Surcharging rules

A surcharge is a fee a merchant adds to a card payment to cover the cost of
accepting the card. Each merchant picks a rate (a percentage) when they're
onboarded, or opts out.

These rules are simplified from the card networks' real ones. Where they differ
from what you know, follow this document.

## Rules

1. **Credit cards only.** Only credit cards can be surcharged. Never surcharge
   a debit or prepaid card.

2. **If in doubt, don't.** If we can't tell the card type (the BIN isn't in our
   table, or the lookup fails), don't surcharge.

3. **How much.** `surcharge = amount × rate`, rounded half up to the currency's
   smallest unit: cents for USD, whole yen for JPY.

4. **What the customer sees is what they pay.** The customer has to be shown the
   exact surcharge and total before they're charged, and we must charge exactly
   the total they were shown.

5. **Refunds.** When a payment is refunded, in full or in part, the surcharge is
   refunded in proportion. Refunding $50.00 of a $100.00 sale that carried a
   $3.00 surcharge returns $51.50. Across all refunds on a payment, the
   surcharge refunded can never be more than the surcharge charged.

6. **Opt-out.** A merchant with surcharging turned off never surcharges.

## Card types and the BIN table

The card type comes from the BIN table (`surcharge-service/conf/bins.csv.gz`),
keyed on the first 8 digits of the card number. Issuers carve narrower product
ranges out of broader ones, so ranges can overlap. When they do, the narrowest
matching range wins.
