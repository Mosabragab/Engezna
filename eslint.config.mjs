import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Additional ignores
    "coverage/**",
    "e2e/reports/**",
    "playwright-report/**",
    "public/sw.js",
    "public/workbox-*.js",
    "public/serwist-*.js",
  ]),
  // Custom rule overrides
  {
    rules: {
      // Allow setState in useCallback functions called from useEffect
      // This is a valid pattern for async data fetching
      "react-hooks/set-state-in-effect": "off",
      // Downgrade explicit any to warning (cleanup later)
      "@typescript-eslint/no-explicit-any": "warn",
      // Downgrade unused vars to warning
      "@typescript-eslint/no-unused-vars": "warn",
      // Console warnings (allow in dev, catch in review)
      "no-console": ["warn", { allow: ["warn", "error"] }],
      // Enforce best practices
      "prefer-const": "error",
      "eqeqeq": ["error", "always", { null: "ignore" }],
      "no-var": "error",
    },
  },
]);

export default eslintConfig;
