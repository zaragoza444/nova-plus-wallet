import { mkdirSync, readFileSync, renameSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { randomBytes } from "node:crypto";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = process.env.ONEX_DATA_DIR || join(__dirname, "data");
const STORE_PATH = join(DATA_DIR, "ledger.json");
const SECRET_PATH = join(DATA_DIR, "master.secret");

export function dataDir() {
  mkdirSync(DATA_DIR, { recursive: true });
  return DATA_DIR;
}

export function masterSecret() {
  dataDir();
  const fromEnv = process.env.ONEX_MASTER_SECRET?.trim();
  if (fromEnv && fromEnv.length >= 16) return fromEnv;
  if (existsSync(SECRET_PATH)) return readFileSync(SECRET_PATH, "utf8").trim();
  const generated = randomBytes(32).toString("hex");
  writeFileSync(SECRET_PATH, generated, { mode: 0o600 });
  return generated;
}

function emptyState() {
  return {
    users: [],
    accounts: [],
    transfers: [],
    cards: [],
    refresh: [],
    idempotency: [],
    nextAccountNumber: 1000,
  };
}

let cache = null;

export function loadState() {
  if (cache) return cache;
  dataDir();
  if (!existsSync(STORE_PATH)) {
    cache = emptyState();
    persistState(cache);
    return cache;
  }
  try {
    cache = { ...emptyState(), ...JSON.parse(readFileSync(STORE_PATH, "utf8")) };
  } catch {
    cache = emptyState();
  }
  return cache;
}

export function persistState(state) {
  cache = state;
  dataDir();
  const tmp = `${STORE_PATH}.${process.pid}.tmp`;
  writeFileSync(tmp, JSON.stringify(state, null, 2));
  renameSync(tmp, STORE_PATH);
}

export function mutate(fn) {
  const state = loadState();
  const result = fn(state);
  persistState(state);
  return result;
}

export function resetStateForTests() {
  cache = emptyState();
  persistState(cache);
}
