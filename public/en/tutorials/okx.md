# Create an API Key on OKX for Tiris Only

This guide is only for Tiris binding: only read assets and spot order placement/cancellation permissions are needed; withdrawals, transfers, futures/margin, etc. are not included.

## Prerequisites
- OKX account has completed KYC and enabled phone/email + 2FA verification.
- Use the desktop web version to avoid mobile UI differences.

## Create and Configure API Key
1) After logging in, click the avatar in the upper-right corner → select `API`. Direct link: https://okx.com/account/my-api  
2) Click `Create API Key`.  
3) Fill in `API key name` (e.g., "Tiris only").  
4) `Account`: if unsure, select `Main account`.  
5) `IP address allowlist`: you can leave it blank for now and add as needed later.  
6) `Permissions`:  
   - Select `Read` and `Trade` permissions.  
   - Do **NOT** select `Withdraw`.  
7) Set a `Passphrase` and keep it safe.  
8) After confirming the info, click `Submit all` and complete SMS/email/Google verification as prompted. The system will generate `API Key`, `Secret Key`, and the `Passphrase` you just set.  
9) Immediately copy and securely store the above three items; keys are usually shown only once.

## Use in Tiris
1) Open Tiris → go to the exchange binding guide → select `OKX`.  
2) Paste `API Key`, `Secret Key`, and `Passphrase` into the corresponding input fields.  
3) Confirm permissions are only `Read + Trade` and finish binding.

## Common Checks
- Binding failed: verify that only Read + Trade permissions are selected and Withdraw is not checked.  
- If IP whitelist is enabled, confirm Tiris access IP (172.105.23.166) is added.  
- If you need to replace keys, delete the old key on OKX, create a new one, and update it in Tiris.
