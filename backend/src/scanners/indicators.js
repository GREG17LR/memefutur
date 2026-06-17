export function sma(values, length) {
  if (!Array.isArray(values) || values.length < length) return null;
  const slice = values.slice(-length);
  return slice.reduce((sum, value) => sum + Number(value || 0), 0) / length;
}

export function rangePct(bars, length = 12) {
  if (!Array.isArray(bars) || bars.length < length) return null;
  const slice = bars.slice(-length);
  const highest = Math.max(...slice.map((bar) => bar.high));
  const lowest = Math.min(...slice.map((bar) => bar.low));
  if (!Number.isFinite(highest) || !Number.isFinite(lowest) || lowest <= 0) return null;
  return ((highest - lowest) / lowest) * 100;
}

export function rsi(bars, length = 14) {
  if (!Array.isArray(bars) || bars.length < length + 1) return null;
  const closes = bars.map((bar) => bar.close);
  let gains = 0;
  let losses = 0;
  for (let i = closes.length - length; i < closes.length; i += 1) {
    const diff = closes[i] - closes[i - 1];
    if (diff >= 0) gains += diff;
    else losses += Math.abs(diff);
  }
  if (losses === 0) return 100;
  const rs = gains / losses;
  return 100 - (100 / (1 + rs));
}

export function volumeRatio(bars, length = 20) {
  if (!Array.isArray(bars) || bars.length < length + 1) return null;
  const volumes = bars.map((bar) => bar.volume || 0);
  const current = volumes[volumes.length - 1];
  const avg = sma(volumes.slice(0, -1), length);
  if (!avg || avg <= 0) return null;
  return current / avg;
}

export function orderBookMetrics(depth) {
  const bids = depth?.bids || depth?.Bids || [];
  const asks = depth?.asks || depth?.Asks || [];

  const bidTotal = bids.reduce((sum, row) => sum + Number(row[1] || row.vol || row.quantity || 0), 0);
  const askTotal = asks.reduce((sum, row) => sum + Number(row[1] || row.vol || row.quantity || 0), 0);
  const bestBid = bids.length ? Number(bids[0][0] || bids[0].price) : null;
  const bestAsk = asks.length ? Number(asks[0][0] || asks[0].price) : null;
  const mid = bestBid && bestAsk ? (bestBid + bestAsk) / 2 : null;
  const spreadPct = mid ? ((bestAsk - bestBid) / mid) * 100 : null;
  const imbalance = askTotal > 0 ? bidTotal / askTotal : null;

  return {
    bidTotal,
    askTotal,
    bestBid,
    bestAsk,
    spreadPct,
    imbalance
  };
}
