export const botState = {
  enabled: false,
  emergencyStopped: false,
  startedAt: null,
  stoppedAt: null,
  signals: [],
  paperTrades: [],
  positions: [],
  dailyPnlPct: 0
};

export function pushSignal(signal) {
  botState.signals.unshift({
    id: `sig_${Date.now()}_${Math.random().toString(16).slice(2)}`,
    createdAt: new Date().toISOString(),
    ...signal
  });
  botState.signals = botState.signals.slice(0, 200);
  return botState.signals[0];
}
