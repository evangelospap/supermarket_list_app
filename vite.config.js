import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const certDir = path.resolve("certs");
const certificatePairs = [
  {
    certFile: path.join(certDir, "tailscale-dev.pem"),
    keyFile: path.join(certDir, "tailscale-dev-key.pem"),
    name: "tailscale",
  },
  {
    certFile: path.join(certDir, "local-dev.pem"),
    keyFile: path.join(certDir, "local-dev-key.pem"),
    name: "local",
  },
];

const selectedCertificatePair = certificatePairs.find(
  ({ certFile, keyFile }) => existsSync(certFile) && existsSync(keyFile),
);

const httpsConfig = selectedCertificatePair
  ? {
      cert: readFileSync(selectedCertificatePair.certFile),
      key: readFileSync(selectedCertificatePair.keyFile),
    }
  : undefined;

const hmrConfig =
  selectedCertificatePair?.name === "tailscale"
    ? {
        host: process.env.VITE_HMR_HOST ?? "desktop-de1g0tf.tail0276cd.ts.net",
        protocol: "wss",
      }
    : undefined;

export default defineConfig({
  plugins: [react()],
  server: {
    hmr: hmrConfig,
    host: "0.0.0.0",
    https: httpsConfig,
    proxy: {
      "/api": "http://127.0.0.1:8787",
    },
  },
});
