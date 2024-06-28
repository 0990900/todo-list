(global => {
  const modules = {};
  const cache = {};

  const suspend = (func, ...args) => () => func(...args)
  const trampoline = func => (...args) => {
    let result = func(...args);
    while (typeof result === 'function') {
      result = result();
    }
    return result;
  }

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
    if (typeof callback !== 'function') {
      throw new Error('callback must be a function');
    }
    const resolve = (dependency, history) => {
      if (cache[dependency]) {
        return cache[dependency];
      }
      const module = modules[dependency];
      if (!module) {
        throw new Error(`Module ${dependency} has not been defined`);
      }
      if (history.includes(dependency)) {
       throw new Error(`Module ${dependency} has a circular dependencies`);
      }
      history.push(dependency);
      return suspend(() => {
        const resolver = trampoline(resolve);
        const moduleInstance = module.factory.apply(global, module.dependencies.map(dep => resolver(dep, history)));
        cache[dependency] = moduleInstance;
        console.log(`dependency resolved - ${dependency}`);
        return moduleInstance;
      });
    }
    const resolver = trampoline(resolve);
    callback.apply(global, dependencies.map(dep => resolver(dep, [])));
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
