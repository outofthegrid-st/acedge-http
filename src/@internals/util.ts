export function exclude<T extends object, K extends keyof T>(obj: T, ...keys: K[]): Omit<T, K> {
  return Object.fromEntries( Object.entries(obj).filter(([key]) => !keys.includes(key as K)) ) as Omit<T, K>;
}


const kindOf = (cache => (thing: unknown) => {
  const str = Object.prototype.toString.call(thing);
  return cache[str] || (cache[str] = str.slice(8, -1).toLowerCase());
})(Object.create(null));


export const kindOfTest = (type: string) => {
  type = type.toLowerCase();
  return (thing: unknown) => kindOf(thing) === type;
};


export function isPlainObject(val: any): boolean {
  if(Array.isArray(val)) return false;
  if(kindOf(val) !== "object" || typeof val !== "object") return false;

  const prototype = Object.getPrototypeOf(val);
  return (prototype === null || prototype === Object.prototype || Object.getPrototypeOf(prototype) === null) && !(Symbol.toStringTag in val) && !(Symbol.iterator in val);
}


export function isBrowser(): boolean {
  return typeof process === "undefined" && typeof window !== "undefined";
}


export function isNumber(arg: any): boolean {
  if(typeof arg === "number")
    return true;

  if(typeof arg !== "string")
    return false;

  if((/^0x[0-9a-f]+$/i).test(arg))
    return true;

  return (/^[-+]?(?:\d+(?:\.\d*)?|\.\d+)(e[-+]?\d+)?$/).test(arg);
}


export function isIterable<T>(arg: unknown): arg is Iterable<T> {
  return !!arg && typeof arg === "object" && typeof (arg as any)[Symbol.iterator] === "function";
}


export function immediate<TArgs extends any[]>(callback: (...args: TArgs) => void, ...args: TArgs): { dispose(): void } & Disposable {
  const hasNativeMethod = typeof setImmediate === "function";
  const id = hasNativeMethod ? setImmediate(callback, ...args) : setTimeout(callback, 0, ...args);

  return {
    dispose() {
      if(hasNativeMethod) {
        clearImmediate(id as NodeJS.Immediate);
      } else {
        clearTimeout(id as NodeJS.Timeout);
      }
    },

    [Symbol.dispose]() {
      if(hasNativeMethod) {
        clearImmediate(id as NodeJS.Immediate);
      } else {
        clearTimeout(id as NodeJS.Timeout);
      }
    },
  };
}
