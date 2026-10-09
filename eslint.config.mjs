import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Ersetzt die Standard-Ausnahmen von eslint-config-next, darum stehen sie hier vollständig.
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Berichte von Playwright
    "playwright-report/**",
    "test-results/**",
  ]),
]);

export default eslintConfig;
