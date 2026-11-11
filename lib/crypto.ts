import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

/** Faqat server tomonida ishlatiladi. */
export function hashPassword(pw: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(pw, salt, 64).toString("hex");
  return `scrypt$${salt}$${hash}`;
}

export function verifyPassword(pw: string, stored: string): boolean {
  if (!stored) return false;
  const [alg, salt, hash] = stored.split("$");
  if (alg !== "scrypt" || !salt || !hash) return false;
  const expected = Buffer.from(hash, "hex");
  const actual = scryptSync(pw, salt, expected.length);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export function randomSecret(bytes = 32): string {
  return randomBytes(bytes).toString("hex");
}
