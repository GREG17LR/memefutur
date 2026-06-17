function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function highestHighBeforeLast(bars, lookback) {
  if (!Array.isArray(bars) || bars.length < lookback + 2) return null;
  const slice = bars.slice(-(lookback + 1), -1);
  return Math.max(...slice.map((bar) => Number(bar.high || 0)));
}

function closeBreakout(bars, lookback) {
  const last = bars?.[bars.length - 1];
  const highest = highestHighBeforeLast(bars, lookback);
  if (!last || !highest || highest <= 0) return false;
  return Number(last.close) > highest;
}

function candleImpulse(bars) {
  const last = bars?.[bars.length - 1];
  if (!last) return false;
  const range = Number(last.high) - Number(last.low);
  if (range <= 0) return false;
  const body = Math.abs(Number(last.close) - Number(last.open));
  return Number(last.close) > Number(last.open) && body / range >= 0.55;
}

function oiChangePct(openInterestAnalysis) {
  const change = openInterestAnalysis?.changePct;
  return Number.isFinite(Number(change)) ? Number(change) : null;
}

export function calculateMemeExplosionScore({ bars, metrics, scoring }) {
  let longScore = 0;
  let shortScore = 0;
  const longReasons = [];
  const shortReasons = [];

  const volumeRatio = Number(metrics?.volumeRatio || 0);
  const imbalance = Number(metrics?.orderBook?.imbalance || 0);
  const spreadPct = Number(metrics?.orderBook?.spreadPct || 0);
  const fundingRate = Number(metrics?.fundingRate || 0);
  const priceChangePct = Number(metrics?.priceChangePct || 0);
  const rsi = Number(metrics?.rsi || 0);
  const oiPct = oiChangePct(metrics?.openInterestAnalysis);

  if (volumeRatio >= 5) {
    longScore += 35;
    shortScore += 20;
    longReasons.push(`volume extreme x${volumeRatio.toFixed(2)}`);
    shortReasons.push(`volume extreme x${volumeRatio.toFixed(2)}`);
  } else if (volumeRatio >= 3) {
    longScore += 25;
    shortScore += 12;
    longReasons.push(`volume explosif x${volumeRatio.toFixed(2)}`);
  } else if (volumeRatio >= 2) {
    longScore += 14;
    longReasons.push(`volume fort x${volumeRatio.toFixed(2)}`);
  }

  if (oiPct !== null) {
    if (oiPct >= 50) {
      longScore += priceChangePct >= 0 ? 35 : 5;
      shortScore += priceChangePct < 0 ? 35 : 5;
      (priceChangePct >= 0 ? longReasons : shortReasons).push(`OI explosion ${oiPct.toFixed(1)}%`);
    } else if (oiPct >= 20) {
      longScore += priceChangePct >= 0 ? 22 : 3;
      shortScore += priceChangePct < 0 ? 22 : 3;
      (priceChangePct >= 0 ? longReasons : shortReasons).push(`OI hausse ${oiPct.toFixed(1)}%`);
    } else if (oiPct >= 10) {
      longScore += priceChangePct >= 0 ? 12 : 2;
      shortScore += priceChangePct < 0 ? 12 : 2;
      (priceChangePct >= 0 ? longReasons : shortReasons).push(`OI progression ${oiPct.toFixed(1)}%`);
    }
  } else if (metrics?.openInterestAnalysis?.available) {
    longScore += 4;
    shortScore += 4;
    longReasons.push('OI disponible sans historique');
  }

  if (imbalance >= 3) {
    longScore += 20;
    longReasons.push(`bid wall dominant ${imbalance.toFixed(2)}`);
  } else if (imbalance >= 2) {
    longScore += 12;
    longReasons.push(`carnet acheteur ${imbalance.toFixed(2)}`);
  } else if (imbalance > 0 && imbalance <= 0.5) {
    shortScore += 20;
    shortReasons.push(`ask wall dominant ${imbalance.toFixed(2)}`);
  } else if (imbalance > 0 && imbalance <= 0.75) {
    shortScore += 12;
    shortReasons.push(`carnet vendeur ${imbalance.toFixed(2)}`);
  }

  if (closeBreakout(bars, 50)) {
    longScore += 25;
    longReasons.push('cassure plus haut 50 bougies');
  } else if (closeBreakout(bars, 20)) {
    longScore += 15;
    longReasons.push('cassure plus haut 20 bougies');
  }

  if (candleImpulse(bars)) {
    longScore += 10;
    longReasons.push('bougie impulsive');
  }

  if (fundingRate > 0 && fundingRate < 0.0007) {
    longScore += 5;
    longReasons.push('funding sain');
  }

  if (fundingRate > 0.0015) {
    longScore -= 12;
    shortScore += 8;
    longReasons.push('funding trop charge');
    shortReasons.push('longs potentiellement surcharges');
  }

  if (priceChangePct > 25) {
    longScore -= 15;
    shortScore += 6;
    longReasons.push('pump deja avance');
    shortReasons.push('risque de prise de benefices');
  }

  if (rsi >= 78) {
    longScore -= 8;
    shortScore += 8;
    shortReasons.push(`RSI tendu ${rsi.toFixed(1)}`);
  }

  if (spreadPct > 0.5) {
    longScore -= 10;
    shortScore -= 10;
    longReasons.push(`spread trop large ${spreadPct.toFixed(2)}%`);
  }

  longScore = clamp(Math.round(longScore));
  shortScore = clamp(Math.round(shortScore));
  const direction = longScore >= shortScore ? 'LONG' : 'SHORT';
  const score = Math.max(longScore, shortScore);

  let label = 'WAIT';
  if (score >= 85) label = 'EXPLOSION_PROBABLE';
  else if (score >= 70) label = 'SETUP_INTERESSANT';
  else if (score >= 55) label = 'SURVEILLANCE';

  return {
    label,
    direction,
    score,
    longScore,
    shortScore,
    confidence: score >= 85 ? 'HIGH' : score >= 70 ? 'MEDIUM' : 'LOW',
    reasons: direction === 'LONG' ? longReasons : shortReasons,
    allReasons: { long: longReasons, short: shortReasons },
    baseScore: scoring?.score || 0
  };
}
