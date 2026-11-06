"use strict";

const db = (() => {
  const DB_NAME = "safehaven-db";
  const DB_VERSION = 1;
  let openPromise = null;

  function open() {
    if (!openPromise) {
      openPromise = new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = () => {
          const d = req.result;
          if (!d.objectStoreNames.contains("sections")) d.createObjectStore("sections", { keyPath: "id" });
          if (!d.objectStoreNames.contains("files")) d.createObjectStore("files", { keyPath: "id" });
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
    }
    return openPromise;
  }

  function wrap(req) {
    return new Promise((resolve, reject) => {
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async function store(name, mode) {
    const d = await open();
    return d.transaction(name, mode).objectStore(name);
  }

  return {
    async getSection(id) {
      const rec = await wrap((await store("sections", "readonly")).get(id));
      return rec ? rec.value : undefined;
    },
    async setSection(id, value) {
      await wrap((await store("sections", "readwrite")).put({ id, value }));
    },
    async getAllSections() {
      const all = await wrap((await store("sections", "readonly")).getAll());
      const out = {};
      for (const rec of all) out[rec.id] = rec.value;
      return out;
    },
    async putFile(rec) {
      await wrap((await store("files", "readwrite")).put(rec));
    },
    async getFile(id) {
      return wrap((await store("files", "readonly")).get(id));
    },
    async getAllFiles() {
      return wrap((await store("files", "readonly")).getAll());
    },
    async deleteFile(id) {
      await wrap((await store("files", "readwrite")).delete(id));
    },
    async clearAll() {
      const d = await open();
      await Promise.all(
        ["sections", "files"].map(
          (name) =>
            new Promise((resolve, reject) => {
              const req = d.transaction(name, "readwrite").objectStore(name).clear();
              req.onsuccess = () => resolve();
              req.onerror = () => reject(req.error);
            })
        )
      );
    }
  };
})();
