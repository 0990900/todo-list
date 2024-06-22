const compose = (...fs) => x => fs.reverse().reduce((acc, f) => f(acc), x);
const identity = x => x;
const isFunc = (...fs) => fs.reduce((acc, f) => typeof f === 'function', true)
const Option = (() => {
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
    getOrElse: identity,
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
})();
