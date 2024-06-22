define('func', [], function () {
  const compose = (...fs) => x => fs.reverse().reduce((acc, f) => f(acc), x);
  const identity = x => x;
  return {
    compose, identity
  };
});

define('option', ['func'], function (func) {
  const isFunc = (...fs) => fs.reduce((acc, f) => typeof f === 'function', true)
  const Some = value => ({
    map: f => isFunc(f) ? handleError(() => f(value), option.of, None) : None(),
    flatMap: f => handleError(
      () => isFunc(f) ? f(value) : None(),
      result => {
        if (isOption(result)) {
          return result;
        } else {
          console.log('flatMap must return Option');
          return option.of(result);
        }
      },
      None),
    getOrElse: _ => value,
    getOrThrow: _ => value,
    tab: f => {
      try {
        isFunc(f) && f(value);
      } catch (e) {
        console.log(e);
      }
      return Some(value);
    },
    isSome: true,
    isNone: false
  });

  const None = () => ({
    map: _ => None(),
    flatMap: _ => None(),
    getOrElse: func.identity,
    getOrThrow: _ => {
      throw new Error('Can\'t get value from none');
    },
    tab: _ => undefined,
    isSome: false,
    isNone: true
  });

  const handleError = (f, onSuccess, onFailure) => {
    if (isFunc(f, onSuccess, onFailure)) {
      try {
        return onSuccess(f());
      } catch (e) {
        console.error(e);
        return onFailure();
      }
    } else {
      console.error('Invalid parameters')
      return onFailure();
    }
  }
  const isOption = obj => obj.hasOwnProperty('isSome') && obj.hasOwnProperty('isNone')

  const option = {
    Some, None,
    of: x => x !== undefined && x !== null ? Some(x) : None()
  };
  return option;
});

define('pubsub', [], function () {
  const events = {};
  return {
    subscribe: (event, listener) => {
      if (!events[event]) {
        events[event] = [];
      }
      events[event].push(listener);
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
    }
  }
});

define('todolist', ['func', 'option', 'pubsub'], function (f, Option, PubSub) {
  class Todo {
    constructor(subject) {
      this.id = crypto.randomUUID();
      this.done = false;
      this.subject = subject;
      this.createdAt = new Date();
    }

    pasted() {
      const timeDiff = new Date() - this.createdAt;
      if (timeDiff > Millis.oneDay) {
        const dayDiff = Math.floor(timeDiff / Millis.oneDay);
        return `${dayDiff}일 전 추가됨`;
      } else if (timeDiff > Millis.oneHour) {
        const hours = Math.floor(timeDiff / Millis.oneHour);
        return hours ? `${hours}시간 전 추가됨` : "방금 추가됨";
      } else if (timeDiff > Millis.oneMin) {
        const minutes = Math.floor(timeDiff / Millis.oneMin);
        return minutes ? `${minutes}분 전 추가됨` : "방금 추가됨";
      } else if (timeDiff < Millis.oneHour) {
        const seconds = Math.floor(timeDiff / 1000);
        return seconds ? `${seconds}초 전 추가됨` : "방금 추가됨";
      }
    }
  }

  const Millis = {
    oneDay: 1000 * 60 * 60 * 24,
    oneHour: 1000 * 60 * 60,
    oneMin: 1000 * 60
  }

  const render = elementId => todoList => {
    f.compose(Option.of, document.byId)(elementId)
      .tab(el => el.innerHTML = "")
      .tab(el => {
        todoList.forEach(todo => {
          const li = Option.of(document.create('li')).getOrThrow();
          const div1 = Option.of(document.create('div')).getOrThrow();
          const div2 = Option.of(document.create('div'))
            .tab($div => {
              $div.className = "controls";
              $div.textContent = todo.pasted();
            }).getOrThrow();
          const input = Option.of(document.create('input'))
            .tab($input => {
              $input.id = todo.id;
              $input.type = "checkbox";
              $input.checked = todo.done;
            }).getOrThrow();
          const label = Option.of(document.create('label'))
            .tab($label => {
              $label.setAttribute('for', todo.id);
              $label.textContent = todo.subject;
            }).getOrThrow();
          div1.appendChild(input);
          div1.appendChild(label);
          li.appendChild(div1);
          li.appendChild(div2);
          el.appendChild(li);
        });
      });
  };

  return {
    of: el => {
      const list = [];
      const add = subject => {
        list.push(new Todo(subject));
        PubSub.publish('render', list);
      }
      const toggle = (id, value) => Option
        .of(list.find(todo => todo.id === id))
        .tab(todo => {
          todo.done = value;
          PubSub.publish('render', list);
        });
      PubSub.subscribe('entered', add);
      PubSub.subscribe('toggle', toggle);
      PubSub.subscribe('render', render(el));
      return {
        print: () => list.forEach(console.log)
      };
    },
    render
  }
});
