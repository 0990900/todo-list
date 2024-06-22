const PubSub = (() => {
  const events = {};
  return {
    subscribe: (event, listener) => {
      if (!events[event]) {
        events[event] = [];
      }
      events[event].push(listener);
      // console.log(`[PubSub] subscribe event: ${event}`);
    },
    publish: (event, ...data) => {
      if (events[event]) {
        console.log(`[PubSub] publish event: ${event}`, data);
        events[event].forEach(listener => listener(...data));
      }
    },
    unsubscribe: (event, stopListener) => {
      if (!events[event]) return;
      events[event] = events[event].filter(listener => listener !== stopListener);
      // console.log(`[PubSub] unsubscribe event: ${event}`);
    }
  }
})();
