"use strict";

const ROUTES = {
  home: renderHome,
  plan: renderPlan,
  people: renderPeople,
  kit: renderKit,
  vault: renderVault,
  shelters: renderShelters,
  backup: renderBackup,
  ice: renderIce
};

function refresh() {
  router();
}

async function router() {
  const r = (location.hash.replace(/^#\/?/, "") || "home").split("?")[0];
  state.route = ROUTES[r] ? r : "home";
  $("#view").innerHTML = ROUTES[state.route]();
  $$(".tabbar a").forEach((a) => a.classList.toggle("active", a.getAttribute("href") === "#/" + state.route));
  if (state.route === "backup") fillStorageStat();
  window.scrollTo(0, 0);
}

async function fillStorageStat() {
  const el = $("#storageStat");
  if (!el || !navigator.storage || !navigator.storage.estimate) {
    if (el) el.textContent = "Storage estimate not available.";
    return;
  }
  try {
    const est = await navigator.storage.estimate();
    el.textContent = `${fmtSize(est.usage || 0)} used${est.quota ? ` of ~${fmtSize(est.quota)} available` : ""}`;
  } catch {
    el.textContent = "Storage estimate not available.";
  }
}

window.addEventListener("hashchange", router);

window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  state.deferredInstall = e;
  const card = $("#installCard");
  if (card) card.hidden = false;
});

window.addEventListener("appinstalled", () => {
  state.deferredInstall = null;
  toast("SafeHaven installed");
});

window.addEventListener("DOMContentLoaded", async () => {
  updateThemeIcon();
  applyLang();
  await loadState();
  await refreshFilesMeta();
  router();
});
