function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

export function scoreMarket({
  bars,
  rangePct,
  rsi,
  volumeRatio,
  orderBook,
  fundingRate,
  fundingAnalysis,
  openInterest,
  openInterestAnalysis,
  marketRegime
}) {
  const last = bars?.[bars.length - 1];
  const previous = bars?.[bars.length - 2];
  const bullishCandle = last && previous ? last.close > last.open && last.close > previous.high : false;
  const bearishRejection = last ? last.close < last.open && ((last.high - last.close) > (last.close - last.low)) : false;

  let longScore = 0;
  let shortScore = 0;
  const reasons = { long: [], short: [] };

  if (rangePct !== null && rangePct <= 18) {
    longScore += 18;
    reasons.long.push(`compression ${rangePct.toFixed(2)}%`);
  }

  if (volumeRatio !== null && volumeRatio >= 2) {
    longScore += 20;
    shortScore += 12;
    reasons.long.push(`volume x${volumeRatio.toFixed(2)}`);
    reasons.short.push(`volume x${volumeRatio.toFixed(2)}`);
  }

  if (bullishCandle) {
    longScore += 18;
    reasons.long.push('cassure bougie haussiere');
  }

  if (bearishRejection && rsi !== null && rsi >= 65) {
    shortScore += 22;
    reasons.short.push('rejet apres surchauffe');
  }

  if (rsi !== null && rsi >= 52 && rsi <= 72) {
    longScore += 12;
    reasons.long.push(`RSI exploitable ${rsi.toFixed(1)}`);
  }

  if (rsi !== null && rsi >= 75) {
    shortScore += 14;
    reasons.short.push(`RSI eleve ${rsi.toFixed(1)}`);
  }

  if (orderBook?.imbalance !== null && orderBook?.imbalance !== undefined) {
    if (orderBook.imbalance >= 1.35) {
      longScore += 22;
      reasons.long.push(`carnet bid dominant ${orderBook.imbalance.toFixed(2)}`);
    }
    if (orderBook.imbalance <= 0.75) {
      shortScore += 22;
      reasons.short.push(`carnet ask dominant ${orderBook.imbalance.toFixed(2)}`);
    }
  }

  if (orderBook?.spreadPct !== null && orderBook?.spreadPct !== undefined) {
    if (orderBook.spreadPct <= 0.25) {
      longScore += 5;
      shortScore += 5;
    } else {
      longScore -= 10;
      shortScore -= 10;
      reasons.long.push(`spread large ${orderBook.spreadPct.toFixed(2)}%`);
      reasons.short.push(`spread large ${orderBook.spreadPct.toFixed(2)}%`);
    }
  }

  if (fundingAnalysis?.available) {
    longScore += fundingAnalysis.scoreLong || 0;
    shortScore += fundingAnalysis.scoreShort || 0;
    if (fundingAnalysis.scoreLong) reasons.long.push(fundingAnalysis.pressure);
    if (fundingAnalysis.scoreShort) reasons.short.push(fundingAnalysis.pressure);
  } else if (fundingRate !== null && fundingRate !== undefined) {
    const fr = Number(fundingRate);
    if (Number.isFinite(fr)) {
      if (fr > 0 && fr < 0.0005) {
        longScore += 5;
        reasons.long.push('funding positif modere');
      }
      if (fr > 0.001) {
        shortScore += 6;
        reasons.short.push('funding trop positif');
      }
      if (fr < -0.0005) {
        longScore += 6;
        reasons.long.push('shorts payent funding');
      }
    }
  }

  if (openInterestAnalysis?.available) {
    longScore += openInterestAnalysis.scoreLong || 0;
    shortScore += openInterestAnalysis.scoreShort || 0;
    for (const reason of openInterestAnalysis.reasons || []) {
      if (openInterestAnalysis.scoreLong) reasons.long.push(reason);
      if (openInterestAnalysis.scoreShort) reasons.short.push(reason);
    }
  } else if (openInterest !== null && openInterest !== undefined) {
    longScore += 5;
    shortScore += 5;
  }

  if (marketRegime?.regime === 'PUMP_ADVANCED') {
    longScore -= 12;
    shortScore += 6;
    reasons.long.push('pump deja avance');
    reasons.short.push('possible exces haussier');
  }

  if (marketRegime?.regime === 'DISTRIBUTION_OR_FLUSH') {
    longScore -= 10;
    shortScore += 8;
    reasons.short.push('distribution ou flush');
  }

  longScore = clamp(Math.round(longScore));
  shortScore = clamp(Math.round(shortScore));

  const direction = longScore >= shortScore ? 'LONG' : 'SHORT';
  const score = Math.max(longScore, shortScore);

  return {
    direction,
    score,
    longScore,
    shortScore,
    confidence: score >= 80 ? 'HIGH' : score >= 65 ? 'MEDIUM' : 'LOW',
    reasons: direction === 'LONG' ? reasons.long : reasons.short,
    allReasons: reasons
  };
}
