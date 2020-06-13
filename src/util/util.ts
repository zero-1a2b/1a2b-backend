

export function wrap<T>(e: Array<T> | T | null): Array<T> {
  if(e === null) {
    return [];
  } else if(e instanceof Array) {
    return e;
  } else {
    return [e];
  }
}
