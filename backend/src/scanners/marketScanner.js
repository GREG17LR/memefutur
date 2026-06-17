import { env } from '../config/env.js';
import { mexcClient } from '../exchanges/mexc.js';
import { orderBookMetrics, rangePct as computeRangePct, rsi as computeRsi, volumeRatio as computeVolumeRatio } from './indicators.js';
import { analyzeFunding } from './fundingScanner.js';
import { analyzeOpenInterest } from './openInterestScanner.js';
import { classifyMarketRegime, priceChangePct as computePriceChangePct } from './marketRegime.js';
import { scoreMarket } from './scoring.js';
import { calculateMemeExplosionScore } from './memeExplosionScore.js';

function extractFundingRate(raw) {
  if (!raw) return null;
  const value = raw.fundingRate ?? raw.funding_rate ?? raw.rate ?? null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export class MarketScanner {
  constructor(client = mexcClient) {
    this.client = client;
    this.openInterestHistory = new Map();
  }

  rememberOpenInterest(symbol, value) {
    const currentHistory = this.openInterestHistory.get(symbol) || [];
    currentHistory.push({ timestamp: Date.now(), value });
    this.openInterestHistory.set(symbol, currentHistory.slice(-20));
  }

  getPreviousOpenInterest(symbol) {
    const history = this.openInterestHistory.get(symbol) || [];
    return history.length >= 1 ? history[history.length - 1].value : null;
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

    const priceChange = computePriceChangePct(safeBars, 4);
    const fundingAnalysis = analyzeFunding(safeFunding);
    const openInterestAnalysis = analyzeOpenInterest({
      current: safeOpenInterest,
      previous: this.getPreviousOpenInterest(symbol),
      priceChangePct: priceChange
    });

    if (safeOpenInterest) {
      this.rememberOpenInterest(symbol, safeOpenInterest);
    }

    const metrics = {
      rangePct: computeRangePct(safeBars, 12),
      rsi: computeRsi(safeBars, 14),
      volumeRatio: computeVolumeRatio(safeBars, 20),
      priceChangePct: priceChange,
      orderBook: orderBookMetrics(safeDepth),
      fundingRate: extractFundingRate(safeFunding),
      fundingAnalysis,
      openInterest: safeOpenInterest,
      openInterestAnalysis,
      ticker: safeTicker
    };

    const marketRegime = classifyMarketRegime({
      priceChangePct: metrics.priceChangePct,
      volumeRatio: metrics.volumeRatio,
      fundingAnalysis,
      openInterestAnalysis
    });

    metrics.marketRegime = marketRegime;

    const scoring = scoreMarket({
      bars: safeBars,
      rangePct: metrics.rangePct,
      rsi: metrics.rsi,
      volumeRatio: metrics.volumeRatio,
      orderBook: metrics.orderBook,
      fundingRate: metrics.fundingRate,
      fundingAnalysis,
      openInterest: metrics.openInterest,
      openInterestAnalysis,
      marketRegime
    });

    const memeExplosion = calculateMemeExplosionScore({
      bars: safeBars,
      metrics,
      scoring
    });

    return {
      symbol,
      timeframe,
      scannedAt: new Date().toISOString(),
      price: safeBars.length ? safeBars[safeBars.length - 1].close : Number(safeTicker?.lastPrice || safeTicker?.last || 0),
      metrics,
      scoring,
      memeExplosion,
      decision: buildDecision(scoring, memeExplosion),
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
    return results.sort((a, b) => {
      const memeDiff = (b.memeExplosion?.score || 0) - (a.memeExplosion?.score || 0);
      return memeDiff !== 0 ? memeDiff : b.scoring.score - a.scoring.score;
    });
  }
}

function buildDecision(scoring, memeExplosion) {
  if (memeExplosion.score >= 85) {
    return {
      action: 'WATCH_FOR_MANUAL_ENTRY',
      priority: 'HIGH',
      text: `Meme Explosion probable en ${memeExplosion.direction}. Validation manuelle indispensable.`
    };
  }

  if (memeExplosion.score >= 70) {
    return {
      action: 'WAIT_CONFIRMATION',
      priority: 'MEDIUM',
      text: `Setup memecoin interessant en ${memeExplosion.direction}, confirmation necessaire.`
    };
  }

  if (scoring.score >= 80) {
    return {
      action: 'WATCH_FOR_MANUAL_ENTRY',
      priority: 'MEDIUM',
      text: `Score marche eleve en ${scoring.direction}, mais pas encore explosion memecoin.`
    };
  }

  return {
    action: 'NO_TRADE',
    priority: 'LOW',
    text: 'Aucune condition forte. Attendre.'
  };
}

export const marketScanner = new MarketScanner();
