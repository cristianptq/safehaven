# SafeHaven — Family Emergency Plan

A disaster-preparedness web app that works **100% offline**. It is the single digital point for your family's emergency plan, vital documents and information during a disaster. Guidance is summarized from [ready.gov/plan](https://www.ready.gov/plan), [ready.gov/kit](https://www.ready.gov/kit), FEMA and the Red Cross.

## Features

- **Emergency plan** — emergency numbers, out-of-area contact, three meeting places, evacuation routes, utility shutoffs, notes, plus built-in best practices.
- **ICE card** — one-tap "In Case of Emergency" screen with call buttons, meeting places and household medical alerts.
- **People** — household members (blood type, allergies, medications, conditions, doctor), pets, and emergency contacts with tap-to-call.
- **Vault** — store vital files on-device (photos of IDs, insurance cards, PDFs; camera capture supported) plus structured vital records (policies, accounts, medical info).
- **Emergency kit checklist** — pre-loaded from ready.gov/kit; tick items off, add quantities/notes and custom items.
- **Backup & sync** — export everything (documents included) to a single JSON file, optionally encrypted with a passphrase (PBKDF2 + AES-GCM). Move it between family devices via Bluetooth / Nearby Share / USB — no internet needed. Import replaces local data. Optional import from OneDrive / Google Drive is available when online (see below).
- **Print** — paper summary of plan, medical info, contacts and kit for the physical emergency kit.
- **Light & dark themes** — follows your system preference; toggle with the ☀️/🌙 button in the top bar.

## Privacy

All data stays on the device (IndexedDB). There are no accounts, no servers, no analytics, no network calls at all.

## Run it

The app is plain HTML/CSS/JS — no build step. Serve the folder with any static server:

```sh
# from this folder
python -m http.server 8080
# or
npx serve .
```

## Install on Android

1. Serve the folder on your LAN (or host it anywhere over HTTPS).
2. Open it in Chrome on the Android device.
3. Menu → **Add to Home screen** / **Install app**.
4. Once installed, it works fully offline — all assets are cached by the service worker and all data is stored locally.

> Service workers require HTTPS or localhost. For LAN testing, `http://<your-pc-ip>:8080` works in Chrome for installation; for production use, host over HTTPS.

## Cloud import (optional, online only)

The app is fully offline by design. Importing a backup **from** OneDrive or Google Drive is an optional convenience that requires an internet connection and a one-time OAuth setup. File-based import/export always works offline.

1. Open [cloud.js](cloud.js) and fill in `CLOUD_CONFIG`:
   - **OneDrive** — register an app at [portal.azure.com](https://portal.azure.com) → App registrations → set a redirect URI to your app's origin → copy the Application (client) ID into `oneDriveClientId`.
   - **Google Drive** — create a project at [console.cloud.google.com](https://console.cloud.google.com) → enable the **Google Drive API** → create an **OAuth client ID** (web) and an **API key** → paste them into `googleClientId` and `googleApiKey`.
2. The provider's official picker script is loaded on demand only when you tap the button — nothing is loaded or sent anywhere otherwise.

## Regenerate icons

```sh
node tools/make-icons.js
```

## Backup format

- Plain: JSON with `app: "safehaven"`, all sections, and files embedded as base64 data URLs.
- Encrypted: same JSON encrypted with AES-GCM-256, key derived via PBKDF2-SHA256 (250k iterations). The passphrase is never stored.
