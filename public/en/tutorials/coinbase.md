# Create an API Key on Coinbase for Tiris

For Tiris binding only: minimal permissions—spot read + trading. No withdrawals, transfers, futures, or margin.

## Prerequisites
- Coinbase account with identity verification and 2FA enabled.  
- Use desktop web to avoid mobile layout differences.

## Create and Configure the API Key
1) After logging in, click your avatar → “Settings” → “API”. Direct link: https://www.coinbase.com/settings/api
2) Click “Create API Key”.  
3) Select an API key nickname (e.g., “Tiris Only”).  
4) Portfolio: select “Primary” if you have no idea what it means.
5) Permissions (minimal):  
   - Check “View”.  
   - Check “Trade”.  
   - **Do not** check “Transfer”, or anything else.  
6) IP whitelist: leave blank for now if you don’t want to limit the IP; you can add it later.  
7) Click "Create & download" and finish 2FA. You’ll get `API Key`, `API Secret`.  
8) Copy and store them securely; the secret typically shows only once.

## Use in Tiris
1) Open Tiris → exchange binding wizard → choose Coinbase.  
2) Paste `API Key`, `API Secret` into the fields.  
3) Confirm permissions are only read + spot trading, then finish binding.

## Quick Checks
- Binding failed? Ensure “Trade” is enabled and withdrawals/futures are not.  
- If using an IP whitelist, add the Tiris IP (e.g., 172.105.23.166).  
- When rotating keys, delete the old one on Coinbase, create a new one, and update Tiris.
