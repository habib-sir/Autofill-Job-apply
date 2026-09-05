package com.bdjob.smsgateway;

import android.Manifest;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Bundle;
import android.telephony.SubscriptionInfo;
import android.telephony.SubscriptionManager;
import android.view.View;
import android.widget.ArrayAdapter;
import android.widget.Button;
import android.widget.EditText;
import android.widget.ScrollView;
import android.widget.Spinner;
import android.widget.Switch;
import android.widget.TextView;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Locale;

public class MainActivity extends AppCompatActivity {

    private static final int PERMISSION_REQUEST_CODE = 1001;

    private EditText etServerUrl;
    private EditText etPairingCode;
    private Spinner spSimSlot;
    private Switch swService;
    private TextView tvStatus;
    private TextView tvLog;
    private ScrollView svLog;
    private Button btnTestSms;
    private Button btnClearLog;

    private SharedPreferences prefs;
    private List<Integer> simSubscriptionIds = new ArrayList<>();

    private final BroadcastReceiver logReceiver = new BroadcastReceiver() {
        @Override
        public void onReceive(Context context, Intent intent) {
            String logMsg = intent.getStringExtra("log");
            if (logMsg != null) {
                appendLog(logMsg);
            }
        }
    };

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        prefs = getSharedPreferences("bd_sms_gateway_prefs", MODE_PRIVATE);

        etServerUrl = findViewById(R.id.et_server_url);
        etPairingCode = findViewById(R.id.et_pairing_code);
        spSimSlot = findViewById(R.id.sp_sim_slot);
        swService = findViewById(R.id.sw_service);
        tvStatus = findViewById(R.id.tv_status);
        tvLog = findViewById(R.id.tv_log);
        svLog = findViewById(R.id.sv_log);
        btnTestSms = findViewById(R.id.btn_test_sms);
        btnClearLog = findViewById(R.id.btn_clear_log);

        // Load saved values
        etServerUrl.setText(prefs.getString("server_url", "http://192.168.10.27:3000"));
        etPairingCode.setText(prefs.getString("pairing_code", ""));

        checkAndRequestPermissions();
        loadSimCards();

        swService.setOnCheckedChangeListener((buttonView, isChecked) -> {
            if (isChecked) {
                startGatewayService();
            } else {
                stopGatewayService();
            }
        });

        btnTestSms.setOnClickListener(v -> sendTestSms());
        btnClearLog.setOnClickListener(v -> tvLog.setText(""));
    }

    @Override
    protected void onResume() {
        super.onResume();
        registerReceiver(logReceiver, new IntentFilter("com.bdjob.smsgateway.LOG_EVENT"));
        updateStatus();
    }

    @Override
    protected void onPause() {
        super.onPause();
        try {
            unregisterReceiver(logReceiver);
        } catch (Exception ignored) {}
    }

    private void checkAndRequestPermissions() {
        List<String> permissions = new ArrayList<>();
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.SEND_SMS) != PackageManager.PERMISSION_GRANTED) {
            permissions.add(Manifest.permission.SEND_SMS);
        }
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.RECEIVE_SMS) != PackageManager.PERMISSION_GRANTED) {
            permissions.add(Manifest.permission.RECEIVE_SMS);
        }
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.READ_PHONE_STATE) != PackageManager.PERMISSION_GRANTED) {
            permissions.add(Manifest.permission.READ_PHONE_STATE);
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
                permissions.add(Manifest.permission.POST_NOTIFICATIONS);
            }
        }

        if (!permissions.isEmpty()) {
            ActivityCompat.requestPermissions(this, permissions.toArray(new String[0]), PERMISSION_REQUEST_CODE);
        }
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, @NonNull String[] permissions, @NonNull int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == PERMISSION_REQUEST_CODE) {
            loadSimCards();
            appendLog("Permissions updated. SMS access ready.");
        }
    }

    private void loadSimCards() {
        if (ActivityCompat.checkSelfPermission(this, Manifest.permission.READ_PHONE_STATE) != PackageManager.PERMISSION_GRANTED) {
            return;
        }

        SubscriptionManager sm = (SubscriptionManager) getSystemService(Context.TELEPHONY_SUBSCRIPTION_SERVICE);
        if (sm == null) return;

        List<SubscriptionInfo> subList = sm.getActiveSubscriptionInfoList();
        List<String> simLabels = new ArrayList<>();
        simSubscriptionIds.clear();

        if (subList != null && !subList.isEmpty()) {
            for (SubscriptionInfo info : subList) {
                String carrier = info.getCarrierName() != null ? info.getCarrierName().toString() : "SIM " + (info.getSimSlotIndex() + 1);
                simLabels.add(carrier + " (Slot " + (info.getSimSlotIndex() + 1) + ")");
                simSubscriptionIds.add(info.getSubscriptionId());
            }
        } else {
            simLabels.add("Default Phone SIM");
            simSubscriptionIds.add(-1);
        }

        ArrayAdapter<String> adapter = new ArrayAdapter<>(this, android.R.layout.simple_spinner_dropdown_item, simLabels);
        spSimSlot.setAdapter(adapter);

        // Auto-select Teletalk if present
        for (int i = 0; i < simLabels.size(); i++) {
            if (simLabels.get(i).toLowerCase().contains("teletalk")) {
                spSimSlot.setSelection(i);
                break;
            }
        }
    }

    private void startGatewayService() {
        String url = etServerUrl.getText().toString().trim();
        String code = etPairingCode.getText().toString().trim();

        if (url.isEmpty()) {
            Toast.makeText(this, "Please enter the Gateway Server URL", Toast.LENGTH_SHORT).show();
            swService.setChecked(false);
            return;
        }

        // Save preferences
        int selectedSimSubId = -1;
        int simPos = spSimSlot.getSelectedItemPosition();
        if (simPos >= 0 && simPos < simSubscriptionIds.size()) {
            selectedSimSubId = simSubscriptionIds.get(simPos);
        }

        prefs.edit()
                .putString("server_url", url)
                .putString("pairing_code", code)
                .putInt("sim_sub_id", selectedSimSubId)
                .apply();

        Intent serviceIntent = new Intent(this, SmsGatewayService.class);
        serviceIntent.putExtra("server_url", url);
        serviceIntent.putExtra("pairing_code", code);
        serviceIntent.putExtra("sim_sub_id", selectedSimSubId);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            startForegroundService(serviceIntent);
        } else {
            startService(serviceIntent);
        }

        tvStatus.setText("🟢 Active (Listening for SMS commands from PC)");
        tvStatus.setTextColor(0xFF15803D);
        appendLog("SMS Gateway started. Phone is now connected to Chrome Extension.");
    }

    private void stopGatewayService() {
        Intent serviceIntent = new Intent(this, SmsGatewayService.class);
        stopService(serviceIntent);
        tvStatus.setText("🔴 Stopped");
        tvStatus.setTextColor(0xFFB91C1C);
        appendLog("SMS Gateway stopped.");
    }

    private void updateStatus() {
        boolean isRunning = SmsGatewayService.isRunning;
        swService.setChecked(isRunning);
        if (isRunning) {
            tvStatus.setText("🟢 Active (Listening for SMS commands from PC)");
            tvStatus.setTextColor(0xFF15803D);
        } else {
            tvStatus.setText("🔴 Disconnected (Toggle ON to connect)");
            tvStatus.setTextColor(0xFFB91C1C);
        }
    }

    private void sendTestSms() {
        int selectedSimSubId = -1;
        int simPos = spSimSlot.getSelectedItemPosition();
        if (simPos >= 0 && simPos < simSubscriptionIds.size()) {
            selectedSimSubId = simSubscriptionIds.get(simPos);
        }

        appendLog("Sending manual test ping to 16222 via SIM...");
        SmsGatewayService.sendSms(this, selectedSimSubId, "16222", "TEST_PING_BDJOB");
    }

    private void appendLog(String message) {
        String time = new SimpleDateFormat("HH:mm:ss", Locale.getDefault()).format(new Date());
        String line = "[" + time + "] " + message + "\n";
        tvLog.append(line);
        svLog.post(() -> svLog.fullScroll(View.FOCUS_DOWN));
    }
}
