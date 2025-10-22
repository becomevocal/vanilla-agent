import { defineConfig } from "vite";
import path from "node:path";

const proxyPort = Number(process.env.PROXY_PORT ?? 43111);

export default defineConfig({
  resolve: {
    alias: {
      "@chaty-assistant/vanilla": path.resolve(
        __dirname,
        "../../packages/widget/src"
      ),
      "@chaty-assistant/vanilla/widget.css": path.resolve(
        __dirname,
        "../../packages/widget/widget.css"
      )
    }
  },
  server: {
    port: 5173,
    proxy: {
      "/api/chat/dispatch": `http://localhost:${proxyPort}`,
      "/form": `http://localhost:${proxyPort}`
    }
  }
});
