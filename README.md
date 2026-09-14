# Autofill Job Apply — One-Click Teletalk & BD Government Job Application Autofill

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](./LICENSE)
[![Platform: Chrome Extension](https://img.shields.io/badge/Platform-Chrome%20Extension-blue.svg)]()
[![Privacy: Local Only](https://img.shields.io/badge/Data-Stored%20Locally-brightgreen.svg)]()
[![Made for Bangladesh](https://img.shields.io/badge/Made%20for-Bangladesh%20🇧🇩-red.svg)]()

**Autofill Job Apply** is a free, open-source Chrome extension that automatically fills **Bangladeshi government job application forms** on `teletalk.com.bd` and similar Teletalk-powered e-recruitment portals (BPSC, NTRCA, Bank Jobs, Primary Teacher, Police, Ansar-VDP, and other circulars hosted on Teletalk). Save your CV / profile once, then apply to any job in seconds instead of retyping the same information every time.

> চাকরির আবেদন ফর্ম বারবার টাইপ করতে হয়রান? এই এক্সটেনশন একবার প্রোফাইল সেভ করলেই টেলিটক-ভিত্তিক যেকোনো সরকারি চাকরির আবেদন ফর্ম **এক ক্লিকে** পূরণ করে দেয়।

**Keywords:** teletalk job apply autofill, bd job circular autofill, government job application Bangladesh, chakrir bibhag autofill, bpsc application form fill, ntrca application autofill, চাকরির আবেদন অটোফিল, টেলিটক চাকরির আবেদন

---

## 📑 Table of Contents

- [Why this exists](#-why-this-exists)
- [Features](#-features)
- [Installation](#-installation)
- [How to use](#-how-to-use)
- [Optional: SMS Gateway (auto-send application fee SMS)](#-optional-sms-gateway-auto-send-application-fee-sms)
- [Privacy & data security](#-privacy--data-security)
- [Supported sites](#-supported-sites)
- [FAQ](#-faq)
- [Contributing](#-contributing)
- [Disclaimer](#-disclaimer)
- [License](#-license)

---

## 🎯 Why this exists

Applying to Bangladeshi government jobs usually means retyping the exact same information — full name, father's/mother's name, date of birth, NID number, present/permanent address, SSC/HSC/graduation results — on dozens of separate `teletalk.com.bd` application forms throughout your job-hunting life. It's repetitive, slow, and one typo can cost you an application.

**Autofill Job Apply** removes that friction: save your details once, and fill any supported form in one click.

## 🚀 Features

- ✅ **One-click autofill** for Teletalk-hosted government job application forms
- ✅ **Multiple profiles** — keep separate saved profiles for different applicants or document sets
- ✅ **PDF CV import with local OCR** — upload your CV as a PDF and the extension reads it automatically (via an on-device OCR engine) to pre-fill your profile — no server upload, everything happens in your browser
- ✅ **Bilingual field support** — fills both English and Bangla (Unicode) name/address fields where the form requires both
- ✅ **Handles real form controls** — text inputs, dropdowns, radio buttons, and checkboxes, not just plain text fields
- ✅ **Export / import your profile as JSON** — back up your data or move it to another computer
- ✅ **Application history tracker** — keeps a local log of which jobs you've applied to and when
- ✅ **100% local data storage** — no account, no cloud sync, no analytics or tracking
- ✅ **Optional SMS Gateway** — send the Teletalk fee-payment SMS and read back the PIN/password reply automatically through your own Android phone (see below)
- ✅ **Free and open source** (MIT license)

## 📦 Installation

Chrome doesn't allow unlisted extensions to auto-update outside the Web Store, so this project is currently installed in **Developer Mode** — it takes under two minutes:

1. **Download this repository**
   ```bash
   git clone https://github.com/habib-sir/Autofill-Job-apply.git
   ```
   Or click **Code → Download ZIP** on GitHub and extract it.

2. Open Chrome (or any Chromium browser — Edge, Brave, Kiwi Browser on Android) and go to:
   ```
   chrome://extensions
   ```

3. Turn on **Developer mode** (top-right toggle).

4. Click **Load unpacked** and select the folder you downloaded.

5. Pin the extension icon to your toolbar for quick access.

## 🧭 How to use

1. Click the extension icon → **Profiles** → create a new profile.
2. Fill in your details manually, **or** click **Upload CV (PDF)** and let the built-in OCR extract your information automatically.
3. Open any application form on a supported job portal (e.g. `bpsc.teletalk.com.bd`, `police.teletalk.com.bd`, etc.).
4. Click the extension icon and hit **Autofill** — all matching fields are filled instantly.
5. Review the filled form carefully, then submit as normal.
6. Check **Applications** in the extension to see your saved application history.

## 📲 Optional: SMS Gateway (auto-send application fee SMS)

Most Teletalk job applications require sending an SMS to **16222** to pay the application fee and receive a PIN/password. This project includes an optional add-on that automates that step through your **own phone's SIM** — no third-party SMS service, no extra cost beyond your own SMS charges:

- A small local bridge server (`server.js`) runs on your PC
- A companion Android app (`android-sms-gateway/`) runs on your phone, connected over your home Wi-Fi
- The extension can dispatch the fee SMS through your phone's SIM and automatically capture the PIN/password reply

This is entirely optional — the core autofill feature works fully without it. See [`SETUP-SMS-GATEWAY.md`](./SETUP-SMS-GATEWAY.md) and [`android-sms-gateway/README.md`](./android-sms-gateway/README.md) for setup instructions.

## 🔒 Privacy & data security

- Your profile (including sensitive fields like NID number) is stored **only in your browser's local extension storage** — never uploaded to any server owned by the developer.
- PDF-to-profile OCR runs **entirely on your device** using a bundled OCR engine — your CV file is never sent anywhere.
- If you use the optional SMS Gateway, message data stays on **your own PC** (in a local file) and **your own phone** — again, nothing goes through any third-party server.
- No analytics, no telemetry, no ads.

## 🌐 Supported sites

Built and tested against **`*.teletalk.com.bd`** government job application portals (BPSC, NTRCA, Bank recruitment, Police, Ansar-VDP, Primary Teacher recruitment, and other circulars hosted on Teletalk's e-recruitment platform). Field mapping is configuration-driven (see `teletalk-mapping.js`), so support for additional portals can be added without touching the core autofill logic.

## ❓ FAQ

**Does this work on mobile?**
Chrome for Android doesn't support extensions. You can use [Kiwi Browser](https://kiwibrowser.com/) (a Chromium-based Android browser that supports Chrome extensions) to load this extension on your phone, or build the included lightweight custom Android browser (`bd-job-browser/`) that has autofill built in natively.

**Is my NID number and personal data safe?**
Yes — everything is stored locally in your browser (or in your phone's app storage for the SMS Gateway). Nothing is uploaded to any server operated by this project.

**Does it cost anything?**
No, the extension itself is completely free and open source. The optional SMS Gateway sends SMS through your own SIM, so normal SMS charges from your mobile operator apply — there's no additional fee from this tool.

**Will it work on non-Teletalk job portals?**
Not out of the box — the field mapping is built specifically for Teletalk's form structure. Contributions adding mapping support for other portals are welcome.

## 🤝 Contributing

Issues and pull requests are welcome. Please don't commit real personal data (NID numbers, phone numbers, real names) in sample/seed files or in generated runtime data files — see [`PRODUCTION_CHECKLIST.md`](./PRODUCTION_CHECKLIST.md) before pushing changes.

## ⚠️ Disclaimer

This is an **unofficial, community-built tool** and is **not affiliated with Teletalk Bangladesh Limited, BPSC, NTRCA, or any government body**. Use it at your own risk, and always review every autofilled field carefully before submitting a real job application.

## 📄 License

Released under the [MIT License](./LICENSE) — free to use, modify, and distribute.

---

<p align="center">Made with ❤️ for Bangladeshi job seekers</p>
