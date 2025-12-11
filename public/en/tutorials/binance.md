# Create a Tiris-Only API Key on Binance

This guide is specifically for Tiris integration: only read assets and spot trading permissions are required—no withdrawal, transfer, futures, or margin capabilities.

## Prerequisites
- Your Binance account has completed KYC verification and has two-factor authentication enabled (Google Authenticator/SMS).
- We recommend using the desktop web version to avoid mobile interface differences.

## Creating and Configuring the API Key
1) After logging in, click your profile icon in the top right corner, select `Account` → `API Management`. Direct link: https://www.binance.com/en/my/settings/api-management
2) Click `Create API`.
3) Select `System Generated` API Key type, then click `Next`.
4) Enter an API label (e.g., "Tiris Only").
5) Complete two-factor verification as prompted (email + Google Authenticator/SMS).
6) After creation, the system will generate an `API Key` and `Secret Key` (the secret key is only shown once).
7) Immediately copy and securely save both values.
8) Click `Edit restrictions` to configure permissions:
   - `IP access restrictions`: Select `Restrict access to trusted IPs only (Recommended)`, enter Tiris's IP address "172.105.23.166", then click `Confirm`
   - Check `Enable Reading` and `Enable Spot & Margin Trading`.
   - Do **NOT** check `Enable Withdrawals`
9) Click `Save` and complete two-factor verification to confirm.

## Using in Tiris
1) Open Tiris → Go to the exchange binding wizard → Select `Binance`.
2) Paste the `API Key` and `Secret Key` into the `API Key` and `API Secret` input fields.
3) Click `Verify Credentials`. After successful verification, click `Next` to complete the binding.

## Common Troubleshooting
- Binding failed: Verify that `Enable Spot & Margin Trading` is checked, and that `Enable Withdrawals` is NOT checked.
- If `IP access restrictions` is enabled, confirm that Tiris's IP address (172.105.23.166) has been added.
- If you need to replace the keys, delete the old key in Binance and create a new one, then update it in Tiris.
