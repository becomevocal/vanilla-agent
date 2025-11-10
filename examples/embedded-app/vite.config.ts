import { defineConfig } from "vite";
import path from "node:path";

const proxyPort = Number(process.env.PROXY_PORT ?? 43111);

export default defineConfig({
  base: './',
  resolve: {
    alias: {
      "vanilla-agent": path.resolve(
        __dirname,
        "../../packages/widget/src"
      ),
      "vanilla-agent/widget.css": path.resolve(
        __dirname,
        "../../packages/widget/src/styles/widget.css"
      )
    }
  },
  optimizeDeps: {
    include: ["lucide"]
  },
  server: {
    port: 5173,
    proxy: {
      "/api/chat/dispatch": `http://localhost:${proxyPort}`,
      "/api/chat/dispatch-action": `http://localhost:${proxyPort}`,
      "/form": `http://localhost:${proxyPort}`
    }
  }
});
