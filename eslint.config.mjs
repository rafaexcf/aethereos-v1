// @ts-check
import baseConfig from "@aethereos/config-eslint/base";
import tseslint from "typescript-eslint";

export default tseslint.config(
  ...baseConfig,
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/build/**",
      "**/.next/**",
      "**/coverage/**",
      "**/.turbo/**",
      "pnpm-lock.yaml",
      // Generated declaration files — never lint .d.ts
      "**/*.d.ts",
      // Config files at root are CJS — ESLint won't lint them
      ".dependency-cruiser.cjs",
      "commitlint.config.cjs",
      // PostCSS configs are CJS (no module type in package.json)
      "**/postcss.config.js",
      // Edge Functions rodam em Deno — não são Node.js e usam console legitimamente
      "supabase/functions/**",
      // Seed e smoke test são CLIs — console.log é intencionalmente o output
      "tooling/seed/**",
      "tooling/smoke/**",
    ],
  },
);
