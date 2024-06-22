const $win = (() => {
  const WAIT_FOR_RENDERING = 102;
  return {
    onload: f => window.addEventListener('DOMContentLoaded', () => {
      setTimeout(f, WAIT_FOR_RENDERING);
    })
  }
})();

const $doc = (() => {
  const byId = name => document.getElementById(name);
  const create = name => document.createElement(name);
  return {
    byId, create
  }
})();

// (global => {
//   const modules = {};
//   const cache = {};
//
//   const define = (name, dependencies, factory) => {
//     if (typeof name !== 'string') {
//       throw new Error('Module name must be a string type');
//     }
//     if (!Array.isArray(dependencies)) {
//       throw new Error('Dependencies must be an array');
//     }
//     modules[name] = {
//       dependencies: dependencies,
//       factory: factory
//     };
//   }
//
//   const require = (dependencies, callback) => {
//     const resolvedDeps = dependencies.map(dep => {
//       if (cache[dep]) {
//         return cache[dep];
//       }
//       const module = modules[dep];
//       if (!module) {
//         throw new Error(`Module ${dep} has not been defined`);
//       }
//       const resolvedModuleDeps = require(module.dependencies, () => {});
//       const moduleInstance = module.factory.apply(global, resolvedModuleDeps);
//       cache[dep] = moduleInstance;
//       return moduleInstance;
//     });
//     callback.apply(global, resolvedDeps);
//   }
//
// })(this);
