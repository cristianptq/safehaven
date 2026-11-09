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
        <div class="ice-banner-title">${esc(t("inCaseOfEmergency"))}</div>
        <div class="ice-banner-sub">${esc(t("iceSubtitle"))}</div>
      </div>
    </a>

    <div class="card">
      <div class="card-head"><h3>${esc(t("readiness"))}</h3></div>
      ${progressBar(pc, t("emergencyPlan"))}
      ${progressBar(kc, t("emergencyKit"))}
      <div class="stat-grid">
        <a class="stat" href="#/people"><div class="stat-num">${hh.members.length}</div><div class="stat-label">${esc(t("household"))}</div></a>
        <a class="stat" href="#/people"><div class="stat-num">${ct.list.length}</div><div class="stat-label">${esc(t("contacts"))}</div></a>
        <a class="stat" href="#/vault"><div class="stat-num">${state.filesMeta.length}</div><div class="stat-label">${esc(t("documents"))}</div></a>
        <a class="stat" href="#/vault"><div class="stat-num">${vt.records.length}</div><div class="stat-label">${esc(t("vitalRecords"))}</div></a>
      </div>
    </div>

    <div class="card" id="installCard" ${state.deferredInstall ? "" : "hidden"}>
      <div class="card-head"><h3>${esc(t("installApp"))}</h3></div>
      <p>${esc(t("installDesc"))}</p>
      <button class="btn primary" data-action="install-app">${esc(t("installBtn"))}</button>
    </div>

    <div class="card">
      <div class="card-head"><h3>${esc(t("remember"))}</h3></div>
      <ul class="tips">
        <li>${esc(t("tipText"))}</li>
        <li>${esc(t("tipBackup"))}</li>
        <li>${esc(t("tipPractice"))}</li>
        <li>${esc(t("tipWater"))}</li>
        <li>${esc(t("tipPrint"))}</li>
      </ul>
    </div>

    <div class="card ${lastExport ? "" : "card-warn"}">
      <div class="card-head"><h3>${esc(t("backupTitle"))}</h3></div>
      ${
        lastExport
          ? `<p>${esc(t("lastBackup"))}: <strong>${esc(lastExport)}</strong></p>`
          : `<p>⚠️ <strong>${esc(t("neverBackedUp"))}</strong> ${esc(t("exportBackupCopy"))}</p>`
      }
      <div class="btn-row">
        <button class="btn primary" data-action="export-plain">${esc(t("export"))}</button>
        <button class="btn ghost" data-action="share-backup">${esc(t("share"))}</button>
        <a class="btn ghost" href="#/backup">${esc(t("more"))}</a>
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
        ${hasCoords ? `<button class="icon-btn" data-action="copy-coords" data-lat="${esc(p.lat)}" data-lng="${esc(p.lng)}" aria-label="${esc(t("copyCoordinates"))}" title="${esc(t("copyCoordinates"))}">📋</button>` : ""}
        ${hasCoords ? `<button class="icon-btn" data-action="show-map" data-lat="${esc(p.lat)}" data-lng="${esc(p.lng)}" data-label="${esc(p.label || label)}" aria-label="${esc(t("showOnMap"))}" title="${esc(t("showOnMap"))}">🗺️</button>` : ""}
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
    rows = cfg.places.map(([f, labelKey]) => placeHtml(t(labelKey), data[f] || {})).join("");
  } else {
    rows = cfg.fields
      .map(([f, labelKey]) => {
        const v = data[f];
        const filled = v && String(v).trim();
        return `<div class="kv"><span>${esc(t(labelKey))}</span><span>${filled ? esc(v) : '<span class="muted">—</span>'}</span></div>`;
      })
      .join("");
  }
  return `<div class="card">
    <div class="card-head"><h3>${esc(t(cfg.titleKey))}</h3><button class="btn ghost small" data-action="edit-plan" data-id="${key}">${esc(t("edit"))}</button></div>
    ${cfg.hintKey ? `<p class="hint">${esc(t(cfg.hintKey))}</p>` : ""}
    ${rows}
  </div>`;
}

function renderPlan() {
  const notes = state.sections.plan.notes || "";
  return `
  <section class="page">
    <h2 class="page-title">${esc(t("emergencyPlan"))}</h2>
    ${Object.keys(PLAN_CARDS).map(planCardHtml).join("")}
    <div class="card">
      <div class="card-head"><h3>${esc(t("otherNotes"))}</h3><button class="btn ghost small" data-action="edit-plan-notes">${esc(t("edit"))}</button></div>
      ${notes.trim() ? `<div class="notes">${esc(notes).replace(/\n/g, "<br>")}</div>` : '<p class="muted">—</p>'}
    </div>
    <div class="card">
      <div class="card-head"><h3>${esc(t("bestPractices"))}</h3></div>
      <ul class="tips">
        <li>${esc(t("bp1"))}</li>
        <li>${esc(t("bp2"))}</li>
        <li>${esc(t("bp3"))}</li>
        <li>${esc(t("bp4"))}</li>
        <li>${esc(t("bp5"))}</li>
        <li>${esc(t("bp6"))}</li>
        <li>${esc(t("bp7"))}</li>
      </ul>
      <p class="src">${esc(t("srcReadyPlan"))}</p>
    </div>
  </section>`;
}

// ---------- People ----------

function memberCard(m) {
  const alerts = [
    m.allergies ? t("allergies") + ": " + m.allergies : null,
    m.conditions ? t("conditions") + ": " + m.conditions : null
  ].filter(Boolean);
  const a = age(m.dob);
  return `<div class="card item">
    <div class="item-head">
      <div>
        <div class="item-title">${esc(m.name)}${a ? ` <span class="muted">· ${a} ${esc(t("yrs"))}</span>` : ""}</div>
        ${m.blood ? `<span class="badge red">🩸 ${esc(m.blood)}</span>` : ""}
      </div>
      <div class="item-actions">
        <button class="icon-btn" data-action="edit-member" data-id="${m.id}" aria-label="${esc(t("edit"))}">✏️</button>
        <button class="icon-btn" data-action="del-member" data-id="${m.id}" aria-label="${esc(t("delete"))}">🗑️</button>
      </div>
    </div>
    ${alerts.length ? `<div class="alert-box">${alerts.map((x) => `<div>⚠️ ${esc(x)}</div>`).join("")}</div>` : ""}
    ${m.medications ? `<div class="kv"><span>${esc(t("medications"))}</span><span>${esc(m.medications).replace(/\n/g, "<br>")}</span></div>` : ""}
    ${
      m.doctorName || m.doctorPhone
        ? `<div class="kv"><span>${esc(t("doctor"))}</span><span>${esc(m.doctorName || "")}${
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
        <button class="icon-btn" data-action="edit-pet" data-id="${p.id}" aria-label="${esc(t("edit"))}">✏️</button>
        <button class="icon-btn" data-action="del-pet" data-id="${p.id}" aria-label="${esc(t("delete"))}">🗑️</button>
      </div>
    </div>
    ${
      p.vetName || p.vetPhone
        ? `<div class="kv"><span>${esc(t("vet"))}</span><span>${esc(p.vetName || "")}${
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
        <span class="badge">${esc(td(c.category || "Other"))}</span>
      </div>
      <div class="item-actions">
        ${c.phone ? `<a class="icon-btn call" href="${telHref(c.phone)}" aria-label="${esc(t("phone"))}">📞</a>` : ""}
        <button class="icon-btn" data-action="edit-contact" data-id="${c.id}" aria-label="${esc(t("edit"))}">✏️</button>
        <button class="icon-btn" data-action="del-contact" data-id="${c.id}" aria-label="${esc(t("delete"))}">🗑️</button>
      </div>
    </div>
    ${c.phone ? `<div class="kv"><span>${esc(t("phone"))}</span><span><a href="${telHref(c.phone)}">${esc(c.phone)}</a></span></div>` : ""}
    ${c.altPhone ? `<div class="kv"><span>${esc(t("altPhone"))}</span><span><a href="${telHref(c.altPhone)}">${esc(c.altPhone)}</a></span></div>` : ""}
    ${c.email ? `<div class="kv"><span>${esc(t("email"))}</span><span>${esc(c.email)}</span></div>` : ""}
    ${c.address ? `<div class="kv"><span>${esc(t("address"))}</span><span>${esc(c.address)}</span></div>` : ""}
    ${c.notes ? `<div class="notes">${esc(c.notes)}</div>` : ""}
  </div>`;
}

function renderPeople() {
  const hh = state.sections.household;
  const ct = state.sections.contacts;
  let body;
  if (state.peopleTab === "household") {
    body = `
      <div class="section-head"><h3>${esc(t("householdMembers"))}</h3><button class="btn primary small" data-action="add-member">+ ${esc(t("add"))}</button></div>
      ${hh.members.length ? hh.members.map(memberCard).join("") : emptyState("👪", t("noHousehold"))}
      <div class="section-head"><h3>${esc(t("pets"))}</h3><button class="btn primary small" data-action="add-pet">+ ${esc(t("add"))}</button></div>
      ${hh.pets.length ? hh.pets.map(petCard).join("") : emptyState("🐾", t("noPets"))}`;
  } else {
    body = `
      <div class="section-head"><h3>${esc(t("emergencyContacts"))}</h3><button class="btn primary small" data-action="add-contact">+ ${esc(t("add"))}</button></div>
      ${ct.list.length ? ct.list.map(contactCard).join("") : emptyState("📇", t("noContacts"))}
      <p class="hint">${esc(t("tipOutOfArea"))}</p>`;
  }
  return `
  <section class="page">
    <h2 class="page-title">${esc(t("people"))}</h2>
    ${seg([["household", t("household")], ["contacts", t("contacts")]], state.peopleTab, "seg-people")}
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
          <div class="kit-label">${esc(td(i.label))}</div>
          ${i.hint ? `<div class="hint">${esc(td(i.hint))}</div>` : ""}
          ${i.notes ? `<div class="notes">📝 ${esc(i.notes)}</div>` : ""}
        </div>
        <input class="kit-qty" type="text" inputmode="text" data-kit-qty="${i.id}" value="${esc(i.qty)}" placeholder="${esc(t("qty"))}" aria-label="${esc(t("quantity"))}">
        <button class="icon-btn" data-action="kit-del" data-id="${i.id}" aria-label="${esc(t("remove"))}">🗑️</button>
      </div>`
        )
        .join("");
      return `<div class="kit-group"><div class="kit-cat">${esc(td(cat))} <span class="muted">${done}/${items.length}</span></div>${rows}</div>`;
    })
    .join("");
  return `
  <section class="page">
    <h2 class="page-title">${esc(t("emergencyKit"))}</h2>
    ${progressBar(pct, t("kitReadiness"), "kitProgress")}
    ${groups}
    <button class="btn primary wide" data-action="kit-add">+ ${esc(t("addKitItem"))}</button>
    <p class="src">${esc(t("srcReadyKit"))}</p>
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
        <button class="icon-btn" data-action="doc-open" data-id="${f.id}" aria-label="${esc(t("open"))}">👁️</button>
        <button class="icon-btn" data-action="doc-download" data-id="${f.id}" aria-label="${esc(t("download"))}">⬇️</button>
        <button class="icon-btn" data-action="doc-del" data-id="${f.id}" aria-label="${esc(t("delete"))}">🗑️</button>
      </div>`
        )
        .join("");
      return `<div class="kit-group"><div class="kit-cat">${esc(td(cat))} <span class="muted">${items.length}</span></div>${rows}</div>`;
    })
    .join("");
  return `
    <div class="card">
      <div class="card-head"><h3>${esc(t("storeDocuments"))}</h3></div>
      ${field(t("category"), "docCategory", state.docCategory, { options: DOC_CATEGORIES.map((c) => [c, td(c)]) })}
      <div class="btn-row">
        <button class="btn primary" data-action="doc-upload">${esc(t("uploadFiles"))}</button>
        <button class="btn ghost" data-action="doc-camera">${esc(t("takePhoto"))}</button>
      </div>
      <p class="hint">${esc(t("docsHint"))}</p>
    </div>
    ${files.length ? groups : emptyState("🗂️", t("noDocuments"))}`;
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
        <span class="badge">${esc(td(r.category || "Other"))}</span>
      </div>
      <div class="item-actions">
        <button class="icon-btn" data-action="vital-edit" data-id="${r.id}" aria-label="${esc(t("edit"))}">✏️</button>
        <button class="icon-btn" data-action="vital-del" data-id="${r.id}" aria-label="${esc(t("delete"))}">🗑️</button>
      </div>
    </div>
    ${rows}
    ${r.notes ? `<div class="notes">${esc(r.notes)}</div>` : ""}
  </div>`;
}

function renderVital() {
  const records = state.sections.vital.records;
  return `
    <div class="section-head"><h3>${esc(t("vitalInformation"))}</h3><button class="btn primary small" data-action="vital-add">+ ${esc(t("add"))}</button></div>
    ${records.length ? records.map(vitalCard).join("") : emptyState("🔐", t("noRecords"))}
    <p class="hint">${esc(t("tipPasswords"))}</p>`;
}

function renderVault() {
  return `
  <section class="page">
    <h2 class="page-title">${esc(t("vault"))}</h2>
    ${seg([["documents", t("documents")], ["vital", t("vitalInfo")]], state.vaultTab, "seg-vault")}
    ${state.vaultTab === "documents" ? renderDocuments() : renderVital()}
  </section>`;
}

// ---------- Backup ----------

function renderBackup() {
  const meta = state.sections.meta;
  return `
  <section class="page">
    <h2 class="page-title">${esc(t("backupSync"))}</h2>

    <div class="card">
      <div class="card-head"><h3>${esc(t("storageOnDevice"))}</h3></div>
      <p id="storageStat">${esc(t("storageChecking"))}</p>
      <p class="hint">${esc(t("storageLocal"))}</p>
    </div>

    <div class="card">
      <div class="card-head"><h3>${esc(t("exportTitle"))}</h3></div>
      <p>${meta.lastExportAt ? `${esc(t("lastBackup"))}: <strong>${esc(fmtDateTime(meta.lastExportAt))}</strong>` : "⚠️ " + esc(t("neverBackedUp"))}</p>
      <div class="btn-row wrap">
        <button class="btn primary" data-action="export-plain">${esc(t("exportBackup"))}</button>
        <button class="btn ghost" data-action="export-encrypted">${esc(t("exportEncrypted"))}</button>
        <button class="btn ghost" data-action="share-backup">${esc(t("shareEllipsis"))}</button>
      </div>
      <p class="hint">${esc(t("exportHint"))}</p>
    </div>

    <div class="card">
      <div class="card-head"><h3>${esc(t("importTitle"))}</h3></div>
      <p>${esc(t("importDesc"))} <strong>${esc(t("importReplaces"))}</strong></p>
      <button class="btn primary" data-action="import-trigger">${esc(t("importFromFile"))}</button>
      <div class="btn-row wrap" style="margin-top:10px">
        <button class="btn ghost" data-action="import-onedrive">☁️ OneDrive</button>
        <button class="btn ghost" data-action="import-gdrive">☁️ Google Drive</button>
      </div>
      <p class="hint">${esc(t("cloudImportHint"))}</p>
    </div>

    <div class="card">
      <div class="card-head"><h3>${esc(t("printTitle"))}</h3></div>
      <p>${esc(t("printDesc"))}</p>
      <button class="btn ghost" data-action="print-summary">${esc(t("printSummary"))}</button>
    </div>

    <div class="card card-danger">
      <div class="card-head"><h3>${esc(t("dangerZone"))}</h3></div>
      <button class="btn danger" data-action="erase-all">${esc(t("eraseAll"))}</button>
    </div>

    <div class="card">
      <div class="card-head"><h3>${esc(t("about"))}</h3></div>
      <p>SafeHaven v${APP_VERSION} — ${esc(t("aboutDesc"))}</p>
      <p class="src">${esc(t("srcGuidance"))}</p>
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
        <p>${esc(t("offlineMapTitle"))}</p>
        <p class="hint">${esc(t("offlineMapHint"))}</p>
      </div>
      <div class="btn-row wrap">
        <button class="btn ghost small" data-action="copy-coords" data-lat="${esc(lat)}" data-lng="${esc(lng)}">📋 ${esc(t("copyCoordinates"))}</button>
        ${online ? `<a class="btn ghost small" target="_blank" rel="noopener" href="https://www.openstreetmap.org/?mlat=${encodeURIComponent(lat)}&mlon=${encodeURIComponent(lng)}#map=17/${encodeURIComponent(lat)}/${encodeURIComponent(lng)}">${esc(t("openFullMap"))}</a>` : ""}
      </div>
    </div>`;
}

function allSheltersMapHtml() {
  const online = navigator.onLine;
  return `
    <div class="map-wrap">
      ${online ? '<div id="mapCanvasAll" class="map-canvas map-canvas-all"></div>' : `<div class="map-offline"><div class="map-pin">🗺️</div><p>${esc(t("mapOnlineOnly"))}</p></div>`}
      <div class="btn-row wrap">
        <button class="btn ghost small" data-action="map-all-locate">📡 ${esc(t("locateMe"))}</button>
        ${online ? `<button class="btn ghost small" data-action="map-all-full">🗺️ ${esc(t("openFullMap"))}</button>` : ""}
      </div>
    </div>`;
}

// ---------- ICE ----------

function renderIce() {
  const p = state.sections.plan;
  const hh = state.sections.household;
  const nums = [
    [t("ambulance"), p.numbers.medical],
    [t("police"), p.numbers.police],
    [t("fire"), p.numbers.fire],
    [t("other"), p.numbers.other]
  ].filter(([, v]) => v && String(v).trim());

  const callBtns = nums.length
    ? nums
        .map(
          ([label, num]) =>
            `<a class="ice-call" href="${telHref(num)}"><span class="ice-call-label">${esc(label)}</span><span class="ice-call-num">${esc(num)}</span></a>`
        )
        .join("")
    : `<p class="muted">${esc(t("noEmergencyNumbers"))}</p>`;

  const medical = hh.members
    .filter((m) => m.allergies || m.conditions || m.medications || m.blood)
    .map(
      (m) => `<div class="card item">
      <div class="item-title">${esc(m.name)} ${m.blood ? `<span class="badge red">🩸 ${esc(m.blood)}</span>` : ""}</div>
      ${m.allergies ? `<div class="alert-box">⚠️ ${esc(t("allergies"))}: ${esc(m.allergies)}</div>` : ""}
      ${m.conditions ? `<div class="alert-box">⚠️ ${esc(t("conditions"))}: ${esc(m.conditions)}</div>` : ""}
      ${m.medications ? `<div class="kv"><span>${esc(t("medications"))}</span><span>${esc(m.medications).replace(/\n/g, "<br>")}</span></div>` : ""}
    </div>`
    )
    .join("");

  const meetings = [
    [t("rightOutsideHome"), p.meeting.near],
    [t("outsideNeighborhood"), p.meeting.neighborhood],
    [t("outOfTown"), p.meeting.regional]
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
          : `<p class="muted">${esc(t("notSetPlanContact"))}</p>`
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
