import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const certDir = path.resolve("certs");
const certificatePairs = [
  {
    certFile: path.join(certDir, "tailscale-dev.pem"),
    keyFile: path.join(certDir, "tailscale-dev-key.pem"),
  },
  {
    certFile: path.join(certDir, "local-dev.pem"),
    keyFile: path.join(certDir, "local-dev-key.pem"),
  },
];

const httpsConfig = certificatePairs
  .filter(({ certFile, keyFile }) => existsSync(certFile) && existsSync(keyFile))
  .map(({ certFile, keyFile }) => ({
    cert: readFileSync(certFile),
    key: readFileSync(keyFile),
  }))[0];

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
