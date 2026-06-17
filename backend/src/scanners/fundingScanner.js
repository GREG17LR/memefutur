function normalizeFundingValue(raw) {
  if (!raw) return null;
  const candidate = raw.fundingRate ?? raw.funding_rate ?? raw.rate ?? raw.fundingRateDisplay ?? raw.currentFundingRate;
  if (candidate === undefined || candidate === null) return null;

  const cleaned = String(candidate).replace('%', '').trim();
  const parsed = Number(cleaned);
  if (!Number.isFinite(parsed)) return null;

  // If API returns percent value like 0.01%, convert to decimal only when string contained %.
  return String(candidate).includes('%') ? parsed / 100 : parsed;
}

export function analyzeFunding(rawFunding) {
  const rate = normalizeFundingValue(rawFunding);

  if (rate === null) {
    return {
      available: false,
      rate: null,
      bias: 'UNKNOWN',
      pressure: 'NEUTRAL',
      scoreLong: 0,
      scoreShort: 0,
      reason: 'funding unavailable'
    };
  }

  let bias = 'NEUTRAL';
  let pressure = 'NEUTRAL';
  let scoreLong = 0;
  let scoreShort = 0;

  if (rate > 0) {
    bias = 'LONGS_PAY_SHORTS';
    if (rate < 0.0005) {
      pressure = 'HEALTHY_LONG_BIAS';
      scoreLong = 5;
    } else if (rate < 0.0015) {
      pressure = 'ELEVATED_LONG_BIAS';
      scoreShort = 4;
    } else {
      pressure = 'OVERHEATED_LONGS';
      scoreShort = 10;
    }
  }

  if (rate < 0) {
    bias = 'SHORTS_PAY_LONGS';
    if (rate > -0.0005) {
      pressure = 'HEALTHY_SHORT_BIAS';
      scoreShort = 3;
    } else {
      pressure = 'SHORTS_CROWDED';
      scoreLong = 8;
    }
  }

  return {
    available: true,
    rate,
    bias,
    pressure,
    scoreLong,
    scoreShort,
    reason: `funding ${rate}`
  };
}
