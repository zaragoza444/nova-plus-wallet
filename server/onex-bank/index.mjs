import { startOnexBank, PORT, HOST } from "./server.mjs";

const server = await startOnexBank();
const addr = server.address();
console.log(`OneX Online Bank API listening on http://${HOST}:${typeof addr === "object" && addr ? addr.port : PORT}`);
console.log("Health: /api/v1/health  ·  Bank: /api/v1/onex-bank/status  ·  Chain: /api/v1/onex/status");
