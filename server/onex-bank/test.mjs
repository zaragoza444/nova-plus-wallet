import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import assert from "node:assert/strict";

const dir = mkdtempSync(join(tmpdir(), "onex-bank-"));
process.env.ONEX_DATA_DIR = dir;
process.env.ONEX_MASTER_SECRET = "test-onex-master-secret-32b";
process.env.ONEX_OPENING_CREDIT = "1";
process.env.ONEX_PORT = "0";
process.env.ONEX_HOST = "127.0.0.1";

const { startOnexBank } = await import("./server.mjs");
const { resetStateForTests } = await import("./store.mjs");

resetStateForTests();
const server = await startOnexBank(0, "127.0.0.1");
const port = server.address().port;
const base = `http://127.0.0.1:${port}/api/v1`;

async function api(path, opts = {}) {
  const headers = { "Content-Type": "application/json", ...(opts.headers || {}) };
  const res = await fetch(`${base}${path}`, { ...opts, headers });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

test("health and onex bank status are live", async () => {
  const health = await api("/health");
  assert.equal(health.status, 200);
  assert.equal(health.body.status, "ok");
  const bank = await api("/onex-bank/status");
  assert.equal(bank.status, 200);
  assert.equal(bank.body.enabled, true);
  assert.equal(bank.body.connected, true);
  const chain = await api("/onex/chain");
  assert.equal(chain.body.chainIdDecimal, 138);
});

test("member session, accounts, transfer, swap, card", async () => {
  const start = await api("/auth/start", {
    method: "POST",
    body: JSON.stringify({ email: "member@onex.test", pin: "2468", fullName: "OneX Member" }),
  });
  assert.equal(start.status, 200);
  assert.ok(start.body.accessToken);
  assert.equal(start.body.accounts.length, 4);
  const usd = start.body.accounts.find((a) => a.currency === "USD");
  const eur = start.body.accounts.find((a) => a.currency === "EUR");
  assert.equal(usd.balance, "100");

  const token = start.body.accessToken;
  const auth = { Authorization: `Bearer ${token}` };

  const me = await api("/auth/me", { headers: auth });
  assert.equal(me.status, 200);
  assert.equal(me.body.user.email, "member@onex.test");

  const xfer = await api("/transfers", {
    method: "POST",
    headers: { ...auth, "Idempotency-Key": "t1" },
    body: JSON.stringify({ fromAccountId: usd.id, toAccountId: eur.id, amount: "10", currency: "USD" }),
  });
  // USD→EUR same-currency should fail
  assert.equal(xfer.status, 400);

  const second = await api("/auth/start", {
    method: "POST",
    body: JSON.stringify({ email: "payee@onex.test", pin: "1357", fullName: "Payee Member" }),
  });
  const payeeUsd = second.body.accounts.find((a) => a.currency === "USD");

  const sent = await api("/transfers/by-account", {
    method: "POST",
    headers: { ...auth, "Idempotency-Key": "t2" },
    body: JSON.stringify({
      fromAccountId: usd.id,
      toAccountNumber: payeeUsd.accountNumber,
      amount: "25.50",
      pin: "2468",
      reference: "invoice",
    }),
  });
  assert.equal(sent.status, 201);
  assert.equal(sent.body.amount, "25.5");

  const replay = await api("/transfers/by-account", {
    method: "POST",
    headers: { ...auth, "Idempotency-Key": "t2" },
    body: JSON.stringify({
      fromAccountId: usd.id,
      toAccountNumber: payeeUsd.accountNumber,
      amount: "25.50",
      pin: "2468",
    }),
  });
  assert.equal(replay.status, 201);
  assert.equal(replay.body.id, sent.body.id);

  const swap = await api("/transfers/exchange", {
    method: "POST",
    headers: { ...auth, "Idempotency-Key": "sx1" },
    body: JSON.stringify({ fromAccountId: usd.id, toAccountId: eur.id, amount: "10" }),
  });
  assert.equal(swap.status, 201);
  assert.ok(Number(swap.body.amountOut) > 0);

  const card = await api("/cards", {
    method: "POST",
    headers: auth,
    body: JSON.stringify({ linkedAccountId: usd.id, currency: "USD", cardholderName: "OneX Member" }),
  });
  assert.equal(card.status, 201);
  assert.equal(card.body.last4.length, 4);
  assert.equal(card.body.virtual, true);

  const deposit = await api("/onex/wallet/deposit", { headers: auth });
  assert.equal(deposit.status, 200);
  assert.match(deposit.body.address, /^0x[a-fA-F0-9]{40}$/);
});

test("unauthorized accounts", async () => {
  const res = await api("/accounts");
  assert.equal(res.status, 401);
});

test.after(() => {
  server.close();
});
