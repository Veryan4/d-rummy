module.exports = {
  env: {
    node: true,
  },
  root: true,
  parser: "@typescript-eslint/parser",
  plugins: ["wc", "lit", "@typescript-eslint"],
  extends: [
    "plugin:wc/recommended",
    "plugin:lit/recommended",
    "plugin:@typescript-eslint/eslint-recommended",
  ],
  ignorePatterns: ["**/*.js"],
  rules: {
    "@typescript-eslint/no-non-null-assertion": "off",
    "@typescript-eslint/ban-ts-comment": "off",
  },
};
