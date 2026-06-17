import express from 'express';
import cors from 'cors';
import axios from 'axios';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

const BASE_CONTRACT = 'https://contract.mexc.com';
const BASE_SPOT = 'https://api.mexc.com';

const cfg = {
  port: Number(process.env.PORT || 3000),
  secret: process.env.WEBHOOK_SECRET || 'change-moi',
  dryRun: process.env.DRY_RUN !== 'false',
  key: process.env.MEXC_ACCESS_KEY || '',
  secretKey: process.env.MEXC_SECRET_KEY || '',
  maxLev: Number(process.env.MAX_LEVERAGE || 2),
  maxOrderUsdt: Number(process.env.MAX_ORDER_USDT || 50),
  allowed: (process.env.ALLOWED_SYMBOLS || '').split(',').map(s => s.trim()).filter(Boolean)
};

let botEnabled = false;
let emergencyStop = false;
let signals = [];

function hmacSha256(str, secret) {
  return crypto.createHmac('sha256', secret).update(str).digest('hex');
}

function mexcContractSign(bodyString, reqTime) {
  return hmacSha256(cfg.key + reqTime + bodyString, cfg.secretKey);
}

function mapFuturesSide(side) {
  const s = String(side).toLowerCase();
  if (s === 'long' || s === 'buy') return 1;       // open long
  if (s === 'close_short') return 2;               // close short
  if (s === 'short' || s === 'sell') return 3;     // open short
  if (s === 'close_long') return 4;                // close long
  throw new Error('side invalide');
}

function scoreSignal(p) {
  const pattern = Number(p.patternScore ?? 0);
  const volume = Number(p.volumeScore ?? 0);
  const book = Number(p.orderBookScore ?? 0);
  const oi = Number(p.openInterestScore ?? 0);
  const funding = Number(p.fundingScore ?? 0);
  const spread = Number(p.spreadScore ?? 0);
  const total = Math.max(0, Math.min(100, pattern * .25 + volume * .20 + book * .25 + oi * .15 + funding * .10 + spread * .05));
  return Math.round(total);
}

function validateTrade(p) {
  if (p.secret !== cfg.secret) throw new Error('secret webhook invalide');
  if (!botEnabled) throw new Error('bot désactivé');
  if (emergencyStop) throw new Error('arrêt urgence actif');
  if (!cfg.allowed.includes(p.symbol)) throw new Error(`symbole non autorisé: ${p.symbol}`);
  if (Number(p.leverage || 1) > cfg.maxLev) throw new Error('levier supérieur au maximum autorisé');
  if (Number(p.notionalUsdt || 0) > cfg.maxOrderUsdt) throw new Error('montant supérieur au maximum autorisé');
  const score = scoreSignal(p);
  if (score < Number(p.minScore || 75)) throw new Error(`score insuffisant: ${score}`);
  return score;
}

async function placeFuturesMarketOrder({ symbol, side, vol, leverage }) {
  const body = { symbol, price: 0, vol: Number(vol), leverage: Number(leverage || 1), side: mapFuturesSide(side), type: 5, openType: 1, externalOid: `mf-${Date.now()}` };
  const bodyString = JSON.stringify(body);
  const reqTime = Date.now().toString();
  const Signature = mexcContractSign(bodyString, reqTime);
  const { data } = await axios.post(`${BASE_CONTRACT}/api/v1/private/order/create`, body, { headers: { ApiKey: cfg.key, 'Request-Time': reqTime, Signature, 'Content-Type': 'application/json' }, timeout: 10000 });
  return data;
}

app.get('/health', (_req, res) => res.json({ ok: true, name: 'Meme Futur', dryRun: cfg.dryRun, botEnabled, emergencyStop }));
app.get('/api/status', (_req, res) => res.json({ botEnabled, emergencyStop, dryRun: cfg.dryRun, maxLev: cfg.maxLev, maxOrderUsdt: cfg.maxOrderUsdt, allowedSymbols: cfg.allowed }));
app.post('/api/bot/enable', (req, res) => { botEnabled = Boolean(req.body.enabled); res.json({ botEnabled }); });
app.post('/api/bot/emergency-stop', (req, res) => { emergencyStop = true; botEnabled = false; res.json({ emergencyStop, botEnabled }); });
app.post('/api/bot/reset-stop', (_req, res) => { emergencyStop = false; res.json({ emergencyStop }); });
app.get('/api/signals', (_req, res) => res.json(signals.slice(-100).reverse()));

app.post('/webhook/tradingview', async (req, res) => {
  const p = req.body || {};
  try {
    const score = validateTrade(p);
    const prepared = { symbol: p.symbol, side: p.side, vol: Number(p.vol || 1), leverage: Number(p.leverage || 1), market: p.market || 'futures', score, at: new Date().toISOString() };
    signals.push({ ...prepared, status: cfg.dryRun ? 'DRY_RUN' : 'SENT' });
    if (cfg.dryRun) return res.json({ success: true, mode: 'DRY_RUN', order: prepared });
    if (prepared.market !== 'futures') throw new Error('V1: exécution LIVE uniquement futures. Spot à valider avant activation.');
    const result = await placeFuturesMarketOrder(prepared);
    return res.json({ success: true, mode: 'LIVE', order: prepared, result });
  } catch (e) {
    signals.push({ symbol: p.symbol, side: p.side, status: 'REJECTED', reason: e.message, at: new Date().toISOString() });
    return res.status(400).json({ success: false, error: e.message });
  }
});

app.listen(cfg.port, () => console.log(`Meme Futur backend on :${cfg.port} dryRun=${cfg.dryRun}`));
