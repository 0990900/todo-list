(global => {
  const modules = {};
  const cache = {};
  const callbacks = [];
  let loadRemoteModules = false;
  let loaded = false;

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
      const moduleInstance = module.factory.apply(global, module.dependencies.map(dep => resolve(dep, history)));
      cache[dependency] = moduleInstance;
      console.log(`dependency resolved - ${dependency}`);
      return moduleInstance;
    }
    callbacks.push(() => callback.apply(global, dependencies.map(dep => resolve(dep, []))));
  }

  const loadRemoteScript = src => new Promise(resolve => {
    const $script = document.createElement('script');
    $script.type = 'text/javascript';
    $script.src = src;
    $script.async = true;
    document.head.appendChild($script);
    const listener = eventName => {
      const f = e => {
        e.currentTarget.removeEventListener(eventName, f, false);
        document.head.removeChild($script);
        resolve();
      }
      return f;
    }
    $script.addEventListener('load', listener('load'), false);
    $script.addEventListener('error', listener('error'), false);
  });

  const loadModules = (scriptUrls, callback) => {
    if (loaded) {
      throw new Error('Module loading is possible only once');
    }
    loadRemoteModules = true;
    Promise
      .all(scriptUrls.map(url => loadRemoteScript(url)))
      .then((...args) => {
        callback && callback.apply(null, args);
        loaded = true;
        callbacks.forEach(f => f());
        console.log('All dependencies have been resolved');
      });
  }

  window.addEventListener('load', e => {
    if (!loadRemoteModules) {
      loaded = true;
      callbacks.forEach(f => f());
      console.log('All dependencies have been resolved');
    }
  });

  global.define = define;
  global.require = require;
  global.loadModules = loadModules;
})(this);

window.onloadafter = (() => {
  const WAIT_FOR_RENDERING = 102;
  return f => window.addEventListener('DOMContentLoaded', () => {
    setTimeout(f, WAIT_FOR_RENDERING);
  });
})();

document.byId = name => document.getElementById(name);
document.create = name => document.createElement(name);
