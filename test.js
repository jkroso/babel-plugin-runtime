var babel = require('babel')

var result = babel.transform('const {a,...rest} = {a:1,b:2}', {
  jsxPragma: "JSX",
  plugins: [__dirname],
  filename: 'whatever.js',
  stage: 0,
})

console.log(result.code)
