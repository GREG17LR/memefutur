package com.memefutur.app;

import android.app.Activity;
import android.os.Bundle;
import android.graphics.Color;
import android.view.Gravity;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;

public class MainActivity extends Activity {
    private boolean botEnabled = false;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setGravity(Gravity.CENTER_HORIZONTAL);
        root.setPadding(40, 60, 40, 40);
        root.setBackgroundColor(Color.rgb(7, 20, 42));

        TextView title = new TextView(this);
        title.setText("MemeFutur");
        title.setTextColor(Color.WHITE);
        title.setTextSize(32);
        title.setGravity(Gravity.CENTER);
        root.addView(title);

        TextView subtitle = new TextView(this);
        subtitle.setText("Cockpit mobile - Futures / DRY_RUN");
        subtitle.setTextColor(Color.rgb(130, 180, 255));
        subtitle.setTextSize(16);
        subtitle.setGravity(Gravity.CENTER);
        root.addView(subtitle);

        TextView status = new TextView(this);
        status.setText("Bot : OFF\nMode : Simulation\nPositions : 0\nDernier signal : aucun");
        status.setTextColor(Color.WHITE);
        status.setTextSize(18);
        status.setPadding(0, 60, 0, 40);
        status.setGravity(Gravity.CENTER);
        root.addView(status);

        Button toggle = new Button(this);
        toggle.setText("Activer le bot");
        root.addView(toggle);

        Button scan = new Button(this);
        scan.setText("Scanner les signaux");
        root.addView(scan);

        Button emergency = new Button(this);
        emergency.setText("Emergency Stop");
        root.addView(emergency);

        TextView footer = new TextView(this);
        footer.setText("V1 locale. Connexion backend à ajouter : /api/status, /api/scan, /api/emergency-stop");
        footer.setTextColor(Color.LTGRAY);
        footer.setTextSize(13);
        footer.setGravity(Gravity.CENTER);
        footer.setPadding(0, 50, 0, 0);
        root.addView(footer);

        toggle.setOnClickListener(v -> {
            botEnabled = !botEnabled;
            status.setText(botEnabled
                    ? "Bot : ON\nMode : Simulation\nPositions : 0\nDernier signal : attente scanner"
                    : "Bot : OFF\nMode : Simulation\nPositions : 0\nDernier signal : aucun");
            toggle.setText(botEnabled ? "Désactiver le bot" : "Activer le bot");
        });

        scan.setOnClickListener(v -> status.setText("Bot : " + (botEnabled ? "ON" : "OFF") + "\nMode : Simulation\nPositions : 0\nDernier signal : scan manuel demandé"));

        emergency.setOnClickListener(v -> {
            botEnabled = false;
            toggle.setText("Activer le bot");
            status.setText("BOT BLOQUÉ\nEmergency Stop actif\nAucun ordre ne doit être exécuté");
        });

        setContentView(root);
    }
}
