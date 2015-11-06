'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _definitions = require("./definitions");

var _definitions2 = _interopRequireDefault(_definitions);

var _path = require('path');

exports['default'] = function (_ref) {
  var t = _ref.types;

  var RUNTIME_MODULE_NAME = (0, _path.join)(__dirname, '../babel-runtime');

  function has(obj, key) {
    return Object.prototype.hasOwnProperty.call(obj, key);
  }

  return {
    pre: function pre(file, state) {
      state.set("helperGenerator", function (name) {
        return state.addImport(RUNTIME_MODULE_NAME + '/helpers/' + name, "default", name);
      });

      state.setDynamic("regeneratorIdentifier", function () {
        return state.addImport(RUNTIME_MODULE_NAME + '/regenerator', "default", "regeneratorRuntime");
      });
    },

    visitor: {
      ReferencedIdentifier: function ReferencedIdentifier(path, state) {
        var node = path.node;
        var parent = path.parent;
        var scope = path.scope;

        if (node.name === "regeneratorRuntime") {
          path.replaceWith(state.get("regeneratorIdentifier"));
          return;
        }

        if (t.isMemberExpression(parent)) return;
        if (!has(_definitions2['default'].builtins, node.name)) return;
        if (scope.getBindingIdentifier(node.name)) return;

        // Symbol() -> _core.Symbol(); new Promise -> new _core.Promise
        path.replaceWith(state.addImport(RUNTIME_MODULE_NAME + '/core-js/' + _definitions2['default'].builtins[node.name], "default", node.name));
      },

      CallExpression: function CallExpression(path, state) {
        // arr[Symbol.iterator]() -> _core.$for.getIterator(arr)

        // we can't compile this
        if (path.node.arguments.length) return;

        var callee = path.node.callee;
        if (!t.isMemberExpression(callee)) return;
        if (!callee.computed) return;
        if (!path.get("callee.property").matchesPattern("Symbol.iterator")) return;

        path.replaceWith(t.callExpression(state.addImport(RUNTIME_MODULE_NAME + '/core-js/get-iterator', "default", "getIterator"), [callee.object]));
      },

      BinaryExpression: function BinaryExpression(path, state) {
        // Symbol.iterator in arr -> core.$for.isIterable(arr)

        if (path.node.operator !== "in") return;
        if (!path.get("left").matchesPattern("Symbol.iterator")) return;

        path.replaceWith(t.callExpression(state.addImport(RUNTIME_MODULE_NAME + '/core-js/is-iterable', "default", "isIterable"), [path.node.right]));
      },

      MemberExpression: {
        enter: function enter(path, state) {
          if (!path.isReferenced()) return;

          // Array.from -> _core.Array.from

          var node = path.node;

          var obj = node.object;
          var prop = node.property;

          if (!t.isReferenced(obj, node)) return;
          if (node.computed) return;
          if (!has(_definitions2['default'].methods, obj.name)) return;

          var methods = _definitions2['default'].methods[obj.name];
          if (!has(methods, prop.name)) return;

          // doesn't reference the global
          if (path.scope.getBindingIdentifier(obj.name)) return;

          // special case Object.defineProperty to not use core-js when using string keys
          if (obj.name === "Object" && prop.name === "defineProperty" && path.parentPath.isCallExpression()) {
            var call = path.parentPath.node;
            if (call.arguments.length === 3 && t.isLiteral(call.arguments[1])) return;
          }

          path.replaceWith(state.addImport(RUNTIME_MODULE_NAME + '/core-js/' + methods[prop.name], "default", obj.name + '$' + prop.name));
        },

        exit: function exit(path, state) {
          if (!path.isReferenced()) return;

          var node = path.node;

          var obj = node.object;

          if (!has(_definitions2['default'].builtins, obj.name)) return;
          if (path.scope.getBindingIdentifier(obj.name)) return;

          path.replaceWith(t.memberExpression(state.addImport(RUNTIME_MODULE_NAME + '/core-js/' + _definitions2['default'].builtins[obj.name], "default", obj.name), node.property, node.computed));
        }
      }
    }
  };
};

module.exports = exports['default'];