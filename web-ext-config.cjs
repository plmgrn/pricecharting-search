// web-ext configuration
// Docs: https://github.com/mozilla/web-ext

module.exports = {
  sourceDir: "src",
  artifactsDir: "web-ext-artifacts",
  ignoreFiles: [
    "**/*.md",
    "**/.DS_Store",
    "**/Thumbs.db"
  ],
  build: {
    overwriteDest: true
  },
  run: {
    startUrl: ["https://www.pricecharting.com/"]
  }
};
