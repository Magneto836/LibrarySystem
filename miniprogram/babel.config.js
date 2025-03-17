module.exports = {
  plugins: [
    ["@babel/plugin-transform-runtime", {
      "corejs": false,
      "helpers": true,
      "regenerator": true,
      "useESModules": false
    }]
  ],
  presets: ["@babel/preset-env"]
};