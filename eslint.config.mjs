import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    ".agents/**",
    ".claude/**",
    ".cursor/**",
    ".devin/**",
    "playwright-report/**",
    "test-results/**",
    "public/sw.js",
    ".next/**",
    ".prisma-composer/**",
    "out/**",
    "build/**",
    "migrations/**",
    "src/prisma/**/*.d.ts",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
