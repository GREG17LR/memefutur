function extractNumeric(raw, keys) {
  if (!raw) return null;
  for (const key of keys) {
    const value = raw[key];
    if (value !== undefined && value !== null) {
      const parsed = Number(String(value).replace(',', '').trim());
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return null;
}

export function normalizeOpenInterest(rawOpenInterest) {
  if (!rawOpenInterest) {
    return {
      available: false,
      notionalUsd: null,
      contracts: null,
      raw: null
    };
  }

  const data = rawOpenInterest.data || rawOpenInterest;
  const item = Array.isArray(data) ? data[0] : data;

  const notionalUsd = extractNumeric(item, [
    'openInterestUsd',
    'open_interest_usd',
    'notionalUsd',
    'notional_usd',
    'amountUsd',
    'holdVolUsd'
  ]);

  const contracts = extractNumeric(item, [
    'openInterest',
    'open_interest',
    'holdVol',
    'volume',
    'amount',
    'contracts'
  ]);

  return {
    available: Boolean(notionalUsd || contracts),
    notionalUsd,
    contracts,
    raw: item
  };
}

export function analyzeOpenInterest({ current, previous = null, priceChangePct = null }) {
  const normalized = normalizeOpenInterest(current);
  const prev = previous ? normalizeOpenInterest(previous) : null;

  let changePct = null;
  const currentValue = normalized.notionalUsd || normalized.contracts;
  const previousValue = prev?.notionalUsd || prev?.contracts;

  if (currentValue && previousValue) {
    changePct = ((currentValue - previousValue) / previousValue) * 100;
  }

  let regime = 'UNKNOWN';
  let scoreLong = 0;
  let scoreShort = 0;
  const reasons = [];

  if (!normalized.available) {
    return {
      ...normalized,
      changePct,
      regime,
      scoreLong,
      scoreShort,
      reasons: ['open interest unavailable']
    };
  }

  if (changePct === null) {
    regime = 'OI_AVAILABLE_NO_HISTORY';
    scoreLong = 3;
    scoreShort = 3;
    reasons.push('OI disponible sans historique');
  } else if (changePct >= 10 && priceChangePct !== null && priceChangePct > 0) {
    regime = 'PRICE_UP_OI_UP';
    scoreLong = 14;
    reasons.push(`prix hausse + OI hausse ${changePct.toFixed(1)}%`);
  } else if (changePct >= 10 && priceChangePct !== null && priceChangePct < 0) {
    regime = 'PRICE_DOWN_OI_UP';
    scoreShort = 14;
    reasons.push(`prix baisse + OI hausse ${changePct.toFixed(1)}%`);
  } else if (changePct <= -10) {
    regime = 'OI_FLUSH';
    reasons.push(`OI purge ${changePct.toFixed(1)}%`);
  } else {
    regime = 'OI_STABLE';
    scoreLong = 4;
    scoreShort = 4;
    reasons.push(`OI stable ${changePct.toFixed(1)}%`);
  }

  return {
    ...normalized,
    changePct,
    regime,
    scoreLong,
    scoreShort,
    reasons
  };
}
