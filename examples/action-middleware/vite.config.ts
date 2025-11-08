import { defineConfig } from "vite";
import path from "node:path";

const proxyPort = Number(process.env.PROXY_PORT ?? 43111);

export default defineConfig({
  resolve: {
    alias: {
      "vanilla-agent": path.resolve(
        __dirname,
        "../../packages/widget/src"
      ),
      "vanilla-agent/widget.css": path.resolve(
        __dirname,
        "../../packages/widget/widget.css"
      )
    }
  },
  server: {
    port: 5173,
    proxy: {
      "/api/chat/dispatch-action": `http://localhost:${proxyPort}`,
      "/api/chat/dispatch": `http://localhost:${proxyPort}`,
      "/form": `http://localhost:${proxyPort}`
    }
  }
});

