import { createHash, createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { masterSecret } from "./store.mjs";

const TOKEN_TTL_SEC = 60 * 60 * 8;
const REFRESH_TTL_MS = 30 * 24 * 60 * 60 * 1000;

function b64url(buf) {
  return Buffer.from(buf).toString("base64url");
}

export function hashPin(pin, saltHex) {
  const salt = saltHex ? Buffer.from(saltHex, "hex") : randomBytes(16);
  const hash = scryptSync(pin, salt, 32, { N: 16384, r: 8, p: 1 });
  return { salt: salt.toString("hex"), hash: hash.toString("hex") };
}

export function verifyPin(pin, saltHex, hashHex) {
  const { hash } = hashPin(pin, saltHex);
  const a = Buffer.from(hash, "hex");
  const b = Buffer.from(hashHex, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

export function signToken(payload, ttlSec = TOKEN_TTL_SEC) {
  const header = b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = {
    ...payload,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + ttlSec,
  };
  const mid = b64url(JSON.stringify(body));
  const sig = createHmac("sha256", masterSecret()).update(`${header}.${mid}`).digest("base64url");
  return `${header}.${mid}.${sig}`;
}

export function verifyToken(token) {
  if (!token || typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [header, mid, sig] = parts;
  const expected = createHmac("sha256", masterSecret()).update(`${header}.${mid}`).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(mid, "base64url").toString("utf8"));
    if (typeof payload.exp !== "number" || payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

export function newRefreshToken() {
  const raw = randomBytes(32).toString("hex");
  const hash = createHash("sha256").update(raw).digest("hex");
  return { raw, hash, expiresAt: Date.now() + REFRESH_TTL_MS };
}

export function hashRefresh(raw) {
  return createHash("sha256").update(raw).digest("hex");
}

const authHits = new Map();

export function rateLimitAuth(ip) {
  const now = Date.now();
  const windowMs = 60_000;
  const row = authHits.get(ip) ?? [];
  const recent = row.filter((t) => now - t < windowMs);
  if (recent.length >= 10) return false;
  recent.push(now);
  authHits.set(ip, recent);
  return true;
}

export function parseBearer(req) {
  const header = req.headers.authorization || req.headers.Authorization || "";
  const m = String(header).match(/^Bearer\s+(.+)$/i);
  return m ? m[1].trim() : null;
}
