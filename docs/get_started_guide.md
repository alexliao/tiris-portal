## Get Started Guide

This guide explains the flow a new user should follow from the first visit to running a live strategy. It doubles as the spec for the in-app guide page that appears after clicking the "Get Started" button on the home page.

### Page Goals
- Present a clear, linear checklist with visible completion state.
- Teach what to do at each stage before moving on.
- Persist progress so users can return and continue.

### User Checklist
1) Review performance metrics and charts to understand profitability and risk.
2) Create an account and sign in.
3) Run a backtest to see how the strategy behaves in different market regimes.
4) Start a paper trade to experience real-time behavior without capital at risk.
5) Connect an exchange account once confident in the strategy.
6) Launch a live trade.

### Action Buttons
- Each checklist item includes a dedicated button that deep-links to the correct feature entry point (e.g., metrics view, signup, backtest creation, paper trade creation, exchange linking, live trade launch).
- Buttons should be primary/filled.
- Buttons should be hidden unless they are on the first uncompleted checklist which means there is always only one button visible.

### Persistence Rules
- The first item (completed before sign-in) is stored in cookies until the user signs in; migrate it into `info` after authentication.
- No.2 is marked as completed if the user has signed in.
- No.3 is marked as completed if the user has at least one backtest trading.
- No.4 is marked as completed if the user has at least one paper trading.
- No.5 is marked as completed if the user has at least one exchange binding.
- No.6 is marked as completed if the user has at least one real trading.
