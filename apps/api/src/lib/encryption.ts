/**
 * AES-256-CBC encryption for storing OAuth access tokens at rest.
 *
 * ENCRYPTION_KEY must be a 64-character hex string (32 bytes).
 * Generate one with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
 *
 * Ciphertext format: <iv_hex>:<encrypted_hex>
 * A fresh random IV is used per encryption, so the same plaintext produces
 * different ciphertexts — safe for storage.
 */

import crypto from "crypto";

const KEY_HEX = process.env.ENCRYPTION_KEY;
if (!KEY_HEX) throw new Error("Missing ENCRYPTION_KEY env var");
if (KEY_HEX.length !== 64)
  throw new Error("ENCRYPTION_KEY must be 64 hex chars (32 bytes)");

const KEY = Buffer.from(KEY_HEX, "hex");
const IV_LENGTH = 16; // AES block size

export function encrypt(plaintext: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv("aes-256-cbc", KEY, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  return `${iv.toString("hex")}:${encrypted.toString("hex")}`;
}

export function decrypt(ciphertext: string): string {
  const colonIdx = ciphertext.indexOf(":");
  if (colonIdx === -1) throw new Error("Invalid ciphertext — missing IV separator");
  const iv = Buffer.from(ciphertext.slice(0, colonIdx), "hex");
  const encrypted = Buffer.from(ciphertext.slice(colonIdx + 1), "hex");
  const decipher = crypto.createDecipheriv("aes-256-cbc", KEY, iv);
  return Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]).toString("utf8");
}
