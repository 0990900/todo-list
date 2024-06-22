(global => {
  const modules = {};
  const cache = {};

  const define = (name, dependencies, factory) => {
    if (typeof name !== 'string') {
      throw new Error('Module name must be a string type');
    }
    if (!Array.isArray(dependencies)) {
      throw new Error('Dependencies must be an array');
    }
    if (typeof factory !== 'function') {
      throw new Error('Factory must be an function');
    }
    modules[name] = {dependencies, factory};
  }

  const require = (dependencies, callback) => {
    const resolve = dependency => {
      if (cache[dependency]) {
        return cache[dependency];
      }
      const module = modules[dependency];
      if (!module) {
        throw new Error(`Module ${dependency} has not been defined`);
      }
      const moduleInstance = module.factory.apply(global, module.dependencies.map(resolve));
      cache[dependency] = moduleInstance;
      return moduleInstance;
    }
    callback.apply(global, dependencies.map(resolve));
  }
  global.define = define;
  global.require = require;
})(this);

window.onloadafter = (() => {
  const WAIT_FOR_RENDERING = 102;
  return f => window.addEventListener('DOMContentLoaded', () => {
    setTimeout(f, WAIT_FOR_RENDERING);
  });
})();

document.byId = name => document.getElementById(name);
document.create = name => document.createElement(name);
