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
    tab: _ => None(),
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
    /**
     * Registering the event and event listener.
     * @param event
     * @param listener
     */
    subscribe: (event, listener) => {
      if (!events[event]) {
        events[event] = [];
      }
      events[event].push(listener);
    },
    /**
     * Passing date to the registered event listener.
     * @param event
     * @param data
     */
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

define('dateformat', [], function () {
  const isDate = date => date instanceof Date && !isNaN(date.getTime());
  const transform = date => ({
    'YYYY': date.getFullYear(),
    'MM': ('0' + (date.getMonth() + 1)).slice(-2),
    'DD': ('0' + date.getDate()).slice(-2),
    'HH': ('0' + date.getHours()).slice(-2),
    'mm': ('0' + date.getMinutes()).slice(-2),
    'ss': ('0' + date.getSeconds()).slice(-2),
    'SSS': ('00' + date.getMilliseconds()).slice(-3)
  });
  const format = (date, format) => {
    if (!isDate(date)) {
      throw new Error('Can\'t format if it is not a Date object');
    }
    return format.replace(/YYYY|MM|DD|HH|mm|ss|SSS/g, matched => transform(date)[matched] || '');
  }
  return {
    format
  };
});

define('todolist', ['func', 'option', 'pubsub', 'dateformat'], function (f, Option, PubSub, Dateformat) {
  class Todo {
    constructor(subject) {
      this.id = crypto.randomUUID();
      this.done = false;
      this.subject = subject;
      this.createdAt = new Date().getTime();
    }
  }

  /**
   * 수정이 정상적으로 완료되면 자동으로 로컬 스토리지에 저장 후 렌더링 한다.
   */
  const modify = (todolist, execute, {onSuccess, onFailure} = {}) => {
    if (typeof execute !== 'function') {
      return;
    }
    try {
      const result = execute();
      localStorage.setItem('todolist', JSON.stringify(todolist));
      PubSub.publish('render', todolist);
      typeof onSuccess === 'function' && onSuccess(result);
    } catch (e) {
      if (typeof onFailure === 'function') {
        onFailure(e);
      } else {
        console.warn(e);
      }
    }
  }

  const render = elementId => todoList => {
    f.compose(Option.of, document.byId)(elementId)
      .tab(el => el.innerHTML = `
        <div id="ready-list">
            <ul></ul>
        </div>
        <div id="done-list">
            <ul></ul>
        </div>`)
      .tab(el => {
        const ulList = el.getElementsByTagName('ul');
        ulList[0].innerHTML = todoList.ready.map(todo => {
          return `
            <li>
              <div class="todo">
                  <input type="checkbox" id="${todo.id}">
                  <label for="${todo.id}">${todo.subject}</label>
              </div>
              <div class="controls">
                  ${Dateformat.format(new Date(todo.createdAt), 'YYYY-MM-DD HH:mm:ss')}
                  | <a href="javascript:void(0);" class="remove" for="${todo.id}" action="remove">삭제</a>
              </div>
            </li>`
        }).join('');
        ulList[1].innerHTML = todoList.done.map(todo => {
          return `
            <li>
              <div class="todo">
                  <input type="checkbox" id="${todo.id}" checked>
                  <label>${todo.subject}</label>
              </div>
              <div class="controls">
                  ${Dateformat.format(new Date(todo.createdAt), 'YYYY-MM-DD HH:mm:ss')}
                  | <a href="javascript:void(0);" class="remove" for="${todo.id}" action="remove">삭제</a>
              </div>
            </li>`
        }).join('');
        if (todoList.done.length) {
          ulList[1].parentNode.className = "box";
        }
      });
  };

  return {
    of: (elList, focus) => {
      const todolist = JSON.parse(localStorage.getItem('todolist')) || {ready: [], done: []};
      const add = subject => {
        modify(todolist, () => {
          const subjectTrimmed = subject.trim();
          if (!subjectTrimmed) {
            return;
          }
          if (todolist.ready.some(item => item.subject === subjectTrimmed)) {
            return;
          }
          todolist.ready.push(new Todo(subjectTrimmed));
          todolist.ready.sort((a, b) => b.createdAt - a.createdAt);
        });
      }
      const toggle = (id, value) => {
        modify(todolist, () => {
          if (value) {
            const idx = todolist.ready.findIndex(todo => todo.id === id);
            if (idx < 0) {
              return;
            }
            const todo = todolist.ready[idx];
            todo.done = value;
            todolist.ready.splice(idx, 1);
            todolist.done.push(todo);
          } else {
            const idx = todolist.done.findIndex(todo => todo.id === id);
            if (idx < 0) {
              return;
            }
            const todo = todolist.done[idx];
            todo.done = value;
            todolist.done.splice(idx, 1);
            todolist.ready.push(todo);
          }
        });
      };
      const remove = id => {
        const removeInner = (array, id) => {
          const idx = array.findIndex(todo => todo.id === id);
          if (idx < 0) {
            return false;
          }
          array.splice(idx, 1);
          return true;
        }
        modify(todolist, () => removeInner(todolist.ready, id) || removeInner(todolist.done, id), {
          onSuccess: result => result ? focus() : alert(`Todolist(${id}) not found`)
        });
      }
      const renderer = render(elList);
      PubSub.subscribe('entered', add);
      PubSub.subscribe('toggle', toggle);
      PubSub.subscribe('remove', remove);
      PubSub.subscribe('render', renderer);
      renderer(todolist);
      return {
        print: () => todolist.ready.forEach(console.log)
      };
    },
    render
  }
});
