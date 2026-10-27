module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: "module",
    ecmaFeatures: { jsx: true },
  },
  env: {
    browser: true,
    node: true,
    es2022: true,
  },
  plugins: ["@typescript-eslint", "jsx-a11y", "react-hooks"],
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:jsx-a11y/recommended",
  ],
  rules: {
    "@typescript-eslint/no-unused-vars": "warn",
    "react-hooks/rules-of-hooks": "error",
    "react-hooks/exhaustive-deps": "warn",
  },
  ignorePatterns: ["node_modules", "dist"],
}
