import { env } from '../config/env.js';
import { mexcClient } from '../exchanges/mexc.js';
import { orderBookMetrics, rangePct as computeRangePct, rsi as computeRsi, volumeRatio as computeVolumeRatio } from './indicators.js';
import { scoreMarket } from './scoring.js';

function extractFundingRate(raw) {
  if (!raw) return null;
  const value = raw.fundingRate ?? raw.funding_rate ?? raw.rate ?? null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export class MarketScanner {
  constructor(client = mexcClient) {
    this.client = client;
  }

  async scanSymbol(symbol, timeframe = env.defaultTimeframe) {
    const [bars, depth, funding, openInterest, ticker] = await Promise.allSettled([
      this.client.getFuturesKlines(symbol, timeframe, 120),
      this.client.getFuturesDepth(symbol, 50),
      this.client.getFuturesFundingRate(symbol),
      this.client.getOpenInterest(symbol),
      this.client.getFuturesTicker(symbol)
    ]);

    const safeBars = bars.status === 'fulfilled' ? bars.value : [];
    const safeDepth = depth.status === 'fulfilled' ? depth.value : null;
    const safeFunding = funding.status === 'fulfilled' ? funding.value : null;
    const safeOpenInterest = openInterest.status === 'fulfilled' ? openInterest.value : null;
    const safeTicker = ticker.status === 'fulfilled' ? ticker.value : null;

    const metrics = {
      rangePct: computeRangePct(safeBars, 12),
      rsi: computeRsi(safeBars, 14),
      volumeRatio: computeVolumeRatio(safeBars, 20),
      orderBook: orderBookMetrics(safeDepth),
      fundingRate: extractFundingRate(safeFunding),
      openInterest: safeOpenInterest,
      ticker: safeTicker
    };

    const scoring = scoreMarket({
      bars: safeBars,
      rangePct: metrics.rangePct,
      rsi: metrics.rsi,
      volumeRatio: metrics.volumeRatio,
      orderBook: metrics.orderBook,
      fundingRate: metrics.fundingRate,
      openInterest: metrics.openInterest
    });

    return {
      symbol,
      timeframe,
      scannedAt: new Date().toISOString(),
      price: safeBars.length ? safeBars[safeBars.length - 1].close : Number(safeTicker?.lastPrice || safeTicker?.last || 0),
      metrics,
      scoring,
      errors: [
        bars.status === 'rejected' ? `bars: ${bars.reason.message}` : null,
        depth.status === 'rejected' ? `depth: ${depth.reason.message}` : null,
        funding.status === 'rejected' ? `funding: ${funding.reason.message}` : null,
        openInterest.status === 'rejected' ? `oi: ${openInterest.reason.message}` : null,
        ticker.status === 'rejected' ? `ticker: ${ticker.reason.message}` : null
      ].filter(Boolean)
    };
  }

  async scanUniverse(symbols = env.allowedSymbols, timeframe = env.defaultTimeframe) {
    const results = await Promise.all(symbols.map((symbol) => this.scanSymbol(symbol, timeframe)));
    return results.sort((a, b) => b.scoring.score - a.scoring.score);
  }
}

export const marketScanner = new MarketScanner();
