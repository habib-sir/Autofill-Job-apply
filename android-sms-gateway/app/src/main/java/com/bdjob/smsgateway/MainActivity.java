package com.bdjob.smsgateway;

import android.Manifest;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.content.res.ColorStateList;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.PowerManager;
import android.provider.Settings;
import android.telephony.SubscriptionInfo;
import android.telephony.SubscriptionManager;
import android.util.Log;
import android.view.View;
import android.widget.ArrayAdapter;
import android.widget.Button;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.Spinner;
import android.widget.Switch;
import android.widget.TextView;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.appcompat.app.AlertDialog;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import rikka.shizuku.Shizuku;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Locale;

public class MainActivity extends AppCompatActivity {

    private static final int PERMISSION_REQUEST_CODE = 1001;
    private static final int SHIZUKU_PERMISSION_REQUEST_CODE = 1002;

    private EditText etServerUrl;
    private EditText etPairingCode;
    private Spinner spSimSlot;
    private Switch swService;
    private TextView tvStatus;
    private LinearLayout statusCard;
    private TextView tvLog;
    private ScrollView svLog;
    private Button btnSyncInbox;
    private Button btnTestSms;
    private Button btnCheckBalance;
    private Button btnClearLog;
    private TextView tvAccStatus;
    private Button btnEnableAcc;
    private Button btnShizukuProtect;

    private final Shizuku.OnRequestPermissionResultListener shizukuPermissionListener = (requestCode, grantResult) -> {
        if (requestCode == SHIZUKU_PERMISSION_REQUEST_CODE) {
            if (grantResult == PackageManager.PERMISSION_GRANTED) {
                appendLog("✅ Shizuku Permission granted! Applying accessibility auto-grant...");
                applyShizukuAccessibilityFix();
            } else {
                appendLog("❌ Shizuku permission was denied by user.");
            }
        }
    };

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

        // Some OEM skins (notably MIUI) apply "Force Dark" at the OS level
        // even when our own theme is Light, which washes out explicitly
        // dark input text into unreadable gray. The theme attribute in
        // themes.xml handles this on stock Android; this is the same
        // opt-out applied directly to the window, for phones that only
        // respect the runtime API.
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            getWindow().getDecorView().setForceDarkAllowed(false);
        }

        prefs = getSharedPreferences("bd_sms_gateway_prefs", MODE_PRIVATE);

        etServerUrl = findViewById(R.id.et_server_url);
        etPairingCode = findViewById(R.id.et_pairing_code);
        // Belt-and-suspenders against OEM force-dark quirks: set these
        // explicitly in code too, not just in the XML layout.
        etServerUrl.setTextColor(0xFF0F172A);
        etServerUrl.setHintTextColor(0xFF64748B);
        etPairingCode.setTextColor(0xFF0369A1);
        etPairingCode.setHintTextColor(0xFF64748B);
        spSimSlot = findViewById(R.id.sp_sim_slot);
        swService = findViewById(R.id.sw_service);
        applyPremiumSwitchTint(swService);
        tvStatus = findViewById(R.id.tv_status);
        statusCard = findViewById(R.id.status_card);
        tvLog = findViewById(R.id.tv_log);
        svLog = findViewById(R.id.sv_log);
        btnSyncInbox = findViewById(R.id.btn_sync_inbox);
        btnTestSms = findViewById(R.id.btn_test_sms);
        btnCheckBalance = findViewById(R.id.btn_check_balance);
        btnClearLog = findViewById(R.id.btn_clear_log);
        tvAccStatus = findViewById(R.id.tv_acc_status);
        btnEnableAcc = findViewById(R.id.btn_enable_acc);
        btnShizukuProtect = findViewById(R.id.btn_shizuku_protect);

        // Load saved values
        etServerUrl.setText(prefs.getString("server_url", "http://192.168.10.27:3000"));
        etPairingCode.setText(prefs.getString("pairing_code", ""));

        checkAndRequestPermissions();
        loadSimCards();
        checkBatteryOptimization();

        swService.setOnCheckedChangeListener((buttonView, isChecked) -> {
            if (isChecked) {
                startGatewayService();
            } else {
                stopGatewayService();
            }
        });

        btnSyncInbox.setOnClickListener(v -> syncPhoneInbox());
        btnTestSms.setOnClickListener(v -> sendTestSms());
        if (btnCheckBalance != null) {
            btnCheckBalance.setOnClickListener(v -> checkTeletalkBalanceManual());
        }
        if (btnEnableAcc != null) {
            btnEnableAcc.setOnClickListener(v -> openAccessibilitySettings());
        }
        if (btnShizukuProtect != null) {
            btnShizukuProtect.setOnClickListener(v -> showShizukuGuideDialog());
        }
        btnClearLog.setOnClickListener(v -> tvLog.setText(""));
    }

    @Override
    protected void onResume() {
        super.onResume();
        try {
            IntentFilter filter = new IntentFilter("com.bdjob.smsgateway.LOG_EVENT");
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                registerReceiver(logReceiver, filter, Context.RECEIVER_NOT_EXPORTED);
            } else {
                registerReceiver(logReceiver, filter);
            }
        } catch (Exception e) {
            Log.e("MainActivity", "Failed to register logReceiver: " + e.getMessage());
        }

        try {
            Shizuku.addRequestPermissionResultListener(shizukuPermissionListener);
        } catch (Throwable ignored) {}

        updateStatus();
        updateAccessibilityUI();
    }

    @Override
    protected void onPause() {
        super.onPause();
        try {
            unregisterReceiver(logReceiver);
        } catch (Exception ignored) {}
        try {
            Shizuku.removeRequestPermissionResultListener(shizukuPermissionListener);
        } catch (Throwable ignored) {}
    }

    /**
     * The default framework Switch renders as a flat gray toggle, which looks
     * out of place next to the rest of the app's gradient/glow visual style.
     * Tint it to match the brand palette: cyan-glow track when ON, quiet
     * neutral when OFF.
     */
    private void applyPremiumSwitchTint(Switch sw) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) return;

        int[][] states = new int[][]{
                new int[]{android.R.attr.state_checked},
                new int[]{}
        };

        ColorStateList thumbTint = new ColorStateList(states, new int[]{
                0xFF0284C7, // ON  — primary
                0xFFFFFFFF  // OFF — white
        });
        ColorStateList trackTint = new ColorStateList(states, new int[]{
                0xFF7DD3FC, // ON  — soft cyan glow
                0xFFCBD5E1  // OFF — neutral gray
        });

        sw.setThumbTintList(thumbTint);
        sw.setTrackTintList(trackTint);
    }

    /**
     * Many phone brands (Xiaomi/MIUI, Oppo, Vivo, Realme, Huawei) aggressively
     * kill background services to save battery, even foreground services with
     * a visible notification. If the gateway silently stops working after a
     * few hours, this is almost always why. Asking the user to exempt the app
     * from battery optimization keeps the SMS polling loop alive reliably.
     */
    private void checkBatteryOptimization() {
        PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
        if (pm == null || Build.VERSION.SDK_INT < Build.VERSION_CODES.M) return;

        if (!pm.isIgnoringBatteryOptimizations(getPackageName())) {
            new AlertDialog.Builder(this)
                    .setTitle("Keep the Gateway Running")
                    .setMessage("Your phone may stop this app in the background to save battery, " +
                            "which would break the SMS connection to your PC. " +
                            "Please allow it to run without restriction.")
                    .setPositiveButton("Allow", (dialog, which) -> {
                        try {
                            Intent intent = new Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS);
                            intent.setData(Uri.parse("package:" + getPackageName()));
                            startActivity(intent);
                        } catch (Exception e) {
                            appendLog("Could not open battery settings: " + e.getMessage());
                        }
                    })
                    .setNegativeButton("Later", null)
                    .show();
        }
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
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.CALL_PHONE) != PackageManager.PERMISSION_GRANTED) {
            permissions.add(Manifest.permission.CALL_PHONE);
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.READ_PHONE_NUMBERS) != PackageManager.PERMISSION_GRANTED) {
                permissions.add(Manifest.permission.READ_PHONE_NUMBERS);
            }
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
            try {
                loadSimCards();
                appendLog("Permissions updated. SMS access ready.");
            } catch (Exception e) {
                Log.e("MainActivity", "Error after permissions: " + e.getMessage());
            }
        }
    }

    private void loadSimCards() {
        try {
            if (ActivityCompat.checkSelfPermission(this, Manifest.permission.READ_PHONE_STATE) != PackageManager.PERMISSION_GRANTED) {
                fallbackSimSlots();
                return;
            }

            SubscriptionManager sm = (SubscriptionManager) getSystemService(Context.TELEPHONY_SUBSCRIPTION_SERVICE);
            if (sm == null) {
                fallbackSimSlots();
                return;
            }

            List<SubscriptionInfo> subList = null;
            try {
                subList = sm.getActiveSubscriptionInfoList();
            } catch (SecurityException se) {
                Log.w("MainActivity", "ActiveSubscriptionInfoList permission check deferred: " + se.getMessage());
            }

            List<String> simLabels = new ArrayList<>();
            simSubscriptionIds.clear();

            if (subList != null && !subList.isEmpty()) {
                for (SubscriptionInfo info : subList) {
                    String carrier = info.getCarrierName() != null ? info.getCarrierName().toString() : "SIM " + (info.getSimSlotIndex() + 1);
                    simLabels.add(carrier + " (Slot " + (info.getSimSlotIndex() + 1) + ")");
                    simSubscriptionIds.add(info.getSubscriptionId());
                }
            } else {
                fallbackSimSlots();
                return;
            }

            ArrayAdapter<String> adapter = new ArrayAdapter<>(this, R.layout.spinner_item, simLabels);
            adapter.setDropDownViewResource(R.layout.spinner_item);
            spSimSlot.setAdapter(adapter);

            // Auto-select Teletalk if present
            for (int i = 0; i < simLabels.size(); i++) {
                if (simLabels.get(i).toLowerCase().contains("teletalk")) {
                    spSimSlot.setSelection(i);
                    break;
                }
            }
        } catch (Exception e) {
            Log.e("MainActivity", "loadSimCards exception: " + e.getMessage(), e);
            fallbackSimSlots();
        }
    }

    private void fallbackSimSlots() {
        List<String> simLabels = new ArrayList<>();
        simSubscriptionIds.clear();
        simLabels.add("SIM 1 (Teletalk / Default)");
        simSubscriptionIds.add(-1);
        simLabels.add("SIM 2");
        simSubscriptionIds.add(-2);
        ArrayAdapter<String> adapter = new ArrayAdapter<>(this, R.layout.spinner_item, simLabels);
        adapter.setDropDownViewResource(R.layout.spinner_item);
        spSimSlot.setAdapter(adapter);
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
        statusCard.setBackgroundResource(R.drawable.bg_status_connected);
        appendLog("SMS Gateway started. Phone is now connected to Chrome Extension.");
    }

    private void stopGatewayService() {
        Intent serviceIntent = new Intent(this, SmsGatewayService.class);
        stopService(serviceIntent);
        tvStatus.setText("🔴 Stopped");
        tvStatus.setTextColor(0xFFB91C1C);
        statusCard.setBackgroundResource(R.drawable.bg_status_disconnected);
        appendLog("SMS Gateway stopped.");
    }

    private void updateStatus() {
        boolean isRunning = SmsGatewayService.isRunning;
        swService.setChecked(isRunning);
        if (isRunning) {
            tvStatus.setText("🟢 Active (Listening for SMS commands from PC)");
            tvStatus.setTextColor(0xFF15803D);
            statusCard.setBackgroundResource(R.drawable.bg_status_connected);
        } else {
            tvStatus.setText("🔴 Disconnected (Toggle ON to connect)");
            tvStatus.setTextColor(0xFFB91C1C);
            statusCard.setBackgroundResource(R.drawable.bg_status_disconnected);
        }
    }

    private void syncPhoneInbox() {
        Intent serviceIntent = new Intent(this, SmsGatewayService.class);
        serviceIntent.setAction("ACTION_SYNC_INBOX");
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            startForegroundService(serviceIntent);
        } else {
            startService(serviceIntent);
        }
        appendLog("Initiating phone SMS inbox sync to PC extension...");
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

    private void checkTeletalkBalanceManual() {
        try {
            appendLog("Dialing Teletalk *152# for balance check...");
            Intent dialIntent = new Intent(Intent.ACTION_DIAL, Uri.parse("tel:" + Uri.encode("*152#")));
            dialIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            startActivity(dialIntent);
        } catch (Exception e) {
            appendLog("Error launching dialer: " + e.getMessage());
        }
    }

    private boolean isAccessibilityServiceEnabled() {
        try {
            int accessibilityEnabled = Settings.Secure.getInt(
                    getContentResolver(),
                    Settings.Secure.ACCESSIBILITY_ENABLED, 0
            );
            if (accessibilityEnabled == 1) {
                String services = Settings.Secure.getString(
                        getContentResolver(),
                        Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES
                );
                if (services != null) {
                    String target = getPackageName() + "/" + UssdAccessibilityService.class.getName();
                    return services.contains(target) || services.contains("UssdAccessibilityService");
                }
            }
        } catch (Exception ignored) {}
        return UssdAccessibilityService.isServiceConnected;
    }

    private void updateAccessibilityUI() {
        boolean active = isAccessibilityServiceEnabled();
        if (tvAccStatus != null) {
            if (active) {
                tvAccStatus.setText("সক্রিয় (Active)");
                tvAccStatus.setTextColor(0xFF15803D);
                tvAccStatus.setBackgroundResource(R.drawable.chip_bg_green);
                if (btnEnableAcc != null) {
                    btnEnableAcc.setText("সার্ভিস সক্রিয় আছে");
                    btnEnableAcc.setEnabled(false);
                }
            } else {
                tvAccStatus.setText("বন্ধ (Off)");
                tvAccStatus.setTextColor(0xFFB45309);
                tvAccStatus.setBackgroundResource(R.drawable.chip_bg_amber);
                if (btnEnableAcc != null) {
                    btnEnableAcc.setText("সার্ভিস অন করুন");
                    btnEnableAcc.setEnabled(true);
                }
            }
        }
    }

    private void openAccessibilitySettings() {
        try {
            Intent intent = new Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            startActivity(intent);
            Toast.makeText(this, "তালিকা থেকে 'BD Job USSD Auto-Reader' সিলেক্ট করে অন করুন", Toast.LENGTH_LONG).show();
        } catch (Exception e) {
            appendLog("Could not open accessibility settings: " + e.getMessage());
        }
    }

    private void showShizukuGuideDialog() {
        // Check if Shizuku is installed and running on the phone
        try {
            if (!Shizuku.pingBinder()) {
                appendLog("⚠️ Shizuku service is not running. Please open Shizuku app and start it.");
                showManualShizukuGuide("Shizuku সার্ভিস ফোনে চালু নেই!\n\nদয়া করে প্রথমে Shizuku অ্যাপটি ওপেন করে সার্ভিস চালু (Start) করুন, অথবা নিচের ম্যানুয়াল কমান্ড কপি করে পিসির ADB দিয়ে রান করুন।");
                return;
            }

            // Check if our app has permission to use Shizuku
            if (Shizuku.checkSelfPermission() == PackageManager.PERMISSION_GRANTED) {
                appendLog("🛡️ Shizuku permission already granted. Applying accessibility settings...");
                applyShizukuAccessibilityFix();
            } else if (Shizuku.shouldShowRequestPermissionRationale()) {
                new AlertDialog.Builder(this)
                        .setTitle("🛡️ Shizuku পারমিশন প্রয়োজন")
                        .setMessage("ইনফিনিক্স ফোন যাতে ব্যাকগ্রাউন্ডে সার্ভিস বন্ধ না করে, সেজন্য Shizuku পারমিশন এলাউ করুন।")
                        .setPositiveButton("এলাউ করুন", (d, w) -> {
                            Shizuku.requestPermission(SHIZUKU_PERMISSION_REQUEST_CODE);
                        })
                        .setNegativeButton("বাতিল", null)
                        .show();
            } else {
                appendLog("Prompting for Shizuku permission popup...");
                Shizuku.requestPermission(SHIZUKU_PERMISSION_REQUEST_CODE);
            }
        } catch (Throwable t) {
            appendLog("Shizuku binder check exception: " + t.getMessage());
            showManualShizukuGuide("Shizuku সার্ভিস সনাক্ত করা যায়নি। নিচের কমান্ডটি কপি করে রান করতে পারেন:");
        }
    }

    private void applyShizukuAccessibilityFix() {
        new Thread(() -> {
            try {
                String pkg = getPackageName();
                String serviceClass = pkg + "/" + UssdAccessibilityService.class.getName();
                String[] commands = new String[]{
                        "pm grant " + pkg + " android.permission.WRITE_SECURE_SETTINGS",
                        "settings put secure enabled_accessibility_services " + serviceClass,
                        "settings put secure accessibility_enabled 1"
                };

                for (String cmd : commands) {
                    executeShizukuCommand(cmd);
                }

                runOnUiThread(() -> {
                    appendLog("🎉 Shizuku সফলভাবে রান হয়েছে! Accessibility পারমিশন লক করা হয়েছে।");
                    Toast.makeText(MainActivity.this, "✅ Shizuku সফল! সার্ভিস চিরস্থায়ীভাবে অন হয়েছে।", Toast.LENGTH_LONG).show();
                    updateAccessibilityUI();
                });
            } catch (Exception e) {
                Log.e("MainActivity", "Failed to apply shizuku commands", e);
                runOnUiThread(() -> {
                    appendLog("❌ Shizuku execution error: " + e.getMessage());
                    Toast.makeText(MainActivity.this, "Shizuku রান করতে সমস্যা: " + e.getMessage(), Toast.LENGTH_SHORT).show();
                });
            }
        }).start();
    }

    private void executeShizukuCommand(String command) throws Exception {
        Process process = Shizuku.newProcess(new String[]{"sh", "-c", command}, null, null);
        BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()));
        String line;
        while ((line = reader.readLine()) != null) {
            Log.d("ShizukuCmd", line);
        }
        process.waitFor();
    }

    private void showManualShizukuGuide(String intro) {
        String cmd = "pm grant " + getPackageName() + " android.permission.WRITE_SECURE_SETTINGS\n" +
                "settings put secure enabled_accessibility_services " + getPackageName() + "/com.bdjob.smsgateway.UssdAccessibilityService\n" +
                "settings put secure accessibility_enabled 1";

        new AlertDialog.Builder(this)
                .setTitle("🛡️ Shizuku / ADB স্থায়ী পারমিশন গাইড")
                .setMessage(intro + "\n\n" + cmd + "\n\nক্লিপবোর্ডে কপি করবেন?")
                .setPositiveButton("কপি করুন", (dialog, which) -> {
                    android.content.ClipboardManager clipboard = (android.content.ClipboardManager) getSystemService(Context.CLIPBOARD_SERVICE);
                    if (clipboard != null) {
                        android.content.ClipData clip = android.content.ClipData.newPlainText("Shizuku Command", cmd);
                        clipboard.setPrimaryClip(clip);
                        Toast.makeText(MainActivity.this, "📋 কমান্ড কপি হয়েছে! Shizuku বা টার্মিনালে পেস্ট করুন।", Toast.LENGTH_SHORT).show();
                    }
                })
                .setNegativeButton("বন্ধ করুন", null)
                .show();
    }

    private void appendLog(String message) {
        String time = new SimpleDateFormat("HH:mm:ss", Locale.getDefault()).format(new Date());
        String line = "[" + time + "] " + message + "\n";
        tvLog.append(line);
        svLog.post(() -> svLog.fullScroll(View.FOCUS_DOWN));
    }
}
