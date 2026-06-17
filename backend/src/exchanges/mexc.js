import axios from 'axios';

const FUTURES_BASE_URL = 'https://contract.mexc.com';
const SPOT_BASE_URL = 'https://api.mexc.com';

const DEFAULT_HEADERS = {
  'Content-Type': 'application/json',
  'User-Agent': 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36',
  Accept: 'application/json,text/plain,*/*',
  Referer: 'https://www.mexc.com/',
  Origin: 'https://www.mexc.com'
};

const futuresHttp = axios.create({
  baseURL: FUTURES_BASE_URL,
  timeout: 10000,
  headers: DEFAULT_HEADERS
});

const spotHttp = axios.create({
  baseURL: SPOT_BASE_URL,
  timeout: 10000,
  headers: DEFAULT_HEADERS
});

function normalizeKline(raw) {
  if (!raw || typeof raw !== 'object') return [];
  const data = raw.data || raw;
  if (Array.isArray(data)) return data.map((bar) => ({
    time: Number(bar.time || bar[0]),
    open: Number(bar.open || bar[1]),
    high: Number(bar.high || bar[2]),
    low: Number(bar.low || bar[3]),
    close: Number(bar.close || bar[4]),
    volume: Number(bar.vol || bar.volume || bar[5])
  })).filter((bar) => Number.isFinite(bar.close));

  const times = data.time || [];
  const opens = data.open || [];
  const highs = data.high || [];
  const lows = data.low || [];
  const closes = data.close || [];
  const vols = data.vol || data.volume || [];

  return times.map((time, index) => ({
    time,
    open: Number(opens[index]),
    high: Number(highs[index]),
    low: Number(lows[index]),
    close: Number(closes[index]),
    volume: Number(vols[index])
  })).filter((bar) => Number.isFinite(bar.close));
}

function normalizeDepth(raw) {
  const data = raw?.data || raw || {};
  const bids = data.bids || data.Bids || data.bid || [];
  const asks = data.asks || data.Asks || data.ask || [];
  return { bids, asks, raw: data };
}

export class MexcClient {
  async getFuturesDepth(symbol, limit = 50) {
    const response = await futuresHttp.get(`/api/v1/contract/depth/${symbol}`, {
      params: { limit }
    });
    return normalizeDepth(response.data);
  }

  async getFuturesKlines(symbol, interval = 'Min60', limit = 120) {
    const end = Math.floor(Date.now() / 1000);
    const start = end - limit * 60 * 60;
    const response = await futuresHttp.get(`/api/v1/contract/kline/${symbol}`, {
      params: { interval, start, end }
    });
    return normalizeKline(response.data);
  }

  async getFuturesFundingRate(symbol) {
    const response = await futuresHttp.get(`/api/v1/contract/funding_rate/${symbol}`);
    return response.data?.data || response.data;
  }

  async getFuturesTicker(symbol) {
    const response = await futuresHttp.get('/api/v1/contract/ticker', {
      params: { symbol }
    });
    const data = response.data?.data || response.data;
    if (Array.isArray(data)) {
      return data.find((item) => item.symbol === symbol) || data[0];
    }
    return data;
  }

  async getSpotTicker(symbol) {
    const spotSymbol = symbol.replace('_', '');
    const response = await spotHttp.get('/api/v3/ticker/24hr', {
      params: { symbol: spotSymbol }
    });
    return response.data;
  }

  async getOpenInterest(symbol) {
    try {
      const ticker = await this.getFuturesTicker(symbol);
      if (!ticker) return null;
      return {
        symbol,
        holdVol: ticker.holdVol,
        openInterest: ticker.holdVol,
        notionalUsd: Number(ticker.holdVol || 0) * Number(ticker.fairPrice || ticker.lastPrice || ticker.indexPrice || 0),
        raw: ticker
      };
    } catch (_error) {
      return null;
    }
  }
}

export const mexcClient = new MexcClient();
