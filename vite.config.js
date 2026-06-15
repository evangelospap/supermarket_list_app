import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const certDir = path.resolve("certs");
const certFile = path.join(certDir, "local-dev.pem");
const keyFile = path.join(certDir, "local-dev-key.pem");
const httpsConfig =
  existsSync(certFile) && existsSync(keyFile)
    ? {
        cert: readFileSync(certFile),
        key: readFileSync(keyFile),
      }
    : undefined;

export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    https: httpsConfig,
    proxy: {
      "/api": "http://127.0.0.1:8787",
    },
  },
});
