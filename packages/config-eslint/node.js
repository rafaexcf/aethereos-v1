// @ts-check
import globals from "globals";
import baseConfig from "./base.js";

/** @type {import("typescript-eslint").ConfigArray} */
export default [
  ...baseConfig,
  {
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
    rules: {
      // Node-specific: não usar process.exit sem tratamento
      "no-process-exit": "off",
    },
  },
];
