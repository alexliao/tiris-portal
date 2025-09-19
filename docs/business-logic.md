# Some Business logic running on tiris-portal

## Delete a trading
- For backtest and simulation types of trading, delete it permanently. But need to delete from the dependent tables first. The tables of records to be deleted in order is positions, trading_logs, transactions, sub_accounts, and finally tradings.
- For real trading, don't delete records from dependent tables. Just mark the trading as deleted.

## Create a simulation trading
- First, create an new trading of type simulation under the authenticated user with a unique name to avoid a clash.
- Second, create two sub accounts, one for stock(hardcoded as ETH for now) and one for balance(hardcoded as USDT for now), under the trading created.
- Then create a trading log of depositing the initial funds for the sub-account of balance (10,000 for now).
- Finally, save the two sub-account IDs for later usage in the info field of the trading.
