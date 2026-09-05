# 60-Second Setup with MacroDroid (No Coding Needed!)

If you want an app on your phone that has full access to send SMS from your phone without compiling Android Studio projects:

1. Download **MacroDroid - Device Automation** from Google Play Store.
2. Open MacroDroid, grant it **SMS Permissions** (Settings -> Apps -> MacroDroid -> Permissions -> SMS -> Allow).

### Macro 1: Auto-Send SMS from Chrome Extension
- **Trigger**: Webhook (or Interval / Notification)
  - Or use MacroDroid's built-in **HTTP Request** polling: Every 3 seconds, `GET http://<SERVER_URL>/api/sms/pending`.
- **Action**: **Send SMS**
  - **Phone Number**: `16222`
  - **Message**: `{lv=sms_body}`
  - **SIM Card**: Select **Teletalk**
- **Action 2**: **HTTP Request (POST)** to `http://<SERVER_URL>/api/sms/report-sent` with `{"jobId": "{lv=job_id}"}`.

### Macro 2: Auto-Sync 16222 Reply PIN to Chrome Extension
- **Trigger**: **SMS Received**
  - Sender: `16222`
- **Action**: **HTTP Request (POST)**
  - URL: `http://<SERVER_URL>/api/sms/incoming`
  - Content-Type: `application/json`
  - Body: `{"sender": "16222", "body": "{sms_message}"}`

Now, whenever you click **"Send 1st SMS from Phone"** or **"Send 2nd Confirmation SMS from Phone"** in the Chrome Extension, your phone automatically fires the SMS through your Teletalk SIM, and relays the PIN back!
