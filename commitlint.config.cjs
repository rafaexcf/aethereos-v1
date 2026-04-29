// @ts-check
/** @type {import("@commitlint/types").UserConfig} */
module.exports = {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "type-enum": [
      2,
      "always",
      ["feat", "fix", "chore", "docs", "refactor", "test", "perf", "ci", "revert"],
    ],
    "scope-case": [2, "always", "kebab-case"],
    "subject-max-length": [2, "always", 100],
    "body-max-line-length": [2, "always", 200],
  },
};
