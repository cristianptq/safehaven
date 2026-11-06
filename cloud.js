"use strict";

// Optional cloud import helpers. These require an internet connection and the
// provider's official picker script (loaded on demand). The app itself never
// depends on them — file-based import/export remains the offline path.
//
// To enable, register OAuth clients and paste the IDs below:
//  - OneDrive:    https://portal.azure.com -> App registrations (redirect URI = app origin)
//  - Google Drive: https://console.cloud.google.com -> OAuth client + API key, enable Drive API
const CLOUD_CONFIG = {
  oneDriveClientId: "",
  googleClientId: "",
  googleApiKey: ""
};

const cloud = (() => {
  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = src;
      s.onload = resolve;
      s.onerror = () => reject(new Error("Failed to load " + src));
      document.head.appendChild(s);
    });
  }

  function ensureOnline(provider) {
    if (!navigator.onLine) {
      toast(provider + " import needs an internet connection. Use file import when offline.");
      return false;
    }
    return true;
  }

  async function pickOneDrive() {
    if (!ensureOnline("OneDrive")) return;
    if (!CLOUD_CONFIG.oneDriveClientId) {
      toast("OneDrive is not configured yet — see README");
      return;
    }
    try {
      await loadScript("https://js.live.net/v7.2/OneDrive.js");
      OneDrive.open({
        clientId: CLOUD_CONFIG.oneDriveClientId,
        action: "download",
        multiSelect: false,
        openInNewWindow: true,
        advanced: { filter: ".json" },
        success: async (resp) => {
          try {
            const file = resp.value && resp.value[0];
            const url = file && (file["@microsoft.graph.downloadUrl"] || (file.permissions && file.permissions[0] && file.permissions[0].link && file.permissions[0].link.webUrl));
            if (!url) throw new Error("no download url");
            const blob = await (await fetch(url)).blob();
            await doImportFile(new File([blob], file.name || "safehaven-backup.json", { type: "application/json" }));
          } catch (err) {
            console.error(err);
            toast("Could not download the file from OneDrive");
          }
        },
        cancel: () => {},
        error: (err) => {
          console.error(err);
          toast("OneDrive picker failed");
        }
      });
    } catch (err) {
      console.error(err);
      toast("OneDrive picker could not load (offline?)");
    }
  }

  let googleTokenClient = null;

  async function pickGoogleDrive() {
    if (!ensureOnline("Google Drive")) return;
    if (!CLOUD_CONFIG.googleClientId || !CLOUD_CONFIG.googleApiKey) {
      toast("Google Drive is not configured yet — see README");
      return;
    }
    try {
      await loadScript("https://accounts.google.com/gsi/client");
      await loadScript("https://apis.google.com/js/api.js");
      await new Promise((resolve) => gapi.load("client:picker", resolve));
      await gapi.client.load("https://www.googleapis.com/discovery/v1/apis/drive/v3/rest");

      googleTokenClient = google.accounts.oauth2.initTokenClient({
        client_id: CLOUD_CONFIG.googleClientId,
        scope: "https://www.googleapis.com/auth/drive.readonly",
        callback: async (tokenResp) => {
          if (tokenResp.error) {
            toast("Google sign-in failed");
            return;
          }
          const picker = new google.picker.PickerBuilder()
            .setOAuthToken(tokenResp.access_token)
            .setDeveloperKey(CLOUD_CONFIG.googleApiKey)
            .addView(new google.picker.DocsView().setMimeTypes("application/json").setSelectFolderEnabled(false))
            .setCallback(async (data) => {
              if (data.action !== google.picker.Action.PICKED) return;
              try {
                const doc = data.docs[0];
                const resp = await gapi.client.drive.files.get({ fileId: doc.id, alt: "media" });
                const blob = new Blob([resp.body], { type: "application/json" });
                await doImportFile(new File([blob], doc.name || "safehaven-backup.json", { type: "application/json" }));
              } catch (err) {
                console.error(err);
                toast("Could not download the file from Google Drive");
              }
            })
            .build();
          picker.setVisible(true);
        }
      });
      googleTokenClient.requestAccessToken();
    } catch (err) {
      console.error(err);
      toast("Google Drive picker could not load (offline?)");
    }
  }

  return { pickOneDrive, pickGoogleDrive };
})();
