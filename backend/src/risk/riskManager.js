import { env } from '../config/env.js';
import { botState } from '../state/botState.js';

export function validateOrderRequest(order) {
  const errors = [];

  if (!env.allowedSymbols.includes(order.symbol)) {
    errors.push(`symbol not allowed: ${order.symbol}`);
  }

  const leverage = Number(order.leverage || 1);
  if (!Number.isFinite(leverage) || leverage < 1) {
    errors.push('invalid leverage');
  }
  if (leverage > env.maxLeverage) {
    errors.push(`leverage too high: ${leverage} > ${env.maxLeverage}`);
  }

  const notionalUsdt = Number(order.notionalUsdt || 0);
  if (!Number.isFinite(notionalUsdt) || notionalUsdt <= 0) {
    errors.push('invalid notionalUsdt');
  }
  if (notionalUsdt > env.maxNotionalUsdt) {
    errors.push(`notional too high: ${notionalUsdt} > ${env.maxNotionalUsdt}`);
  }

  if (botState.positions.length >= env.maxOpenPositions) {
    errors.push('max open positions reached');
  }

  if (Math.abs(botState.dailyPnlPct) >= env.maxDailyLossPct) {
    errors.push('daily loss limit reached');
  }

  if (botState.emergencyStopped) {
    errors.push('emergency stop is active');
  }

  if (!botState.enabled) {
    errors.push('bot is disabled');
  }

  return {
    accepted: errors.length === 0,
    errors
  };
}

export function buildPaperTradeFromSignal(signal) {
  const side = signal.scoring.direction;
  const entry = Number(signal.price || 0);
  const stopLoss = side === 'LONG' ? entry * 0.92 : entry * 1.08;
  const takeProfit1 = side === 'LONG' ? entry * 1.15 : entry * 0.85;
  const takeProfit2 = side === 'LONG' ? entry * 1.30 : entry * 0.70;

  return {
    symbol: signal.symbol,
    side,
    entry,
    stopLoss,
    takeProfit1,
    takeProfit2,
    leverage: Math.min(env.maxLeverage, 2),
    notionalUsdt: Math.min(env.maxNotionalUsdt, 25),
    status: 'PAPER_PENDING',
    createdAt: new Date().toISOString()
  };
}
