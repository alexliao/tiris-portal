import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth';
import { getTradings, getTradingById, type Trading, type Bot, type BotCreateRequest, type ExchangeBinding, ApiError, getBotByTradingId, startBot, stopBot, createBot, getExchangeBindings, getExchangeBindingById, getBot, getSubAccountsByTrading, deleteTrading, updateTrading } from '../utils/api';
import { AlertCircle, Play, Square, Loader2, Copy, Check, Trash2, Zap } from 'lucide-react';
import Navigation from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import TradingPerformanceWidget from '../components/trading/TradingPerformanceWidget';
import BacktestProgressBar from '../components/trading/BacktestProgressBar';
import ConfirmDialog from '../components/common/ConfirmDialog';
import EditableText from '../components/common/EditableText';
import UnderConstruction from '../components/common/UnderConstruction';
import { THEME_COLORS, getTradingTheme, getTradingIcon } from '../config/theme';
import { createDateTimeFormatter } from '../utils/locale';
import { getTradingDayCount } from '../utils/tradingDates';

const ICON_SERVICE_BASE_URL = import.meta.env.VITE_ICON_SERVICE_BASE_URL;

const extractExchangeCredentials = (binding?: ExchangeBinding | null) => {
  if (!binding) {
    return { apiKey: null as string | null, apiSecret: null as string | null };
  }

  const info = binding.info || {};
  const credentialsSections = [info.credentials, info.credential, info.security, info.api_credentials, info.apiCredentials].filter((section): section is Record<string, unknown> => section !== undefined && section !== null && typeof section === 'object');

  const candidateKeys: Array<string | null | undefined> = [
    binding.api_key,
    info.api_key as string | undefined,
    info.apiKey as string | undefined,
    info.api_key_plain as string | undefined,
    info.apiKeyPlain as string | undefined,
    info.api_key_preview as string | undefined,
    info.apiKeyPreview as string | undefined,
    ...credentialsSections.map(section => (section.api_key ?? section.apiKey ?? section.key ?? null) as string | null),
  ];

  const candidateSecrets: Array<string | null | undefined> = [
    binding.api_secret,
    info.api_secret as string | undefined,
    info.apiSecret as string | undefined,
    info.api_secret_plain as string | undefined,
    info.apiSecretPlain as string | undefined,
    info.api_secret_preview as string | undefined,
    info.apiSecretPreview as string | undefined,
    ...credentialsSections.map(section => (section.api_secret ?? section.apiSecret ?? section.secret ?? null) as string | null),
  ];

  const apiKey = candidateKeys.find((value): value is string => typeof value === 'string' && value.trim().length > 0) ?? null;
  const apiSecret = candidateSecrets.find((value): value is string => typeof value === 'string' && value.trim().length > 0) ?? null;

  return { apiKey, apiSecret };
};

export const TradingDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [trading, setTrading] = useState<Trading | null>(null);
  const [bot, setBot] = useState<Bot | null>(null);
  const [exchangeBinding, setExchangeBinding] = useState<ExchangeBinding | null>(null);
  const [loading, setLoading] = useState(true);
  const [botLoading, setBotLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusCheckInterval, setStatusCheckInterval] = useState<NodeJS.Timeout | null>(null);
  const isCheckingStatus = useRef(false);
  const monitoringBotId = useRef<string | null>(null);
  const [copiedId, setCopiedId] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean;
    isDeleting: boolean;
  }>({
    isOpen: false,
    isDeleting: false,
  });

  // Under construction modal state
  const [showUnderConstruction, setShowUnderConstruction] = useState(false);

  // Data refresh state management
  const [dataRefreshInterval, setDataRefreshInterval] = useState<NodeJS.Timeout | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const isRefreshing2 = useRef(false);

  const dateTimeFormatter = useMemo(
    () =>
      createDateTimeFormatter(i18n.language, {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      }),
    [i18n.language]
  );

  const dateFormatter = useMemo(
    () =>
      createDateTimeFormatter(i18n.language, {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }),
    [i18n.language]
  );

  const formatDateTime = useCallback(
    (value: unknown): string | null => {
      if (!value) return null;

      const date =
        value instanceof Date
          ? value
          : typeof value === 'string' || typeof value === 'number'
          ? new Date(value)
          : null;

      if (!date || Number.isNaN(date.getTime())) return null;

      return dateTimeFormatter.format(date);
    },
    [dateTimeFormatter]
  );

  const formatDate = useCallback(
    (value: unknown): string | null => {
      if (!value) return null;

      const date =
        value instanceof Date
          ? value
          : typeof value === 'string' || typeof value === 'number'
          ? new Date(value)
          : null;

      if (!date || Number.isNaN(date.getTime())) return null;

      return dateFormatter.format(date);
    },
    [dateFormatter]
  );

  const createdAtDisplay = formatDateTime(trading?.created_at);
  const backtestStartDisplay = trading?.type === 'backtest' ? formatDate(trading?.info?.start_date) : null;
  const backtestEndDisplay = trading?.type === 'backtest' ? formatDate(trading?.info?.end_date) : null;
  const hasBacktestRange = Boolean(backtestStartDisplay || backtestEndDisplay);
  const backtestRangeLabel = hasBacktestRange
    ? `${backtestStartDisplay ?? '—'} - ${backtestEndDisplay ?? '—'}`
    : null;
  const tradingDayCount = useMemo(() => getTradingDayCount(trading), [trading]);
  const tradingDayCountLabel = tradingDayCount !== null ? t('trading.detail.dayCount', { count: tradingDayCount }) : null;

  // Convert timeframe string to seconds
  const timeframeToSeconds = (timeframe: string): number => {
    const match = timeframe.match(/^(\d+)([smhd]|w)$/);
    if (!match) return 300; // Default 5 minutes if invalid format

    const value = parseInt(match[1]);
    const unit = match[2];

    switch (unit) {
      case 's': return value;
      case 'm': return value * 60;
      case 'h': return value * 3600;
      case 'd': return value * 86400;
      case 'w': return value * 604800;
      default: return 300;
    }
  };

  // Calculate refresh interval based on timeframe (timeframe/10, min 1s, max 60s)
  const calculateRefreshInterval = (timeframe?: string): number => {
    if (!timeframe) return 30000; // Default 30 seconds if no timeframe

    const timeframeSeconds = timeframeToSeconds(timeframe);
    const intervalSeconds = Math.floor(timeframeSeconds / 10);

    // Clamp between 1 and 60 seconds
    const clampedSeconds = Math.max(3, Math.min(60, intervalSeconds));

    return clampedSeconds * 1000; // Convert to milliseconds
  };

  // Extract trading data fetching logic into reusable function
  const fetchTradingData = async (isInitialLoad = false) => {
    if (!id) {
      setError(t('trading.detail.tradingIdRequired'));
      return;
    }

    try {
      // Only clear error and show loading on initial load, not during refresh
      if (isInitialLoad) {
        setError(null);
      }

      let foundTrading: Trading | null = null;

      // Try to fetch trading by ID first (works for both authenticated and unauthenticated)
      if (isAuthenticated) {
        // For authenticated users, first try to find in their own tradings
        const tradings = await getTradings();
        foundTrading = tradings.find(t => t.id === id) || null;

        // If not found in user's own tradings, try to fetch by ID (might be another user's public trading)
        if (!foundTrading) {
          foundTrading = await getTradingById(id, true);
        }
      } else {
        // For unauthenticated users, try to fetch the specific trading without auth
        // This will only work for tradings that the backend exposes as shareable
        foundTrading = await getTradingById(id, false);
      }

      if (!foundTrading) {
        setError(t('trading.detail.notFound'));
        return;
      }

      setTrading(foundTrading);

      // Try to fetch associated bot (requires authentication)
      if (isAuthenticated) {
        try {
          const associatedBot = await getBotByTradingId(foundTrading.id);
          setBot(associatedBot);
        } catch (botErr) {
          console.warn('Failed to fetch bot for trading:', botErr);
          // Don't show error for bot fetch failure, just log it
        }
      } else {
        setBot(null);
      }

      // Set exchange binding from embedded object if available, otherwise fetch it
      try {
        let resolvedBinding: ExchangeBinding | null = null;

        if (foundTrading.exchange_binding) {
          const embeddedBinding = foundTrading.exchange_binding;
          resolvedBinding = {
            id: embeddedBinding.id,
            name: embeddedBinding.name,
            exchange_type: embeddedBinding.exchange_type,
            status: embeddedBinding.status || 'active',
            created_at: embeddedBinding.created_at || foundTrading.created_at,
            info: embeddedBinding.info ? { ...embeddedBinding.info } : {}
          };
          const embeddedCredentials = extractExchangeCredentials(resolvedBinding);
          resolvedBinding.api_key = embeddedCredentials.apiKey;
          resolvedBinding.api_secret = embeddedCredentials.apiSecret;

          // For real trading, if credentials are missing from embedded binding, fetch the full binding details
          if (isAuthenticated && foundTrading.type === 'real' && (!resolvedBinding.api_key || !resolvedBinding.api_secret)) {
            const bindingIdToUse = foundTrading.exchange_binding_id || embeddedBinding.id;
            try {
              const fullBinding = await getExchangeBindingById(bindingIdToUse);
              if (fullBinding) {
                const privateBinding: ExchangeBinding = { ...fullBinding };
                const privateCredentials = extractExchangeCredentials(privateBinding);
                privateBinding.api_key = privateCredentials.apiKey;
                privateBinding.api_secret = privateCredentials.apiSecret;
                resolvedBinding = privateBinding;
              }
            } catch (err) {
              console.warn('Failed to fetch full exchange binding for real trading:', err);
              // Keep the embedded binding (which may be missing credentials) as fallback
            }
          }
        }

        // Note: For unauthenticated access we're limited to the shareable trading types checked earlier
        if (!resolvedBinding && isAuthenticated) {
          const isPaperOrBacktest = foundTrading.type === 'paper' || foundTrading.type === 'backtest';

          if (!isPaperOrBacktest) {
            // For real trading only, fetch the specific exchange binding by ID to ensure we get the full details including credentials
            try {
              const binding = await getExchangeBindingById(foundTrading.exchange_binding_id);
              if (binding) {
                const privateBinding: ExchangeBinding = { ...binding };
                const privateCredentials = extractExchangeCredentials(privateBinding);
                privateBinding.api_key = privateCredentials.apiKey;
                privateBinding.api_secret = privateCredentials.apiSecret;
                resolvedBinding = privateBinding;
              }
            } catch (err) {
              console.warn('Failed to fetch specific exchange binding by ID:', err);
              // Fall back to fetching all bindings if the specific request fails
              const privateExchangeBindings = await getExchangeBindings();
              const binding = privateExchangeBindings.find(eb => eb.id === foundTrading.exchange_binding_id);
              if (binding) {
                const privateBinding: ExchangeBinding = { ...binding };
                const privateCredentials = extractExchangeCredentials(privateBinding);
                privateBinding.api_key = privateCredentials.apiKey;
                privateBinding.api_secret = privateCredentials.apiSecret;
                resolvedBinding = privateBinding;
              }
            }
          }
          // For paper/backtest trading: no exchange binding fetch needed
          // Exchange name will be displayed from trading.info.exchange_name
        }

        if (resolvedBinding) {
          setExchangeBinding(resolvedBinding);
        }
      } catch (exchangeErr) {
        console.warn('Failed to fetch exchange binding details:', exchangeErr);
        // Don't show error for exchange binding fetch failure
      }
    } catch (err) {
      console.error('Failed to fetch trading:', err);
      // Only show errors during initial load, silently handle refresh errors
      if (isInitialLoad) {
        if (err instanceof ApiError) {
          setError(t('trading.detail.failedToLoadWithError', { error: err.message }));
        } else {
          setError(`${t('trading.detail.failedToLoad')}. ${t('common.tryAgain')}`);
        }
      }
    }
  };

  // Initial data loading effect
  useEffect(() => {
    const initialLoad = async () => {
      if (!id) {
        setError(t('trading.detail.tradingIdRequired'));
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        await fetchTradingData(true); // Mark as initial load
      } finally {
        setLoading(false);
      }
    };

    // Load data for both authenticated and unauthenticated users
    if (!authLoading && id) {
      initialLoad();
    }
  }, [id, isAuthenticated, authLoading]);

  // Bot status checking function
  const checkBotStatus = async (botId: string) => {
    // Prevent concurrent status checks
    if (isCheckingStatus.current) {
      console.log('Status check already in progress, skipping');
      return;
    }

    isCheckingStatus.current = true;
    try {
      console.log('Checking bot status for bot ID:', botId);
      const updatedBot = await getBot(botId);
      console.log('Bot status check result:', {
        enabled: updatedBot.record.enabled,
        alive: updatedBot.alive,
        lastHeartbeat: updatedBot.record.last_heartbeat_at
      });

      // Check if we need to update bot state - do this check OUTSIDE of setBot
      let shouldUpdate = false;
      let changeDetails = {};

      setBot(currentBot => {
        if (!currentBot) {
          shouldUpdate = true;
          changeDetails = { reason: 'No current bot, setting new bot state' };
          return updatedBot;
        }

        // Check if status actually changed (more precise comparison)
        const enabledChanged = currentBot.record.enabled !== updatedBot.record.enabled;
        const aliveChanged = currentBot.alive !== updatedBot.alive;
        const heartbeatChanged = currentBot.record.last_heartbeat_at !== updatedBot.record.last_heartbeat_at;

        const statusChanged = enabledChanged || aliveChanged || heartbeatChanged;

        if (statusChanged) {
          shouldUpdate = true;
          changeDetails = {
            enabledChanged: enabledChanged ? `${currentBot.record.enabled} → ${updatedBot.record.enabled}` : 'no change',
            aliveChanged: aliveChanged ? `${currentBot.alive} → ${updatedBot.alive}` : 'no change',
            heartbeatChanged: heartbeatChanged ? 'updated' : 'no change'
          };
          return updatedBot;
        }

        // No changes, keep current state
        return currentBot;
      });

      // Log OUTSIDE of the state setter to avoid React Strict Mode duplicates
      if (shouldUpdate) {
        console.log('Bot status changed, updating state:', changeDetails);
      }
    } catch (err) {
      console.error('Failed to check bot status:', err);

      // Handle 404 (bot not found) - treat as bot being offline/deleted
      if ((err instanceof ApiError && err.status === 404) ||
        (err instanceof Error && err.message.includes('404'))) {
        console.log('Bot not found (404), marking as offline and stopping monitoring');
        setBot(currentBot => {
          if (currentBot) {
            // Update the bot to show as offline
            return {
              ...currentBot,
              alive: false,
              record: {
                ...currentBot.record,
                enabled: false
              }
            };
          }
          return null; // If no current bot, set to null
        });

        // Stop monitoring since bot doesn't exist
        stopBotStatusMonitoring();
      }

      // Don't throw error for status checks, just log it
    } finally {
      isCheckingStatus.current = false;
    }
  };

  // Unified data refresh function
  const refreshAllData = useCallback(async () => {
    // Prevent concurrent refreshes
    if (isRefreshing2.current) {
      console.log('Data refresh already in progress, skipping');
      return;
    }

    isRefreshing2.current = true;
    setIsRefreshing(true);

    try {
      console.log('Refreshing all page data');

      // Refresh trading data (without showing loading state)
      await fetchTradingData(false);

      // Refresh bot status if bot exists
      if (bot?.record.id) {
        await checkBotStatus(bot.record.id);
      }

      console.log('Data refresh completed successfully');
    } catch (err) {
      console.error('Failed to refresh data:', err);
      // Don't throw error, just log it to avoid breaking the interval
    } finally {
      isRefreshing2.current = false;
      setIsRefreshing(false);
    }
  }, [bot?.record.id]);


  // Start automatic data refresh when page loads and user is authenticated
  useEffect(() => {
    console.log('Data refresh interval effect triggered', {
      isAuthenticated,
      authLoading,
      botTimeframe: bot?.record.spec.params?.timeframe,
      shouldStart: isAuthenticated && !authLoading
    });

    if (isAuthenticated && !authLoading) {
      // Get timeframe from bot params or trading info
      const timeframe = (bot?.record.spec.params?.timeframe || trading?.info?.timeframe) as string | undefined;
      const refreshIntervalMs = calculateRefreshInterval(timeframe);

      console.log(`Starting automatic data refresh with ${refreshIntervalMs}ms interval (timeframe: ${timeframe || 'default'})`);

      // Create interval for data refresh based on timeframe
      // Note: We capture the current refreshAllData function instead of including it in dependencies
      // This prevents the interval from being recreated every time refreshAllData changes
      const currentRefreshAllData = refreshAllData;
      const interval = setInterval(() => {
        console.log(`${refreshIntervalMs}ms interval triggered, calling refreshAllData`);
        currentRefreshAllData();
      }, refreshIntervalMs);

      setDataRefreshInterval(interval);

      // Cleanup on unmount or when dependencies change
      return () => {
        console.log('Cleaning up data refresh interval');
        clearInterval(interval);
      };
    }
  }, [isAuthenticated, authLoading, bot?.record.spec.params?.timeframe, trading?.info?.timeframe]);

  // Start periodic status checking when bot is running
  const startBotStatusMonitoring = (botId: string) => {
    // Prevent starting monitoring for the same bot multiple times
    if (monitoringBotId.current === botId && statusCheckInterval) {
      console.log('Status monitoring already active for bot ID:', botId);
      return;
    }

    console.log('Starting bot status monitoring for bot ID:', botId);

    // Clear any existing interval first
    if (statusCheckInterval) {
      console.log('Clearing existing status monitoring interval');
      clearInterval(statusCheckInterval);
    }

    // Set the monitoring bot ID
    monitoringBotId.current = botId;

    // Create new interval
    console.log('Creating new status monitoring interval');
    const interval = setInterval(() => {
      checkBotStatus(botId);
    }, 5000);

    setStatusCheckInterval(interval);
  };

  // Stop periodic status checking
  const stopBotStatusMonitoring = () => {
    console.log('Stopping bot status monitoring');
    if (statusCheckInterval) {
      clearInterval(statusCheckInterval);
      setStatusCheckInterval(null);
    }
    monitoringBotId.current = null;
  };

  // Start monitoring if bot is already running when component loads
  useEffect(() => {
    if (bot && bot.record.enabled && bot.alive && !statusCheckInterval) {
      console.log('Bot is running on page load, starting status monitoring');
      startBotStatusMonitoring(bot.record.id);
    } else if (bot && (!bot.record.enabled || !bot.alive) && statusCheckInterval) {
      console.log('Bot is not running, stopping status monitoring');
      stopBotStatusMonitoring();
    }
  }, [bot?.record.id, bot?.record.enabled, bot?.alive]); // More specific dependencies

  // Cleanup intervals on component unmount
  useEffect(() => {
    return () => {
      if (statusCheckInterval) {
        clearInterval(statusCheckInterval);
      }
      if (dataRefreshInterval) {
        clearInterval(dataRefreshInterval);
      }
    };
  }, [statusCheckInterval, dataRefreshInterval]);

  const handleStartBot = async () => {
    if (!trading) return;

    console.log('Starting bot for trading:', trading.id);
    setBotLoading(true);
    try {
      const isRealTrading = trading.type === 'real';
      let finalApiKey: string | null = null;
      let finalApiSecret: string | null = null;

      if (isRealTrading) {
        const { apiKey, apiSecret } = extractExchangeCredentials(exchangeBinding);
        finalApiKey = apiKey;
        finalApiSecret = apiSecret;

        if (!finalApiKey || !finalApiSecret) {
          // If credentials are missing, try to fetch the full binding
          if (exchangeBinding?.id) {
            try {
              const fullBinding = await getExchangeBindingById(exchangeBinding.id);
              const { apiKey: fullApiKey, apiSecret: fullApiSecret } = extractExchangeCredentials(fullBinding);
              if (fullApiKey && fullApiSecret) {
                finalApiKey = fullApiKey;
                finalApiSecret = fullApiSecret;
              }
            } catch (err) {
              console.error('Failed to fetch full exchange binding for bot creation:', err);
            }
          }

          if (!finalApiKey || !finalApiSecret) {
            throw new Error(t('trading.tradingDetail.apiCredentialsRequired'));
          }
        }
      }
      let currentBot = bot;

      // If no bot exists, create one first
      if (!currentBot) {
        console.log('No existing bot found, creating new bot for trading ID:', trading.id);

        // Fetch sub-accounts for this trading to include in bot creation
        console.log('Fetching sub-accounts for trading:', trading.id);
        const subAccounts = await getSubAccountsByTrading(trading.id);
        console.log('Retrieved sub-accounts:', subAccounts);

        // Identify stock and balance sub-accounts
        const stockSubAccount = subAccounts.find(account =>
          account.info?.account_type === 'stock' ||
          ['ETH', 'BTC'].includes(account.symbol)
        );
        const balanceSubAccount = subAccounts.find(account =>
          account.info?.account_type === 'balance' ||
          ['USDT', 'USDC'].includes(account.symbol)
        );

        console.log('Stock sub-account:', stockSubAccount);
        console.log('Balance sub-account:', balanceSubAccount);

        if (!stockSubAccount || !balanceSubAccount) {
          throw new Error(`Missing required sub-accounts. Found ${subAccounts.length} sub-accounts, but need both stock and balance accounts.`);
        }

        // Build exchange spec based on trading type
        let exchangeTypeForSpec: string | undefined;
        let exchangeBindingSpec: BotCreateRequest['spec']['exchange_binding'];

        if (trading.type === 'paper' || trading.type === 'backtest') {
          // For paper/backtest trading, use exchange info from trading.info field
          const exchangeTypeFromInfo = (trading.info as { exchange_type?: string; exchange_name?: string; exchange_ccxt_id?: string })?.exchange_type;
          const exchangeCcxtIdFromInfo = (trading.info as { exchange_type?: string; exchange_name?: string; exchange_ccxt_id?: string })?.exchange_ccxt_id;

          if (!exchangeTypeFromInfo || !exchangeCcxtIdFromInfo) {
            throw new Error('Exchange information not available in trading details. Please refresh the page.');
          }

          exchangeTypeForSpec = exchangeTypeFromInfo;

          // Keep exchange name + ccxt id in params for downstream compatibility
          exchangeBindingSpec = undefined;
        } else {
          // For real trading, use the exchange binding that was already loaded
          if (!exchangeBinding) {
            throw new Error(t('trading.tradingDetail.exchangeBindingNotAvailable'));
          }

          console.log('Using exchange binding for bot creation:', exchangeBinding);

          const exchangeInfo = exchangeBinding.info ? { ...exchangeBinding.info } : undefined;
          exchangeBindingSpec = {
            id: exchangeBinding.id,
            name: exchangeBinding.name,
            exchange_type: exchangeBinding.exchange_type,
            ...(exchangeInfo ? { info: exchangeInfo } : {}),
          };

          // Use exchange type from exchange binding for real trading
          exchangeTypeForSpec = exchangeBinding.exchange_type;

          if (isRealTrading && exchangeBindingSpec) {
            exchangeBindingSpec.api_key = finalApiKey!;
            exchangeBindingSpec.api_secret = finalApiSecret!;
          }
        }

        // Create BotSpec using strategy from trading info
        // Generate symbol from stock and balance sub-accounts
        const symbol = `${stockSubAccount.symbol}/${balanceSubAccount.symbol}`;

        const spec: any = {
          trading: {
            id: trading.id,
            name: trading.name,
            type: trading.type,
            stock_sub_account: {
              id: stockSubAccount.id,
              symbol: stockSubAccount.symbol,
              balance: parseFloat(stockSubAccount.balance)
            },
            balance_sub_account: {
              id: balanceSubAccount.id,
              symbol: balanceSubAccount.symbol,
              balance: parseFloat(balanceSubAccount.balance)
            }
          },
          params: {
            timeframe: trading.info?.timeframe,
            // Use strategy_name from trading info if available, otherwise default
            strategy_name: trading.info?.strategy_name,
            symbol: symbol,
            // For real trading, pass INITIAL_TRADING_BALANCE
            ...(isRealTrading && {
              INITIAL_TRADING_BALANCE: trading.info?.initial_funds
            })
          },
          exchange_type: exchangeTypeForSpec,
          ...(exchangeBindingSpec && { exchange_binding: exchangeBindingSpec })
        };

        // For backtest trading, include start_date and end_date
        if (trading.info?.start_date && trading.info?.end_date) {
          spec.start_date = trading.info.start_date;
          spec.end_date = trading.info.end_date;
        }

        const createRequest: BotCreateRequest = { spec };

        console.log('Creating bot with request:', createRequest);
        currentBot = await createBot(createRequest);
        console.log('Bot created:', currentBot);
        setBot(currentBot);

        // Update trading info with strategy name for future display
        if (currentBot?.record.spec.params?.strategy_name) {
          setTrading(currentTrading => {
            if (currentTrading && currentBot?.record.spec.params?.strategy_name) {
              return {
                ...currentTrading,
                info: {
                  ...currentTrading.info,
                  strategy: currentBot.record.spec.params.strategy_name as string
                }
              };
            }
            return currentTrading;
          });
        }
      }

      // Now start the bot
      console.log('Starting bot with ID:', currentBot.record.id);
      const updatedBot = await startBot(currentBot.record.id);
      console.log('Bot started:', updatedBot);
      setBot(updatedBot);

      // Wait a moment for bot to initialize, then refresh bot data to get timeframe
      console.log('Waiting for bot to initialize and set timeframe...');
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Refresh bot data to get updated params including timeframe
      console.log('Refreshing bot data to get updated timeframe...');
      const refreshedBot = await getBot(updatedBot.record.id);
      console.log('Refreshed bot data:', refreshedBot);
      setBot(refreshedBot);

      // Also refresh trading data
      console.log('Refreshing trading data...');
      await fetchTradingData(false);

      // Start monitoring bot status if the bot is now running
      if (refreshedBot.record.enabled && refreshedBot.alive) {
        startBotStatusMonitoring(refreshedBot.record.id);
      }

      // Bot data/trading data already refreshed above; no need to hard refresh the page
      console.log('Bot started successfully, keeping page state intact.');
    } catch (err) {
      console.error('Failed to start bot:', err);
      // Could add a toast notification here
    } finally {
      setBotLoading(false);
    }
  };

  const handleStopBot = async () => {
    if (!bot) return;

    setBotLoading(true);
    try {
      const updatedBot = await stopBot(bot.record.id);
      setBot(updatedBot);

      // Stop monitoring when bot is stopped
      stopBotStatusMonitoring();
    } catch (err) {
      console.error('Failed to stop bot:', err);
      // Could add a toast notification here
    } finally {
      setBotLoading(false);
    }
  };

  const handleDeleteClick = () => {
    setDeleteConfirmation({
      isOpen: true,
      isDeleting: false,
    });
  };

  const handleDeleteCancel = () => {
    setDeleteConfirmation({
      isOpen: false,
      isDeleting: false,
    });
  };

  const handleDeleteConfirm = async () => {
    if (!trading) {
      return;
    }

    try {
      setDeleteConfirmation(prev => ({ ...prev, isDeleting: true }));
      await deleteTrading(trading.id, trading.type);

      // Close confirmation dialog
      setDeleteConfirmation({
        isOpen: false,
        isDeleting: false,
      });

      // Navigate back to the trading list page
      navigate(`/tradings/${trading.type}`);
    } catch (err) {
      console.error('Failed to delete trading:', err);
      let errorMessage = 'Unknown error';
      if (err instanceof ApiError) {
        errorMessage = err.message;
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }

      setDeleteConfirmation({
        isOpen: false,
        isDeleting: false,
      });
      setError(t('dashboard.deleteFailed', { error: errorMessage }));
    }
  };

  const getTypeIcon = (type: string) => {
    const IconComponent = getTradingIcon(type);
    return <IconComponent className="w-8 h-8" />;
  };

  const handleCopyTradingId = async () => {
    if (!trading?.id) return;
    try {
      await navigator.clipboard.writeText(trading.id);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 1200);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  };

  const handleTitleSave = async (nextName: string) => {
    if (!trading) {
      return nextName;
    }

    const updatedTrading = await updateTrading(trading.id, { name: nextName });
    setTrading(prev => (prev ? { ...prev, name: updatedTrading.name } : updatedTrading));
    return updatedTrading.name;
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="pt-20 flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-tiris-primary-600 mx-auto mb-4"></div>
            <p className="text-gray-600">{t('common.loading')}</p>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="pt-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex items-center justify-center h-96">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-tiris-primary-600 mx-auto mb-4"></div>
                <p className="text-gray-600">{t('dashboard.loadingTradings')}</p>
              </div>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="pt-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="text-center">
              <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-gray-900 mb-2">{t('common.error')}</h1>
              <p className="text-red-600 mb-4">{error}</p>
              <Link
                to="/dashboard"
                className="inline-flex items-center px-4 py-2 bg-tiris-primary-600 text-white rounded-md hover:bg-tiris-primary-700 transition-colors"
              >
                {t('dashboard.title')}
              </Link>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!loading && !trading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="pt-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="text-center">
              <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-gray-900 mb-2">{t('trading.detail.notFound')}</h1>
              <p className="text-gray-600 mb-4">{t('trading.detail.notFound')}</p>
              <Link
                to="/dashboard"
                className="inline-flex items-center px-4 py-2 bg-tiris-primary-600 text-white rounded-md hover:bg-tiris-primary-700 transition-colors"
              >
                {t('dashboard.title')}
              </Link>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  // Don't render the main content if we don't have a trading object
  if (!trading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="pt-20">
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-tiris-primary-600 mx-auto mb-4"></div>
              <p className="text-gray-600">{t('dashboard.loadingTradings')}</p>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  // Get theme colors for the trading type
  const themeType = getTradingTheme(trading.type);
  const themeColors = THEME_COLORS[themeType];

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="pt-20">
        {/* Header with Theme Gradient */}
        <div
          style={{
            background: `linear-gradient(135deg, ${themeColors.primary}, ${themeColors.hover})`
          }}
          className="shadow-sm text-white"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex items-start">
              <Link
                to={`/tradings/${trading.type}`}
                className="p-3 bg-white/20 rounded-lg backdrop-blur-sm hover:bg-white/30 transition-colors"
                title={t('trading.detail.backToList')}
              >
                {getTypeIcon(trading.type)}
              </Link>
              <div className="ml-4 flex-1">
                <div className="flex items-center gap-2">
                  <EditableText
                    value={trading.name}
                    onSave={handleTitleSave}
                    disabled={!isAuthenticated}
                    className="flex-1 min-w-0"
                    textClassName="truncate text-lg sm:text-2xl font-bold text-white"
                    inputClassName="text-lg sm:text-2xl font-bold text-white placeholder-white/60"
                    editButtonClassName="text-white/80 hover:text-white focus:outline-none hover:bg-white/20 rounded-md"
                    actionButtonClassName="bg-white/20 text-white hover:bg-white/30 focus:outline-none"
                    labels={{
                      edit: t('common.edit') || 'Edit',
                      save: t('common.save') || 'Save',
                      cancel: t('common.cancel') || 'Cancel',
                    }}
                    as="h1"
                  />
                  {isAuthenticated && (
                    <button
                      onClick={handleDeleteClick}
                      className="ml-auto shrink-0 p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-lg transition-colors"
                      title={t('common.delete')}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-white/80">
                  <div className="flex items-center gap-2">
                    <span>ID: {trading.id.substring(0, 4)}...</span>
                    <button
                      onClick={handleCopyTradingId}
                      className="p-1 rounded hover:bg-white/20 text-white/80 transition-colors hover:text-white"
                      title={t('trading.detail.copyId')}
                    >
                      {copiedId ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  {((trading.type === 'paper' || trading.type === 'backtest') && trading.info?.exchange_name) || exchangeBinding ? (
                    <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-white/20 text-white/80 gap-1.5">
                      {((trading.type === 'paper' || trading.type === 'backtest') ? (trading.info as { exchange_type?: string; exchange_ccxt_id?: string })?.exchange_type : exchangeBinding?.exchange_type) && (
                        <img
                          src={`${ICON_SERVICE_BASE_URL}/icons/${(trading.type === 'paper' || trading.type === 'backtest') ? (trading.info as { exchange_type?: string; exchange_ccxt_id?: string })?.exchange_type : exchangeBinding?.exchange_type}.png`}
                          alt={(trading.type === 'paper' || trading.type === 'backtest') ? (trading.info as { exchange_type?: string; exchange_ccxt_id?: string })?.exchange_type : exchangeBinding?.exchange_type}
                          className="w-4 h-4 rounded"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      )}
                      {(trading.type === 'paper' || trading.type === 'backtest') && trading.info?.exchange_name
                        ? String(trading.info.exchange_name)
                        : exchangeBinding?.name}
                    </span>
                  ) : null}
                  {tradingDayCountLabel && (
                    <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-white/20 text-white/80">
                      {tradingDayCountLabel}
                    </span>
                  )}
                  {(bot?.record.spec.params?.timeframe || trading.info?.timeframe) === '5m' && (
                    <span
                      className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-white/20 text-white/80 cursor-help"
                      title={t('trading.badges.minuteLevelTooltip')}
                    >
                      <Zap className="w-3.5 h-3.5" />
                    </span>
                  )}
                  {bot && (
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                      bot.alive ? 'bg-green-200 text-green-900' : 'bg-gray-200 text-gray-900'
                    }`}>
                      {bot.alive ? t('dashboard.botStatus.online') : t('dashboard.botStatus.offline')}
                    </span>
                  )}
                  </div>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Trading Info */}
          <div className="bg-white rounded-lg shadow-sm p-3 md:p-6 mb-8">
            <div className="flex flex-col">
              <div className={`grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-4 ${(trading.info?.initial_funds !== undefined || trading.info?.initial_balance !== undefined) ? 'lg:grid-cols-3' : 'lg:grid-cols-2'}`}>
                {(trading.info?.initial_funds !== undefined || trading.info?.initial_balance !== undefined) && (
                  <div>
                    <div className="flex mb-2">
                      <span className="text-xs md:text-sm font-medium text-gray-600">{t('trading.detail.initialFunds')}:&nbsp;</span>
                      <span className="text-sm font-semibold text-gray-900">
                        ${Math.floor(typeof trading.info.initial_funds === 'number' ? trading.info.initial_funds : Number(trading.info.initial_balance || 0)).toLocaleString()}
                      </span>
                    </div>
                    {trading.info?.baseline_price !== undefined && (
                      <div className="flex mb-2">
                        <span className="text-xs md:text-sm font-medium text-gray-600">{t('trading.detail.initialPrice')}:&nbsp;</span>
                        <span className="text-sm font-semibold text-gray-900">
                          ${Number(trading.info.baseline_price).toFixed(2)}
                        </span>
                      </div>
                    )}
                  </div>
                )}
                <div className="flex flex-col gap-1 w-full">
                  <div className="flex items-center gap-1">
                    <span className="text-xs md:text-sm font-medium text-gray-600">{t('dashboard.tableHeaders.created')}:&nbsp;</span>
                    <span className="text-sm font-semibold text-gray-900">{createdAtDisplay ?? '—'}</span>
                  </div>
                  {backtestRangeLabel && (
                    <div className="flex items-center gap-1">
                      <span className="text-xs md:text-sm font-medium text-gray-600">{t('trading.detail.dateRange')}:&nbsp;</span>
                      <span className="text-sm font-semibold text-gray-900">{backtestRangeLabel}</span>
                    </div>
                  )}
                  {/* Bot Controls - Mobile Only */}
                  {isAuthenticated && (
                    <div className="flex lg:hidden items-center gap-2">
                      {bot && bot.record.enabled && bot.alive ? (
                        <button
                          onClick={handleStopBot}
                          disabled={botLoading}
                          className="inline-flex items-center px-2 py-1 md:px-3 md:py-2 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 transition-colors whitespace-nowrap"
                        >
                          {botLoading ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <Square className="w-4 h-4 mr-2" />
                          )}
                          {t('trading.detail.stopBot')}
                        </button>
                      ) : (
                        <>
                          {isRefreshing && (
                            <div className="flex items-center">
                              <Loader2 className="w-4 h-4 animate-spin text-gray-600" />
                            </div>
                          )}
                          <button
                            onClick={() => handleStartBot()}
                            disabled={botLoading}
                            className="inline-flex items-center px-2 py-1 md:px-3 md:py-2 text-sm bg-tiris-primary-600 text-white rounded-md hover:bg-tiris-primary-700 disabled:opacity-50 transition-colors whitespace-nowrap"
                          >
                            {botLoading ? (
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                              <Play className="w-4 h-4 mr-2" />
                            )}
                            {t('trading.detail.startBot')}
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
                {/* Bot Controls for Desktop - Right Aligned */}
                {isAuthenticated && (
                  <div className="hidden lg:flex items-center justify-end gap-2">
                    {bot && bot.record.enabled && bot.alive ? (
                      <button
                        onClick={handleStopBot}
                        disabled={botLoading}
                        className="inline-flex items-center px-2 py-1 md:px-3 md:py-2 text-xs md:text-sm bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 transition-colors whitespace-nowrap"
                      >
                        {botLoading ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Square className="w-4 h-4 mr-2" />
                        )}
                        {t('trading.detail.stopBot')}
                      </button>
                    ) : (
                      <>
                        {isRefreshing && (
                          <div className="flex items-center">
                            <Loader2 className="w-4 h-4 animate-spin text-gray-600" />
                          </div>
                        )}
                        <button
                          onClick={() => handleStartBot()}
                          disabled={botLoading}
                          className="inline-flex items-center px-2 py-1 md:px-3 md:py-2 text-xs md:text-sm bg-tiris-primary-600 text-white rounded-md hover:bg-tiris-primary-700 disabled:opacity-50 transition-colors whitespace-nowrap"
                        >
                          {botLoading ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <Play className="w-4 h-4 mr-2" />
                          )}
                          {t('trading.detail.startBot')}
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Backtest Progress Bar */}
            {trading?.type === 'backtest' && bot?.record.status?.info && (
              <BacktestProgressBar
                progressPct={((bot.record.status.info as Record<string, Record<string, unknown>>)?.backtest as Record<string, unknown>)?.progress_pct as number | undefined}
                status={((bot.record.status.info as Record<string, Record<string, unknown>>)?.backtest as Record<string, unknown>)?.status as string | undefined}
                completed={((bot.record.status.info as Record<string, Record<string, unknown>>)?.backtest as Record<string, unknown>)?.completed as boolean | undefined}
                iterations={((bot.record.status.info as Record<string, Record<string, unknown>>)?.backtest as Record<string, unknown>)?.iterations as number | undefined}
                loopIterations={((bot.record.status.info as Record<string, Record<string, unknown>>)?.backtest as Record<string, unknown>)?.loop_iterations as number | undefined}
                lastCandleTs={((bot.record.status.info as Record<string, Record<string, unknown>>)?.backtest as Record<string, unknown>)?.last_candle_ts as number | undefined}
                pointerTs={((bot.record.status.info as Record<string, Record<string, unknown>>)?.backtest as Record<string, unknown>)?.pointer_ts as number | undefined}
                pointerIso={((bot.record.status.info as Record<string, Record<string, unknown>>)?.backtest as Record<string, unknown>)?.pointer_iso as string | undefined}
              />
            )}
          </div>

          {/* Performance Widget */}
          <TradingPerformanceWidget
            trading={trading}
            showHeader={false}
            showHighlights={false}
          />
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteConfirmation.isOpen}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        title={t('dashboard.deleteTradingTitle')}
        message={
          trading?.type === 'real'
            ? t('dashboard.deleteTradingMessageReal', {
                name: trading?.name || ''
              })
            : t('dashboard.deleteTradingMessage', {
                name: trading?.name || ''
              })
        }
        confirmText={t('common.delete')}
        cancelText={t('common.cancel')}
        isDestructive={true}
        isLoading={deleteConfirmation.isDeleting}
      />

      {/* Under Construction Modal */}
      {showUnderConstruction && (
        <div className="fixed inset-0 flex items-center justify-center z-50" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <UnderConstruction />
            <button
              onClick={() => setShowUnderConstruction(false)}
              className="mt-6 w-full px-4 py-2 bg-tiris-primary-600 text-white rounded-md hover:bg-tiris-primary-700 transition-colors"
            >
              {t('common.close') || 'Close'}
            </button>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
};

export default TradingDetailPage;
