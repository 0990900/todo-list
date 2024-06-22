const React = () => {
  const options = {
    states: [],
    stateIdx: 0,
    root: null,
    rootComponent: null,
    renderCount: 0
  }

  const debounceFrame = callback => {
    let nextHandler = -1;
    return () => {
      cancelAnimationFrame(nextHandler);
      nextHandler = requestAnimationFrame(callback);
    }
  }

  const _render = debounceFrame(() => {
    const {root, rootComponent} = options;
    if (root && rootComponent && isFunc(rootComponent)) {
      root.innerHTML = rootComponent();
      options.stateIdx = 0;
      options.renderCount += 1;
    }
  });

  const userState = initStatus => {
    const {states, stateIdx} = options;
    states.length === stateIdx && states.push(initStatus);
    const state = states[stateIdx];
    const setState = newState => {
      if (equals(newState, state)) {
        return;
      }
      states[stateIdx] = newState;
      _render();
    }
    options.stateIdx += 1;
    return [state, setState];
  }

  const render = (rootComponent, root) => {
    options.rootComponent = rootComponent;
    options.root = root;
    _render();
  }

  const equals = (a, b) => {
    if (a === b) {
      return true;
    }
    return JSON.stringify(a) === JSON.stringify(b);
  }

  return {userState, render};
}
