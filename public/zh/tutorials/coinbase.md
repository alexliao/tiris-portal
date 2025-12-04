# 在 Coinbase 创建仅供 Tiris 使用的 API Key

此教程用于 Tiris 绑定向导：仅允许读取与现货交易，不含提现/划转/期货等权限。

## 前置准备
- Coinbase 账户完成身份验证，并启用 2FA。
- 建议使用桌面网页端操作，避免移动端界面差异。

## 创建与配置 API Key
1) 登录后，点击右上角头像 → 进入`设置` → `API` → `Coinbase 开发者平台` → `API keys`。直达链接：https://portal.cdp.coinbase.com/projects/api-keys  
2) 点击`Create API Key`。  
3) `API key nickname`：填写便于识别的名称（如 `Tiris专用`）。  
4) 点击`API restrictions`
5) `IP allowlist`：可先不限制，后续补充。  
6) `Portfolio`：选`主要/默认`
7) 权限：  
   - 勾选`View`查看权限。  
   - 勾选`Trade`现货交易权限。  
   - **不要** 勾选`Transfer`等其他权限。  
8) 点击`Create`，完成 2FA。系统会生成 `API Key ID`、`Secret`。  
9) 立即复制并安全保存上述信息，密钥通常只显示一次。

## 在 Tiris 中使用
1) 打开 Tiris → 进入交易所绑定向导 → 选择 `Coinbase`。  
2) 将 `API Key`、`API Secret` 填入对应输入框。  
3) 确认权限仅为`读取 + 现货交易`，完成绑定。

## 常见检查
- 绑定失败：核对是否遗漏Trade权限，或误勾选了Transfer权限。确保点击了`Coinbase 开发者平台`或者直达链接后进入的API创建页面。
- 如开启 IP 白名单，确认 Tiris 访问 IP（如 172.105.23.166）已加入。  
- 更换密钥需先在 Coinbase 删除旧密钥，重新创建后再在 Tiris 更新。
