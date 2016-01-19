var babel = require('babel-core')

var result = babel.transform('const [a]=b', {
  plugins: [__dirname, "transform-es2015-destructuring"],
  filename: 'whatever.js'
})

console.log(result.code)
