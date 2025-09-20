# Some Business logic running on tiris-portal

## Create a simulation trading
- First, create an new trading of type simulation under the authenticated user with a unique name to avoid a clash.
- Second, create two sub accounts, one for stock(hardcoded as ETH for now) and one for balance(hardcoded as USDT for now), under the trading created.
- Then create a trading log of depositing the initial funds for the sub-account of balance (10,000 for now).
