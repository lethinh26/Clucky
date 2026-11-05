// Test-only browser harness: stub Google identity and navigation, keep real UI/API client.
import { createServer } from "../../../react/node_modules/vite/dist/node/index.js";
import { fileURLToPath } from "node:url";
const here = fileURLToPath(new URL(".", import.meta.url));
const root = fileURLToPath(new URL("../../", import.meta.url));
const server = await createServer({
  configFile: false,
  root: here,
  plugins: [
    {
      name: "catalog-mock-api",
      configureServer(s) {
        s.middlewares.use((req, res, next) => {
          if (req.url?.split("?")[0] === "/api/catalog/products/901") {
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({
              id: 901, slug: "chicken-901", name: "Regression Chicken", categoryName: "Chicken",
              description: "Test product", basePrice: 50000, price: 50000,
              imageUrl: "/images/food-placeholder.svg", isActive: true, isAvailable: true,
              options: [{ id: "heat", name: "Heat", required: true,
                choices: [{ id: "11", name: "Mild", priceAdjustment: 0 }, { id: "12", name: "Hot", priceAdjustment: 5000 }] }],
              toppings: [{ id: "22", name: "Cheese", price: 10000 }],
            }));
            return;
          }
          if (req.url?.split("?")[0] === "/api/catalog/combos/901") {
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({
              id: 901, slug: "combo-901", name: "Regression Combo", description: "Test combo", comboPrice: 120000,
              imageUrl: "/images/food-placeholder.svg", isActive: true, isAvailable: true, items: [],
            }));
            return;
          }
          if (req.url && req.url.startsWith("/api/catalog/categories")) {
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify([
              { id: 1, name: "Gà rán", sortOrder: 1, isActive: true },
              { id: 2, name: "Burger", sortOrder: 2, isActive: true },
              { id: 3, name: "Combo", sortOrder: 3, isActive: true },
              { id: 4, name: "Món phụ", sortOrder: 4, isActive: true },
              { id: 5, name: "Đồ uống", sortOrder: 5, isActive: true },
            ]));
            return;
          }
          if (req.url && req.url.startsWith("/api/catalog/products")) {
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify([]));
            return;
          }
          if (req.url && req.url.startsWith("/api/catalog/combos")) {
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify([]));
            return;
          }
          if (req.url && req.url.startsWith("/api/stores")) {
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify([]));
            return;
          }
          next();
        });
      },
    },
  ],
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
