import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";
const AUTH_TAG_LENGTH = 16; // bytes

function getKey(): Buffer {
  const hex = process.env.CREDENTIALS_ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) {
    throw new Error(
      "CREDENTIALS_ENCRYPTION_KEY must be a 64-char hex string (32 bytes)"
    );
  }
  return Buffer.from(hex, "hex");
}

/**
 * Encrypt a plaintext string with AES-256-GCM.
 * Returns base64-encoded `iv` and `encrypted_value` (ciphertext + auth tag).
 */
export function encrypt(plaintext: string): {
  iv: string;
  encrypted_value: string;
} {
  const key = getKey();
  const iv = randomBytes(12); // 96-bit nonce for GCM
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  const encrypted_value = Buffer.concat([ciphertext, tag]).toString("base64");
  return { iv: iv.toString("base64"), encrypted_value };
}

/**
 * Decrypt a value produced by `encrypt`.
 * `encrypted_value` is base64(ciphertext || auth_tag); `iv` is base64(nonce).
 */
export function decrypt(encrypted_value: string, iv: string): string {
  const key = getKey();
  const ivBuf = Buffer.from(iv, "base64");
  const combined = Buffer.from(encrypted_value, "base64");
  const ciphertext = combined.subarray(0, combined.length - AUTH_TAG_LENGTH);
  const tag = combined.subarray(combined.length - AUTH_TAG_LENGTH);
  const decipher = createDecipheriv(ALGORITHM, key, ivBuf);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}
