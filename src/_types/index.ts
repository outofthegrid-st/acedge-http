export * from "./http";


export type MaybeArray<T> = T | T[];

export type LooseAutocomplete<T extends string | number | symbol> = T | Omit<string, T>;

export type GenericFunction = (...args: any[]) => unknown;

export type Dict<T> = {
  [key: string]: T;
};
