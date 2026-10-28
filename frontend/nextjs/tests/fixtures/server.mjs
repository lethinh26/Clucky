// Test-only browser harness: stub Google identity and navigation, keep real UI/API client.
import { createServer } from "../../../react/node_modules/vite/dist/node/index.js";
import { fileURLToPath } from "node:url";
const here = fileURLToPath(new URL(".", import.meta.url));
const root = fileURLToPath(new URL("../../", import.meta.url));
const server = await createServer({
  configFile: false,
  root: here,
  resolve: {
    alias: [
      { find: "@/lib/google-auth", replacement: `${here}google-identity.ts` },
      { find: "next/navigation", replacement: `${here}navigation.ts` },
      { find: "@", replacement: root },
    ],
  },
  define: {
    "process.env.NEXT_PUBLIC_API_URL": JSON.stringify("http://127.0.0.1:4175"),
  },
  esbuild: { jsx: "automatic" },
  server: {
    host: "127.0.0.1",
    port: 4175,
    strictPort: true,
    fs: { allow: [root] },
  },
});
await server.listen();
