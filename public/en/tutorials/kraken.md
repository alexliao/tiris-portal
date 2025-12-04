# Create an API Key on Kraken for Tiris Only

This guide is only for binding to Tiris: you only need asset read and spot order/place/cancel permissions. No withdrawal, transfer, margin/futures, or other abilities.

## Prerequisites
- Kraken account has passed KYC and 2FA (Google Authenticator, etc.) is enabled.
- Use the desktop web interface to avoid mobile layout differences.

## Create and Configure the API Key
1) Log in to Kraken Pro, click the avatar at the top right → select “Settings” → “Connections & API”. Direct link: https://pro.kraken.com/app/settings/api  
2) Click “Create API Key”.  
3) Set a name (e.g., “Tiris Only”).  
4) Keep permissions minimal, only check:  
   - `Funds Permissions` - `Query`  
   - `Orders and Trades` - all sub-options  
   - Leave all other permissions unchecked; especially **do not** check `Withdraw`.  
5) Keep other options “Off”.  
7) Click “Generate Key” and complete 2FA as prompted. The page will show the `API Key` and `API Secret` (only once).  
8) Copy both immediately and store them safely.

## Use in Tiris
1) Open Tiris → go to the exchange binding wizard → choose Kraken.  
2) Paste the `API Key` and `Private Key` into the corresponding fields.  
3) Confirm permissions are only “Read + Spot trading” and finish binding.

## Quick Checks
- Binding failed: check whether `Funds Permissions` - `Query` was selected or if withdrawal/transfer/other high permissions were mistakenly checked.  
- If you enabled an IP whitelist, add 172.105.23.166.  
- If you need to rotate keys, delete the old key on Kraken, create a new one, and update Tiris.
