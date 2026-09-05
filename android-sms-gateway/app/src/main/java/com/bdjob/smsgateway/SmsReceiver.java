package com.bdjob.smsgateway;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.telephony.SmsMessage;
import android.util.Log;

import org.json.JSONObject;

import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.Executors;

public class SmsReceiver extends BroadcastReceiver {

    private static final String TAG = "SmsReceiver";

    @Override
    public void onReceive(Context context, Intent intent) {
        if (!"android.provider.Telephony.SMS_RECEIVED".equals(intent.getAction())) {
            return;
        }

        Bundle bundle = intent.getExtras();
        if (bundle == null) return;

        Object[] pdus = (Object[]) bundle.get("pdus");
        String format = bundle.getString("format");

        if (pdus == null || pdus.length == 0) return;

        StringBuilder fullBody = new StringBuilder();
        String sender = "";

        for (Object pdu : pdus) {
            SmsMessage message;
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.M) {
                message = SmsMessage.createFromPdu((byte[]) pdu, format);
            } else {
                message = SmsMessage.createFromPdu((byte[]) pdu);
            }

            if (message != null) {
                if (sender.isEmpty() && message.getDisplayOriginatingAddress() != null) {
                    sender = message.getDisplayOriginatingAddress();
                }
                fullBody.append(message.getMessageBody());
            }
        }

        final String finalSender = sender;
        final String finalBody = fullBody.toString();

        Log.d(TAG, "Incoming SMS from " + finalSender + ": " + finalBody);

        // Check if this is a Teletalk / 16222 message
        boolean isTeletalk = finalSender.contains("16222") ||
                finalBody.toLowerCase().contains("pin is") ||
                finalBody.toLowerCase().contains("application fee") ||
                finalBody.toLowerCase().contains("user id is") ||
                finalBody.toLowerCase().contains("password is");

        if (isTeletalk) {
            // Forward directly to the Chrome Extension Gateway
            SharedPreferences prefs = context.getSharedPreferences("bd_sms_gateway_prefs", Context.MODE_PRIVATE);
            String serverUrl = prefs.getString("server_url", "");

            if (!serverUrl.isEmpty()) {
                Executors.newSingleThreadExecutor().execute(() -> {
                    try {
                        String cleanUrl = serverUrl.replaceAll("/+$", "") + "/api/sms/incoming";
                        JSONObject json = new JSONObject();
                        json.put("sender", finalSender);
                        json.put("body", finalBody);

                        URL url = new URL(cleanUrl);
                        HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                        conn.setRequestMethod("POST");
                        conn.setConnectTimeout(5000);
                        conn.setRequestProperty("Content-Type", "application/json");
                        conn.setDoOutput(true);

                        try (OutputStream os = conn.getOutputStream()) {
                            os.write(json.toString().getBytes(StandardCharsets.UTF_8));
                        }

                        int respCode = conn.getResponseCode();
                        Log.d(TAG, "Forwarded 16222 SMS to PC Extension, response: " + respCode);

                        Intent logIntent = new Intent("com.bdjob.smsgateway.LOG_EVENT");
                        logIntent.putExtra("log", "📥 Received 16222 Reply! Synced to PC: " + finalBody);
                        context.sendBroadcast(logIntent);

                    } catch (Exception e) {
                        Log.e(TAG, "Failed to forward incoming SMS", e);
                    }
                });
            }
        }
    }
}
