"use strict";

// ---------- Forms ----------

function memberForm(m) {
  openModal(m ? "Edit member" : "Add member", `
    ${field("Full name", "name", m?.name || "", { required: true })}
    ${field("Date of birth", "dob", m?.dob || "", { type: "date" })}
    ${field("Blood type", "blood", m?.blood || "", { options: BLOOD_TYPES.map((b) => [b, b || "Unknown / not set"]) })}
    ${field("Allergies", "allergies", m?.allergies || "", { textarea: true, placeholder: "e.g. penicillin, peanuts" })}
    ${field("Medications", "medications", m?.medications || "", { textarea: true, placeholder: "One per line, include dosage" })}
    ${field("Medical conditions", "conditions", m?.conditions || "", { textarea: true, placeholder: "e.g. diabetes, asthma" })}
    ${field("Doctor name", "doctorName", m?.doctorName || "")}
    ${field("Doctor phone", "doctorPhone", m?.doctorPhone || "", { type: "tel" })}
    ${field("Notes", "notes", m?.notes || "", { textarea: true })}
  `, {
    onSubmit: (fd) => {
      const v = trimAll(Object.fromEntries(fd));
      if (!v.name) {
        toast("Name is required");
        return false;
      }
      const arr = state.sections.household.members;
      if (m) Object.assign(arr.find((x) => x.id === m.id), v);
      else arr.push({ id: uid(), ...v });
      save("household").then(() => {
        refresh();
        toast("Saved");
      });
    }
  });
}

function petForm(p) {
  openModal(p ? "Edit pet" : "Add pet", `
    ${field("Name", "name", p?.name || "", { required: true })}
    ${field("Species / breed", "species", p?.species || "", { placeholder: "e.g. dog, labrador" })}
    ${field("Vet name", "vetName", p?.vetName || "")}
    ${field("Vet phone", "vetPhone", p?.vetPhone || "", { type: "tel" })}
    ${field("Notes", "notes", p?.notes || "", { textarea: true, placeholder: "Food, medication, carrier location…" })}
  `, {
    onSubmit: (fd) => {
      const v = trimAll(Object.fromEntries(fd));
      if (!v.name) {
        toast("Name is required");
        return false;
      }
      const arr = state.sections.household.pets;
      if (p) Object.assign(arr.find((x) => x.id === p.id), v);
      else arr.push({ id: uid(), ...v });
      save("household").then(() => {
        refresh();
        toast("Saved");
      });
    }
  });
}

function contactForm(c) {
  openModal(c ? "Edit contact" : "Add contact", `
    ${field("Name", "name", c?.name || "", { required: true })}
    ${field("Category", "category", c?.category || "Family", { options: CONTACT_CATEGORIES.map((x) => [x, x]) })}
    ${field("Phone", "phone", c?.phone || "", { type: "tel" })}
    ${field("Alternative phone", "altPhone", c?.altPhone || "", { type: "tel" })}
    ${field("Email", "email", c?.email || "", { type: "email" })}
    ${field("Address", "address", c?.address || "")}
    ${field("Notes", "notes", c?.notes || "", { textarea: true })}
  `, {
    onSubmit: (fd) => {
      const v = trimAll(Object.fromEntries(fd));
      if (!v.name) {
        toast("Name is required");
        return false;
      }
      const arr = state.sections.contacts.list;
      if (c) Object.assign(arr.find((x) => x.id === c.id), v);
      else arr.push({ id: uid(), ...v });
      save("contacts").then(() => {
        refresh();
        toast("Saved");
      });
    }
  });
}

function placeFieldset(f, label, p) {
  return `<fieldset class="place-fs">
    <legend>${esc(label)}</legend>
    ${field("Name / description", `${f}__label`, p.label || "", { placeholder: "e.g. the big oak tree" })}
    ${field("Address", `${f}__address`, p.address || "", { placeholder: "Street, number, city" })}
    <div class="vf-row">
      <input type="text" inputmode="decimal" name="${f}__lat" placeholder="Latitude" value="${esc(p.lat || "")}">
      <input type="text" inputmode="decimal" name="${f}__lng" placeholder="Longitude" value="${esc(p.lng || "")}">
    </div>
    <button type="button" class="btn ghost small" data-action="geo-fill" data-prefix="${f}">📡 Use my current location</button>
  </fieldset>`;
}

function planForm(key) {
  const cfg = PLAN_CARDS[key];
  const data = state.sections.plan[key] || {};
  const body = cfg.meeting
    ? cfg.places.map(([f, label]) => placeFieldset(f, label, data[f] || {})).join("")
    : cfg.fields.map(([f, label, type]) => field(label, f, data[f] || "", { type: type || "text" })).join("");
  openModal(cfg.title, `
    ${cfg.hint ? `<p class="hint">${esc(cfg.hint)}</p>` : ""}
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
        toast("Saved");
      });
    }
  });
}

function planNotesForm() {
  openModal("Other notes", field("Notes", "notes", state.sections.plan.notes || "", { textarea: true }), {
    onSubmit: (fd) => {
      state.sections.plan.notes = String(fd.get("notes") || "").trim();
      save("plan").then(() => {
        refresh();
        toast("Saved");
      });
    }
  });
}

function kitForm(item) {
  const cats = [...new Set(state.sections.kit.items.map((i) => i.cat))];
  if (!cats.includes("Custom")) cats.push("Custom");
  openModal(item ? "Edit item" : "Add kit item", `
    ${field("Item", "label", item?.label || "", { required: true })}
    ${field("Category", "cat", item?.cat || cats[0], { options: cats.map((c) => [c, c]) })}
    ${field("Quantity", "qty", item?.qty || "", { placeholder: "e.g. 12 L, 3 pcs" })}
    ${field("Hint", "hint", item?.hint || "", { placeholder: "Short guidance shown under the item" })}
    ${field("Notes", "notes", item?.notes || "", { placeholder: "e.g. expiry date, location" })}
  `, {
    onSubmit: (fd) => {
      const v = trimAll(Object.fromEntries(fd));
      if (!v.label) {
        toast("Item name is required");
        return false;
      }
      const arr = state.sections.kit.items;
      if (item) Object.assign(arr.find((x) => x.id === item.id), v);
      else arr.push({ id: uid(), done: false, custom: true, ...v });
      save("kit").then(() => {
        refresh();
        toast("Saved");
      });
    }
  });
}

function vfRow(label = "", value = "") {
  return `<div class="vf-row">
    <input type="text" name="vf_label" placeholder="Label (e.g. Policy #)" value="${esc(label)}">
    <input type="text" name="vf_value" placeholder="Value" value="${esc(value)}">
  </div>`;
}

function vitalForm(r) {
  const rows = (r?.fields?.length ? r.fields : [{ label: "", value: "" }]).map((f) => vfRow(f.label, f.value)).join("");
  openModal(r ? "Edit record" : "Add vital record", `
    ${field("Title", "title", r?.title || "", { required: true, placeholder: "e.g. Home insurance" })}
    ${field("Category", "category", r?.category || "Insurance", { options: VITAL_CATEGORIES.map((c) => [c, c]) })}
    <div id="vfRows">${rows}</div>
    <button type="button" class="btn ghost small" data-action="vital-add-row">+ Add field</button>
    ${field("Notes", "notes", r?.notes || "", { textarea: true })}
  `, {
    onSubmit: (fd) => {
      const title = String(fd.get("title") || "").trim();
      if (!title) {
        toast("Title is required");
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
        toast("Saved");
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
    toast("Message is empty");
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
    if (recipients.length > 1) toast("WhatsApp opens one chat at a time — resend for each contact");
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

async function initAllSheltersMap() {
  try {
    await loadLeaflet();
    const el = document.getElementById("mapCanvasAll");
    if (!el) return;
    const center = state.userLocation ? [state.userLocation.lat, state.userLocation.lng] : [45.94, 25.0]; // Romania
    const zoom = state.userLocation ? 11 : 7;
    const map = L.map(el).setView(center, zoom);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "&copy; OpenStreetMap contributors"
    }).addTo(map);
    if (state.userLocation) {
      L.circleMarker([state.userLocation.lat, state.userLocation.lng], {
        radius: 8,
        color: "#fff",
        weight: 2,
        fillColor: "#0078d4",
        fillOpacity: 1
      }).addTo(map).bindPopup("📍 You");
    }
    for (const s of SHELTERS) {
      L.circleMarker([s.lat, s.lng], {
        radius: 4,
        color: "#b42318",
        weight: 1,
        fillColor: "#e5484d",
        fillOpacity: 0.7
      }).addTo(map).bindPopup(`<strong>${esc(s.name)}</strong><br>${esc(s.address)}<br>${esc(s.locality)}`);
    }
  } catch (err) {
    console.error(err);
    const el = document.getElementById("mapCanvasAll");
    if (el) el.outerHTML = `<div class="map-offline"><div class="map-pin">🗺️</div><p>${esc(t("mapOnlineOnly"))}</p></div>`;
  }
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
    if (el) el.outerHTML = '<div class="map-offline"><div class="map-pin">📍</div><p>Map could not load.</p></div>';
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
  toast(files.length === 1 ? "File stored" : `${files.length} files stored`);
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
    toast("Backup exported");
  } catch (err) {
    console.error(err);
    toast("Export failed");
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
      toast("File sharing not supported here — use Export");
    }
  } catch (err) {
    if (err && err.name === "AbortError") return;
    console.error(err);
    toast("Share failed");
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
        toast("Wrong passphrase or corrupted file");
        return;
      }
      if (!obj || obj.app !== "safehaven") throw new Error("bad file");
    }
    const ok = await confirmDialog("Importing will REPLACE all current data on this device. Continue?", "Replace data", true);
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
    toast("Backup imported");
  } catch (err) {
    console.error(err);
    toast("Import failed — not a valid SafeHaven backup");
  }
}

async function doErase() {
  const ok1 = await confirmDialog("Erase ALL data on this device? This cannot be undone.", "Erase everything", true);
  if (!ok1) return;
  const ok2 = await confirmDialog("Really sure? Consider exporting a backup first.", "Yes, erase", true);
  if (!ok2) return;
  await db.clearAll();
  await loadState();
  await refreshFilesMeta();
  location.hash = "#/home";
  refresh();
  toast("All data erased");
}

// ---------- Print ----------

function buildPrintSheet() {
  const p = state.sections.plan;
  const hh = state.sections.household;
  const ct = state.sections.contacts;
  const kit = state.sections.kit;

  const planRows = Object.values(PLAN_CARDS)
    .map((cfg) => {
      const data = p[Object.keys(PLAN_CARDS).find((k) => PLAN_CARDS[k] === cfg)] || {};
      const rows = cfg.fields
        .filter(([f]) => data[f] && String(data[f]).trim())
        .map(([f, label]) => `<tr><th>${esc(label)}</th><td>${esc(data[f])}</td></tr>`)
        .join("");
      return rows ? `<h3>${esc(cfg.title)}</h3><table>${rows}</table>` : "";
    })
    .join("");

  const members = hh.members
    .map((m) => {
      const bits = [
        m.dob ? `DOB: ${fmtDate(m.dob)}` : "",
        m.blood ? `Blood: ${m.blood}` : "",
        m.allergies ? `Allergies: ${m.allergies}` : "",
        m.conditions ? `Conditions: ${m.conditions}` : "",
        m.medications ? `Medications: ${m.medications.replace(/\n/g, "; ")}` : "",
        m.doctorName ? `Doctor: ${m.doctorName} ${m.doctorPhone || ""}` : ""
      ].filter(Boolean);
      return `<tr><th>${esc(m.name)}</th><td>${esc(bits.join(" · "))}</td></tr>`;
    })
    .join("");

  const contacts = ct.list
    .map((c) => `<tr><th>${esc(c.name)}</th><td>${esc([c.category, c.phone, c.altPhone].filter(Boolean).join(" · "))}</td></tr>`)
    .join("");

  const kitRows = kit.items
    .map((i) => `<tr><td>${i.done ? "☑" : "☐"}</td><td>${esc(i.label)}${i.qty ? ` (${esc(i.qty)})` : ""}</td></tr>`)
    .join("");

  $("#printSheet").innerHTML = `
    <h1>SafeHaven — Family Emergency Plan</h1>
    <p>Printed ${esc(fmtDateTime(new Date().toISOString()))}. Keep a copy in your emergency kit.</p>
    ${planRows}
    ${p.notes ? `<h3>Notes</h3><p>${esc(p.notes).replace(/\n/g, "<br>")}</p>` : ""}
    ${members ? `<h3>Household medical info</h3><table>${members}</table>` : ""}
    ${hh.pets.length ? `<h3>Pets</h3><table>${hh.pets.map((x) => `<tr><th>${esc(x.name)}</th><td>${esc([x.species, x.vetName, x.vetPhone].filter(Boolean).join(" · "))}</td></tr>`).join("")}</table>` : ""}
    ${contacts ? `<h3>Emergency contacts</h3><table>${contacts}</table>` : ""}
    ${kitRows ? `<h3>Emergency kit checklist</h3><table>${kitRows}</table>` : ""}
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
      if (m && (await confirmDialog(`Remove ${m.name}?`, "Remove", true))) {
        hh.members = hh.members.filter((x) => x.id !== id);
        await save("household");
        refresh();
        toast("Removed");
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
      if (p && (await confirmDialog(`Remove ${p.name}?`, "Remove", true))) {
        hh.pets = hh.pets.filter((x) => x.id !== id);
        await save("household");
        refresh();
        toast("Removed");
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
      if (c && (await confirmDialog(`Remove ${c.name}?`, "Remove", true))) {
        state.sections.contacts.list = state.sections.contacts.list.filter((x) => x.id !== id);
        await save("contacts");
        refresh();
        toast("Removed");
      }
      break;
    }

    case "edit-plan":
      planForm(id);
      break;

    case "geo-fill": {
      const prefix = el.dataset.prefix;
      if (!navigator.geolocation) {
        toast("Geolocation not available on this device");
        break;
      }
      toast("Getting location…");
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude.toFixed(6);
          const lng = pos.coords.longitude.toFixed(6);
          const latEl = $(`#modalForm [name="${prefix}__lat"]`);
          const lngEl = $(`#modalForm [name="${prefix}__lng"]`);
          if (latEl) latEl.value = lat;
          if (lngEl) lngEl.value = lng;
          toast("Location captured");
        },
        (err) => {
          console.error(err);
          toast("Could not get location — check permission");
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
      break;
    }

    case "copy-coords": {
      const text = `${el.dataset.lat}, ${el.dataset.lng}`;
      try {
        await navigator.clipboard.writeText(text);
        toast("Coordinates copied");
      } catch {
        toast(text);
      }
      break;
    }

    case "show-map": {
      const { lat, lng, label } = el.dataset;
      openModal(label || "Location", mapModalHtml(label || "Location", lat, lng), { submitLabel: "Close", onSubmit: () => {} });
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
      if (item && (await confirmDialog(`Remove "${item.label}" from the kit list?`, "Remove", true))) {
        state.sections.kit.items = state.sections.kit.items.filter((x) => x.id !== id);
        await save("kit");
        refresh();
        toast("Removed");
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
      if (f && (await confirmDialog(`Delete "${f.name}"?`, "Delete", true))) {
        await db.deleteFile(id);
        await refreshFilesMeta();
        refresh();
        toast("Deleted");
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
      if (r && (await confirmDialog(`Delete "${r.title}"?`, "Delete", true))) {
        state.sections.vital.records = state.sections.vital.records.filter((x) => x.id !== id);
        await save("vital");
        refresh();
        toast("Deleted");
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
