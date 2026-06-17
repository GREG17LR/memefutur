# MemeFutur

MemeFutur est une V1 de bot de trading crypto orientée memecoins, avec une architecture prudente :

- backend Node.js pour scanner les marchés et centraliser les clés API ;
- app Android Kotlin/Jetpack Compose comme cockpit de pilotage ;
- intégration MEXC Futures en priorité, MEXC Spot en second temps ;
- mode `DRY_RUN` activé par défaut ;
- scoring séparé LONG / SHORT ;
- prise en compte du pattern graphique, volume, carnet d'ordres, funding et open interest.

> Aucune clé API ne doit être stockée dans l'application Android. Les clés restent uniquement côté backend.

## Structure

```text
memefutur/
├── android/                # Application Android cockpit
├── backend/                # API Node.js + scanner + exécution MEXC
├── .github/workflows/      # Build APK via GitHub Actions
└── README.md
```

## Lancer le backend

```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

Par défaut, le backend tourne en simulation :

```env
DRY_RUN=true
```

Ne passer en réel qu'après validation complète des logs, des tailles de position et des garde-fous.

## Endpoints principaux

```text
GET  /health
GET  /api/status
POST /api/bot/start
POST /api/bot/stop
POST /api/emergency-stop
POST /webhook/tradingview
```

## Roadmap V1

1. Backend scanner LONG / SHORT.
2. Cockpit Android.
3. Build APK automatique.
4. Connexion MEXC Futures.
5. Scoring order book.
6. Validation manuelle avant passage d'ordre.
7. Mode live encadré.

## Avertissement

Le trading futures avec levier présente un risque élevé de perte rapide du capital. Cette base technique doit rester en mode simulation tant que la stratégie, les stops, le dimensionnement et les limites journalières ne sont pas validés.
