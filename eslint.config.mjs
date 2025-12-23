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
    },
  },
]);

export default eslintConfig;
