// Shared web-ext configuration, must work on any machine.
// Docs: https://github.com/mozilla/web-ext
module.exports = {
  //default source dir; the npm build/lint scripts override it with --source-dir build
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
    startUrl: ["https://github.com/plmgrn/pricecharting-search"]
  }
};
