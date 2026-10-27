# Senior Fullstack Skills Assessment

This repo is a cut-down slice of a payments platform. Merchants take card
payments in a React virtual terminal. The terminal talks to a TypeScript BFF,
which calls a .NET payments API and a Scala surcharge service. The payments API
charges the card through our gateway (simulated here), and the surcharge
service works out what surcharge applies, if any. The [README](./README.md)
explains how to run it.

We don't expect you to finish everything. We want to see how you find your way
around a codebase you haven't seen before, what you prioritize and what
trade-offs you make. Your notes matter as much as your code.

Plan on about 4 hours. There's more here than fits, so pick your battles. If you
have to choose, we'd rather see Task 1 done thoroughly, one backend task and one
BFF task done properly and a careful review of PR #231 than everything touched
lightly. For anything you don't get to, a short note on how you'd approach it is
worth nearly as much as code.

Use whatever editor, tools and references you normally would. We expect you to
use AI tools the way you would at work, and you own everything you hand in. In
the follow-up call we'll ask you to walk us through your changes and your
reasoning, including how you checked what your tools produced, and we'll go
through a few design questions about the system.

## Languages

You'll need to read C#, Scala and TypeScript. Everyone writes TypeScript, in the
BFF and the React app. On the backend, pick C# or Scala, whichever you're
stronger in. If a fix belongs in the backend you're not working in, describe it
in your notes (file, change, reason) instead of making it.

## Part A

### Task 1: "The terminal said one thing, the receipt said another"

Two tickets from support:

> **INC-4471** · Harbor Dental Group (`mer_002`)
>
> On Oct 21 a patient paid for a $185.00 cleaning with a Visa credit card. The
> terminal showed a total of $189.63 but the receipt says $189.62. The patient
> noticed, and apparently it isn't the first time a total has been off by a
> cent. Separately, a patient paying with a debit card was shown a surcharge on
> the terminal.

> **INC-4478** · Blue Ridge Outfitters (`mer_001`)
>
> Their bookkeeper says the deposits from the gateway come in a few cents short
> of the totals on our receipts, every week.

Find the causes and fix them, so that what the customer is shown, what the
receipt says and what the gateway captures always agree, in line with
[docs/surcharging.md](./docs/surcharging.md). Tell us where you think the
number should come from, and why.

## Part B: Choose a backend track

Pick .NET or Scala and do one of its tasks. A second task, from either track,
is a bonus.

### .NET

**Task 2: Duplicate charges.** Merchants say customers are sometimes charged two
or three times for one payment, usually when the terminal says the request timed
out. (Test card `4000 0000 0000 0259` makes the gateway slow.) Make creating a
payment safe to retry, end to end. Tell us what contract you chose and which
cases you considered.

**Task 3: Partial refunds.** Right now a payment can only be refunded in full.
Add partial refunds: any number of refunds per payment, up to the amount
captured, with the surcharge refunded proportionally (rule 5 in
`docs/surcharging.md`). Two people pressing Refund at the same moment must never
refund more than was captured. A terminal UI for it is a bonus.

### Scala

**Task 2: Latency under load.** The surcharge service is called on every
payment and every terminal preview, and it struggles at peak. Run
`node scripts/load-test.mjs` against it in production mode to see this. Find out
why and fix it. Tell us what you measured before and after.

**Task 3: Surcharge rules.** Bring the surcharge service in line with
`docs/surcharging.md`, with tests that would have caught the gaps. Then make
sure the terminal shows the customer the right thing for the card they're using.

## Part C: BFF

Do one of these two. The other is a bonus.

### Task 4: Someone else's payments

> **INC-4486** · Harbor Dental Group (`mer_002`)
>
> Front desk opened the Payments page and saw a list of payments that weren't
> theirs. Patient names they didn't recognize, amounts they never charged. They
> refreshed a few seconds later and their own payments were back.

Find out what happened and fix it. The payments API team has asked that you
don't just delete the BFF's caching, because the list is their most expensive
query. Tell us whose data could have been exposed and to whom, and what you'd
need to know before replying to the merchant.

### Task 5: Everyone's terminal goes down

> **INC-4493** · All merchants
>
> A few times a week every terminal shows errors for a few seconds at once. Ops
> say the BFF container restarts each time. It often lines up with a
> surcharge-service deploy, but not always. Last lines before one of the
> restarts:
>
> ```
> TypeError: fetch failed
>     at node:internal/deps/undici/undici:15456:13
>     at process.processTicksAndRejections (node:internal/process/task_queues:103:5)
>     at async fetchQuote (/app/dist/services/surchargeServiceClient.js:7:22)
>     at async quoteSurcharge (/app/dist/controllers/surcharge.controller.js:15:19) {
>   [cause]: Error: getaddrinfo ENOTFOUND surcharge-service
> ```

Find out why one failed call takes down every terminal, and make sure no single
request or dependency can do that again, on any route. Decide what the terminal
should do when the surcharge service is slow or down (rule 4 in
`docs/surcharging.md`) and make the BFF behave that way. Tell us how we'd find
out about this in production before a merchant does.

## Part D

### Task 6: Code review

A teammate has opened PR #231. The description is in
[`review/PR-231.md`](./review/PR-231.md) and the diff is in
[`review/PR-231.diff`](./review/PR-231.diff). You can `git apply` it on a branch
if you want to run it. Review it the way you would at work: write the comments
you'd leave (file, line, comment) and an overall verdict in `REVIEW.md`. Don't
fix the PR.

### Task 7: What would you fix first?

List the 3 to 5 issues anywhere in this system you'd prioritize if it were going
to production next month, beyond what you've already fixed. For each one, say
what's wrong, why it matters and how you'd fix it. Put them in priority order.

## Handing it back

- `NOTES.md`: what you changed and why, your Task 1 findings, your Task 7 list,
  and what you'd do with more time
- `REVIEW.md` for Task 6
- Commits with messages that explain the change. Send us a link to your fork, or
  a zip of the repo that includes the `.git` directory.
