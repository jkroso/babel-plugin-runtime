# babel-plugin-runtime

The difference between this and the plugin its based of is that this one explcitly depends on `babel-runtime` rather than expecting you to install it yourself.

Externalise references to helpers and builtins, automatically polyfilling your code without polluting globals

## Installation

```sh
$ npm install @jkroso/babel-plugin-runtime
```

## Usage

### Via `.babelrc` (Recommended)

**.babelrc**

```json
{
  "plugins": ["runtime"]
}
```

### Via CLI

```sh
$ babel --plugins runtime script.js
```

### Via Node API

```javascript
require("babel-core").transform("code", {
  plugins: ["runtime"]
});
```
