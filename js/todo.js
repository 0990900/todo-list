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

const TodoList = {
  of: (pubSub, render) => {
    const list = [];
    const add = subject => {
      list.push(new Todo(subject));
      pubSub.publish('render', list);
    }
    const toggle = (id, value) => Option
      .of(list.find(todo => todo.id === id))
      .tab(todo => {
        todo.done = value;
        pubSub.publish('render', list);
      });
    pubSub.subscribe('entered', add);
    pubSub.subscribe('toggle', toggle);
    pubSub.subscribe('render', render);
    return {
      print: () => list.forEach(console.log)
    };
  },
  render: elementId => todoList => {
    compose(Option.of, $doc.byId)(elementId)
      .tab(el => el.innerHTML = "")
      .tab(el => {
        todoList.forEach(todo => {
          const li = Option.of($doc.create('li')).getOrThrow();
          const div1 = Option.of($doc.create('div')).getOrThrow();
          const div2 = Option.of($doc.create('div'))
            .tab($div => {
              $div.className = "controls";
              $div.textContent = todo.pasted();
            }).getOrThrow();
          const input = Option.of($doc.create('input'))
            .tab($input => {
              $input.id = todo.id;
              $input.type = "checkbox";
              $input.checked = todo.done;
            }).getOrThrow();
          const label = Option.of($doc.create('label'))
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
  }
};
