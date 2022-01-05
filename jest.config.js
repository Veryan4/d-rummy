module.exports = {
  moduleFileExtensions: ["js", "ts", "json"],
  moduleNameMapper: {
    "\\.(css|less|scss|sass)$": "identity-obj-proxy",
  },
  transform: {
    "^.+\\.ts$": "ts-jest",
  },
  testEnvironment: "jsdom",
};
