import dotenv from 'dotenv';

dotenv.config();

const toBool = (value, fallback = false) => {
  if (value === undefined || value === null || value === '') return fallback;
  return String(value).toLowerCase() === 'true';
};

const toNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toList = (value) => String(value || '')
  .split(',')
  .map((item) => item.trim())
  .filter(Boolean);

export const env = {
  port: toNumber(process.env.PORT, 3000),
  nodeEnv: process.env.NODE_ENV || 'development',
  appApiKey: process.env.APP_API_KEY || 'change-me-local-api-key',
  webhookSecret: process.env.WEBHOOK_SECRET || 'change-me-tradingview-secret',
  dryRun: toBool(process.env.DRY_RUN, true),
  botEnabled: toBool(process.env.BOT_ENABLED, false),
  maxLeverage: toNumber(process.env.MAX_LEVERAGE, 2),
  maxOpenPositions: toNumber(process.env.MAX_OPEN_POSITIONS, 3),
  maxDailyLossPct: toNumber(process.env.MAX_DAILY_LOSS_PCT, 3),
  maxRiskPerTradePct: toNumber(process.env.MAX_RISK_PER_TRADE_PCT, 1),
  maxNotionalUsdt: toNumber(process.env.MAX_NOTIONAL_USDT, 50),
  allowedSymbols: toList(process.env.ALLOWED_SYMBOLS || 'EVAA_USDT,BTC_USDT,ETH_USDT'),
  defaultTimeframe: process.env.DEFAULT_TIMEFRAME || 'Min60',
  mexcAccessKey: process.env.MEXC_ACCESS_KEY || '',
  mexcSecretKey: process.env.MEXC_SECRET_KEY || '',
  telegramBotToken: process.env.TELEGRAM_BOT_TOKEN || '',
  telegramChatId: process.env.TELEGRAM_CHAT_ID || ''
};
