
## Track Choice
I've chosen the Scala track for this take home assignment.

## Part A
INC-4471 is caused by SurchargeCalculator using the wrong parameter for rounding; it used RoundingMode.HALF_EVEN instead of RoundingMode.HALF_UP matching the spec in SURCHARGE.md. 
As for the Audit bug In NewPaymentPage.tsx the code ran a function called previewSurcharge and it ran it regardless of whether the card was a credit card or not. To fix this I expanded out the handling on the page to check whether the card was a credit card or not on that page to solve that.

INC-4478 is caused by a double precision issue in the C# code where a double was multiplied by 100 and then truncated but this handled rounding via integer precision instead of rounding half up as done elsewhere. This is therefore not included in the code as it's outside the scope of the Scala track I'm aiming for.

## Part B
Task 2: To handle this, I would run the load tester and then probably use Java profiling tools to find the source of the issue as we're on top of Java here and they're pretty powerful.  I'd give claude a round to fix it first though as it's pretty good at fixing performance issues these days.

Task 3 (Chosen): Surcharge rules was chosen for this step as the preexisting tasks overlap the work on getteing everything up to standard so a lot of it has already been done. I added proper handling to yen and updated QuoteService.scala to use handle the precision of the total values which were summed with doubles, similar to the C# problem above. 


## Part C
Task 4:
I suspect I've encountered the cause of this issue during testing of other issues; It looks like the caching behavior in place doesn't take account for the current merchant at all when defining the cache key as the first time a page is loaded. This means if one merchant loaded the page it would load their data and if another merchant loaded the terminal in that period they would see data from the other merchant pulled from the cache. the solution would be to add the merchant id to the cache as a separate index to cache on so whenever a merchant loads the page they will load the cache specific to them. Before replying to the merchant I'd want to look at the logs and see what other vendors accessed the terminal page within the cache refresh window as their data potentially would have been leaked.

Task 5 (Chosen):
The reason why bff failed for this was because there was no error handling for async calls. Because this was happening in a Node environment anyone causing such a failure would kill the service. Errors need to be taken a lot more seriously in Node than local javascript because of this factor and you need handling. The way to discover this beforehand in production would be to add some test code throwing exceptions manually in the code in various places to test that you have full coverage and you've got full error handling in place.

## PART D Task 7:
 
1. Cache issue (P0)
The issue in Task 4 lead to Customer data being visible to others. It also immediately breaks the UI if more than one person is using the tool at once. this particular bug would be exposed basically immediately as the UI is basically not functional with it and it exposes customer information to boot. It places slightly above the login flow task below because as the UI not being able to handle two people accessing the tool at the same time is a really big issue but both are absolutely required for MVP.

2. Customer Permissions and Login Flow (P0)
Right now from the terminal view you can view and edit any customer's data. This is not acceptable for a production system so we'll need to add a login flow and restrict access when acting outside of proper permissions on the backend so that merchants can only access their own data.

3. Duplicate Charges (P1)
The C# Track mentions a duplicate charges bug. It is quite substantial and must be dealt with. Yelp in particular is famous for an incident where people experience longer delays than usual and were charged for every time they clicked pay, espescially since when loading is slow it's quite tempting to click the button over and over. With a loading blip people could be charged dozens of times and we don't want that on our UI.

4. Performance issue (P1)
This is referring to the performance issue in Task 3. Performance issues are exactly what you run into as you're scaling so smoothing those out when going to production is important. You can always add more boxes in the short term but if it's already revealed to be an issue before going to production it's likely going to become much worse in the future.

5. Switch to a proper menu bar (P2)
The current setup is fine, but as more features are added they are going to take up more header space and a bunch of buttons will look weird. Swapping in proper menu bar will solve this. This is prioritized over the dropdown selection redirect issue mentioned in REVIEW.md as in practice it's really dubious why users would want to switch between merchants at all in production as they will probably only be looking at their own data, so that issue is basically in practice just an extra convenience for developer use.

