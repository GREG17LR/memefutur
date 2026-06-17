import express from 'express';
import { env } from '../config/env.js';
import { marketScanner } from '../scanners/marketScanner.js';
import { botState, pushSignal } from '../state/botState.js';
import { buildPaperTradeFromSignal } from '../risk/riskManager.js';

export const apiRouter = express.Router();

function requireApiKey(req, res, next) {
  const key = req.headers['x-api-key'];
  if (!key || key !== env.appApiKey) {
    return res.status(401).json({ success: false, error: 'unauthorized' });
  }
  return next();
}

apiRouter.get('/status', (_req, res) => {
  res.json({
    success: true,
    status: {
      enabled: botState.enabled,
      emergencyStopped: botState.emergencyStopped,
      dryRun: env.dryRun,
      allowedSymbols: env.allowedSymbols,
      maxLeverage: env.maxLeverage,
      maxOpenPositions: env.maxOpenPositions,
      maxDailyLossPct: env.maxDailyLossPct,
      positions: botState.positions.length,
      signals: botState.signals.length
    }
  });
});

apiRouter.post('/bot/start', requireApiKey, (_req, res) => {
  botState.enabled = true;
  botState.emergencyStopped = false;
  botState.startedAt = new Date().toISOString();
  botState.stoppedAt = null;
  res.json({ success: true, status: botState });
});

apiRouter.post('/bot/stop', requireApiKey, (_req, res) => {
  botState.enabled = false;
  botState.stoppedAt = new Date().toISOString();
  res.json({ success: true, status: botState });
});

apiRouter.post('/emergency-stop', requireApiKey, (_req, res) => {
  botState.enabled = false;
  botState.emergencyStopped = true;
  botState.stoppedAt = new Date().toISOString();
  res.json({ success: true, status: botState });
});

apiRouter.get('/signals', (_req, res) => {
  res.json({ success: true, data: botState.signals });
});

apiRouter.get('/paper-trades', (_req, res) => {
  res.json({ success: true, data: botState.paperTrades });
});

apiRouter.get('/scan', async (req, res) => {
  const symbols = req.query.symbols
    ? String(req.query.symbols).split(',').map((s) => s.trim()).filter(Boolean)
    : env.allowedSymbols;
  const timeframe = req.query.timeframe || env.defaultTimeframe;

  const results = await marketScanner.scanUniverse(symbols, timeframe);
  const saved = results
    .filter((result) => result.scoring.score >= 65)
    .map((result) => pushSignal(result));

  if (env.dryRun) {
    saved
      .filter((signal) => signal.scoring.score >= 75)
      .forEach((signal) => {
        botState.paperTrades.unshift(buildPaperTradeFromSignal(signal));
      });
    botState.paperTrades = botState.paperTrades.slice(0, 200);
  }

  res.json({ success: true, data: results, savedSignals: saved.length });
});

apiRouter.post('/webhook/tradingview', async (req, res) => {
  const payload = req.body || {};
  if (payload.secret !== env.webhookSecret) {
    return res.status(401).json({ success: false, error: 'invalid webhook secret' });
  }

  const symbol = payload.symbol;
  if (!env.allowedSymbols.includes(symbol)) {
    return res.status(400).json({ success: false, error: `symbol not allowed: ${symbol}` });
  }

  const signal = pushSignal({
    source: 'TRADINGVIEW',
    symbol,
    timeframe: payload.timeframe || payload.interval || 'unknown',
    price: Number(payload.price || 0),
    scoring: {
      direction: String(payload.side || payload.direction || 'LONG').toUpperCase(),
      score: Number(payload.score || 70),
      confidence: Number(payload.score || 70) >= 80 ? 'HIGH' : 'MEDIUM',
      reasons: ['external tradingview signal']
    },
    raw: payload
  });

  if (env.dryRun) {
    botState.paperTrades.unshift(buildPaperTradeFromSignal(signal));
    botState.paperTrades = botState.paperTrades.slice(0, 200);
  }

  res.json({ success: true, dryRun: env.dryRun, signal });
});
