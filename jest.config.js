module.exports = {
  moduleFileExtensions: ["js", "ts", "json"],
  moduleNameMapper: {
    "\\.(css|less|scss|sass)$": "identity-obj-proxy",
  },
  transform: {
    "^.+\\.[tj]sx?$": [
      "ts-jest",
      {
        tsconfig: {
          allowJs: true,
          module: "CommonJS",
        },
      },
    ],
  },
  transformIgnorePatterns: [
    "node_modules/(?!(.*(@veryan|lit|@lit|@lit-labs|@material)))",
  ],
  setupFiles: ["<rootDir>/jest.setup.ts"],
  testEnvironment: "node",
};
