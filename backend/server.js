import { createServer } from "node:http";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "..");
const DIST_DIR = path.join(ROOT_DIR, "dist");
const STATE_FILE = process.env.STATE_FILE
  ? path.resolve(process.env.STATE_FILE)
  : path.join(ROOT_DIR, "data", "supermarket-state.json");
const DATA_DIR = path.dirname(STATE_FILE);
const PORT = Number(process.env.PORT ?? 8787);
const HOST = process.env.HOST ?? "0.0.0.0";
const MAX_BODY_BYTES = 1024 * 1024;
const MIME_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
};

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

    if (request.method === "GET" && url.pathname === "/api/state") {
      const payload = await readState();

      if (!payload) {
        sendJson(response, 404, { error: "State has not been created yet" });
        return;
      }

      sendJson(response, 200, payload);
      return;
    }

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
