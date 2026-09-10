import { createServer } from "node:http";
import { randomInt, randomUUID } from "node:crypto";
import { hashPin, verifyPin, signToken, verifyToken, newRefreshToken, hashRefresh, rateLimitAuth, parseBearer } from "./auth.mjs";
import { loadState, mutate } from "./store.mjs";
import { parseUnits, formatUnits, addUnits, subUnits, decimalsFor } from "./money.mjs";
import { firstLiveRpc, chainStatusPayload, chainConfigPayload, proxyJsonRpc, ONEX_CHAIN_ID } from "./chain.mjs";
import { createMemberWallet, readOnChainEth, sendOnChainEth } from "./custody.mjs";

const PORT = Number(process.env.ONEX_PORT || 8090);
const HOST = process.env.ONEX_HOST || "127.0.0.1";
const OPENING = process.env.ONEX_OPENING_CREDIT !== "0";
const PUBLIC_URL = process.env.ONEX_PUBLIC_URL || `http://${HOST}:${PORT}`;

const FIAT = ["USD", "EUR", "GBP"];
const ALL_CCY = [...FIAT, "ETH"];
const USD_REF = { USD: 1, EUR: 1.08, GBP: 1.27 };
const HAIRCUT = 30 / 10_000;

const CORS_ORIGINS = new Set(
  (process.env.ONEX_CORS_ORIGINS || "http://127.0.0.1:5199,http://localhost:5199,http://127.0.0.1:5173,http://localhost:5173,https://novabank.uk")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
);

function json(res, status, body, extra = {}) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    ...extra,
  });
  res.end(payload);
}

function err(res, status, message) {
  json(res, status, { statusCode: status, message, error: status === 401 ? "Unauthorized" : "Error" });
}

function cors(req, res) {
  const origin = req.headers.origin;
  if (origin && CORS_ORIGINS.has(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Credentials", "true");
  }
  res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type, Idempotency-Key, X-Onex-Protocol, X-Nova-Protocol");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PATCH,OPTIONS");
}

function readBody(req, limit = 64_000) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", (c) => {
      size += c.length;
      if (size > limit) {
        reject(new Error("Payload too large"));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on("end", () => {
      if (!chunks.length) return resolve({});
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}"));
      } catch {
        reject(new Error("Invalid JSON"));
      }
    });
    req.on("error", reject);
  });
}

function clientIp(req) {
  const raw = req.headers["x-forwarded-for"];
  if (typeof raw === "string" && raw.length) return raw.split(",")[0].trim();
  return req.socket.remoteAddress || "unknown";
}

function requireUser(req, res) {
  const token = parseBearer(req);
  const payload = token ? verifyToken(token) : null;
  if (!payload?.sub) {
    err(res, 401, "Unauthorized");
    return null;
  }
  const state = loadState();
  const user = state.users.find((u) => u.id === payload.sub);
  if (!user) {
    err(res, 401, "Unauthorized");
    return null;
  }
  return user;
}

function publicAccount(account) {
  return {
    id: account.id,
    accountNumber: account.accountNumber,
    currency: account.currency,
    type: account.type,
    name: account.name,
    balance: formatUnits(BigInt(account.units), decimalsFor(account.currency)),
    available: formatUnits(BigInt(account.units), decimalsFor(account.currency)),
    ledger: true,
    chainId: account.currency === "ETH" ? ONEX_CHAIN_ID : null,
  };
}

function publicUser(user, accounts) {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    createdAt: user.createdAt,
    primaryAccountId: accounts[0]?.id ?? null,
  };
}

function nextAccountNumber(state) {
  const n = state.nextAccountNumber++;
  return String(n).padStart(4, "0");
}

function openingUnits(currency) {
  if (!OPENING) return 0n;
  if (currency === "USD") return 10000n;
  if (currency === "EUR") return 10000n;
  if (currency === "GBP") return 5000n;
  return 0n;
}

function provisionUser(state, { email, fullName, pin, custody }) {
  const { salt, hash } = hashPin(pin);
  const user = {
    id: randomUUID(),
    email,
    fullName,
    pinSalt: salt,
    pinHash: hash,
    createdAt: new Date().toISOString(),
    depositAddress: custody.address,
    encryptedKey: custody.encryptedKey,
  };
  state.users.push(user);
  for (const currency of ALL_CCY) {
    state.accounts.push({
      id: randomUUID(),
      userId: user.id,
      accountNumber: nextAccountNumber(state),
      currency,
      type: currency === "ETH" ? "crypto_vault" : "savings",
      name: currency === "ETH" ? "OneX ETH vault" : `${currency} current`,
      units: openingUnits(currency).toString(),
    });
  }
  return user;
}

function accountsFor(state, userId) {
  return state.accounts.filter((a) => a.userId === userId);
}

function findAccount(state, id) {
  return state.accounts.find((a) => a.id === id);
}

function sessionBundle(user) {
  const state = loadState();
  const accounts = accountsFor(state, user.id).map(publicAccount);
  const accessToken = signToken({ sub: user.id, email: user.email });
  const refresh = newRefreshToken();
  mutate((s) => {
    s.refresh.push({ userId: user.id, hash: refresh.hash, expiresAt: refresh.expiresAt });
  });
  return {
    accessToken,
    refreshToken: refresh.raw,
    tokenType: "Bearer",
    expiresIn: 8 * 60 * 60,
    user: publicUser(user, accounts),
    accounts,
    primaryAccount: accounts[0] ?? null,
  };
}

async function withIdempotency(req, res, handler) {
  const key = req.headers["idempotency-key"] || req.headers["Idempotency-Key"];
  if (key) {
    const hit = loadState().idempotency.find((r) => r.key === String(key));
    if (hit && Date.now() - hit.at < 24 * 60 * 60 * 1000) {
      json(res, hit.status, hit.body);
      return;
    }
  }
  const send = (status, body) => {
    if (key) {
      mutate((s) => {
        s.idempotency = s.idempotency.filter((r) => Date.now() - r.at < 24 * 60 * 60 * 1000);
        s.idempotency.push({ key: String(key), status, body, at: Date.now() });
      });
    }
    json(res, status, body);
  };
  await handler(send);
}

let ethUsdCache = { at: 0, usd: 3200 };

async function ethUsd() {
  if (Date.now() - ethUsdCache.at < 60_000) return ethUsdCache.usd;
  try {
    const res = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd");
    const body = await res.json();
    const usd = Number(body?.ethereum?.usd);
    if (Number.isFinite(usd) && usd > 0) ethUsdCache = { at: Date.now(), usd };
  } catch {
    /* keep last */
  }
  return ethUsdCache.usd;
}

function usdOf(currency, amount) {
  if (currency === "ETH") return amount * ethUsdCache.usd;
  return amount * (USD_REF[currency] ?? 1);
}

async function quoteExchange(from, to, amountStr) {
  await ethUsd();
  const fromAmt = Number(amountStr);
  if (!Number.isFinite(fromAmt) || fromAmt <= 0) throw new Error("Invalid amount");
  const fromUsd = usdOf(from, fromAmt);
  const toUsdPx = to === "ETH" ? ethUsdCache.usd : USD_REF[to] ?? 1;
  const out = (fromUsd / toUsdPx) * (1 - HAIRCUT);
  return {
    from,
    to,
    amountIn: amountStr,
    amountOut: to === "ETH" ? out.toFixed(8) : out.toFixed(2),
    price: (fromUsd / fromAmt / toUsdPx).toFixed(8),
    source: "onex-settlement-mid",
    venue: "settlement-mid",
    haircutBps: 30,
  };
}

function integrations() {
  return {
    environment: process.env.ONEX_ENV || "local",
    realMoney: false,
    liveActive: true,
    sandboxFund: OPENING,
    showOtpInApi: false,
    productionExperience: true,
    allowSandboxProviders: OPENING,
    banking: { provider: "onex-ledger", sandbox: OPENING, fineractLive: false, swiftOauthReady: false, swiftSandbox: false },
    crypto: {
      provider: "onexchain",
      sandbox: false,
      onexEvmLive: true,
      dfnsReady: false,
      dfnsActive: false,
    },
    cards: { provider: "onex-virtual", sandbox: true, marqetaConfigured: false, marqetaSandbox: false },
    onexChain: {
      network: "DBIS Chain 138",
      aliases: ["OneX Chain", "Defi Oracle Meta"],
      chainId: ONEX_CHAIN_ID,
      wallet: "onexwallet",
      enabled: true,
      statusPath: "/api/v1/onex/status",
      chainConfigPath: "/api/v1/onex/chain",
    },
  };
}

function maskCard(pan) {
  return `•••• •••• •••• ${pan.slice(-4)}`;
}

function issueVirtualPan() {
  // Virtual test BIN 400000 — not a live Visa product.
  const body = Array.from({ length: 11 }, () => randomInt(10)).join("");
  const base = `400000${body}`;
  let sum = 0;
  for (let i = 0; i < 15; i++) {
    let n = Number(base[i]);
    if (i % 2 === 0) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
  }
  const check = (10 - (sum % 10)) % 10;
  return `${base}${check}`;
}

async function handle(req, res) {
  cors(req, res);
  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url || "/", `http://${req.headers.host || "127.0.0.1"}`);
  const path = url.pathname.replace(/\/+$/, "") || "/";

  try {
    if (path === "/onex-rpc" && req.method === "POST") {
      const body = await readBody(req);
      const result = await proxyJsonRpc(body);
      json(res, 200, result);
      return;
    }

    if (path === "/api/v1/health" && req.method === "GET") {
      json(res, 200, {
        status: "ok",
        info: { database: { status: "up" }, ledger: { status: "up" } },
        error: {},
        details: { database: { status: "up" }, ledger: { status: "up" } },
        integrations: integrations(),
      });
      return;
    }

    if (path === "/api/v1/health/live" && req.method === "GET") {
      json(res, 200, { onex: { status: "up", env: process.env.ONEX_ENV || "local", role: "primary", mode: "online", module: "m0", protocol: "1", integrations: integrations() } });
      return;
    }

    if (path === "/api/v1/global/status" && req.method === "GET") {
      json(res, 200, {
        name: "OneX Online Bank",
        region: "global",
        publicUrl: PUBLIC_URL,
        webUrl: PUBLIC_URL,
        swapWebUrl: "/#/onex/app/swap",
        env: process.env.ONEX_ENV || "local",
        role: "primary",
        mode: "online",
        module: "m0",
        protocol: "1",
        products: {
          bank: { name: "OneX Bank", path: "/#/onex" },
          swap: { name: "OneX Swap", path: "/#/onex/app/swap" },
          chain: { name: "OneX Chain", path: "/#/onex/app/chain" },
        },
        features: integrations(),
      });
      return;
    }

    if ((path === "/api/v1/onex/status" || path === "/api/v1/onex-bank/status") && req.method === "GET") {
      const live = await firstLiveRpc();
      if (path === "/api/v1/onex-bank/status") {
        json(res, 200, {
          network: "OnexBankOnline",
          provider: "onex",
          enabled: true,
          connected: true,
          mode: "onex_ledger_live",
          gatewayUrl: PUBLIC_URL,
          webUrl: `${PUBLIC_URL}/#/onex`,
          adminUrl: `${PUBLIC_URL}/#/onex`,
          ecosystemPath: "/api/v1/global/status",
          health: { ok: true, gateway: { url: PUBLIC_URL, ok: true }, webBanking: { url: `${PUBLIC_URL}/#/onex`, ok: true } },
          chain: chainStatusPayload(live),
          statusPath: "/api/v1/onex-bank/status",
          time: new Date().toISOString(),
        });
        return;
      }
      json(res, 200, chainStatusPayload(live));
      return;
    }

    if (path === "/api/v1/onex/chain" && req.method === "GET") {
      json(res, 200, chainConfigPayload());
      return;
    }

    if (path === "/api/v1/chains/onex" && req.method === "GET") {
      const live = await firstLiveRpc();
      json(res, 200, {
        id: "onex",
        label: "OneX Chain",
        chainId: ONEX_CHAIN_ID,
        connected: live.connected,
        rpcConnected: live.connected,
        liquidityConnected: true,
        blockNumber: live.blockNumber,
        rpcUrl: live.url,
        explorerUrl: "https://explorer.d-bis.org",
        production: true,
        liveActive: live.connected,
        public: true,
      });
      return;
    }

    if (path === "/api/v1/auth/start" && req.method === "POST") {
      if (!rateLimitAuth(clientIp(req))) return err(res, 429, "Too many sign-in attempts");
      const body = await readBody(req);
      const email = String(body.email || "").trim().toLowerCase();
      const pin = String(body.pin || "").trim();
      const fullName = String(body.fullName || "").trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return err(res, 400, "Valid email is required");
      if (!/^\d{4}$/.test(pin)) return err(res, 400, "A 4-digit PIN is required");
      const state = loadState();
      let user = state.users.find((u) => u.email === email);
      if (!user) {
        if (fullName.length < 2) return err(res, 400, "Full name is required on first registration");
        const custody = await createMemberWallet();
        user = mutate((s) => provisionUser(s, { email, fullName, pin, custody }));
      } else if (!verifyPin(pin, user.pinSalt, user.pinHash)) {
        return err(res, 401, "Invalid PIN");
      }
      json(res, 200, sessionBundle(user));
      return;
    }

    if (path === "/api/v1/auth/refresh" && req.method === "POST") {
      const body = await readBody(req);
      const raw = String(body.refreshToken || "");
      const hashed = hashRefresh(raw);
      const state = loadState();
      const row = state.refresh.find((r) => r.hash === hashed && r.expiresAt > Date.now());
      if (!row) return err(res, 401, "Invalid refresh token");
      const user = state.users.find((u) => u.id === row.userId);
      if (!user) return err(res, 401, "Unauthorized");
      json(res, 200, sessionBundle(user));
      return;
    }

    if (path === "/api/v1/auth/logout" && req.method === "POST") {
      const user = requireUser(req, res);
      if (!user) return;
      mutate((s) => {
        s.refresh = s.refresh.filter((r) => r.userId !== user.id);
      });
      json(res, 200, { ok: true });
      return;
    }

    if (path === "/api/v1/auth/me" && req.method === "GET") {
      const user = requireUser(req, res);
      if (!user) return;
      const accounts = accountsFor(loadState(), user.id).map(publicAccount);
      json(res, 200, { user: publicUser(user, accounts), accounts });
      return;
    }

    if (path === "/api/v1/accounts" && req.method === "GET") {
      const user = requireUser(req, res);
      if (!user) return;
      json(res, 200, { accounts: accountsFor(loadState(), user.id).map(publicAccount) });
      return;
    }

    if (path === "/api/v1/accounts/resolve" && req.method === "GET") {
      const user = requireUser(req, res);
      if (!user) return;
      const q = (url.searchParams.get("q") || url.searchParams.get("accountNumber") || "").trim();
      const state = loadState();
      const hit = state.accounts.find((a) => a.accountNumber === q);
      if (!hit) return err(res, 404, "Account not found");
      json(res, 200, { accountNumber: hit.accountNumber, currency: hit.currency, name: hit.name });
      return;
    }

    if (path === "/api/v1/wallets" && req.method === "GET") {
      const user = requireUser(req, res);
      if (!user) return;
      const vaults = accountsFor(loadState(), user.id).filter((a) => a.type === "crypto_vault").map(publicAccount);
      json(res, 200, { wallets: vaults, depositAddress: user.depositAddress, chainId: ONEX_CHAIN_ID });
      return;
    }

    if (path === "/api/v1/onex/wallet/deposit" && req.method === "GET") {
      const user = requireUser(req, res);
      if (!user) return;
      json(res, 200, { address: user.depositAddress, chainId: ONEX_CHAIN_ID, network: "eip155:138", currency: "ETH" });
      return;
    }

    if (path === "/api/v1/onex/wallet/sync" && req.method === "POST") {
      const user = requireUser(req, res);
      if (!user) return;
      const onchain = await readOnChainEth(user.depositAddress);
      const updated = mutate((s) => {
        const vault = s.accounts.find((a) => a.userId === user.id && a.currency === "ETH");
        if (vault && onchain.connected) vault.units = onchain.wei.toString();
        return vault;
      });
      json(res, 200, {
        address: user.depositAddress,
        connected: onchain.connected,
        balance: updated ? formatUnits(BigInt(updated.units), 18) : "0",
        blockNumber: onchain.blockNumber ?? null,
      });
      return;
    }

    if (path === "/api/v1/onex/wallet/withdraw" && req.method === "POST") {
      const user = requireUser(req, res);
      if (!user) return;
      await withIdempotency(req, res, async (send) => {
        const body = await readBody(req);
        const to = String(body.toAddress || "");
        if (!/^0x[a-fA-F0-9]{40}$/.test(to)) return err(res, 400, "Valid 0x address required");
        const amount = parseUnits(String(body.amount || ""), 18);
        const vault = accountsFor(loadState(), user.id).find((a) => a.id === body.accountId && a.currency === "ETH");
        if (!vault) return err(res, 404, "ETH vault not found");
        if (BigInt(vault.units) < amount) return err(res, 400, "Insufficient funds");
        const sent = await sendOnChainEth(user.encryptedKey, to, amount);
        const transfer = mutate((s) => {
          const acc = findAccount(s, vault.id);
          acc.units = subUnits(BigInt(acc.units), amount).toString();
          const row = {
            id: randomUUID(),
            userId: user.id,
            fromAccountId: vault.id,
            toAccountId: null,
            toAddress: to,
            amount: formatUnits(amount, 18),
            currency: "ETH",
            reference: "onex-chain-withdraw",
            txId: sent.txId,
            createdAt: new Date().toISOString(),
            kind: "withdraw",
          };
          s.transfers.push(row);
          return row;
        });
        send(201, { ...transfer, provider: "onexchain" });
      });
      return;
    }

    if (path === "/api/v1/transfers" && req.method === "POST") {
      const user = requireUser(req, res);
      if (!user) return;
      await withIdempotency(req, res, async (send) => {
        const body = await readBody(req);
        const from = findAccount(loadState(), body.fromAccountId);
        const to = findAccount(loadState(), body.toAccountId);
        if (!from || from.userId !== user.id) return err(res, 404, "Source account not found");
        if (!to) return err(res, 404, "Destination account not found");
        if (from.currency !== to.currency) return err(res, 400, "Use /transfers/exchange for different currencies");
        const amount = parseUnits(String(body.amount || ""), decimalsFor(from.currency));
        const row = mutate((s) => {
          const src = findAccount(s, from.id);
          const dst = findAccount(s, to.id);
          src.units = subUnits(BigInt(src.units), amount).toString();
          dst.units = addUnits(BigInt(dst.units), amount).toString();
          const transfer = {
            id: randomUUID(),
            userId: user.id,
            fromAccountId: src.id,
            toAccountId: dst.id,
            toAccountNumber: dst.accountNumber,
            amount: formatUnits(amount, decimalsFor(src.currency)),
            currency: src.currency,
            reference: String(body.reference || "transfer"),
            createdAt: new Date().toISOString(),
            kind: "internal",
          };
          s.transfers.push(transfer);
          return transfer;
        });
        send(201, row);
      });
      return;
    }

    if (path === "/api/v1/transfers/by-account" && req.method === "POST") {
      const user = requireUser(req, res);
      if (!user) return;
      await withIdempotency(req, res, async (send) => {
        const body = await readBody(req);
        const pin = String(body.pin || "");
        if (!verifyPin(pin, user.pinSalt, user.pinHash)) return err(res, 401, "Invalid PIN");
        const from = findAccount(loadState(), body.fromAccountId);
        const to = loadState().accounts.find((a) => a.accountNumber === String(body.toAccountNumber || ""));
        if (!from || from.userId !== user.id) return err(res, 404, "Source account not found");
        if (!to) return err(res, 404, "Destination account not found");
        if (from.currency !== to.currency) return err(res, 400, "Currency must match");
        const amount = parseUnits(String(body.amount || ""), decimalsFor(from.currency));
        const row = mutate((s) => {
          const src = findAccount(s, from.id);
          const dst = findAccount(s, to.id);
          src.units = subUnits(BigInt(src.units), amount).toString();
          dst.units = addUnits(BigInt(dst.units), amount).toString();
          const transfer = {
            id: randomUUID(),
            userId: user.id,
            fromAccountId: src.id,
            toAccountId: dst.id,
            toAccountNumber: dst.accountNumber,
            amount: formatUnits(amount, decimalsFor(src.currency)),
            currency: src.currency,
            reference: String(body.reference || "by-account"),
            createdAt: new Date().toISOString(),
            kind: "by-account",
          };
          s.transfers.push(transfer);
          return transfer;
        });
        send(201, row);
      });
      return;
    }

    if (path === "/api/v1/transfers/exchange" && req.method === "POST") {
      const user = requireUser(req, res);
      if (!user) return;
      await withIdempotency(req, res, async (send) => {
        const body = await readBody(req);
        const from = findAccount(loadState(), body.fromAccountId);
        const to = findAccount(loadState(), body.toAccountId);
        if (!from || from.userId !== user.id || !to || to.userId !== user.id) return err(res, 404, "Account not found");
        const quote = await quoteExchange(from.currency, to.currency, String(body.amount || ""));
        const inAmt = parseUnits(quote.amountIn, decimalsFor(from.currency));
        const outAmt = parseUnits(quote.amountOut, decimalsFor(to.currency));
        const row = mutate((s) => {
          const src = findAccount(s, from.id);
          const dst = findAccount(s, to.id);
          src.units = subUnits(BigInt(src.units), inAmt).toString();
          dst.units = addUnits(BigInt(dst.units), outAmt).toString();
          const transfer = {
            id: randomUUID(),
            userId: user.id,
            fromAccountId: src.id,
            toAccountId: dst.id,
            amount: quote.amountIn,
            amountOut: quote.amountOut,
            currency: src.currency,
            toCurrency: dst.currency,
            reference: "onex-swap",
            createdAt: new Date().toISOString(),
            kind: "exchange",
            quote,
          };
          s.transfers.push(transfer);
          return transfer;
        });
        send(201, row);
      });
      return;
    }

    if (path === "/api/v1/markets/quote" && req.method === "POST") {
      const body = await readBody(req);
      const from = String(body.from || body.baseAsset || "").toUpperCase();
      const to = String(body.to || body.quoteAsset || "").toUpperCase();
      if (!ALL_CCY.includes(from) || !ALL_CCY.includes(to)) return err(res, 400, "Unsupported pair");
      json(res, 200, await quoteExchange(from, to, String(body.amount || body.quantity || "1")));
      return;
    }

    if (path === "/api/v1/transfers" && req.method === "GET") {
      const user = requireUser(req, res);
      if (!user) return;
      const rows = loadState().transfers.filter((t) => t.userId === user.id).slice(-50).reverse();
      json(res, 200, { transfers: rows });
      return;
    }

    if (path === "/api/v1/cards" && req.method === "GET") {
      const user = requireUser(req, res);
      if (!user) return;
      const cards = loadState().cards.filter((c) => c.userId === user.id).map((c) => ({
        id: c.id,
        last4: c.last4,
        masked: c.masked,
        currency: c.currency,
        status: c.status,
        linkedAccountId: c.linkedAccountId,
        network: "Visa",
        virtual: true,
      }));
      json(res, 200, { cards });
      return;
    }

    if (path === "/api/v1/cards" && req.method === "POST") {
      const user = requireUser(req, res);
      if (!user) return;
      const body = await readBody(req);
      const linked = findAccount(loadState(), body.linkedAccountId);
      if (!linked || linked.userId !== user.id) return err(res, 404, "Linked account not found");
      if (linked.currency === "ETH") return err(res, 400, "Link a fiat account for cards");
      const pan = issueVirtualPan();
      const card = mutate((s) => {
        const row = {
          id: randomUUID(),
          userId: user.id,
          linkedAccountId: linked.id,
          currency: linked.currency,
          last4: pan.slice(-4),
          masked: maskCard(pan),
          status: "ACTIVE",
          cardholderName: String(body.cardholderName || user.fullName),
          createdAt: new Date().toISOString(),
        };
        s.cards.push(row);
        return row;
      });
      json(res, 201, {
        id: card.id,
        last4: card.last4,
        masked: card.masked,
        currency: card.currency,
        status: card.status,
        linkedAccountId: card.linkedAccountId,
        network: "Visa",
        virtual: true,
      });
      return;
    }

    err(res, 404, `Cannot ${req.method} ${path}`);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Server error";
    const status = /Insufficient|Invalid|required|must/i.test(message) ? 400 : 500;
    err(res, status, message);
  }
}

export function startOnexBank(port = PORT, host = HOST) {
  const server = createServer((req, res) => {
    void handle(req, res);
  });
  return new Promise((resolve) => {
    server.listen(port, host, () => resolve(server));
  });
}

export { PORT, HOST, PUBLIC_URL };
