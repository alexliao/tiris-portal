# Create an API Key on Coinbase for Tiris

For Tiris binding only: minimal permissions—spot read + trading. No withdrawals, transfers, futures, or margin.

## Prerequisites
- Coinbase account with identity verification and 2FA enabled.  
- Use desktop web to avoid mobile layout differences.

## Create and Configure the API Key
1) After logging in, click your avatar → `Settings` → `API` → `Coinbase Developer Platform` → `API Keys`. Direct link: https://portal.cdp.coinbase.com/projects/api-keys
2) Click `Create API Key`.  
3) Select an `API key nickname` (e.g., "Tiris Only").  
4) Click `API restrictions`
5) `IP allowlist`: leave blank for now if you don’t want to limit the IP; you can add it later.  
6) `Portfolio`: select `Primary` if you have no idea what it means.
7) Permissions:  
   - Check `View`.  
   - Check `Trade`.  
   - Do **NOT** check `Transfer`, or anything else.  
8) Click `Create` and finish 2FA. You’ll get `API Key ID`, `Secret`.  
9) Copy and store them securely; the secret typically shows only once.

## Use in Tiris
1) Open Tiris → exchange binding wizard → choose `Coinbase`.  
2) Paste `API Key`, `API Secret` into the fields.  
3) Confirm permissions are only read + spot trading, then finish binding.

## Quick Checks
- Binding failed? Ensure Trade is enabled and Transfer are not. Ensure you clicked `Coinbase Developer Platform` or the direct link to access the API creation function.  
- If using an IP whitelist, add the Tiris IP (e.g., 172.105.23.166).  
- When rotating keys, delete the old one on Coinbase, create a new one, and update Tiris.
