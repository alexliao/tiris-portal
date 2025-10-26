# Some Business logic running on tiris-portal

## Create a paper trading
- First, create an new trading of type paper under the authenticated user with a unique name to avoid a clash.
  - In the creation process, the portal gets the exchange information from tiris-bot API `/exchange/paper` endpoint for users to select.
  - The creation process will not look up the backend for exchange bindings because the exchange bindings is all for real trading.
  - The chosen exchange type, along with other exchange information, will be stored in the trading info field for later reference.
- Second, create two sub accounts, one for stock(hardcoded as ETH for now) and one for balance(hardcoded as USDT for now), under the trading created.
- Then create a trading log of depositing the initial funds for the sub-account of balance (10,000 for now).

## Create a real trading
- First, create an new trading of type real under the authenticated user with a unique name to avoid a clash.
  - The portal attempts to fetch the exchange information from tiris-backend API `/exchange-bindings` endpoint. Once the exchange information (such as API key and secret) is needed, it can be get by the exchange-binding id from the backend. 
- Second, create two sub accounts, one for stock(hardcoded as ETH for now) and one for balance that user selected from the trading creation form, under the trading created.
- The initial funds of a real trading is from the exchange account determined by the API key of the exchange binding used for the real trading. If a user created multiple real tradings with the same exchange binding, the total amount allocated to these tradings cannot exceed the amount in the exchange account. The allocation includes both initial funds and any trading profits/losses that remain in the sub-accounts.
- **Implementation**: The `fetchExchangeBalanceForBinding` function automatically calculates the available balance by:
  1. Fetching the current exchange account balance
  2. Finding all existing real tradings that use the same exchange binding
  3. For each trading, fetching its sub-accounts and summing up the current balance of quote currency (USDT/USDC) sub-accounts
  4. Subtracting the total allocated funds from the exchange balance

  This ensures that trading profits/losses remain allocated to their respective tradings and cannot be used as initial funds for new tradings. The form enforces this constraint by limiting the input and slider maximum to the available balance. 

## Start the bot for a trading
- For usability, only need start/stop function for a trading.
- Start action will create the bot first if the bot is not existing.
- For backtest and paper trading, create the bot with the public type of exchange bindings.
