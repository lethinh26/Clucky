import parser from "@typescript-eslint/parser";
import reactHooks from "eslint-plugin-react-hooks";
import nextPlugin from "@next/eslint-plugin-next";

export default [
  { ignores: ["node_modules/**", ".next/**", "next-env.d.ts"] },
  {
    plugins: { "@next/next": nextPlugin },
    rules: {
      "@next/next/no-sync-scripts": "error",
      "@next/next/no-duplicate-head": "error",
    },
  },
  {
    files: [
      "app/**/*.{ts,tsx}",
      "components/**/*.{ts,tsx}",
      "lib/**/*.{ts,tsx}",
    ],
    languageOptions: {
      parser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: { "react-hooks": reactHooks },
    rules: {
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
    },
  },
];
