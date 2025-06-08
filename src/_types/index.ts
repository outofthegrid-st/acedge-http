export * from "./http";


export type MaybeArray<T> = T | T[];

export type MaybePromise<T> = T | Promise<T>;

export type LooseAutocomplete<T extends string | number | symbol> = T | Omit<string, T>;

export type GenericFunction = (...args: any[]) => unknown;

export type Dict<T> = {
  [key: string]: T;
};

export type ReadonlyDict<T> = {
  readonly [key: string]: T;
};
