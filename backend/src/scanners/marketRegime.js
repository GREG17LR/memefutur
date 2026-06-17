export function priceChangePct(bars, lookback = 4) {
  if (!Array.isArray(bars) || bars.length <= lookback) return null;
  const last = bars[bars.length - 1];
  const ref = bars[bars.length - 1 - lookback];
  if (!last?.close || !ref?.close) return null;
  return ((last.close - ref.close) / ref.close) * 100;
}

export function classifyMarketRegime({ priceChangePct, volumeRatio, fundingAnalysis, openInterestAnalysis }) {
  let regime = 'NEUTRAL';
  const warnings = [];
  const tags = [];

  if (priceChangePct !== null && priceChangePct > 8 && volumeRatio >= 2) {
    regime = 'BREAKOUT_ATTEMPT';
    tags.push('price-volume expansion');
  }

  if (priceChangePct !== null && priceChangePct > 25) {
    regime = 'PUMP_ADVANCED';
    warnings.push('pump deja avance, risque achat tardif');
  }

  if (priceChangePct !== null && priceChangePct < -12 && volumeRatio >= 2) {
    regime = 'DISTRIBUTION_OR_FLUSH';
    warnings.push('vente forte avec volume');
  }

  if (openInterestAnalysis?.regime === 'PRICE_UP_OI_UP') {
    tags.push('new leverage entering long side');
  }

  if (openInterestAnalysis?.regime === 'PRICE_DOWN_OI_UP') {
    tags.push('new leverage entering short side');
  }

  if (fundingAnalysis?.pressure === 'OVERHEATED_LONGS') {
    warnings.push('funding trop positif');
  }

  return {
    regime,
    warnings,
    tags
  };
}
