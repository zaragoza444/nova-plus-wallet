import { createServer } from "node:http";
import { request as httpsRequest } from "node:https";
import { readFile } from "node:fs/promises";
import { extname, join, relative, resolve, sep } from "node:path";

const NOVA_BANK_HOST = "nova-bank-api-production-7311.up.railway.app";
const HOP_HEADERS = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailers",
  "transfer-encoding",
  "upgrade",
  "host",
]);

const root = join(process.cwd(), "dist");
const port = Number(process.env.PORT || 8080);
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".json": "application/json",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".webp": "image/webp",
};

const allowed = new Set(Object.keys(types));

function safeFile(urlPath) {
  let rel = "";
  try {
    rel = decodeURIComponent((urlPath || "/").split("?")[0]);
  } catch {
    return null;
  }
  rel = rel.replace(/^[/\\]+/, "");
  if (!rel || rel.endsWith("/")) rel = `${rel}index.html`;
  const file = resolve(root, rel);
  const fromRoot = relative(root, file);
  if (!fromRoot || fromRoot.startsWith("..") || fromRoot.includes(`..${sep}`)) return null;
  if (!allowed.has(extname(file))) return null;
  return file;
}

function proxyNovaBank(req, res) {
  const raw = req.url || "/";
  let pathname = "/";
  let search = "";
  try {
    const parsed = new URL(raw, "http://127.0.0.1");
    pathname = parsed.pathname;
    search = parsed.search;
  } catch {
    return false;
  }
  if (pathname !== "/nova-api/v1" && !pathname.startsWith("/nova-api/v1/")) return false;
  const upstreamPath = `/api/v1${pathname.slice("/nova-api/v1".length)}${search}`;
  if (!upstreamPath.startsWith("/api/v1")) {
    res.writeHead(404);
    res.end("Not found");
    return true;
  }
  const headers = {};
  for (const [key, value] of Object.entries(req.headers)) {
    if (!value || HOP_HEADERS.has(key.toLowerCase())) continue;
    headers[key] = value;
  }
  headers.host = NOVA_BANK_HOST;
  const preq = httpsRequest(
    {
      hostname: NOVA_BANK_HOST,
      port: 443,
      method: req.method,
      path: upstreamPath,
      headers,
    },
    (pres) => {
      res.writeHead(pres.statusCode || 502, pres.headers);
      pres.pipe(res);
    },
  );
  preq.on("error", () => {
    if (!res.headersSent) res.writeHead(502);
    res.end("Nova Bank upstream unavailable");
  });
  req.pipe(preq);
  return true;
}

createServer(async (req, res) => {
  if (proxyNovaBank(req, res)) return;
  const file = safeFile(req.url);
  const attempts = file ? [file, join(root, "index.html")] : [join(root, "index.html")];
  for (const attempt of attempts) {
    try {
      const data = await readFile(attempt);
      res.writeHead(200, { "content-type": types[extname(attempt)] || "application/octet-stream" });
      res.end(data);
      return;
    } catch {
      /* fall through to the app shell */
    }
  }
  res.writeHead(404);
  res.end("Not found");
}).listen(port, "0.0.0.0");
