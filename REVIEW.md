Overall
Typing is questionable.


## **ReportsController.cs**
Line 1:
The total for the gross is dramatically less than the card network totals so something isn't adding up. for Blue Ridge Outfitters 2026-10-20 we see a gross of 1609.57 but there's 40514.13 reported for mastercard alone. It also reports 8 payments when the actual total per the individual results is 10. I'm unfamiliar with C# so I can't isolate the exact issue but it should be here. Also, when no data to report on is found the UI defaults to Yen which is incorrect; it should probably use the per customer money. labelled This surfaces immediately in testing as there's no more recent data. this would almost certainly impact customer demos if test data isn't dated to the current date so that's probably a blocker. There's some ambiguity on what causes it as I'm seeing inconsistent behavior but I'll let you take a look.
## **reports.controller.ts**
Line 9: 
nit: unknown typing of the settlementCache object which makes typechecking ignore potential typing issues. Fix it with explicit typing. This appearing would imply that some sort of linting should probably be introduced if it doesn't exist or the current linting should cover this sort of thing. That can wait for a later diff though.
Another nit: digging into the ResponseCache object used here it never actually clears anything at expiration so theoretically it leaks memory. I’m not sure that impacts much at the current scale however.
## **App.tsx**
Line 43:
Swapping from one merchant to the other in the UI redirects back to the main page since it doesn't handle the route correctly. The new payment page has the same issue but now that we have multiple pages it's a more substantial issue. Some convenient change to the route handling to handle multiple pages is probably in order in the long term for this project as there will likely many more pages and functions as features are added.

Overall, fix the comment in App.tsx and ReportsController.cs and change the typing in reports.controller.ts as that should be easy before merging. 