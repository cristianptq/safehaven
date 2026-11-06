"use strict";

function planCompletion(plan) {
  const keys = [
    plan.outOfArea.name,
    plan.outOfArea.phone,
    plan.meeting.near,
    plan.meeting.neighborhood,
    plan.meeting.regional,
    plan.evacuation.destination,
    plan.evacuation.routePrimary,
    plan.utilities.gas,
    plan.utilities.water,
    plan.utilities.electricity
  ];
  const filled = keys.filter((v) => v && String(v).trim()).length;
  return Math.round((filled / keys.length) * 100);
}

function kitCompletion(kit) {
  const total = kit.items.length;
  if (!total) return 0;
  return Math.round((kit.items.filter((i) => i.done).length / total) * 100);
}

function progressBar(pct, label, id = "") {
  return `<div class="prog" ${id ? `id="${id}"` : ""}>
    <div class="prog-top"><span>${esc(label)}</span><span>${pct}%</span></div>
    <div class="prog-track"><div class="prog-fill" style="width:${pct}%"></div></div>
  </div>`;
}

function seg(options, current, action) {
  return `<div class="seg">${options
    .map(
      ([v, t]) =>
        `<button type="button" class="seg-btn ${v === current ? "active" : ""}" data-action="${action}" data-id="${v}">${esc(t)}</button>`
    )
    .join("")}</div>`;
}

function emptyState(icon, text) {
  return `<div class="empty"><div class="empty-icon">${icon}</div><p>${esc(text)}</p></div>`;
}

// ---------- Home ----------

function renderHome() {
  const meta = state.sections.meta;
  const plan = state.sections.plan;
  const hh = state.sections.household;
  const ct = state.sections.contacts;
  const kit = state.sections.kit;
  const vt = state.sections.vital;

  const pc = planCompletion(plan);
  const kc = kitCompletion(kit);
  const lastExport = meta.lastExportAt ? fmtDateTime(meta.lastExportAt) : null;

  return `
  <section class="page">
    <a class="ice-banner" href="#/ice">
      <div class="ice-banner-icon">🚨</div>
      <div>
        <div class="ice-banner-title">In Case of Emergency</div>
        <div class="ice-banner-sub">Tap for the ICE card — critical info at a glance</div>
      </div>
    </a>

    <div class="card">
      <div class="card-head"><h3>Readiness</h3></div>
      ${progressBar(pc, "Emergency plan")}
      ${progressBar(kc, "Emergency kit")}
      <div class="stat-grid">
        <a class="stat" href="#/people"><div class="stat-num">${hh.members.length}</div><div class="stat-label">Household</div></a>
        <a class="stat" href="#/people"><div class="stat-num">${ct.list.length}</div><div class="stat-label">Contacts</div></a>
        <a class="stat" href="#/vault"><div class="stat-num">${state.filesMeta.length}</div><div class="stat-label">Documents</div></a>
        <a class="stat" href="#/vault"><div class="stat-num">${vt.records.length}</div><div class="stat-label">Vital records</div></a>
      </div>
    </div>

    <div class="card" id="installCard" ${state.deferredInstall ? "" : "hidden"}>
      <div class="card-head"><h3>Install on this device</h3></div>
      <p>Install SafeHaven as an app so it works fully offline from your home screen.</p>
      <button class="btn primary" data-action="install-app">Install app</button>
    </div>

    <div class="card">
      <div class="card-head"><h3>Remember</h3></div>
      <ul class="tips">
        <li>Text, don't call during a disaster — texts get through congested networks more easily.</li>
        <li>Export a backup after every change and keep a copy on every family device.</li>
        <li>Practice your evacuation plan at least twice a year.</li>
        <li>Store 4 litres of water per person per day, for at least 3 days.</li>
        <li>Keep a printed copy of your plan in the kit (Backup → Print).</li>
      </ul>
    </div>

    <div class="card ${lastExport ? "" : "card-warn"}">
      <div class="card-head"><h3>Backup</h3></div>
      ${
        lastExport
          ? `<p>Last backup: <strong>${esc(lastExport)}</strong></p>`
          : `<p>⚠️ <strong>Never backed up.</strong> Export a backup and copy it to every family device.</p>`
      }
      <div class="btn-row">
        <button class="btn primary" data-action="export-plain">Export</button>
        <button class="btn ghost" data-action="share-backup">Share</button>
        <a class="btn ghost" href="#/backup">More</a>
      </div>
    </div>
  </section>`;
}

// ---------- Plan ----------

function placeHtml(label, p) {
  const hasCoords = p.lat && p.lng;
  const filled = p.label || p.address || hasCoords;
  if (!filled) return `<div class="kv"><span>${esc(label)}</span><span class="muted">—</span></div>`;
  return `<div class="place">
    <div class="place-head">
      <span class="place-label">${esc(label)}</span>
      <span class="place-actions">
        ${hasCoords ? `<button class="icon-btn" data-action="copy-coords" data-lat="${esc(p.lat)}" data-lng="${esc(p.lng)}" aria-label="Copy coordinates" title="Copy coordinates">📋</button>` : ""}
        ${hasCoords ? `<button class="icon-btn" data-action="show-map" data-lat="${esc(p.lat)}" data-lng="${esc(p.lng)}" data-label="${esc(p.label || label)}" aria-label="Show on map" title="Show on map">🗺️</button>` : ""}
      </span>
    </div>
    ${p.label ? `<div class="place-name">${esc(p.label)}</div>` : ""}
    ${p.address ? `<div class="place-sub">📍 ${esc(p.address)}</div>` : ""}
    ${hasCoords ? `<div class="place-sub mono">🧭 ${esc(p.lat)}, ${esc(p.lng)}</div>` : ""}
  </div>`;
}

function planCardHtml(key) {
  const cfg = PLAN_CARDS[key];
  const data = state.sections.plan[key] || {};
  let rows;
  if (cfg.meeting) {
    rows = cfg.places.map(([f, label]) => placeHtml(label, data[f] || {})).join("");
  } else {
    rows = cfg.fields
      .map(([f, label]) => {
        const v = data[f];
        const filled = v && String(v).trim();
        return `<div class="kv"><span>${esc(label)}</span><span>${filled ? esc(v) : '<span class="muted">—</span>'}</span></div>`;
      })
      .join("");
  }
  return `<div class="card">
    <div class="card-head"><h3>${esc(cfg.title)}</h3><button class="btn ghost small" data-action="edit-plan" data-id="${key}">Edit</button></div>
    ${cfg.hint ? `<p class="hint">${esc(cfg.hint)}</p>` : ""}
    ${rows}
  </div>`;
}

function renderPlan() {
  const notes = state.sections.plan.notes || "";
  return `
  <section class="page">
    <h2 class="page-title">Emergency plan</h2>
    ${Object.keys(PLAN_CARDS).map(planCardHtml).join("")}
    <div class="card">
      <div class="card-head"><h3>Other notes</h3><button class="btn ghost small" data-action="edit-plan-notes">Edit</button></div>
      ${notes.trim() ? `<div class="notes">${esc(notes).replace(/\n/g, "<br>")}</div>` : '<p class="muted">—</p>'}
    </div>
    <div class="card">
      <div class="card-head"><h3>Best practices</h3></div>
      <ul class="tips">
        <li>Make a household communication plan and practice it twice a year.</li>
        <li>Prefer text messages over calls — networks may be overloaded.</li>
        <li>Agree on an out-of-area contact everyone checks in with.</li>
        <li>Know your evacuation routes and destination; plan for pets.</li>
        <li>Learn how to shut off gas, water and electricity.</li>
        <li>Sign up for local emergency alerts; keep a battery or hand-crank radio.</li>
        <li>Keep printed copies of the plan and contact list in your kit.</li>
      </ul>
      <p class="src">Summarized from ready.gov/plan, FEMA and Red Cross guidance.</p>
    </div>
  </section>`;
}

// ---------- People ----------

function memberCard(m) {
  const alerts = [
    m.allergies ? "Allergies: " + m.allergies : null,
    m.conditions ? "Conditions: " + m.conditions : null
  ].filter(Boolean);
  const a = age(m.dob);
  return `<div class="card item">
    <div class="item-head">
      <div>
        <div class="item-title">${esc(m.name)}${a ? ` <span class="muted">· ${a} yrs</span>` : ""}</div>
        ${m.blood ? `<span class="badge red">🩸 ${esc(m.blood)}</span>` : ""}
      </div>
      <div class="item-actions">
        <button class="icon-btn" data-action="edit-member" data-id="${m.id}" aria-label="Edit">✏️</button>
        <button class="icon-btn" data-action="del-member" data-id="${m.id}" aria-label="Delete">🗑️</button>
      </div>
    </div>
    ${alerts.length ? `<div class="alert-box">${alerts.map((x) => `<div>⚠️ ${esc(x)}</div>`).join("")}</div>` : ""}
    ${m.medications ? `<div class="kv"><span>Medications</span><span>${esc(m.medications).replace(/\n/g, "<br>")}</span></div>` : ""}
    ${
      m.doctorName || m.doctorPhone
        ? `<div class="kv"><span>Doctor</span><span>${esc(m.doctorName || "")}${
            m.doctorPhone ? ` · <a href="${telHref(m.doctorPhone)}">${esc(m.doctorPhone)}</a>` : ""
          }</span></div>`
        : ""
    }
    ${m.notes ? `<div class="notes">${esc(m.notes)}</div>` : ""}
  </div>`;
}

function petCard(p) {
  return `<div class="card item">
    <div class="item-head">
      <div>
        <div class="item-title">🐾 ${esc(p.name)}</div>
        ${p.species ? `<span class="badge">${esc(p.species)}</span>` : ""}
      </div>
      <div class="item-actions">
        <button class="icon-btn" data-action="edit-pet" data-id="${p.id}" aria-label="Edit">✏️</button>
        <button class="icon-btn" data-action="del-pet" data-id="${p.id}" aria-label="Delete">🗑️</button>
      </div>
    </div>
    ${
      p.vetName || p.vetPhone
        ? `<div class="kv"><span>Vet</span><span>${esc(p.vetName || "")}${
            p.vetPhone ? ` · <a href="${telHref(p.vetPhone)}">${esc(p.vetPhone)}</a>` : ""
          }</span></div>`
        : ""
    }
    ${p.notes ? `<div class="notes">${esc(p.notes)}</div>` : ""}
  </div>`;
}

function contactCard(c) {
  return `<div class="card item">
    <div class="item-head">
      <div>
        <div class="item-title">${esc(c.name)}</div>
        <span class="badge">${esc(c.category || "Other")}</span>
      </div>
      <div class="item-actions">
        ${c.phone ? `<a class="icon-btn call" href="${telHref(c.phone)}" aria-label="Call">📞</a>` : ""}
        <button class="icon-btn" data-action="edit-contact" data-id="${c.id}" aria-label="Edit">✏️</button>
        <button class="icon-btn" data-action="del-contact" data-id="${c.id}" aria-label="Delete">🗑️</button>
      </div>
    </div>
    ${c.phone ? `<div class="kv"><span>Phone</span><span><a href="${telHref(c.phone)}">${esc(c.phone)}</a></span></div>` : ""}
    ${c.altPhone ? `<div class="kv"><span>Alt phone</span><span><a href="${telHref(c.altPhone)}">${esc(c.altPhone)}</a></span></div>` : ""}
    ${c.email ? `<div class="kv"><span>Email</span><span>${esc(c.email)}</span></div>` : ""}
    ${c.address ? `<div class="kv"><span>Address</span><span>${esc(c.address)}</span></div>` : ""}
    ${c.notes ? `<div class="notes">${esc(c.notes)}</div>` : ""}
  </div>`;
}

function renderPeople() {
  const hh = state.sections.household;
  const ct = state.sections.contacts;
  let body;
  if (state.peopleTab === "household") {
    body = `
      <div class="section-head"><h3>Household members</h3><button class="btn primary small" data-action="add-member">+ Add</button></div>
      ${hh.members.length ? hh.members.map(memberCard).join("") : emptyState("👪", "No household members yet. Add everyone living in your home.")}
      <div class="section-head"><h3>Pets</h3><button class="btn primary small" data-action="add-pet">+ Add</button></div>
      ${hh.pets.length ? hh.pets.map(petCard).join("") : emptyState("🐾", "No pets added.")}`;
  } else {
    body = `
      <div class="section-head"><h3>Emergency contacts</h3><button class="btn primary small" data-action="add-contact">+ Add</button></div>
      ${ct.list.length ? ct.list.map(contactCard).join("") : emptyState("📇", "No contacts yet. Add family, doctors, insurers, utilities…")}
      <p class="hint">Tip: add your out-of-area contact here too, and mark them "Out-of-area".</p>`;
  }
  return `
  <section class="page">
    <h2 class="page-title">People</h2>
    ${seg([["household", "Household"], ["contacts", "Contacts"]], state.peopleTab, "seg-people")}
    ${body}
  </section>`;
}

// ---------- Kit ----------

function renderKit() {
  const kit = state.sections.kit;
  const pct = kitCompletion(kit);
  const cats = [...new Set(kit.items.map((i) => i.cat))];
  const groups = cats
    .map((cat) => {
      const items = kit.items.filter((i) => i.cat === cat);
      const done = items.filter((i) => i.done).length;
      const rows = items
        .map(
          (i) => `<div class="kit-row ${i.done ? "done" : ""}">
        <label class="kit-check"><input type="checkbox" data-kit-toggle="${i.id}" ${i.done ? "checked" : ""}><span class="kit-box"></span></label>
        <div class="kit-main" data-action="kit-edit" data-id="${i.id}">
          <div class="kit-label">${esc(i.label)}</div>
          ${i.hint ? `<div class="hint">${esc(i.hint)}</div>` : ""}
          ${i.notes ? `<div class="notes">📝 ${esc(i.notes)}</div>` : ""}
        </div>
        <input class="kit-qty" type="text" inputmode="text" data-kit-qty="${i.id}" value="${esc(i.qty)}" placeholder="qty" aria-label="Quantity">
        <button class="icon-btn" data-action="kit-del" data-id="${i.id}" aria-label="Remove">🗑️</button>
      </div>`
        )
        .join("");
      return `<div class="kit-group"><div class="kit-cat">${esc(cat)} <span class="muted">${done}/${items.length}</span></div>${rows}</div>`;
    })
    .join("");
  return `
  <section class="page">
    <h2 class="page-title">Emergency kit</h2>
    ${progressBar(pct, "Kit readiness", "kitProgress")}
    ${groups}
    <button class="btn primary wide" data-action="kit-add">+ Add item</button>
    <p class="src">Checklist pre-loaded from ready.gov/kit and Red Cross guidance. Tick items off as you pack them.</p>
  </section>`;
}

// ---------- Vault ----------

function docIcon(mime) {
  if ((mime || "").startsWith("image/")) return "🖼️";
  if (mime === "application/pdf") return "📕";
  return "📄";
}

function renderDocuments() {
  const files = [...state.filesMeta].sort((a, b) => (b.addedAt || "").localeCompare(a.addedAt || ""));
  const cats = [...DOC_CATEGORIES, ...new Set(files.map((f) => f.category).filter((c) => !DOC_CATEGORIES.includes(c)))];
  const groups = cats
    .map((cat) => {
      const items = files.filter((f) => f.category === cat);
      if (!items.length) return "";
      const rows = items
        .map(
          (f) => `<div class="doc-row">
        <div class="doc-icon">${docIcon(f.mime)}</div>
        <div class="doc-main">
          <div class="doc-name">${esc(f.name)}</div>
          <div class="hint">${fmtSize(f.size)} · ${fmtDate(f.addedAt)}</div>
        </div>
        <button class="icon-btn" data-action="doc-open" data-id="${f.id}" aria-label="Open">👁️</button>
        <button class="icon-btn" data-action="doc-download" data-id="${f.id}" aria-label="Download">⬇️</button>
        <button class="icon-btn" data-action="doc-del" data-id="${f.id}" aria-label="Delete">🗑️</button>
      </div>`
        )
        .join("");
      return `<div class="kit-group"><div class="kit-cat">${esc(cat)} <span class="muted">${items.length}</span></div>${rows}</div>`;
    })
    .join("");
  return `
    <div class="card">
      <div class="card-head"><h3>Store documents</h3></div>
      ${field("Category", "docCategory", state.docCategory, { options: DOC_CATEGORIES.map((c) => [c, c]) })}
      <div class="btn-row">
        <button class="btn primary" data-action="doc-upload">📎 Upload files</button>
        <button class="btn ghost" data-action="doc-camera">📷 Take photo</button>
      </div>
      <p class="hint">Photos of IDs, insurance cards, prescriptions, property papers… Files never leave this device unless you export them.</p>
    </div>
    ${files.length ? groups : emptyState("🗂️", "No documents stored yet.")}`;
}

function vitalCard(r) {
  const rows = (r.fields || [])
    .filter((f) => f.label || f.value)
    .map((f) => `<div class="kv"><span>${esc(f.label)}</span><span>${esc(f.value)}</span></div>`)
    .join("");
  return `<div class="card item">
    <div class="item-head">
      <div>
        <div class="item-title">${esc(r.title)}</div>
        <span class="badge">${esc(r.category || "Other")}</span>
      </div>
      <div class="item-actions">
        <button class="icon-btn" data-action="vital-edit" data-id="${r.id}" aria-label="Edit">✏️</button>
        <button class="icon-btn" data-action="vital-del" data-id="${r.id}" aria-label="Delete">🗑️</button>
      </div>
    </div>
    ${rows}
    ${r.notes ? `<div class="notes">${esc(r.notes)}</div>` : ""}
  </div>`;
}

function renderVital() {
  const records = state.sections.vital.records;
  return `
    <div class="section-head"><h3>Vital information</h3><button class="btn primary small" data-action="vital-add">+ Add</button></div>
    ${records.length ? records.map(vitalCard).join("") : emptyState("🔐", "No records yet. Add insurance policies, account references, medical info…")}
    <p class="hint">Tip: avoid storing full passwords — store hints or recovery info instead.</p>`;
}

function renderVault() {
  return `
  <section class="page">
    <h2 class="page-title">Vault</h2>
    ${seg([["documents", "Documents"], ["vital", "Vital info"]], state.vaultTab, "seg-vault")}
    ${state.vaultTab === "documents" ? renderDocuments() : renderVital()}
  </section>`;
}

// ---------- Backup ----------

function renderBackup() {
  const meta = state.sections.meta;
  return `
  <section class="page">
    <h2 class="page-title">Backup &amp; sync</h2>

    <div class="card">
      <div class="card-head"><h3>Storage on this device</h3></div>
      <p id="storageStat">Checking…</p>
      <p class="hint">All data is stored locally on this device (IndexedDB). Nothing is sent anywhere.</p>
    </div>

    <div class="card">
      <div class="card-head"><h3>Export</h3></div>
      <p>${meta.lastExportAt ? `Last backup: <strong>${esc(fmtDateTime(meta.lastExportAt))}</strong>` : "⚠️ Never backed up."}</p>
      <div class="btn-row wrap">
        <button class="btn primary" data-action="export-plain">Export backup</button>
        <button class="btn ghost" data-action="export-encrypted">Export encrypted</button>
        <button class="btn ghost" data-action="share-backup">Share…</button>
      </div>
      <p class="hint">Move the file to other family devices via Bluetooth, Nearby Share, USB or SD card — no internet needed. Use "Share" on Android to send it directly. Encrypted backups require a passphrase to import.</p>
    </div>

    <div class="card">
      <div class="card-head"><h3>Import</h3></div>
      <p>Load a backup file exported from another device. <strong>This replaces all current data on this device.</strong></p>
      <button class="btn primary" data-action="import-trigger">Import from file</button>
      <div class="btn-row wrap" style="margin-top:10px">
        <button class="btn ghost" data-action="import-onedrive">☁️ OneDrive</button>
        <button class="btn ghost" data-action="import-gdrive">☁️ Google Drive</button>
      </div>
      <p class="hint">Cloud import needs an internet connection and a one-time setup (see README). When offline, use file import — it always works.</p>
    </div>

    <div class="card">
      <div class="card-head"><h3>Print</h3></div>
      <p>Print a paper summary of your plan, household medical info and contacts for the emergency kit.</p>
      <button class="btn ghost" data-action="print-summary">🖨️ Print emergency summary</button>
    </div>

    <div class="card card-danger">
      <div class="card-head"><h3>Danger zone</h3></div>
      <button class="btn danger" data-action="erase-all">Erase all data on this device</button>
    </div>

    <div class="card">
      <div class="card-head"><h3>About</h3></div>
      <p>SafeHaven v${APP_VERSION} — works 100% offline. Your data never leaves your device except when you export it.</p>
      <p class="src">Guidance summarized from ready.gov/plan, ready.gov/kit, FEMA and the Red Cross.</p>
    </div>
  </section>`;
}

// ---------- Shelters ----------

function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function shelterRow(s, dist) {
  return `<div class="shelter-row">
    <div class="shelter-main">
      <div class="shelter-name">${esc(s.name)}</div>
      <div class="hint">📍 ${esc(s.address)}</div>
      <div class="hint">${esc(s.locality)}${s.county ? " · " + esc(s.county) : ""}${dist != null ? ` · <strong>${dist < 1 ? Math.round(dist * 1000) + " m" : dist.toFixed(1) + " km"}</strong>` : ""}</div>
    </div>
    <button class="icon-btn" data-action="shelter-map" data-lat="${s.lat}" data-lng="${s.lng}" data-label="${esc(s.name)}" aria-label="${esc(t("showOnMap"))}" title="${esc(t("showOnMap"))}">🗺️</button>
  </div>`;
}

function renderShelters() {
  const counties = [...new Set(SHELTERS.map((s) => s.county))].sort();
  const q = state.shelterSearch.trim().toLowerCase();
  let list = SHELTERS;
  if (state.shelterCounty) list = list.filter((s) => s.county === state.shelterCounty);
  if (q) list = list.filter((s) => (s.name + " " + s.address + " " + s.locality).toLowerCase().includes(q));

  const sorted = state.userLocation
    ? [...list].map((s) => ({ ...s, _d: haversineKm(state.userLocation.lat, state.userLocation.lng, s.lat, s.lng) })).sort((a, b) => a._d - b._d)
    : list;
  const shown = sorted.slice(0, 200);

  return `
  <section class="page">
    <h2 class="page-title">🏢 ${esc(t("civilShelters"))}</h2>
    <p class="hint">${esc(t("sheltersDesc"))}</p>
    <div class="card">
      <div class="vf-row" style="grid-template-columns:1fr;gap:10px">
        <input type="search" id="shelterSearch" placeholder="${esc(t("searchShelter"))}" value="${esc(state.shelterSearch)}">
        <select id="shelterCounty">
          <option value="">${esc(t("allCounties"))}</option>
          ${counties.map((c) => `<option value="${esc(c)}" ${c === state.shelterCounty ? "selected" : ""}>${esc(c)}</option>`).join("")}
        </select>
      </div>
      <div class="btn-row wrap">
        <button class="btn ghost small" data-action="shelter-locate">📡 ${esc(t("locateMe"))}</button>
        <button class="btn ghost small" data-action="shelter-map-all">🗺️ ${esc(t("showAllOnMap"))}</button>
        ${state.userLocation ? `<span class="hint" style="align-self:center">${esc(t("nearest"))}: ${state.userLocation.lat.toFixed(4)}, ${state.userLocation.lng.toFixed(4)}</span>` : ""}
      </div>
    </div>
    <p class="hint">${list.length} ${esc(t("sheltersFound"))}${list.length > 200 ? ` — ${esc(t("nearest"))} 200` : ""}</p>
    <div class="shelter-list">
      ${shown.length ? shown.map((s) => shelterRow(s, s._d)).join("") : `<div class="empty"><p>${esc(t("noShelters"))}</p></div>`}
    </div>
  </section>`;
}

// ---------- Map ----------

function mapModalHtml(label, lat, lng) {
  const online = navigator.onLine;
  return `
    <div class="map-wrap">
      <div class="map-meta">
        <div class="map-title">${esc(label)}</div>
        <div class="mono muted">🧭 ${esc(lat)}, ${esc(lng)}</div>
      </div>
      ${online ? '<div id="mapCanvas" class="map-canvas"></div>' : ""}
      <div class="map-offline ${online ? "hidden" : ""}">
        <div class="map-pin">📍</div>
        <p>You're offline — interactive map unavailable.</p>
        <p class="hint">Coordinates are shown above. Copy them into any GPS device or map app.</p>
      </div>
      <div class="btn-row wrap">
        <button class="btn ghost small" data-action="copy-coords" data-lat="${esc(lat)}" data-lng="${esc(lng)}">📋 Copy coordinates</button>
        ${online ? `<a class="btn ghost small" target="_blank" rel="noopener" href="https://www.openstreetmap.org/?mlat=${encodeURIComponent(lat)}&mlon=${encodeURIComponent(lng)}#map=17/${encodeURIComponent(lat)}/${encodeURIComponent(lng)}">Open full map</a>` : ""}
      </div>
    </div>`;
}

function allSheltersMapHtml() {
  const online = navigator.onLine;
  return `
    <div class="map-wrap">
      ${online ? '<div id="mapCanvasAll" class="map-canvas map-canvas-all"></div>' : `<div class="map-offline"><div class="map-pin">🗺️</div><p>${esc(t("mapOnlineOnly"))}</p></div>`}
    </div>`;
}

// ---------- ICE ----------

function renderIce() {
  const p = state.sections.plan;
  const hh = state.sections.household;
  const nums = [
    ["Ambulance", p.numbers.medical],
    ["Police", p.numbers.police],
    ["Fire", p.numbers.fire],
    ["Other", p.numbers.other]
  ].filter(([, v]) => v && String(v).trim());

  const callBtns = nums.length
    ? nums
        .map(
          ([label, num]) =>
            `<a class="ice-call" href="${telHref(num)}"><span class="ice-call-label">${esc(label)}</span><span class="ice-call-num">${esc(num)}</span></a>`
        )
        .join("")
    : '<p class="muted">No emergency numbers set — add them in the Plan tab.</p>';

  const medical = hh.members
    .filter((m) => m.allergies || m.conditions || m.medications || m.blood)
    .map(
      (m) => `<div class="card item">
      <div class="item-title">${esc(m.name)} ${m.blood ? `<span class="badge red">🩸 ${esc(m.blood)}</span>` : ""}</div>
      ${m.allergies ? `<div class="alert-box">⚠️ Allergies: ${esc(m.allergies)}</div>` : ""}
      ${m.conditions ? `<div class="alert-box">⚠️ Conditions: ${esc(m.conditions)}</div>` : ""}
      ${m.medications ? `<div class="kv"><span>Medications</span><span>${esc(m.medications).replace(/\n/g, "<br>")}</span></div>` : ""}
    </div>`
    )
    .join("");

  const meetings = [
    ["Right outside home", p.meeting.near],
    ["Outside neighborhood", p.meeting.neighborhood],
    ["Out of town", p.meeting.regional]
  ].filter(([, pl]) => pl && (pl.label || pl.address || (pl.lat && pl.lng)));

  return `
  <section class="page ice">
    <h2 class="page-title">🚨 ${esc(t("inCaseOfEmergency"))}</h2>
    <div class="ice-grid">${callBtns}</div>

    <div class="card ice-msg-card">
      <div class="card-head"><h3>📨 ${esc(t("sendEmergencyMessage"))}</h3></div>
      <p class="hint">${esc(t("emergencyMessageDesc"))}</p>
      <button class="btn primary wide" data-action="compose-msg">${esc(t("compose"))}</button>
    </div>

    <div class="card">
      <div class="card-head"><h3>${esc(t("outOfAreaContact"))}</h3></div>
      ${
        p.outOfArea.name || p.outOfArea.phone
          ? `<div class="ice-big">${esc(p.outOfArea.name || "—")}</div>
             ${p.outOfArea.phone ? `<a class="ice-call" href="${telHref(p.outOfArea.phone)}"><span class="ice-call-num">${esc(p.outOfArea.phone)}</span></a>` : ""}`
          : '<p class="muted">Not set — add it in the Plan tab.</p>'
      }
    </div>

    <div class="card">
      <div class="card-head"><h3>${esc(t("meetingPlaces"))}</h3></div>
      ${meetings.length ? meetings.map(([l, pl]) => placeHtml(l, pl)).join("") : `<p class="muted">${esc(t("notSetPlan"))}</p>`}
    </div>

    <div class="card">
      <div class="card-head"><h3>${esc(t("medicalAlerts"))}</h3></div>
      ${medical || `<p class="muted">${esc(t("noMedicalInfo"))}</p>`}
    </div>
  </section>`;
}
