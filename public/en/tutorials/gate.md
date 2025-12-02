# Create an API Key on Gate for Tiris

This flow is only for Tiris binding: keep permissions minimal—spot account read and trading only. No withdrawals, transfers, futures, or other abilities.

## Prep
- A Gate account with KYC completed and 2FA (Google/SMS) enabled.
- Use desktop web to avoid mobile layout differences.

## Create and Configure the API Key
1) After logging in, click your avatar (top right) → “API Management”. Direct link: https://www.gate.com/zh/myaccount/profile/api-key/manage  
2) Click “Create API Key”.  
3) Add a note for identification (e.g., “Tiris Only”).  
4) IP whitelist: leave unrestricted for now if you don’t want to limit the IP; you can add it later.  
5) Permissions (keep minimal):  
   - Check “Spot”.  
   - Check “Read/Write”.  
   - Do **not** check “Withdrawal”, “Transfer”, “Futures/Contracts”, “Margin borrowing”, or anything else.  
6) Click “Submit”, finish 2FA. Gate will show `API Key` and `API Secret` (secret appears once).  
7) Copy both immediately and store them safely; do not share publicly.

## Use in Tiris
1) Open Tiris → go to the exchange binding wizard → choose Gate.  
2) Paste the `API Key` and `Secret Key` you just created into the fields.  
3) Confirm permissions are only “Read + Spot trading”, then finish binding.

## Quick Checks
- If binding fails: ensure “Spot” is checked and withdrawals/futures are not.  
- If you enabled an IP whitelist, add the Tiris IP (172.105.23.166).  
- If you rotate keys, delete the old key on Gate, create a new one, then update Tiris.
