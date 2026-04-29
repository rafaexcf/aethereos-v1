import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@aethereos/drivers": path.resolve(
        __dirname,
        "../../packages/drivers/src/index.ts",
      ),
      "@aethereos/drivers-supabase": path.resolve(
        __dirname,
        "../../packages/drivers-supabase/src/index.ts",
      ),
      "@aethereos/scp-registry": path.resolve(
        __dirname,
        "../../packages/scp-registry/src/index.ts",
      ),
    },
  },
  test: {
    environment: "node",
    globals: true,
    include: ["__tests__/**/*.test.ts"],
  },
});
