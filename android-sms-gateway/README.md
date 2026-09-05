# BD Job SMS Gateway - Android Native App

This is the native Android application that runs on your Android phone with a **Teletalk SIM card**.
It connects with the **BD Job Autofill Chrome Extension**.

When you click **"Send SMS"** in the Chrome Extension on your PC, this Android app automatically sends the SMS to `16222` using your phone's Teletalk SIM. When Teletalk replies with your PIN or password, this app intercepts the reply and syncs it back to your PC in real-time.

---

## 3 Ways to Run on Your Phone

### Option 1: MacroDroid (Zero Compiling, 60-Second Setup - Recommended!)
If you don't want to install Android Studio or compile code:
1. Install the free **MacroDroid** app from Google Play Store on your phone.
2. Grant it **SMS** and **Notification** permissions.
3. Import the included `macrodroid-profile.json` (or set up a simple Webhook trigger to send SMS to 16222).
4. Enter your Gateway URL and Token shown in the Chrome Extension.
5. Done! You can now send SMS directly from the Chrome extension.

---

### Option 2: Termux (100% Free, 2 Commands on Phone)
1. Install **Termux** and **Termux:API** from F-Droid or Play Store.
2. Grant SMS permissions to Termux:API in your phone settings.
3. In Termux, run:
   ```bash
   pkg update && pkg install curl jq termux-api
   curl -O http://<YOUR_GATEWAY_URL>/termux-gateway.sh
   bash termux-gateway.sh <YOUR_GATEWAY_URL> <YOUR_TOKEN>
   ```
4. Termux will run in the background, send SMS to `16222` when triggered from PC, and report replies!

---

### Option 3: Full Native Android Studio Project (Java / Kotlin)
The complete Android project source code is in this directory (`/android-sms-gateway/app`):
- `app/src/main/AndroidManifest.xml`: Declares `SEND_SMS`, `RECEIVE_SMS`, and `FOREGROUND_SERVICE` permissions.
- `MainActivity.java`: Interface to enter Server URL, Pairing Code, and select Teletalk SIM slot (SIM 1 or SIM 2).
- `SmsGatewayService.java`: Persistent Foreground Service that polls for pending SMS jobs from the extension and calls Android's native `SmsManager.sendTextMessage("16222", null, body, ...)`.
- `SmsReceiver.java`: Background `BroadcastReceiver` that captures incoming SMS from `16222` and automatically syncs the PIN to your extension.

#### How to Build in Android Studio:
1. Open Android Studio -> **Open an Existing Project** -> select `android-sms-gateway`.
2. Connect your Android phone via USB (or Wi-Fi debugging).
3. Click **Run** (Green play button).
4. When prompted on your phone, tap **Allow** for SMS permissions.
5. In the app, enter the **Gateway URL** and **Pairing Code** shown on your extension, then tap **Connect**.
