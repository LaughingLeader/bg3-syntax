const path = require("path");

module.exports = {
  mode: "production",
  entry: {
    client: "./bin/client/index.js",
    server: "./bin/server/index.js"
  },
  output: {
    path: path.resolve(__dirname, "bin"),
    filename: "[name]/index.js",
    libraryTarget: "commonjs"
  },
  target: "node",
  node: false,
  externals: {
    vscode: "commonjs vscode",
    "vscode-languageserver": "commonjs vscode-languageserver",
    "vscode-languageclient": "commonjs vscode-languageclient"
  }
};
