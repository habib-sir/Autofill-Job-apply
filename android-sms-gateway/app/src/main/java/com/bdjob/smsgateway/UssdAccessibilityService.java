package com.bdjob.smsgateway;

import android.accessibilityservice.AccessibilityService;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.util.Log;
import android.view.accessibility.AccessibilityEvent;
import android.view.accessibility.AccessibilityNodeInfo;

import org.json.JSONObject;

import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class UssdAccessibilityService extends AccessibilityService {

    private static final String TAG = "UssdAccessibility";
    public static boolean isServiceConnected = false;

    private final ExecutorService executor = Executors.newSingleThreadExecutor();
    private static long lastDetectedTime = 0;

    // Regex to detect balance like "Tk 125.50", "Balance: 125.50 Tk", "Tk. 50", "৫০ টাকা"
    private static final Pattern BALANCE_PATTERN = Pattern.compile(
            "(?:Tk|Tk\\.|Balance|Bal|টাকা|টাক\\.)[:\\s]*([0-9]+(?:\\.[0-9]{1,2})?)",
            Pattern.CASE_INSENSITIVE
    );

    @Override
    public void onServiceConnected() {
        super.onServiceConnected();
        isServiceConnected = true;
        Log.i(TAG, "UssdAccessibilityService connected and active!");
        broadcastLog("⚡ Accessibility Service Connected! Ready to auto-read *152# balance popups.");
    }

    @Override
    public void onAccessibilityEvent(AccessibilityEvent event) {
        if (event == null) return;

        AccessibilityNodeInfo source = getRootInActiveWindow();
        if (source == null) {
            source = event.getSource();
        }
        if (source == null) return;

        try {
            StringBuilder allText = new StringBuilder();
            extractAllText(source, allText);
            String fullScreenText = allText.toString().trim();

            if (fullScreenText.isEmpty()) return;

            // Check if this screen belongs to USSD Dialog
            boolean isUssdScreen = fullScreenText.contains("USSD")
                    || fullScreenText.contains("balance")
                    || fullScreenText.contains("Balance")
                    || fullScreenText.contains("ব্যালেন্স")
                    || fullScreenText.contains("Tk")
                    || fullScreenText.contains("টাকা")
                    || fullScreenText.contains("Validity")
                    || fullScreenText.contains("মেয়াদ");

            if (isUssdScreen) {
                Matcher matcher = BALANCE_PATTERN.matcher(fullScreenText);
                String detectedBalance = null;
                if (matcher.find()) {
                    detectedBalance = matcher.group(1);
                }

                // Debounce so we don't spam multiple times within 4 seconds
                long now = System.currentTimeMillis();
                if (detectedBalance != null && (now - lastDetectedTime > 4000)) {
                    lastDetectedTime = now;
                    broadcastLog("🎯 Accessibility detected Teletalk Balance: ৳ " + detectedBalance);
                    broadcastLog("Raw: " + fullScreenText);

                    // Send to backend PC extension
                    sendBalanceToBackend(detectedBalance, fullScreenText);

                    // Dismiss dialog automatically by finding OK or Close button
                    dismissDialog(source);
                }
            }
        } catch (Exception e) {
            Log.e(TAG, "Error parsing accessibility event: " + e.getMessage());
        } finally {
            try {
                source.recycle();
            } catch (Exception ignored) {}
        }
    }

    private void extractAllText(AccessibilityNodeInfo node, StringBuilder sb) {
        if (node == null) return;

        if (node.getText() != null) {
            sb.append(node.getText().toString()).append(" ");
        }
        if (node.getContentDescription() != null) {
            sb.append(node.getContentDescription().toString()).append(" ");
        }

        int count = node.getChildCount();
        for (int i = 0; i < count; i++) {
            AccessibilityNodeInfo child = node.getChild(i);
            if (child != null) {
                extractAllText(child, sb);
                try {
                    child.recycle();
                } catch (Exception ignored) {}
            }
        }
    }

    private void dismissDialog(AccessibilityNodeInfo root) {
        if (root == null) return;
        try {
            // Find "OK", "Dismiss", "Cancel", "ঠিক আছে", "বাতিল"
            String[] dismissLabels = {"OK", "Ok", "ok", "Dismiss", "Close", "Cancel", "ঠিক আছে", "বন্ধ করুন"};
            for (String label : dismissLabels) {
                java.util.List<AccessibilityNodeInfo> list = root.findAccessibilityNodeInfosByText(label);
                if (list != null && !list.isEmpty()) {
                    for (AccessibilityNodeInfo btn : list) {
                        if (btn.isClickable()) {
                            btn.performAction(AccessibilityNodeInfo.ACTION_CLICK);
                            broadcastLog("✨ Auto-closed USSD dialog cleanly.");
                            return;
                        }
                    }
                }
            }
        } catch (Exception e) {
            Log.w(TAG, "Dismiss action note: " + e.getMessage());
        }
    }

    private void sendBalanceToBackend(String amount, String rawText) {
        executor.execute(() -> {
            try {
                SharedPreferences prefs = getSharedPreferences("bd_sms_gateway_prefs", Context.MODE_PRIVATE);
                String serverUrl = prefs.getString("server_url", "http://192.168.10.27:3000");
                String cleanUrl = serverUrl.replaceAll("/+$", "") + "/api/sms/ussd-response";

                JSONObject body = new JSONObject();
                body.put("requestId", "auto_acc_" + System.currentTimeMillis());
                body.put("rawResponse", rawText);
                body.put("code", "*152#");

                HttpURLConnection conn = (HttpURLConnection) new URL(cleanUrl).openConnection();
                conn.setRequestMethod("POST");
                conn.setRequestProperty("Content-Type", "application/json; charset=UTF-8");
                conn.setConnectTimeout(6000);
                conn.setReadTimeout(6000);
                conn.setDoOutput(true);

                try (OutputStream os = conn.getOutputStream()) {
                    os.write(body.toString().getBytes(StandardCharsets.UTF_8));
                }

                int respCode = conn.getResponseCode();
                if (respCode == 200) {
                    broadcastLog("✅ Successfully synced balance ৳ " + amount + " to PC Extension!");
                }
                conn.disconnect();
            } catch (Exception e) {
                Log.e(TAG, "Failed to upload balance to server: " + e.getMessage());
            }
        });
    }

    private void broadcastLog(String message) {
        try {
            Intent intent = new Intent("com.bdjob.smsgateway.LOG_EVENT");
            intent.putExtra("log", message);
            intent.putExtra("message", message);
            intent.setPackage(getPackageName());
            sendBroadcast(intent);
        } catch (Exception ignored) {}
    }

    @Override
    public void onInterrupt() {
        isServiceConnected = false;
        broadcastLog("⚠️ Accessibility Service interrupted.");
    }

    @Override
    public boolean onUnbind(Intent intent) {
        isServiceConnected = false;
        return super.onUnbind(intent);
    }
}
