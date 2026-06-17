# MemeFutur Backend

Backend Node.js du projet MemeFutur.

## Objectif V1

- Scanner des paires MEXC Futures.
- Calculer un score LONG / SHORT.
- Intégrer pattern, volume, carnet d'ordres, funding et open interest quand disponible.
- Générer des signaux.
- Simuler des trades en `DRY_RUN`.
- Exposer une API consommable par l'application Android.

## Installation locale

```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

## Endpoints

```text
GET  /health
GET  /api/status
GET  /api/scan
GET  /api/scan?symbols=EVAA_USDT,BTC_USDT&timeframe=Min60
GET  /api/signals
GET  /api/paper-trades
POST /api/bot/start
POST /api/bot/stop
POST /api/emergency-stop
POST /webhook/tradingview
```

Les endpoints de contrôle nécessitent le header :

```text
x-api-key: valeur_de_APP_API_KEY
```

## Test rapide

```bash
curl http://localhost:3000/health
curl http://localhost:3000/api/status
curl "http://localhost:3000/api/scan?symbols=EVAA_USDT&timeframe=Min60"
```

## Sécurité

- `DRY_RUN=true` par défaut.
- Pas de clé API dans Android.
- Pas d'ordre réel dans cette première couche.
- Les endpoints trading réels seront ajoutés séparément après validation du paper trading.
