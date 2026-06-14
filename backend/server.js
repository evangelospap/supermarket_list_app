import { createServer } from "node:http";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "..");
const DIST_DIR = path.join(ROOT_DIR, "dist");
// The backend stores the shared list in one JSON file so every device sees the same state.
const STATE_FILE = process.env.STATE_FILE
  ? path.resolve(process.env.STATE_FILE)
  : path.join(ROOT_DIR, "data", "supermarket-state.json");
const DATA_DIR = path.dirname(STATE_FILE);
const PORT = Number(process.env.PORT ?? 8787);
const HOST = process.env.HOST ?? "0.0.0.0";
const MAX_BODY_BYTES = 1024 * 1024;
const PRODUCT_LOOKUP_TIMEOUT_MS = 6000;
const MIME_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
};

// All API responses share permissive CORS because the Vite dev server and backend run on different ports.
function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET,PUT,OPTIONS",
    "Access-Control-Allow-Origin": "*",
    "Content-Type": "application/json; charset=utf-8",
  });
  response.end(JSON.stringify(payload));
}

function sendEmpty(response, statusCode) {
  response.writeHead(statusCode, {
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET,PUT,OPTIONS",
    "Access-Control-Allow-Origin": "*",
  });
  response.end();
}

// In production the same Node server also serves the Vite build from /dist.
async function sendStaticFile(response, pathname) {
  const requestedPath = pathname === "/" ? "/index.html" : pathname;
  const filePath = path.resolve(DIST_DIR, `.${requestedPath}`);

  if (!filePath.startsWith(DIST_DIR)) {
    sendJson(response, 403, { error: "Forbidden" });
    return;
  }

  try {
    const contents = await readFile(filePath);
    response.writeHead(200, {
      "Content-Type": MIME_TYPES[path.extname(filePath)] ?? "application/octet-stream",
    });
    response.end(contents);
  } catch (error) {
    if (error.code === "ENOENT") {
      const fallback = await readFile(path.join(DIST_DIR, "index.html"));
      response.writeHead(200, { "Content-Type": MIME_TYPES[".html"] });
      response.end(fallback);
      return;
    }

    throw error;
  }
}

// Keep state validation small but strict enough to avoid writing broken list data to disk.
function isValidState(value) {
  return (
    value &&
    Array.isArray(value.categories) &&
    Array.isArray(value.items) &&
    value.items.every(
      (item) =>
        typeof item.id === "string" &&
        typeof item.name === "string" &&
        typeof item.category === "string" &&
        (item.status === "needed" || item.status === "have"),
    )
  );
}

async function readState() {
  try {
    const contents = await readFile(STATE_FILE, "utf8");
    const payload = JSON.parse(contents);
    return isValidState(payload.state) ? payload : undefined;
  } catch (error) {
    if (error.code === "ENOENT") {
      return undefined;
    }

    throw error;
  }
}

// Write through a temporary file, then rename, so a crash is less likely to corrupt the JSON DB.
async function writeState(state) {
  const payload = {
    state,
    updatedAt: new Date().toISOString(),
  };
  const tempFile = `${STATE_FILE}.tmp`;

  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(tempFile, JSON.stringify(payload, null, 2), "utf8");
  await rename(tempFile, STATE_FILE);

  return payload;
}

// QR codes may contain URLs or text; product barcodes are usually the 8-14 digit sequence inside.
function extractScannableCode(value) {
  const text = String(value ?? "").trim();
  const digitMatch = text.match(/\b\d{8,14}\b/);

  return digitMatch?.[0] ?? text;
}

function pickText(...values) {
  return values.find((value) => typeof value === "string" && value.trim())?.trim() ?? "";
}

// Flatten Open Food Facts into the tiny shape the frontend needs for the stage-2 confirmation UI.
function buildProductPayload(code, product) {
  const name = pickText(
    product.product_name_el,
    product.product_name,
    product.generic_name_el,
    product.generic_name,
    product.abbreviated_product_name,
  );

  return {
    code,
    found: Boolean(name),
    product: name
      ? {
          brand: pickText(product.brands),
          categories: pickText(product.categories),
          code,
          name,
          quantity: pickText(product.quantity),
          source: "openfoodfacts",
        }
      : undefined,
  };
}

// Product recognition is best-effort: if the public catalogue misses, the user can still type the name.
async function fetchProductByCode(rawCode) {
  const code = extractScannableCode(rawCode);

  if (!code) {
    return { code: "", found: false };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PRODUCT_LOOKUP_TIMEOUT_MS);
  const fields = [
    "abbreviated_product_name",
    "brands",
    "categories",
    "generic_name",
    "generic_name_el",
    "product_name",
    "product_name_el",
    "quantity",
  ].join(",");

  try {
    const response = await fetch(
      `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json?fields=${fields}`,
      {
        headers: {
          Accept: "application/json",
          "User-Agent": "supermarket-list-app/0.1",
        },
        signal: controller.signal,
      },
    );

    if (!response.ok) {
      throw new Error("Product lookup failed");
    }

    const payload = await response.json();

    if (payload.status !== 1 || !payload.product) {
      return { code, found: false };
    }

    return buildProductPayload(code, payload.product);
  } finally {
    clearTimeout(timeout);
  }
}

// Manual body parsing keeps this server dependency-free and enough for the small state payload.
function readRequestBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";

    request.on("data", (chunk) => {
      body += chunk;

      if (body.length > MAX_BODY_BYTES) {
        reject(new Error("Request body is too large"));
        request.destroy();
      }
    });

    request.on("end", () => resolve(body));
    request.on("error", reject);
  });
}

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url, `http://${request.headers.host}`);

    if (request.method === "OPTIONS") {
      sendEmpty(response, 204);
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/health") {
      sendJson(response, 200, { ok: true });
      return;
    }

    // Stage 1 scanner lookup: barcode/QR code -> product metadata, without mutating the shopping list.
    const productLookupMatch = url.pathname.match(/^\/api\/products\/(.+)$/);

    if (request.method === "GET" && productLookupMatch) {
      const code = decodeURIComponent(productLookupMatch[1]);
      const payload = await fetchProductByCode(code);

      sendJson(response, payload.found ? 200 : 404, payload);
      return;
    }
    if (request.method === "GET" && url.pathname === "/api/state") {
      const payload = await readState();

      if (!payload) {
        sendJson(response, 404, { error: "State has not been created yet" });
        return;
      }

      sendJson(response, 200, payload);
      return;
    }

    // Persist the whole client state; this keeps categories and item status in one simple document.
    if (request.method === "PUT" && url.pathname === "/api/state") {
      const body = await readRequestBody(request);
      const payload = JSON.parse(body || "{}");

      if (!isValidState(payload.state)) {
        sendJson(response, 400, { error: "Invalid supermarket state" });
        return;
      }

      const savedPayload = await writeState(payload.state);
      sendJson(response, 200, savedPayload);
      return;
    }

    if (request.method === "GET") {
      await sendStaticFile(response, url.pathname);
      return;
    }

    sendJson(response, 404, { error: "Not found" });
  } catch (error) {
    sendJson(response, 500, { error: error.message || "Server error" });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Supermarket backend listening on http://${HOST}:${PORT}`);
});
