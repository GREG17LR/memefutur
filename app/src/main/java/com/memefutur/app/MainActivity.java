package com.memefutur.app;

import android.app.Activity;
import android.os.Bundle;
import android.graphics.Color;
import android.graphics.Typeface;
import android.view.Gravity;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.text.DecimalFormat;

public class MainActivity extends Activity {
    private static final String BACKEND_URL = "http://127.0.0.1:3000";

    private boolean botEnabled = false;
    private TextView status;
    private TextView recommendation;
    private LinearLayout signalsContainer;
    private final DecimalFormat priceFormat = new DecimalFormat("0.########");

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        ScrollView scrollView = new ScrollView(this);
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setPadding(34, 54, 34, 34);
        root.setBackgroundColor(Color.rgb(7, 20, 42));
        scrollView.addView(root);

        TextView title = new TextView(this);
        title.setText("MemeFutur");
        title.setTextColor(Color.WHITE);
        title.setTextSize(30);
        title.setTypeface(Typeface.DEFAULT_BOLD);
        title.setGravity(Gravity.CENTER);
        root.addView(title, fullWidth());

        TextView subtitle = new TextView(this);
        subtitle.setText("Meme Explosion Scanner - Termux / DRY_RUN");
        subtitle.setTextColor(Color.rgb(130, 180, 255));
        subtitle.setTextSize(15);
        subtitle.setGravity(Gravity.CENTER);
        root.addView(subtitle, fullWidth());

        status = new TextView(this);
        status.setText("Backend : non testé\nBot : OFF\nMode : Simulation");
        status.setTextColor(Color.WHITE);
        status.setTextSize(17);
        status.setPadding(0, 34, 0, 26);
        status.setGravity(Gravity.CENTER);
        root.addView(status, fullWidth());

        recommendation = new TextView(this);
        recommendation.setText("Décision : attendre un scan réel.");
        recommendation.setTextColor(Color.WHITE);
        recommendation.setTextSize(18);
        recommendation.setTypeface(Typeface.DEFAULT_BOLD);
        recommendation.setPadding(24, 24, 24, 24);
        recommendation.setBackgroundColor(Color.rgb(13, 55, 105));
        root.addView(recommendation, fullWidthWithMargins(0, 0, 0, 24));

        Button test = new Button(this);
        test.setText("Tester connexion backend");
        root.addView(test, fullWidth());

        Button toggle = new Button(this);
        toggle.setText("Activer le bot");
        root.addView(toggle, fullWidth());

        Button scan = new Button(this);
        scan.setText("Scanner réel MEXC");
        root.addView(scan, fullWidth());

        Button emergency = new Button(this);
        emergency.setText("Emergency Stop");
        root.addView(emergency, fullWidth());

        TextView section = new TextView(this);
        section.setText("Top Meme Explosion");
        section.setTextColor(Color.WHITE);
        section.setTextSize(22);
        section.setTypeface(Typeface.DEFAULT_BOLD);
        section.setPadding(0, 32, 0, 12);
        root.addView(section, fullWidth());

        signalsContainer = new LinearLayout(this);
        signalsContainer.setOrientation(LinearLayout.VERTICAL);
        root.addView(signalsContainer, fullWidth());

        toggle.setOnClickListener(v -> {
            botEnabled = !botEnabled;
            toggle.setText(botEnabled ? "Désactiver le bot" : "Activer le bot");
            status.setText("Backend : local\nBot : " + (botEnabled ? "ON" : "OFF") + "\nMode : Simulation");
        });

        test.setOnClickListener(v -> testBackend());
        scan.setOnClickListener(v -> scanSignals());
        emergency.setOnClickListener(v -> {
            botEnabled = false;
            toggle.setText("Activer le bot");
            status.setText("BOT BLOQUÉ\nEmergency Stop local actif\nAucun ordre ne doit être exécuté");
            recommendation.setText("Décision : ne pas trader. Emergency Stop actif.");
            recommendation.setBackgroundColor(Color.rgb(120, 20, 35));
        });

        setContentView(scrollView);
    }

    private ViewGroup.LayoutParams fullWidth() {
        return new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT
        );
    }

    private LinearLayout.LayoutParams fullWidthWithMargins(int l, int t, int r, int b) {
        LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT
        );
        params.setMargins(l, t, r, b);
        return params;
    }

    private void testBackend() {
        status.setText("Test backend en cours...");
        new Thread(() -> {
            try {
                String response = httpGet(BACKEND_URL + "/health");
                JSONObject json = new JSONObject(response);
                boolean ok = json.optBoolean("success", false);
                runOnUiThread(() -> status.setText(ok
                        ? "Backend : connecté\nBot : " + (botEnabled ? "ON" : "OFF") + "\nMode : Simulation"
                        : "Backend : réponse inattendue"));
            } catch (Exception e) {
                runOnUiThread(() -> status.setText("Backend indisponible\nLance Termux : npm run dev\n" + e.getMessage()));
            }
        }).start();
    }

    private void scanSignals() {
        status.setText("Scan MEXC en cours...");
        recommendation.setText("Décision : analyse Meme Explosion en cours...");
        signalsContainer.removeAllViews();

        new Thread(() -> {
            try {
                String response = httpGet(BACKEND_URL + "/api/scan");
                JSONObject json = new JSONObject(response);
                JSONArray data = json.optJSONArray("data");
                if (data == null || data.length() == 0) {
                    runOnUiThread(() -> {
                        status.setText("Scan terminé, aucun signal exploitable.");
                        recommendation.setText("Décision : ne pas trader. Aucune donnée exploitable.");
                    });
                    return;
                }

                JSONObject best = data.getJSONObject(0);
                runOnUiThread(() -> renderScan(data, best));
            } catch (Exception e) {
                runOnUiThread(() -> {
                    status.setText("Erreur scan\n" + e.getMessage());
                    recommendation.setText("Décision : ne pas trader. Erreur de scan.");
                    recommendation.setBackgroundColor(Color.rgb(120, 20, 35));
                });
            }
        }).start();
    }

    private void renderScan(JSONArray data, JSONObject best) {
        signalsContainer.removeAllViews();

        for (int i = 0; i < data.length(); i++) {
            JSONObject item = data.optJSONObject(i);
            if (item == null) continue;
            signalsContainer.addView(signalCard(item, i + 1), fullWidthWithMargins(0, 0, 0, 18));
        }

        JSONObject meme = best.optJSONObject("memeExplosion");
        JSONObject scoring = best.optJSONObject("scoring");
        JSONObject decisionObj = best.optJSONObject("decision");
        String symbol = best.optString("symbol", "?");
        String direction = meme != null ? meme.optString("direction", "?") : scoring.optString("direction", "?");
        int memeScore = meme != null ? meme.optInt("score", 0) : 0;
        int baseScore = scoring != null ? scoring.optInt("score", 0) : 0;
        String confidence = meme != null ? meme.optString("confidence", "LOW") : scoring.optString("confidence", "LOW");
        double price = best.optDouble("price", 0.0);

        String decision;
        int bg;
        if (decisionObj != null) {
            decision = "Décision : " + decisionObj.optString("text", "Attendre.");
        } else if (memeScore >= 85 && botEnabled) {
            decision = "Décision : Meme Explosion probable. Surveiller " + symbol + " en " + direction + " avant validation manuelle.";
        } else if (memeScore >= 70) {
            decision = "Décision : setup intéressant sur " + symbol + " en " + direction + ", confirmation nécessaire.";
        } else {
            decision = "Décision : attendre. Meilleur Meme Explosion Score : " + symbol + " " + memeScore + "/100.";
        }

        if (memeScore >= 85) bg = Color.rgb(0, 115, 70);
        else if (memeScore >= 70) bg = Color.rgb(135, 95, 10);
        else bg = Color.rgb(13, 55, 105);

        recommendation.setText(decision);
        recommendation.setBackgroundColor(bg);
        status.setText("Backend : connecté\nBot : " + (botEnabled ? "ON" : "OFF")
                + "\nDernier scan : OK"
                + "\nMeilleur MES : " + symbol + " " + direction + " " + memeScore + "/100 @ " + priceFormat.format(price)
                + "\nScore marché : " + baseScore + "/100 | Confiance : " + confidence);
    }

    private TextView signalCard(JSONObject item, int rank) {
        JSONObject scoring = item.optJSONObject("scoring");
        JSONObject meme = item.optJSONObject("memeExplosion");
        JSONObject metrics = item.optJSONObject("metrics");
        JSONObject regime = metrics != null ? metrics.optJSONObject("marketRegime") : null;

        String symbol = item.optString("symbol", "?");
        double price = item.optDouble("price", 0.0);
        String direction = meme != null ? meme.optString("direction", "?") : scoring.optString("direction", "?");
        int memeScore = meme != null ? meme.optInt("score", 0) : 0;
        int baseScore = scoring != null ? scoring.optInt("score", 0) : 0;
        String confidence = meme != null ? meme.optString("confidence", "LOW") : scoring.optString("confidence", "LOW");
        String label = meme != null ? meme.optString("label", "WAIT") : "WAIT";
        String regimeText = regime != null ? regime.optString("regime", "NEUTRAL") : "NEUTRAL";
        JSONArray reasonsArray = meme != null ? meme.optJSONArray("reasons") : null;
        String reasons = reasonsArray != null ? reasonsArray.toString() : "[]";

        TextView card = new TextView(this);
        card.setText(rank + ". " + symbol + "  " + direction + "  MES " + memeScore + "/100\n"
                + "Prix : " + priceFormat.format(price) + " | Confiance : " + confidence + " | Base : " + baseScore + "/100\n"
                + "Label : " + label + " | Régime : " + regimeText + "\n"
                + "Pourquoi : " + reasons);
        card.setTextColor(Color.WHITE);
        card.setTextSize(15);
        card.setPadding(24, 22, 24, 22);

        if (memeScore >= 85) {
            card.setBackgroundColor(Color.rgb(0, 100, 65));
        } else if (memeScore >= 70) {
            card.setBackgroundColor(Color.rgb(110, 80, 10));
        } else {
            card.setBackgroundColor(Color.rgb(20, 40, 75));
        }

        return card;
    }

    private String httpGet(String urlString) throws Exception {
        URL url = new URL(urlString);
        HttpURLConnection connection = (HttpURLConnection) url.openConnection();
        connection.setRequestMethod("GET");
        connection.setConnectTimeout(7000);
        connection.setReadTimeout(20000);

        int statusCode = connection.getResponseCode();
        BufferedReader reader = new BufferedReader(new InputStreamReader(
                statusCode >= 200 && statusCode < 300
                        ? connection.getInputStream()
                        : connection.getErrorStream()
        ));

        StringBuilder builder = new StringBuilder();
        String line;
        while ((line = reader.readLine()) != null) {
            builder.append(line);
        }
        reader.close();
        connection.disconnect();

        if (statusCode < 200 || statusCode >= 300) {
            throw new RuntimeException("HTTP " + statusCode + " - " + builder);
        }

        return builder.toString();
    }
}
