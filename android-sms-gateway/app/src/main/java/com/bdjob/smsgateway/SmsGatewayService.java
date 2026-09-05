package com.bdjob.smsgateway;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.telephony.SmsManager;
import android.util.Log;

import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class SmsGatewayService extends Service {

    public static final String TAG = "SmsGatewayService";
    private static final String CHANNEL_ID = "bd_job_sms_gateway_channel";
    private static final int NOTIFICATION_ID = 101;

    public static boolean isRunning = false;

    private String serverUrl = "";
    private String pairingCode = "";
    private int simSubscriptionId = -1;

    private final Handler handler = new Handler(Looper.getMainLooper());
    private final ExecutorService executor = Executors.newSingleThreadExecutor();
    private boolean isPolling = false;

    private final Runnable pollRunnable = new Runnable() {
        @Override
        public void run() {
            if (!isPolling) return;
            executor.execute(() -> {
                fetchAndProcessPendingSms();
            });
            handler.postDelayed(this, 2500); // Poll every 2.5 seconds
        }
    };

    @Override
    public void onCreate() {
        super.onCreate();
        createNotificationChannel();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null) {
            serverUrl = intent.getStringExtra("server_url");
            pairingCode = intent.getStringExtra("pairing_code");
            simSubscriptionId = intent.getIntExtra("sim_sub_id", -1);
        }

        if (serverUrl == null || serverUrl.isEmpty()) {
            serverUrl = getSharedPreferences("bd_sms_gateway_prefs", MODE_PRIVATE).getString("server_url", "");
        }
        if (pairingCode == null || pairingCode.isEmpty()) {
            pairingCode = getSharedPreferences("bd_sms_gateway_prefs", MODE_PRIVATE).getString("pairing_code", "");
        }

        startForeground(NOTIFICATION_ID, buildForegroundNotification("Connected to Chrome Extension - Ready to send"));
        isRunning = true;
        isPolling = true;

        // Register device with server
        executor.execute(this::registerDevice);

        // Start polling
        handler.removeCallbacks(pollRunnable);
        handler.post(pollRunnable);

        sendBroadcastLog("Gateway service active. Polling server at: " + serverUrl);

        return START_STICKY;
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        isRunning = false;
        isPolling = false;
        handler.removeCallbacks(pollRunnable);
        executor.shutdown();
        sendBroadcastLog("Gateway service stopped.");
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID,
                    "BD Job SMS Gateway Service",
                    NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription("Keeps the phone connected to send SMS from Chrome extension");
            NotificationManager nm = getSystemService(NotificationManager.class);
            if (nm != null) {
                nm.createNotificationChannel(channel);
            }
        }
    }

    private Notification buildForegroundNotification(String statusText) {
        Intent notificationIntent = new Intent(this, MainActivity.class);
        PendingIntent pendingIntent = PendingIntent.getActivity(
                this, 0, notificationIntent,
                Build.VERSION.SDK_INT >= Build.VERSION_CODES.M ? PendingIntent.FLAG_IMMUTABLE : 0
        );

        return new NotificationCompat.Builder(this, CHANNEL_ID)
                .setContentTitle("BD Job SMS Gateway Active")
                .setContentText(statusText)
                .setSmallIcon(android.R.drawable.sym_action_chat)
                .setContentIntent(pendingIntent)
                .setOngoing(true)
                .build();
    }

    private void registerDevice() {
        try {
            String cleanUrl = serverUrl.replaceAll("/+$", "") + "/api/sms/pair";
            JSONObject body = new JSONObject();
            body.put("token", pairingCode);
            body.put("deviceName", Build.MANUFACTURER.toUpperCase() + " " + Build.MODEL);
            body.put("phoneModel", Build.MODEL);
            body.put("simCarrier", "Teletalk (SIM Slot " + (simSubscriptionId > 0 ? simSubscriptionId : 1) + ")");
            body.put("batteryLevel", 95);

            String response = makeHttpRequest(cleanUrl, "POST", body.toString());
            sendBroadcastLog("Paired with extension gateway: " + response);
        } catch (Exception e) {
            Log.e(TAG, "Registration error", e);
            sendBroadcastLog("Registration failed: " + e.getMessage());
        }
    }

    private void fetchAndProcessPendingSms() {
        try {
            String cleanUrl = serverUrl.replaceAll("/+$", "") + "/api/sms/pending";
            String response = makeHttpRequest(cleanUrl, "GET", null);
            if (response == null) return;

            JSONObject json = new JSONObject(response);
            if (!json.optBoolean("ok", false)) return;

            JSONArray jobs = json.optJSONArray("jobs");
            if (jobs == null || jobs.length() == 0) return;

            for (int i = 0; i < jobs.length(); i++) {
                JSONObject job = jobs.getJSONObject(i);
                String jobId = job.getString("id");
                String recipient = job.getString("recipient");
                String smsBody = job.getString("body");

                sendBroadcastLog("Incoming command from PC: Send SMS to " + recipient + " -> \"" + smsBody + "\"");

                // Execute sending through phone SIM
                boolean sent = sendSms(this, simSubscriptionId, recipient, smsBody);

                if (sent) {
                    reportJobSent(jobId);
                    sendBroadcastLog("✅ SMS successfully sent to " + recipient + " via Teletalk!");
                } else {
                    sendBroadcastLog("❌ Failed to send SMS to " + recipient);
                }
            }
        } catch (Exception e) {
            // Suppress continuous polling network errors in logs
            Log.w(TAG, "Poll error: " + e.getMessage());
        }
    }

    private void reportJobSent(String jobId) {
        try {
            String cleanUrl = serverUrl.replaceAll("/+$", "") + "/api/sms/report-sent";
            JSONObject body = new JSONObject();
            body.put("jobId", jobId);
            body.put("simUsed", "Teletalk SIM");
            makeHttpRequest(cleanUrl, "POST", body.toString());
        } catch (Exception e) {
            Log.e(TAG, "Report error", e);
        }
    }

    public static boolean sendSms(Context context, int subId, String recipient, String body) {
        try {
            SmsManager smsManager;
            if (subId >= 0 && Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP_MR1) {
                smsManager = SmsManager.getSmsManagerForSubscriptionId(subId);
            } else {
                smsManager = SmsManager.getDefault();
            }

            if (smsManager == null) {
                return false;
            }

            if (body.length() > 160) {
                java.util.ArrayList<String> parts = smsManager.divideMessage(body);
                smsManager.sendMultipartTextMessage(recipient, null, parts, null, null);
            } else {
                smsManager.sendTextMessage(recipient, null, body, null, null);
            }
            return true;
        } catch (Exception e) {
            Log.e(TAG, "SmsManager error", e);
            return false;
        }
    }

    private String makeHttpRequest(String urlStr, String method, String jsonBody) throws Exception {
        URL url = new URL(urlStr);
        HttpURLConnection conn = (HttpURLConnection) url.openConnection();
        conn.setRequestMethod(method);
        conn.setConnectTimeout(5000);
        conn.setReadTimeout(5000);

        if (jsonBody != null) {
            conn.setRequestProperty("Content-Type", "application/json");
            conn.setDoOutput(true);
            try (OutputStream os = conn.getOutputStream()) {
                os.write(jsonBody.getBytes(StandardCharsets.UTF_8));
            }
        }

        int code = conn.getResponseCode();
        if (code >= 200 && code < 300) {
            try (BufferedReader br = new BufferedReader(new InputStreamReader(conn.getInputStream(), StandardCharsets.UTF_8))) {
                StringBuilder sb = new StringBuilder();
                String line;
                while ((line = br.readLine()) != null) {
                    sb.append(line);
                }
                return sb.toString();
            }
        }
        return null;
    }

    private void sendBroadcastLog(String message) {
        Intent intent = new Intent("com.bdjob.smsgateway.LOG_EVENT");
        intent.putExtra("log", message);
        sendBroadcast(intent);
    }
}
