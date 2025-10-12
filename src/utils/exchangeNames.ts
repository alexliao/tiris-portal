/**
 * Map exchange type IDs to display names
 */
export const EXCHANGE_TYPE_NAMES: Record<string, string> = {
  // Real exchanges
  okx: 'OKX',
  binance: 'Binance',
  bybit: 'Bybit',
  kraken: 'Kraken',
  gate: 'Gate.io',
  coinbase: 'Coinbase',
  kucoin: 'KuCoin',
  bitfinex: 'Bitfinex',
  huobi: 'Huobi',

  // Demo exchanges
  okx_demo: 'OKX Demo',
  binance_demo: 'Binance Demo',
  bybit_demo: 'Bybit Demo',
};

/**
 * Get display name for an exchange type ID
 * @param exchangeType - The exchange type ID (e.g., 'okx_demo', 'binance')
 * @returns The display name (e.g., 'OKX Demo', 'Binance') or capitalized original if not found
 */
export function getExchangeTypeName(exchangeType: string): string {
  if (!exchangeType) return 'Unknown';

  // Check if we have a mapping for this exchange type
  if (exchangeType in EXCHANGE_TYPE_NAMES) {
    return EXCHANGE_TYPE_NAMES[exchangeType];
  }

  // If not found, capitalize the first letter as fallback
  return exchangeType.charAt(0).toUpperCase() + exchangeType.slice(1);
}
