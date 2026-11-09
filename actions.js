"use strict";

// ---------- Forms ----------

function memberForm(m) {
  openModal(m ? t("editMember") : t("addMember"), `
    ${field(t("fullName"), "name", m?.name || "", { required: true })}
    ${field(t("dob"), "dob", m?.dob || "", { type: "date" })}
    ${field(t("bloodType"), "blood", m?.blood || "", { options: BLOOD_TYPES.map((b) => [b, b || t("unknownNotSet")]) })}
    ${field(t("allergies"), "allergies", m?.allergies || "", { textarea: true, placeholder: "e.g. penicillin, peanuts" })}
    ${field(t("medications"), "medications", m?.medications || "", { textarea: true, placeholder: "One per line, include dosage" })}
    ${field(t("medicalConditions"), "conditions", m?.conditions || "", { textarea: true, placeholder: "e.g. diabetes, asthma" })}
    ${field(t("doctorName"), "doctorName", m?.doctorName || "")}
    ${field(t("doctorPhone"), "doctorPhone", m?.doctorPhone || "", { type: "tel" })}
    ${field(t("notes"), "notes", m?.notes || "", { textarea: true })}
  `, {
    onSubmit: (fd) => {
      const v = trimAll(Object.fromEntries(fd));
      if (!v.name) {
        toast(t("nameRequired"));
        return false;
      }
      const arr = state.sections.household.members;
      if (m) Object.assign(arr.find((x) => x.id === m.id), v);
      else arr.push({ id: uid(), ...v });
      save("household").then(() => {
        refresh();
        toast(t("saved"));
      });
    }
  });
}

function petForm(p) {
  openModal(p ? t("editPet") : t("addPet"), `
    ${field(t("name"), "name", p?.name || "", { required: true })}
    ${field(t("speciesBreed"), "species", p?.species || "", { placeholder: "e.g. dog, labrador" })}
    ${field(t("vetName"), "vetName", p?.vetName || "")}
    ${field(t("vetPhone"), "vetPhone", p?.vetPhone || "", { type: "tel" })}
    ${field(t("notes"), "notes", p?.notes || "", { textarea: true, placeholder: "Food, medication, carrier location…" })}
  `, {
    onSubmit: (fd) => {
      const v = trimAll(Object.fromEntries(fd));
      if (!v.name) {
        toast(t("nameRequired"));
        return false;
      }
      const arr = state.sections.household.pets;
      if (p) Object.assign(arr.find((x) => x.id === p.id), v);
      else arr.push({ id: uid(), ...v });
      save("household").then(() => {
        refresh();
        toast(t("saved"));
      });
    }
  });
}

function contactForm(c) {
  openModal(c ? t("editContact") : t("addContact"), `
    ${field(t("name"), "name", c?.name || "", { required: true })}
    ${field(t("category"), "category", c?.category || "Family", { options: CONTACT_CATEGORIES.map((x) => [x, td(x)]) })}
    ${field(t("phone"), "phone", c?.phone || "", { type: "tel" })}
    ${field(t("alternativePhone"), "altPhone", c?.altPhone || "", { type: "tel" })}
    ${field(t("email"), "email", c?.email || "", { type: "email" })}
    ${field(t("address"), "address", c?.address || "")}
    ${field(t("notes"), "notes", c?.notes || "", { textarea: true })}
  `, {
    onSubmit: (fd) => {
      const v = trimAll(Object.fromEntries(fd));
      if (!v.name) {
        toast(t("nameRequired"));
        return false;
      }
      const arr = state.sections.contacts.list;
      if (c) Object.assign(arr.find((x) => x.id === c.id), v);
      else arr.push({ id: uid(), ...v });
      save("contacts").then(() => {
        refresh();
        toast(t("saved"));
      });
    }
  });
}

function placeFieldset(f, label, p) {
  return `<fieldset class="place-fs">
    <legend>${esc(label)}</legend>
    ${field(t("nameDesc"), `${f}__label`, p.label || "", { placeholder: "e.g. the big oak tree" })}
    ${field(t("address"), `${f}__address`, p.address || "", { placeholder: "Street, number, city" })}
    <div class="vf-row">
      <input type="text" inputmode="decimal" name="${f}__lat" placeholder="${esc(t("latitude"))}" value="${esc(p.lat || "")}">
      <input type="text" inputmode="decimal" name="${f}__lng" placeholder="${esc(t("longitude"))}" value="${esc(p.lng || "")}">
    </div>
    <button type="button" class="btn ghost small" data-action="geo-fill" data-prefix="${f}">${esc(t("useMyLocation"))}</button>
  </fieldset>`;
}

function planForm(key) {
  const cfg = PLAN_CARDS[key];
  const data = state.sections.plan[key] || {};
  const body = cfg.meeting
    ? cfg.places.map(([f, labelKey]) => placeFieldset(f, t(labelKey), data[f] || {})).join("")
    : cfg.fields.map(([f, labelKey, type]) => field(t(labelKey), f, data[f] || "", { type: type || "text" })).join("");
  openModal(t(cfg.titleKey), `
    ${cfg.hintKey ? `<p class="hint">${esc(t(cfg.hintKey))}</p>` : ""}
    ${body}
  `, {
    onSubmit: (fd) => {
      if (cfg.meeting) {
        const out = {};
        for (const [f] of cfg.places) {
          out[f] = {
            label: String(fd.get(`${f}__label`) || "").trim(),
            address: String(fd.get(`${f}__address`) || "").trim(),
            lat: String(fd.get(`${f}__lat`) || "").trim(),
            lng: String(fd.get(`${f}__lng`) || "").trim()
          };
        }
        state.sections.plan[key] = out;
      } else {
        state.sections.plan[key] = trimAll(Object.fromEntries(fd));
      }
      save("plan").then(() => {
        refresh();
        toast(t("saved"));
      });
    }
  });
}

function planNotesForm() {
  openModal(t("otherNotes"), field(t("notes"), "notes", state.sections.plan.notes || "", { textarea: true }), {
    onSubmit: (fd) => {
      state.sections.plan.notes = String(fd.get("notes") || "").trim();
      save("plan").then(() => {
        refresh();
        toast(t("saved"));
      });
    }
  });
}

function kitForm(item) {
  const cats = [...new Set(state.sections.kit.items.map((i) => i.cat))];
  if (!cats.includes("Custom")) cats.push("Custom");
  openModal(item ? t("editItem") : t("addKitItem"), `
    ${field(t("item"), "label", item?.label || "", { required: true })}
    ${field(t("category"), "cat", item?.cat || cats[0], { options: cats.map((c) => [c, td(c)]) })}
    ${field(t("quantity"), "qty", item?.qty || "", { placeholder: "e.g. 12 L, 3 pcs" })}
    ${field(t("hint"), "hint", item?.hint || "", { placeholder: "Short guidance shown under the item" })}
    ${field(t("notes"), "notes", item?.notes || "", { placeholder: "e.g. expiry date, location" })}
  `, {
    onSubmit: (fd) => {
      const v = trimAll(Object.fromEntries(fd));
      if (!v.label) {
        toast(t("itemNameRequired"));
        return false;
      }
      const arr = state.sections.kit.items;
      if (item) Object.assign(arr.find((x) => x.id === item.id), v);
      else arr.push({ id: uid(), done: false, custom: true, ...v });
      save("kit").then(() => {
        refresh();
        toast(t("saved"));
      });
    }
  });
}

function vfRow(label = "", value = "") {
  return `<div class="vf-row">
    <input type="text" name="vf_label" placeholder="${esc(t("labelField"))}" value="${esc(label)}">
    <input type="text" name="vf_value" placeholder="${esc(t("valueField"))}" value="${esc(value)}">
  </div>`;
}

function vitalForm(r) {
  const rows = (r?.fields?.length ? r.fields : [{ label: "", value: "" }]).map((f) => vfRow(f.label, f.value)).join("");
  openModal(r ? t("editRecord") : t("addVitalRecord"), `
    ${field(t("title"), "title", r?.title || "", { required: true, placeholder: "e.g. Home insurance" })}
    ${field(t("category"), "category", r?.category || "Insurance", { options: VITAL_CATEGORIES.map((c) => [c, td(c)]) })}
    <div id="vfRows">${rows}</div>
    <button type="button" class="btn ghost small" data-action="vital-add-row">${esc(t("addField"))}</button>
    ${field(t("notes"), "notes", r?.notes || "", { textarea: true })}
  `, {
    onSubmit: (fd) => {
      const title = String(fd.get("title") || "").trim();
      if (!title) {
        toast(t("titleRequired"));
        return false;
      }
      const labels = fd.getAll("vf_label");
      const values = fd.getAll("vf_value");
      const fields = labels
        .map((label, i) => ({ label: String(label).trim(), value: String(values[i] || "").trim() }))
        .filter((f) => f.label || f.value);
      const rec = {
        id: r?.id || uid(),
        title,
        category: String(fd.get("category") || "Other"),
        fields,
        notes: String(fd.get("notes") || "").trim()
      };
      const arr = state.sections.vital.records;
      if (r) Object.assign(arr.find((x) => x.id === r.id), rec);
      else arr.push(rec);
      save("vital").then(() => {
        refresh();
        toast(t("saved"));
      });
    }
  });
}

// ---------- ICE emergency message ----------

function buildEmergencyMessage(status, withIds, kitIds, location) {
  const hh = state.sections.household;
  const kit = state.sections.kit;

  const statusText =
    status === "help" ? t("needHelp") : status === "moving" ? t("headingToSafety") : t("imSafe");

  const withNames = hh.members.filter((m) => withIds.includes(m.id)).map((m) => m.name);
  const withText = withNames.length ? withNames.join(", ") : t("nobody");

  const kitItems = kit.items.filter((i) => kitIds.includes(i.id)).map((i) => i.label);
  const kitText = kitItems.length ? kitItems.join(", ") : "—";

  let msg = `${statusText}\n${t("withMe")}: ${withText}`;

  if (location && location.text) {
    // "Where I'm heading" when status is help/moving, or location is a destination (meeting/shelter).
    // "Where I am" only when status is safe AND location is current GPS.
    const heading = status === "help" || status === "moving" || location.kind !== "current";
    const locLabel = heading ? t("locationHeading") : t("locationWhereAmI");
    msg += `\n${locLabel}: ${location.text}`;
  }

  msg += `\n${t("kitPicked")}: ${kitText}`;
  return msg;
}

function resolveLocationChoice(fd) {
  const kind = fd.get("locKind");
  if (!kind || kind === "none") return null;
  if (kind === "current") {
    return state.userLocation
      ? { kind, text: `${state.userLocation.lat.toFixed(6)},${state.userLocation.lng.toFixed(6)}` }
      : { kind, pendingGps: true };
  }
  if (kind === "meeting") {
    const key = fd.get("locMeeting");
    const pl = state.sections.plan.meeting[key];
    if (!pl) return null;
    const parts = [pl.label, pl.address].filter(Boolean);
    const coords = pl.lat && pl.lng ? ` (${pl.lat},${pl.lng})` : "";
    return { kind, text: (parts.join(", ") || key) + coords };
  }
  if (kind === "shelter") {
    const idx = parseInt(fd.get("locShelter"), 10);
    const s = SHELTERS[idx];
    if (!s) return null;
    return { kind, text: `${s.name}, ${s.address}, ${s.locality} (${s.lat},${s.lng})` };
  }
  return null;
}

function composeMsgForm() {
  const hh = state.sections.household;
  const kit = state.sections.kit;
  const contacts = state.sections.contacts.list.filter((c) => c.phone);

  const memberChecks = hh.members.length
    ? hh.members
        .map(
          (m) => `<label class="check-row"><input type="checkbox" name="with" value="${m.id}"><span>${esc(m.name)}</span></label>`
        )
        .join("")
    : `<p class="hint">${esc(t("noRecipients"))}</p>`;

  // show ALL kit items (the kit page is a prep guideline; here you pick what you actually took)
  const kitCats = [...new Set(kit.items.map((i) => i.cat))];
  const kitChecks = kitCats
    .map(
      (cat) =>
        `<div class="check-cat">${esc(cat)}</div>` +
        kit.items
          .filter((i) => i.cat === cat)
          .map(
            (i) => `<label class="check-row"><input type="checkbox" name="kit" value="${i.id}"><span>${esc(i.label)}</span></label>`
          )
          .join("")
    )
    .join("");

  const recipientChecks = contacts.length
    ? contacts
        .map(
          (c) => `<label class="check-row"><input type="checkbox" name="rcpt" value="${esc(c.phone)}" checked><span>${esc(c.name)} · ${esc(c.phone)}</span></label>`
        )
        .join("")
    : `<p class="hint">${esc(t("noRecipients"))}</p>`;

  // location options
  const p = state.sections.plan;
  const meetingOpts = [["near", t("rightOutsideHome")], ["neighborhood", t("outsideNeighborhood")], ["regional", t("outOfTown")]]
    .filter(([k]) => {
      const pl = p.meeting[k];
      return pl && (pl.label || pl.address || (pl.lat && pl.lng));
    })
    .map(([k, label]) => `<option value="${k}">${esc(label)}${p.meeting[k].label ? " — " + esc(p.meeting[k].label) : ""}</option>`)
    .join("");

  openModal(t("sendEmergencyMessage"), `
    <label class="fld"><span>${esc(t("statusLabel"))}</span>
      <select name="status">
        <option value="safe">${esc(t("imSafe"))}</option>
        <option value="moving">${esc(t("headingToSafety"))}</option>
        <option value="help">${esc(t("needHelp"))}</option>
      </select>
    </label>
    <div class="fld"><span class="fld-label">${esc(t("withMe"))}</span><div class="check-list">${memberChecks}</div></div>

    <div class="fld"><span class="fld-label">${esc(t("locationLabel"))}</span>
      <select name="locKind" id="locKind">
        <option value="none">${esc(t("locationNone"))}</option>
        <option value="current">${esc(t("locationCurrent"))}</option>
        ${meetingOpts ? `<option value="meeting">${esc(t("pickMeetingPlace"))}</option>` : ""}
        <option value="shelter">${esc(t("pickShelter"))}</option>
      </select>
      <select name="locMeeting" id="locMeeting" class="loc-sub" hidden>${meetingOpts}</select>
      <select name="locShelter" id="locShelter" class="loc-sub" hidden>
        ${SHELTERS.map((s, i) => `<option value="${i}">${esc(s.name)} — ${esc(s.locality)}</option>`).join("")}
      </select>
    </div>

    <div class="fld"><span class="fld-label">${esc(t("selectRecipients"))}</span><div class="check-list">${recipientChecks}</div></div>
    <div class="fld"><span class="fld-label">${esc(t("kitPicked"))}</span><div class="check-list">${kitChecks || '<p class="hint">—</p>'}</div></div>
    <label class="fld"><span>${esc(t("messagePreview"))}</span><textarea name="msg" id="msgPreview" rows="6"></textarea></label>
    <div class="btn-row wrap">
      <button type="button" class="btn ghost small" data-action="msg-regen">↻ ${esc(t("compose"))}</button>
      <button type="button" class="btn ghost small" data-action="msg-copy">📋 ${esc(t("copyMessage"))}</button>
    </div>
    <div class="btn-row wrap" style="margin-top:10px">
      <button type="button" class="btn primary" data-action="msg-sms">📲 ${esc(t("sendViaSms"))}</button>
      <button type="button" class="btn primary" data-action="msg-whatsapp">💬 ${esc(t("sendViaWhatsapp"))}</button>
    </div>
  `, { submitLabel: t("close"), onSubmit: () => {} });

  const regen = () => {
    const form = $("#modalForm");
    if (!form) return;
    const fd = new FormData(form);
    const loc = resolveLocationChoice(fd);
    if (loc && loc.pendingGps) {
      // need GPS first
      if (!navigator.geolocation) {
        toast(t("locationError"));
      } else {
        toast(t("gettingLocation"));
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            state.userLocation = { lat: pos.coords.latitude, lng: pos.coords.longitude };
            regen();
          },
          () => toast(t("locationError")),
          { enableHighAccuracy: true, timeout: 10000 }
        );
      }
      return;
    }
    const preview = $("#msgPreview");
    if (preview) preview.value = buildEmergencyMessage(fd.get("status"), fd.getAll("with"), fd.getAll("kit"), loc);
  };

  const syncLocSub = () => {
    const kind = $("#locKind") ? $("#locKind").value : "none";
    if ($("#locMeeting")) $("#locMeeting").hidden = kind !== "meeting";
    if ($("#locShelter")) $("#locShelter").hidden = kind !== "shelter";
  };
  syncLocSub();
  regen();

  const form = $("#modalForm");
  if (form) {
    form.addEventListener("change", (e) => {
      if (e.target.name === "msg") return;
      if (e.target.name === "locKind") syncLocSub();
      regen();
    });
  }
}

async function sendMsg(channel) {
  const fd = new FormData($("#modalForm"));
  const msg = $("#msgPreview").value;
  const recipients = fd.getAll("rcpt");
  if (!msg.trim()) {
    toast(t("messageEmpty"));
    return;
  }
  if (channel === "copy") {
    try {
      await navigator.clipboard.writeText(msg);
      toast(t("messageCopied"));
    } catch {
      toast(msg);
    }
    return;
  }
  if (!recipients.length) {
    toast(t("noRecipients"));
    return;
  }
  const encoded = encodeURIComponent(msg);
  if (channel === "sms") {
    // sms: with comma-separated numbers works on Android
    window.location.href = `sms:${recipients.join(",")}?body=${encoded}`;
  } else if (channel === "whatsapp") {
    // Prefer the native share sheet (lets you pick multiple chats / any app).
    if (navigator.share) {
      try {
        await navigator.share({ text: msg });
        return;
      } catch (err) {
        if (err && err.name === "AbortError") return; // user cancelled
        // fall through to wa.me
      }
    }
    // Fallback: wa.me opens one chat at a time
    const first = recipients[0].replace(/[^0-9]/g, "");
    window.open(`https://wa.me/${first}?text=${encoded}`, "_blank");
    if (recipients.length > 1) toast(t("whatsappOneAtTime"));
  }
}

// ---------- Map (online only) ----------

let leafletReady = null;

function loadLeaflet() {
  if (!leafletReady) {
    leafletReady = new Promise((resolve, reject) => {
      const css = document.createElement("link");
      css.rel = "stylesheet";
      css.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(css);
      const s = document.createElement("script");
      s.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
      s.onload = resolve;
      s.onerror = () => reject(new Error("leaflet load failed"));
      document.head.appendChild(s);
    });
  }
  return leafletReady;
}

let allSheltersMap = null;
let userMarker = null;

async function initAllSheltersMap() {
  try {
    await loadLeaflet();
    const el = document.getElementById("mapCanvasAll");
    if (!el) return;
    const center = state.userLocation ? [state.userLocation.lat, state.userLocation.lng] : [45.94, 25.0]; // Romania
    const zoom = state.userLocation ? 11 : 7;
    allSheltersMap = L.map(el).setView(center, zoom);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "&copy; OpenStreetMap contributors"
    }).addTo(allSheltersMap);
    if (state.userLocation) addUserMarkerToAllMap();
    for (const s of SHELTERS) {
      L.circleMarker([s.lat, s.lng], {
        radius: 4,
        color: "#b42318",
        weight: 1,
        fillColor: "#e5484d",
        fillOpacity: 0.7
      }).addTo(allSheltersMap).bindPopup(`<strong>${esc(s.name)}</strong><br>${esc(s.address)}<br>${esc(s.locality)}`);
    }
  } catch (err) {
    console.error(err);
    const el = document.getElementById("mapCanvasAll");
    if (el) el.outerHTML = `<div class="map-offline"><div class="map-pin">🗺️</div><p>${esc(t("mapOnlineOnly"))}</p></div>`;
  }
}

function openFullSheltersMap() {
  const pts = SHELTERS.map((s) => ({ n: s.name, a: s.address, l: s.locality, lat: s.lat, lng: s.lng }));
  const user = state.userLocation;
  const L10n = {
    you: t("youMarker"),
    locate: t("locateMe"),
    directions: t("directions"),
    locating: t("gettingLocationToast"),
    locError: t("locationError")
  };
  const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(t("allSheltersMap"))}</title>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">
<style>
html,body,#map{height:100%;margin:0}
.loc-btn{position:absolute;top:12px;right:12px;z-index:1000;background:#b42318;color:#fff;border:none;border-radius:10px;padding:12px 16px;font-size:15px;font-weight:700;cursor:pointer;box-shadow:0 4px 14px rgba(0,0,0,.3);font-family:system-ui,sans-serif}
.loc-btn:active{transform:scale(.97)}
.leaflet-popup-content{font-family:system-ui,sans-serif;font-size:14px;line-height:1.4}
.nav-link{display:inline-block;margin-top:8px;background:#b42318;color:#fff!important;text-decoration:none;padding:7px 12px;border-radius:8px;font-weight:600;font-size:13px}
.nav-alt{background:#1f6fb5}
</style></head><body>
<div id="map"></div>
<button class="loc-btn" id="locBtn">📡 ${esc(L10n.locate)}</button>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"><\/script>
<script>
const pts = ${JSON.stringify(pts)};
const L10n = ${JSON.stringify(L10n)};
let user = ${JSON.stringify(user || null)};
const map = L.map('map').setView(user ? [user.lat, user.lng] : [45.94, 25.0], user ? 11 : 7);
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; OpenStreetMap contributors' }).addTo(map);
let userMarker = null;
function showUser() {
  if (!user) return;
  if (userMarker) userMarker.remove();
  userMarker = L.circleMarker([user.lat, user.lng], { radius: 9, color: '#fff', weight: 2, fillColor: '#0078d4', fillOpacity: 1 }).addTo(map).bindPopup(L10n.you);
  map.setView([user.lat, user.lng], 13);
}
if (user) showUser();
document.getElementById('locBtn').addEventListener('click', () => {
  if (!navigator.geolocation) { alert(L10n.locError); return; }
  document.getElementById('locBtn').textContent = '⏳ ' + L10n.locating;
  navigator.geolocation.getCurrentPosition((pos) => {
    user = { lat: pos.coords.latitude, lng: pos.coords.longitude };
    showUser();
    document.getElementById('locBtn').textContent = '📡 ' + L10n.locate;
  }, () => {
    alert(L10n.locError);
    document.getElementById('locBtn').textContent = '📡 ' + L10n.locate;
  }, { enableHighAccuracy: true, timeout: 10000 });
});
// geo: URI opens the device's maps app (OsmAnd / Organic Maps work fully offline
// with downloaded maps). OSM web link is the online fallback.
function geoUrl(p) {
  return 'geo:' + p.lat + ',' + p.lng + '?q=' + p.lat + ',' + p.lng + '(' + encodeURIComponent(p.n) + ')';
}
function osmDirUrl(p) {
  const dest = p.lat + ',' + p.lng;
  return user
    ? 'https://www.openstreetmap.org/directions?from=' + user.lat + '%2C' + user.lng + '&to=' + encodeURIComponent(dest)
    : 'https://www.openstreetmap.org/directions?to=' + encodeURIComponent(dest);
}
for (const p of pts) {
  const popup = '<strong>' + p.n + '</strong><br>' + p.a + '<br>' + p.l +
    '<br><a class="nav-link" href="' + geoUrl(p) + '">🧭 ' + L10n.directions + '</a>' +
    ' <a class="nav-link nav-alt" target="_blank" rel="noopener" href="' + osmDirUrl(p) + '">🌐 OSM</a>';
  L.circleMarker([p.lat, p.lng], { radius: 5, color: '#b42318', weight: 1, fillColor: '#e5484d', fillOpacity: 0.7 })
    .addTo(map).bindPopup(popup);
}
<\/script></body></html>`;
  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank");
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

function addUserMarkerToAllMap() {
  if (!allSheltersMap || !state.userLocation) return;
  if (userMarker) userMarker.remove();
  userMarker = L.circleMarker([state.userLocation.lat, state.userLocation.lng], {
    radius: 9,
    color: "#fff",
    weight: 2,
    fillColor: "#0078d4",
    fillOpacity: 1
  }).addTo(allSheltersMap).bindPopup(esc(t("youMarker"))).openPopup();
  allSheltersMap.setView([state.userLocation.lat, state.userLocation.lng], 12);
}

async function initLeafletMap(lat, lng, label) {
  try {
    await loadLeaflet();
    const el = document.getElementById("mapCanvas");
    if (!el) return;
    const map = L.map(el).setView([parseFloat(lat), parseFloat(lng)], 16);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "&copy; OpenStreetMap contributors"
    }).addTo(map);
    L.marker([parseFloat(lat), parseFloat(lng)]).addTo(map).bindPopup(esc(label || "Meeting place")).openPopup();
  } catch (err) {
    console.error(err);
    const el = document.getElementById("mapCanvas");
    if (el) el.outerHTML = `<div class="map-offline"><div class="map-pin">📍</div><p>${esc(t("mapCouldNotLoad"))}</p></div>`;
  }
}

// ---------- Documents ----------

async function onDocFiles(input) {
  const files = [...input.files];
  if (!files.length) return;
  for (const f of files) {
    await db.putFile({
      id: uid(),
      name: f.name,
      mime: f.type || "application/octet-stream",
      size: f.size,
      category: state.docCategory,
      notes: "",
      addedAt: new Date().toISOString(),
      blob: f
    });
  }
  await refreshFilesMeta();
  refresh();
  toast(files.length === 1 ? t("fileStored") : `${files.length} ${t("filesStored")}`);
}

async function docOpen(id) {
  const f = await db.getFile(id);
  if (!f) return;
  const url = URL.createObjectURL(f.blob);
  window.open(url, "_blank");
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

async function docDownload(id) {
  const f = await db.getFile(id);
  if (!f) return;
  const url = URL.createObjectURL(f.blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = f.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

// ---------- Export / Import ----------

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
}

async function buildBackup() {
  const data = await db.getAllSections();
  const files = await db.getAllFiles();
  const packed = [];
  for (const f of files) {
    packed.push({
      id: f.id,
      name: f.name,
      mime: f.mime,
      size: f.size,
      category: f.category,
      notes: f.notes || "",
      addedAt: f.addedAt,
      data: await blobToDataUrl(f.blob)
    });
  }
  return { app: "safehaven", version: 1, exportedAt: new Date().toISOString(), encrypted: false, data, files: packed };
}

function stamp() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
}

function downloadText(name, text) {
  const url = URL.createObjectURL(new Blob([text], { type: "application/json" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

async function markExported() {
  state.sections.meta.lastExportAt = new Date().toISOString();
  await save("meta");
}

async function doExport(encrypted) {
  try {
    const backup = await buildBackup();
    let text;
    let suffix = "";
    if (encrypted) {
      const pass = await promptPassphrase({ confirm: true, title: "Encrypt backup" });
      if (!pass) return;
      const payload = await cryptoBox.encryptText(JSON.stringify(backup), pass);
      text = JSON.stringify({ app: "safehaven", version: 1, exportedAt: backup.exportedAt, encrypted: true, ...payload });
      suffix = "-encrypted";
    } else {
      text = JSON.stringify(backup);
    }
    downloadText(`safehaven-backup-${stamp()}${suffix}.json`, text);
    await markExported();
    refresh();
    toast(t("backupExported"));
  } catch (err) {
    console.error(err);
    toast(t("exportFailed"));
  }
}

async function doShare() {
  try {
    const backup = await buildBackup();
    const file = new File([JSON.stringify(backup)], `safehaven-backup-${stamp()}.json`, { type: "application/json" });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: "SafeHaven backup" });
      await markExported();
      refresh();
    } else {
      toast(t("shareNotSupported"));
    }
  } catch (err) {
    if (err && err.name === "AbortError") return;
    console.error(err);
    toast(t("shareFailed"));
  }
}

async function doImportFile(file) {
  try {
    const text = await file.text();
    let obj = JSON.parse(text);
    if (!obj || obj.app !== "safehaven") throw new Error("bad file");
    if (obj.encrypted) {
      const pass = await promptPassphrase({ title: "Backup passphrase" });
      if (!pass) return;
      try {
        obj = JSON.parse(await cryptoBox.decryptText(obj, pass));
      } catch {
        toast(t("wrongPassphrase"));
        return;
      }
      if (!obj || obj.app !== "safehaven") throw new Error("bad file");
    }
    const ok = await confirmDialog(t("importReplaceConfirm"), t("replaceData"), true);
    if (!ok) return;
    await db.clearAll();
    for (const [id, value] of Object.entries(obj.data || {})) await db.setSection(id, value);
    for (const f of obj.files || []) {
      const blob = await (await fetch(f.data)).blob();
      await db.putFile({
        id: f.id || uid(),
        name: f.name || "file",
        mime: f.mime || blob.type,
        size: f.size || blob.size,
        category: f.category || "Other",
        notes: f.notes || "",
        addedAt: f.addedAt || new Date().toISOString(),
        blob
      });
    }
    await loadState();
    await refreshFilesMeta();
    refresh();
    toast(t("backupImported"));
  } catch (err) {
    console.error(err);
    toast(t("importFailed"));
  }
}

async function doErase() {
  const ok1 = await confirmDialog(t("eraseConfirm1"), t("eraseEverything"), true);
  if (!ok1) return;
  const ok2 = await confirmDialog(t("eraseConfirm2"), t("yesErase"), true);
  if (!ok2) return;
  await db.clearAll();
  await loadState();
  await refreshFilesMeta();
  location.hash = "#/home";
  refresh();
  toast(t("allDataErased"));
}

// ---------- Print ----------

function buildPrintSheet() {
  const p = state.sections.plan;
  const hh = state.sections.household;
  const ct = state.sections.contacts;
  const kit = state.sections.kit;

  const planRows = Object.entries(PLAN_CARDS)
    .map(([key, cfg]) => {
      const data = p[key] || {};
      if (cfg.meeting) {
        const rows = cfg.places
          .map(([f, labelKey]) => {
            const pl = data[f] || {};
            const txt = [pl.label, pl.address].filter(Boolean).join(", ") + (pl.lat && pl.lng ? ` (${pl.lat},${pl.lng})` : "");
            return txt.trim() ? `<tr><th>${esc(t(labelKey))}</th><td>${esc(txt)}</td></tr>` : "";
          })
          .join("");
        return rows ? `<h3>${esc(t(cfg.titleKey))}</h3><table>${rows}</table>` : "";
      }
      const rows = cfg.fields
        .filter(([f]) => data[f] && String(data[f]).trim())
        .map(([f, labelKey]) => `<tr><th>${esc(t(labelKey))}</th><td>${esc(data[f])}</td></tr>`)
        .join("");
      return rows ? `<h3>${esc(t(cfg.titleKey))}</h3><table>${rows}</table>` : "";
    })
    .join("");

  const members = hh.members
    .map((m) => {
      const bits = [
        m.dob ? `${t("dob")}: ${fmtDate(m.dob)}` : "",
        m.blood ? `${t("bloodType")}: ${m.blood}` : "",
        m.allergies ? `${t("allergies")}: ${m.allergies}` : "",
        m.conditions ? `${t("conditions")}: ${m.conditions}` : "",
        m.medications ? `${t("medications")}: ${m.medications.replace(/\n/g, "; ")}` : "",
        m.doctorName ? `${t("doctor")}: ${m.doctorName} ${m.doctorPhone || ""}` : ""
      ].filter(Boolean);
      return `<tr><th>${esc(m.name)}</th><td>${esc(bits.join(" · "))}</td></tr>`;
    })
    .join("");

  const contacts = ct.list
    .map((c) => `<tr><th>${esc(c.name)}</th><td>${esc([td(c.category), c.phone, c.altPhone].filter(Boolean).join(" · "))}</td></tr>`)
    .join("");

  const kitRows = kit.items
    .map((i) => `<tr><td>${i.done ? "☑" : "☐"}</td><td>${esc(i.label)}${i.qty ? ` (${esc(i.qty)})` : ""}</td></tr>`)
    .join("");

  $("#printSheet").innerHTML = `
    <h1>SafeHaven — ${esc(t("emergencyPlan"))}</h1>
    <p>${esc(t("printDesc"))}</p>
    ${planRows}
    ${p.notes ? `<h3>${esc(t("notes"))}</h3><p>${esc(p.notes).replace(/\n/g, "<br>")}</p>` : ""}
    ${members ? `<h3>${esc(t("medicalAlerts"))}</h3><table>${members}</table>` : ""}
    ${hh.pets.length ? `<h3>${esc(t("pets"))}</h3><table>${hh.pets.map((x) => `<tr><th>${esc(x.name)}</th><td>${esc([x.species, x.vetName, x.vetPhone].filter(Boolean).join(" · "))}</td></tr>`).join("")}</table>` : ""}
    ${contacts ? `<h3>${esc(t("emergencyContacts"))}</h3><table>${contacts}</table>` : ""}
    ${kitRows ? `<h3>${esc(t("emergencyKit"))}</h3><table>${kitRows}</table>` : ""}
  `;
}

// ---------- Global event handlers ----------

document.addEventListener("click", async (e) => {
  if (e.target.classList && e.target.classList.contains("modal-backdrop")) {
    closeModal();
    return;
  }
  const el = e.target.closest("[data-action]");
  if (!el) return;
  const action = el.dataset.action;
  const id = el.dataset.id;
  const hh = state.sections.household;

  switch (action) {
    case "modal-close":
      closeModal();
      break;

    case "seg-people":
      state.peopleTab = id;
      refresh();
      break;
    case "seg-vault":
      state.vaultTab = id;
      refresh();
      break;

    case "add-member":
      memberForm(null);
      break;
    case "edit-member":
      memberForm(hh.members.find((x) => x.id === id));
      break;
    case "del-member": {
      const m = hh.members.find((x) => x.id === id);
      if (m && (await confirmDialog(`${t("remove")} ${m.name}?`, t("remove"), true))) {
        hh.members = hh.members.filter((x) => x.id !== id);
        await save("household");
        refresh();
        toast(t("removed"));
      }
      break;
    }

    case "add-pet":
      petForm(null);
      break;
    case "edit-pet":
      petForm(hh.pets.find((x) => x.id === id));
      break;
    case "del-pet": {
      const p = hh.pets.find((x) => x.id === id);
      if (p && (await confirmDialog(`${t("remove")} ${p.name}?`, t("remove"), true))) {
        hh.pets = hh.pets.filter((x) => x.id !== id);
        await save("household");
        refresh();
        toast(t("removed"));
      }
      break;
    }

    case "add-contact":
      contactForm(null);
      break;
    case "edit-contact":
      contactForm(state.sections.contacts.list.find((x) => x.id === id));
      break;
    case "del-contact": {
      const c = state.sections.contacts.list.find((x) => x.id === id);
      if (c && (await confirmDialog(`${t("remove")} ${c.name}?`, t("remove"), true))) {
        state.sections.contacts.list = state.sections.contacts.list.filter((x) => x.id !== id);
        await save("contacts");
        refresh();
        toast(t("removed"));
      }
      break;
    }

    case "edit-plan":
      planForm(id);
      break;

    case "geo-fill": {
      const prefix = el.dataset.prefix;
      if (!navigator.geolocation) {
        toast(t("locationError"));
        break;
      }
      toast(t("gettingLocationToast"));
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude.toFixed(6);
          const lng = pos.coords.longitude.toFixed(6);
          const latEl = $(`#modalForm [name="${prefix}__lat"]`);
          const lngEl = $(`#modalForm [name="${prefix}__lng"]`);
          if (latEl) latEl.value = lat;
          if (lngEl) lngEl.value = lng;
          toast(t("locationCaptured"));
        },
        (err) => {
          console.error(err);
          toast(t("locationPermission"));
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
      break;
    }

    case "copy-coords": {
      const text = `${el.dataset.lat}, ${el.dataset.lng}`;
      try {
        await navigator.clipboard.writeText(text);
        toast(t("coordinatesCopied"));
      } catch {
        toast(text);
      }
      break;
    }

    case "show-map": {
      const { lat, lng, label } = el.dataset;
      openModal(label || t("locationLabel"), mapModalHtml(label || t("locationLabel"), lat, lng), { submitLabel: t("close"), onSubmit: () => {} });
      if (navigator.onLine) initLeafletMap(lat, lng, label);
      break;
    }
    case "edit-plan-notes":
      planNotesForm();
      break;

    case "kit-add":
      kitForm(null);
      break;
    case "kit-edit":
      kitForm(state.sections.kit.items.find((x) => x.id === id));
      break;
    case "kit-del": {
      const item = state.sections.kit.items.find((x) => x.id === id);
      if (item && (await confirmDialog(`${t("removeItemConfirm")} "${item.label}" ${t("fromKitList")}`, t("remove"), true))) {
        state.sections.kit.items = state.sections.kit.items.filter((x) => x.id !== id);
        await save("kit");
        refresh();
        toast(t("removed"));
      }
      break;
    }

    case "doc-upload":
      $("#docFileInput").click();
      break;
    case "doc-camera":
      $("#docCameraInput").click();
      break;
    case "doc-open":
      docOpen(id);
      break;
    case "doc-download":
      docDownload(id);
      break;
    case "doc-del": {
      const f = state.filesMeta.find((x) => x.id === id);
      if (f && (await confirmDialog(`${t("deleteFile")} "${f.name}"?`, t("delete"), true))) {
        await db.deleteFile(id);
        await refreshFilesMeta();
        refresh();
        toast(t("deleted"));
      }
      break;
    }

    case "vital-add":
      vitalForm(null);
      break;
    case "vital-edit":
      vitalForm(state.sections.vital.records.find((x) => x.id === id));
      break;
    case "vital-del": {
      const r = state.sections.vital.records.find((x) => x.id === id);
      if (r && (await confirmDialog(`${t("deleteFile")} "${r.title}"?`, t("delete"), true))) {
        state.sections.vital.records = state.sections.vital.records.filter((x) => x.id !== id);
        await save("vital");
        refresh();
        toast(t("deleted"));
      }
      break;
    }
    case "vital-add-row":
      $("#vfRows").insertAdjacentHTML("beforeend", vfRow());
      break;

    case "export-plain":
      doExport(false);
      break;
    case "export-encrypted":
      doExport(true);
      break;
    case "share-backup":
      doShare();
      break;
    case "import-trigger":
      $("#importFileInput").click();
      break;
    case "import-onedrive":
      cloud.pickOneDrive();
      break;
    case "import-gdrive":
      cloud.pickGoogleDrive();
      break;
    case "erase-all":
      doErase();
      break;
    case "print-summary":
      buildPrintSheet();
      window.print();
      break;
    case "shelter-locate": {
      if (!navigator.geolocation) {
        toast(t("locationError"));
        break;
      }
      toast(t("gettingLocation"));
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          state.userLocation = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          refresh();
          toast("📍 " + state.userLocation.lat.toFixed(4) + ", " + state.userLocation.lng.toFixed(4));
        },
        (err) => {
          console.error(err);
          toast(t("locationError"));
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
      break;
    }

    case "shelter-map": {
      const { lat, lng, label } = el.dataset;
      openModal(label || t("civilShelters"), mapModalHtml(label || "", lat, lng), { submitLabel: t("close"), onSubmit: () => {} });
      if (navigator.onLine) initLeafletMap(lat, lng, label);
      break;
    }

    case "shelter-map-all": {
      openModal(t("allSheltersMap"), allSheltersMapHtml(), { submitLabel: t("close"), onSubmit: () => {} });
      if (navigator.onLine) initAllSheltersMap();
      break;
    }

    case "map-all-full": {
      openFullSheltersMap();
      break;
    }

    case "map-all-locate": {
      if (!navigator.geolocation) {
        toast(t("locationError"));
        break;
      }
      toast(t("gettingLocationToast"));
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          state.userLocation = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          addUserMarkerToAllMap();
          toast(t("locationCaptured"));
        },
        () => toast(t("locationPermission")),
        { enableHighAccuracy: true, timeout: 10000 }
      );
      break;
    }

    case "toggle-lang": {
      const next = getLang() === "en" ? "ro" : "en";
      setLang(next);
      applyLang();
      refresh();
      break;
    }

    case "compose-msg":
      composeMsgForm();
      break;
    case "msg-regen": {
      const fd = new FormData($("#modalForm"));
      $("#msgPreview").value = buildEmergencyMessage(fd.get("status"), fd.getAll("with"), fd.getAll("kit"));
      break;
    }
    case "msg-copy":
      sendMsg("copy");
      break;
    case "msg-sms":
      sendMsg("sms");
      break;
    case "msg-whatsapp":
      sendMsg("whatsapp");
      break;

    case "toggle-theme": {
      const next = document.documentElement.getAttribute("data-theme") === "light" ? "dark" : "light";
      document.documentElement.setAttribute("data-theme", next);
      localStorage.setItem("safehavenTheme", next);
      const meta = document.querySelector('meta[name="theme-color"]');
      if (meta) meta.setAttribute("content", next === "light" ? "#f5f3ef" : "#0e1113");
      updateThemeIcon();
      break;
    }

    case "install-app":
      if (state.deferredInstall) {
        state.deferredInstall.prompt();
        state.deferredInstall = null;
        $("#installCard")?.setAttribute("hidden", "");
      }
      break;
  }
});

document.addEventListener("change", async (e) => {
  const el = e.target;
  if (el.matches("[data-kit-toggle]")) {
    const item = state.sections.kit.items.find((x) => x.id === el.dataset.kitToggle);
    if (item) {
      item.done = el.checked;
      await save("kit");
      const bar = $("#kitProgress");
      if (bar) bar.outerHTML = progressBar(kitCompletion(state.sections.kit), "Kit readiness", "kitProgress");
    }
  } else if (el.matches("[data-kit-qty]")) {
    const item = state.sections.kit.items.find((x) => x.id === el.dataset.kitQty);
    if (item) {
      item.qty = el.value.trim();
      await save("kit");
    }
  } else if (el.id === "docCategory") {
    state.docCategory = el.value;
  } else if (el.id === "shelterCounty") {
    state.shelterCounty = el.value;
    refresh();
  } else if (el.id === "docFileInput" || el.id === "docCameraInput") {
    await onDocFiles(el);
    el.value = "";
  } else if (el.id === "importFileInput") {
    if (el.files[0]) await doImportFile(el.files[0]);
    el.value = "";
  }
});

let shelterSearchTimer = null;
document.addEventListener("input", (e) => {
  if (e.target.id === "shelterSearch") {
    clearTimeout(shelterSearchTimer);
    shelterSearchTimer = setTimeout(() => {
      state.shelterSearch = e.target.value;
      const el = $("#shelterSearch");
      const pos = el ? el.selectionStart : 0;
      refresh();
      const el2 = $("#shelterSearch");
      if (el2) {
        el2.focus();
        el2.setSelectionRange(pos, pos);
      }
    }, 250);
  }
});

document.addEventListener("submit", (e) => {
  if (e.target.id === "modalForm") {
    e.preventDefault();
    if (modalSubmit) {
      const keep = modalSubmit(new FormData(e.target));
      if (keep !== false) closeModal();
    }
  }
});
