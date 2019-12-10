const test = process.env.NODE_ENV === 'test'

const presets = [
  [
    '@babel/env',
    {
      targets: {
        edge: '10',
        firefox: '60',
        chrome: '67',
        safari: '11.1'
      },
      useBuiltIns: 'usage',
      corejs: 3
    }
  ]
]

if (!test) {
  presets.push(['minify'])
}

const plugins = [
  [
    "@babel/plugin-proposal-class-properties",
    { loose: true }
  ],
  "@babel/plugin-transform-runtime"
]

const ignore = test ? [] : [
  "**/*.test.js",
  "**/*.spec.js"
]

module.exports = {
  presets,
  plugins,
  ignore,
  comments: test
}
