define('func', [], function () {
  const compose = (...fs) => x => fs.reverse().reduce((acc, f) => f(acc), x);
  const identity = x => x;
  const empty = _ => {
  };
  const isFunc = (...fs) => fs.reduce((acc, f) => typeof f === 'function', true);
  return {
    compose, identity, empty, isFunc
  };
});

define('option', ['func'], function (F) {
  const Some = value => ({
    map: f => F.isFunc(f) ? handleError(() => f(value), option.of, None) : None(),
    flatMap: f => handleError(
      () => F.isFunc(f) ? f(value) : None(),
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
        F.isFunc(f) && f(value);
      } catch (e) {
        console.log(e);
      }
      return Some(value);
    },
    zip: (...args) => {
      const f = args.splice(-1);
      return f.length && F.isFunc(f[0])
        ? handleError(() => f[0].apply(null, [value].concat(args.map(arg => arg.getOrThrow()))), F.identity, None)
        : None();
    },
    isSome: true,
    isNone: false
  });

  const None = () => ({
    map: _ => None(),
    flatMap: _ => None(),
    getOrElse: F.identity,
    getOrThrow: _ => {
      throw new Error('Can\'t get value from none');
    },
    zip: _ => None(),
    tab: _ => None(),
    isSome: false,
    isNone: true
  });

  const handleError = (f, onSuccess, onFailure) => {
    if (F.isFunc(f, onSuccess, onFailure)) {
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
  const isTime = time => typeof time === 'number' && !isNaN(time);
  const transform = date => ({
    'YYYY': date.getFullYear(),
    'MM': ('0' + (date.getMonth() + 1)).slice(-2),
    'DD': ('0' + date.getDate()).slice(-2),
    'HH': ('0' + date.getHours()).slice(-2),
    'mm': ('0' + date.getMinutes()).slice(-2),
    'ss': ('0' + date.getSeconds()).slice(-2),
    'SSS': ('00' + date.getMilliseconds()).slice(-3)
  });
  /**
   * convert date obj (or time value) to formated date-string.
   * @param dateOrTime time or date object
   * @param format  default value is 'YYYY-MM-DD HH:mm:ss'
   * @returns {string}  formated date-string
   */
  const format = (dateOrTime, format = 'YYYY-MM-DD HH:mm:ss') => {
    if (isTime(dateOrTime)) {
      dateOrTime = new Date(dateOrTime);
    } else if (!isDate(dateOrTime)) {
      throw new Error('Can\'t format if it is not a Date object or time');
    }
    return format.replace(/YYYY|MM|DD|HH|mm|ss|SSS/g, matched => transform(dateOrTime)[matched] || '');
  }
  return {
    format
  };
});

define('template', [], function () {
  const execute = (message, data) => message.replace(/\{\{([^}]+)}}/g, match => {
    match = match.slice(2, -2); // 괄호를 벗긴다.
    const sub = match.split('.');
    if (sub.length > 1) {
      let temp = data;
      sub.forEach(item => {
        if (!temp[data]) {
          temp = '{{' + match + '}}'; // fallback when it does not exsits
          return;
        }
        temp = temp[item];
      });
      return temp;
    } else {
      if (!data[match]) return '{{' + match + '}}';
      return data[match];
    }
  });
  return {execute};
});

define('todolist', ['func', 'option', 'pubsub', 'dateformat', 'template'], function (F, Option, PubSub, Dateformat, Template) {
  class Todo {
    constructor(subject) {
      this.id = crypto.randomUUID();
      this.done = false;
      this.subject = subject;
      this.createdAt = new Date().getTime();
    }

    static template = element => todo => Template.execute(element.innerHTML, {
      id: todo.id,
      subject: todo.subject,
      createdAt: Dateformat.format(todo.createdAt)
    });
    static sorter = (a, b) => b.createdAt - a.createdAt;
  }

  const sharedData = JSON.parse(localStorage.getItem('todolist')) || {ready: [], done: []};

  /**
   * 수정이 정상적으로 완료되면 자동으로 로컬 스토리지에 저장 후 렌더링 한다.
   */
  const modify = (execute, {onSuccess, onFailure} = {}) => {
    if (typeof execute !== 'function') {
      return;
    }
    try {
      const result = execute();
      localStorage.setItem('todolist', JSON.stringify(sharedData));
      PubSub.publish('todo:render');
      typeof onSuccess === 'function' && onSuccess(result);
    } catch (e) {
      typeof onFailure === 'function' ? onFailure(e) : console.warn(e);
    }
  }

  const action = {
    append: onActionSuccess => subject => {
      typeof subject === 'string' && modify(() => {
        const subjectTrimmed = subject.trim();
        if (!subjectTrimmed) {
          return;
        }
        if (sharedData.ready.some(item => item.subject === subjectTrimmed)
          || sharedData.done.some(item => item.subject === subjectTrimmed)) {
          return;
        }
        sharedData.ready.push(new Todo(subjectTrimmed));
        sharedData.ready.sort(Todo.sorter);
        onActionSuccess();
      });
    },
    toggle: onActionSuccess => (id, value) => {
      typeof value === 'boolean' && modify(() => {
        if (value) {
          const idx = sharedData.ready.findIndex(todo => todo.id === id);
          if (idx < 0) {
            return;
          }
          const todo = sharedData.ready[idx];
          todo.done = value;
          sharedData.ready.splice(idx, 1);
          sharedData.done.push(todo);
          sharedData.done.sort(Todo.sorter);
        } else {
          const idx = sharedData.done.findIndex(todo => todo.id === id);
          if (idx < 0) {
            return;
          }
          const todo = sharedData.done[idx];
          todo.done = value;
          sharedData.done.splice(idx, 1);
          sharedData.ready.push(todo);
          sharedData.ready.sort(Todo.sorter);
        }
        onActionSuccess();
      });
    },
    remove: onActionSuccess => id => {
      const removeInner = (array, id) => {
        const idx = array.findIndex(todo => todo.id === id);
        if (idx < 0) {
          return false;
        }
        array.splice(idx, 1);
        return true;
      }
      modify(() => removeInner(sharedData.ready, id) || removeInner(sharedData.done, id), {
        onSuccess: result => result ? onActionSuccess() : alert(`Todolist(${id}) not found`)
      });
    },
    render: (el, template) => () => {
      if (el && template && template.base && template.ready && template.done) {
        el.innerHTML = template.base.innerHTML;
        const ulList = el.getElementsByTagName('ul');
        const readyTemplate = Todo.template(template.ready);
        const doneTemplate = Todo.template(template.done);
        ulList[0].innerHTML = sharedData.ready.map(readyTemplate).join('');
        ulList[1].innerHTML = sharedData.done.map(doneTemplate).join('');
        if (sharedData.done.length) {
          ulList[1].parentNode.className = 'box';
        }
      }
    }
  };

  return {
    of: (el, template, onActionSuccess = F.empty) => {
      el.addEventListener('click', event => {
        if (event.target.type === 'checkbox') {
          PubSub.publish('todo:toggle', event.target.dataset['id'], event.target.checked);
        } else if (event.target.tagName === 'A' && event.target.dataset['action'] === 'remove') {
          event.preventDefault();
          PubSub.publish('todo:remove', event.target.dataset['id']);
        }
      });
      PubSub.subscribe('todo:append', action.append(onActionSuccess));
      PubSub.subscribe('todo:toggle', action.toggle(onActionSuccess));
      PubSub.subscribe('todo:remove', action.remove(onActionSuccess));
      PubSub.subscribe('todo:render', action.render(el, template));
      PubSub.publish('todo:render');
    }
  }
});
