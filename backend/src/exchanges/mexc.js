import axios from 'axios';

const FUTURES_BASE_URL = 'https://contract.mexc.com';
const SPOT_BASE_URL = 'https://api.mexc.com';

const futuresHttp = axios.create({
  baseURL: FUTURES_BASE_URL,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' }
});

const spotHttp = axios.create({
  baseURL: SPOT_BASE_URL,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' }
});

function normalizeKline(raw) {
  // MEXC futures kline responses may expose arrays by field: time/open/high/low/close/vol.
  if (!raw || typeof raw !== 'object') return [];
  const data = raw.data || raw;
  if (Array.isArray(data)) return data;

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

export class MexcClient {
  async getFuturesDepth(symbol, limit = 50) {
    const response = await futuresHttp.get(`/api/v1/contract/depth/${symbol}`, {
      params: { limit }
    });
    return response.data?.data || response.data;
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
    return Array.isArray(data) ? data[0] : data;
  }

  async getSpotTicker(symbol) {
    const spotSymbol = symbol.replace('_', '');
    const response = await spotHttp.get('/api/v3/ticker/24hr', {
      params: { symbol: spotSymbol }
    });
    return response.data;
  }

  async getOpenInterest(symbol) {
    // Placeholder defensive implementation. Public OI endpoints vary by venue/version.
    // The scanner accepts null and keeps the score conservative when OI is unavailable.
    try {
      const response = await futuresHttp.get(`/api/v1/contract/open_interest/${symbol}`);
      return response.data?.data || response.data;
    } catch (_error) {
      return null;
    }
  }
}

export const mexcClient = new MexcClient();
