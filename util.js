"use strict";

const $ = (sel, el = document) => el.querySelector(sel);
const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];

const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const uid = () =>
  crypto.randomUUID ? crypto.randomUUID() : "id-" + Date.now() + "-" + Math.random().toString(16).slice(2);

const trimAll = (obj) =>
  Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, typeof v === "string" ? v.trim() : v]));

const fmtDate = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  return isNaN(d) ? "" : d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
};

const fmtDateTime = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  return isNaN(d)
    ? ""
    : d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) +
        " " +
        d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
};

const fmtSize = (n) => {
  if (n == null || isNaN(n)) return "";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i++;
  }
  return n.toFixed(n >= 10 || i === 0 ? 0 : 1) + " " + units[i];
};

const telHref = (phone) => "tel:" + String(phone || "").replace(/[^0-9+*#]/g, "");

const age = (dob) => {
  const d = new Date(dob);
  if (isNaN(d)) return "";
  const now = new Date();
  let a = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) a--;
  return a >= 0 && a < 130 ? String(a) : "";
};

function updateThemeIcon() {
  const btn = $("#themeToggle");
  if (btn) btn.textContent = document.documentElement.getAttribute("data-theme") === "light" ? "🌙" : "☀️";
}

function applyLang() {
  const lang = getLang();
  document.documentElement.setAttribute("lang", lang);
  const btn = $("#langToggle");
  if (btn) btn.textContent = lang.toUpperCase();
  $$("[data-i18n]").forEach((el) => {
    el.textContent = t(el.dataset.i18n);
  });
}

function toast(msg, ms = 2600) {
  const root = $("#toastRoot");
  const el = document.createElement("div");
  el.className = "toast";
  el.textContent = msg;
  root.appendChild(el);
  requestAnimationFrame(() => el.classList.add("show"));
  setTimeout(() => {
    el.classList.remove("show");
    setTimeout(() => el.remove(), 300);
  }, ms);
}

let modalSubmit = null;

function openModal(title, bodyHtml, { submitLabel = "Save", onSubmit = null } = {}) {
  const root = $("#modalRoot");
  root.innerHTML = `
    <div class="modal-backdrop">
      <div class="modal" role="dialog" aria-modal="true" aria-label="${esc(title)}">
        <div class="modal-head">
          <h2>${esc(title)}</h2>
          <button type="button" class="icon-btn" data-action="modal-close" aria-label="Close">✕</button>
        </div>
        <form id="modalForm" class="modal-body" novalidate>
          ${bodyHtml}
          <div class="modal-foot">
            <button type="button" class="btn ghost" data-action="modal-close">${esc(t("cancel"))}</button>
            <button type="submit" class="btn primary">${esc(submitLabel)}</button>
          </div>
        </form>
      </div>
    </div>`;
  modalSubmit = onSubmit;
  const first = $("#modalForm input, #modalForm select, #modalForm textarea");
  if (first) first.focus();
}

function closeModal() {
  $("#modalRoot").innerHTML = "";
  modalSubmit = null;
}

function confirmDialog(message, okLabel, danger = false) {
  if (!okLabel) okLabel = t("confirm");
  return new Promise((resolve) => {
    const root = $("#modalRoot");
    root.innerHTML = `
      <div class="modal-backdrop">
        <div class="modal" role="alertdialog" aria-modal="true">
          <div class="modal-head"><h2>${esc(t("pleaseConfirm"))}</h2></div>
          <div class="modal-body">
            <p class="confirm-text">${esc(message)}</p>
            <div class="modal-foot">
              <button type="button" class="btn ghost" data-c="no">${esc(t("cancel"))}</button>
              <button type="button" class="btn ${danger ? "danger" : "primary"}" data-c="yes">${esc(okLabel)}</button>
            </div>
          </div>
        </div>
      </div>`;
    const done = (v) => {
      root.innerHTML = "";
      resolve(v);
    };
    root.querySelector('[data-c="yes"]').addEventListener("click", () => done(true));
    root.querySelector('[data-c="no"]').addEventListener("click", () => done(false));
    root.querySelector(".modal-backdrop").addEventListener("click", (e) => {
      if (e.target.classList.contains("modal-backdrop")) done(false);
    });
  });
}

function promptPassphrase({ confirm = false, title } = {}) {
  if (!title) title = t("setPassphrase");
  return new Promise((resolve) => {
    const root = $("#modalRoot");
    root.innerHTML = `
      <div class="modal-backdrop">
        <div class="modal" role="dialog" aria-modal="true" aria-label="${esc(title)}">
          <div class="modal-head"><h2>${esc(title)}</h2></div>
          <div class="modal-body">
            <label class="fld"><span>${esc(t("backupPassphrase"))}</span><input type="password" id="pp1" autocomplete="off"></label>
            ${confirm ? `<label class="fld"><span>${esc(t("backupPassphrase"))}</span><input type="password" id="pp2" autocomplete="off"></label>` : ""}
            <div class="hint">${esc(t("passHint"))}</div>
            <div class="modal-foot">
              <button type="button" class="btn ghost" data-c="no">${esc(t("cancel"))}</button>
              <button type="button" class="btn primary" data-c="yes">${esc(t("ok"))}</button>
            </div>
          </div>
        </div>
      </div>`;
    const done = (v) => {
      root.innerHTML = "";
      resolve(v);
    };
    root.querySelector('[data-c="yes"]').addEventListener("click", () => {
      const p1 = root.querySelector("#pp1").value;
      const p2 = confirm ? root.querySelector("#pp2").value : p1;
      if (p1.length < 6) {
        toast(t("passTooShort"));
        return;
      }
      if (p1 !== p2) {
        toast(t("passNoMatch"));
        return;
      }
      done(p1);
    });
    root.querySelector('[data-c="no"]').addEventListener("click", () => done(null));
    root.querySelector(".modal-backdrop").addEventListener("click", (e) => {
      if (e.target.classList.contains("modal-backdrop")) done(null);
    });
    root.querySelector("#pp1").focus();
  });
}

const field = (
  label,
  name,
  value = "",
  { type = "text", placeholder = "", hint = "", textarea = false, options = null, required = false } = {}
) => {
  const hintHtml = hint ? `<div class="hint">${esc(hint)}</div>` : "";
  const req = required ? "required" : "";
  if (options) {
    return `<label class="fld"><span>${esc(label)}</span><select name="${esc(name)}" ${req}>${options
      .map(([v, t]) => `<option value="${esc(v)}" ${String(v) === String(value) ? "selected" : ""}>${esc(t)}</option>`)
      .join("")}</select>${hintHtml}</label>`;
  }
  if (textarea) {
    return `<label class="fld"><span>${esc(label)}</span><textarea name="${esc(name)}" rows="3" placeholder="${esc(
      placeholder
    )}">${esc(value)}</textarea>${hintHtml}</label>`;
  }
  return `<label class="fld"><span>${esc(label)}</span><input type="${type}" name="${esc(name)}" value="${esc(
    value
  )}" placeholder="${esc(placeholder)}" ${req}>${hintHtml}</label>`;
};
