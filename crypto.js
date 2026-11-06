"use strict";

// Passphrase-based encryption for backups: PBKDF2 (SHA-256) -> AES-GCM 256.
const cryptoBox = (() => {
  const enc = new TextEncoder();
  const dec = new TextDecoder();
  const ITERATIONS = 250000;

  function bufToB64(buf) {
    const bytes = new Uint8Array(buf);
    let s = "";
    for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
    return btoa(s);
  }

  function b64ToBuf(b64) {
    const s = atob(b64);
    const bytes = new Uint8Array(s.length);
    for (let i = 0; i < s.length; i++) bytes[i] = s.charCodeAt(i);
    return bytes.buffer;
  }

  async function deriveKey(passphrase, salt, iterations) {
    const base = await crypto.subtle.importKey("raw", enc.encode(passphrase), "PBKDF2", false, ["deriveKey"]);
    return crypto.subtle.deriveKey(
      { name: "PBKDF2", salt, iterations, hash: "SHA-256" },
      base,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"]
    );
  }

  async function encryptText(text, passphrase) {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const key = await deriveKey(passphrase, salt, ITERATIONS);
    const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, enc.encode(text));
    return {
      kdf: { algo: "PBKDF2", hash: "SHA-256", iterations: ITERATIONS, salt: bufToB64(salt) },
      cipher: "AES-GCM",
      iv: bufToB64(iv),
      data: bufToB64(ciphertext)
    };
  }

  async function decryptText(payload, passphrase) {
    const salt = b64ToBuf(payload.kdf.salt);
    const iv = new Uint8Array(b64ToBuf(payload.iv));
    const key = await deriveKey(passphrase, salt, payload.kdf.iterations);
    const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, b64ToBuf(payload.data));
    return dec.decode(plain);
  }

  return { encryptText, decryptText, bufToB64, b64ToBuf };
})();
