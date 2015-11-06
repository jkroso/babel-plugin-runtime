import definitions from "./definitions";
import {join} from "path";

export default function ({ types: t }) {
  const RUNTIME_MODULE_NAME = join(__dirname, '../babel-runtime');

  function has(obj, key) {
    return Object.prototype.hasOwnProperty.call(obj, key);
  }

  let HELPER_BLACKLIST = ["interopRequireWildcard", "interopRequireDefault"];

  return {
    pre(file) {
      file.set("helperGenerator", function (name) {
        if (HELPER_BLACKLIST.indexOf(name) < 0) {
          return file.addImport(`${RUNTIME_MODULE_NAME}/helpers/${name}`, "default", name);
        }
      });

      this.setDynamic("regeneratorIdentifier", function () {
        return file.addImport(`${RUNTIME_MODULE_NAME}/regenerator`, "default", "regeneratorRuntime");
      });
    },

    visitor: {
      ReferencedIdentifier(path, state) {
        let { node, parent, scope } = path;

        if (node.name === "regeneratorRuntime") {
          path.replaceWith(state.get("regeneratorIdentifier"));
          return;
        }

        if (t.isMemberExpression(parent)) return;
        if (!has(definitions.builtins, node.name)) return;
        if (scope.getBindingIdentifier(node.name)) return;

        // Symbol() -> _core.Symbol(); new Promise -> new _core.Promise
        path.replaceWith(state.addImport(
          `${RUNTIME_MODULE_NAME}/core-js/${definitions.builtins[node.name]}`,
          "default",
          node.name
        ));
      },

      CallExpression(path, state) {
        // arr[Symbol.iterator]() -> _core.$for.getIterator(arr)

        // we can't compile this
        if (path.node.arguments.length) return;

        let callee = path.node.callee;
        if (!t.isMemberExpression(callee)) return;
        if (!callee.computed) return;
        if (!path.get("callee.property").matchesPattern("Symbol.iterator")) return;

        path.replaceWith(t.callExpression(
          state.addImport(
            `${RUNTIME_MODULE_NAME}/core-js/get-iterator`,
            "default",
            "getIterator"
          ),
          [callee.object]
        ));
      },

      BinaryExpression(path, state) {
        // Symbol.iterator in arr -> core.$for.isIterable(arr)

        if (path.node.operator !== "in") return;
        if (!path.get("left").matchesPattern("Symbol.iterator")) return;

        path.replaceWith(t.callExpression(
          state.addImport(
            `${RUNTIME_MODULE_NAME}/core-js/is-iterable`,
            "default",
            "isIterable"
          ),
          [path.node.right]
        ));
      },

      MemberExpression: {
        enter(path, state) {
          if (!path.isReferenced()) return;

          // Array.from -> _core.Array.from

          let { node } = path;
          let obj = node.object;
          let prop = node.property;

          if (!t.isReferenced(obj, node)) return;
          if (node.computed) return;
          if (!has(definitions.methods, obj.name)) return;

          let methods = definitions.methods[obj.name];
          if (!has(methods, prop.name)) return;

          // doesn't reference the global
          if (path.scope.getBindingIdentifier(obj.name)) return;

          // special case Object.defineProperty to not use core-js when using string keys
          if (obj.name === "Object" && prop.name === "defineProperty" && path.parentPath.isCallExpression()) {
            let call = path.parentPath.node;
            if (call.arguments.length === 3 && t.isLiteral(call.arguments[1])) return;
          }

          path.replaceWith(state.addImport(
            `${RUNTIME_MODULE_NAME}/core-js/${methods[prop.name]}`,
            "default",
            `${obj.name}$${prop.name}`
          ));
        },

        exit(path, state) {
          if (!path.isReferenced()) return;

          let { node } = path;
          let obj = node.object;

          if (!has(definitions.builtins, obj.name)) return;
          if (path.scope.getBindingIdentifier(obj.name)) return;

          path.replaceWith(t.memberExpression(
            state.addImport(
              `${RUNTIME_MODULE_NAME}/core-js/${definitions.builtins[obj.name]}`,
              "default",
              obj.name
            ),
            node.property,
            node.computed
          ));
        }
      }
    }
  };
}
