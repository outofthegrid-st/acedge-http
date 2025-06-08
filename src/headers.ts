import { Exception } from "./@internals/errors";
import { isPlainObject } from "./@internals/util";
import type { CommonHttpHeaders, Headers, LooseAutocomplete } from "./_types";


export function isHeaderName(value: unknown): value is string {
  return typeof value === "string" && /^[-_a-zA-Z0-9^`|~,!#$%&'*+.]+$/.test(value.trim());
}

export function normalizeHeader(value: string): string {
  return String(value).trim().toLowerCase();
}

export function parseValue(value: string | string[] | number | undefined | null): string | string[] | undefined {
  if(value == null || typeof value === "undefined")
    return void 0;

  return (Array.isArray(value) ? value.map(parseValue) : String(value)) as string[];
}


class HttpHeaders {
  private readonly _map: Map<string, string | Set<string>>;

  public constructor(headers?: Headers);
  public constructor(headers?: HttpHeaders);
  public constructor(iterable?: Iterable<readonly [LooseAutocomplete<keyof CommonHttpHeaders>, string | string[] | undefined]>);
  public constructor(init?: any) {
    this._map = new Map();

    if(init instanceof HttpHeaders) {
      this.concat(init);
    } else if(
      !!init &&
      typeof init === "object" &&
      Symbol.iterator in init &&
      typeof init[Symbol.iterator] === "function"
    ) {
      for(const [key, value] of init) {
        this.set(key, value);
      }
    } else if(
      !!init &&
      typeof init === "object" &&
      isPlainObject(init)
    ) {
      for(const key in init) {
        this.set(key, init[key]);
      }
    }
  }

  public get size(): number {
    return this._map.size;
  }

  public set(
    name: LooseAutocomplete<keyof CommonHttpHeaders>,
    value: string | string[] | number | undefined | null,
    rewrite?: boolean // eslint-disable-line comma-dangle
  ): this {
    if(!isHeaderName(name)) {
      throw new Exception("The header name must valid", "ERR_INVALID_ARGUMENT");
    }

    const v = parseValue(value);

    if(!v)
      return this;

    const n = normalizeHeader(name);

    if(!this._map.has(n) || rewrite) {
      this._map.set(n, Array.isArray(v) ? new Set(v) : v);
      return this;
    }

    const curr = this._map.get(n)!;

    if(typeof curr === "string") {
      this._map.set(n, new Set([
        curr,
        ...(Array.isArray(v) ? v : [v]),
      ]));
    } else {
      for(const nv of Array.isArray(v) ? v : [v]) {
        curr.add(nv);
      }
    }

    return this;
  }

  public get(name: LooseAutocomplete<keyof CommonHttpHeaders>): string | string[] | undefined {
    if(!isHeaderName(name))
      return void 0;

    const val = this._map.get(normalizeHeader(name));

    if(typeof val === "string")
      return val;

    if(val instanceof Set)
      return Array.from(val);

    return void 0;
  }

  public has(name: LooseAutocomplete<keyof CommonHttpHeaders>): boolean {
    if(!isHeaderName(name))
      return false;

    return this._map.has(normalizeHeader(name));
  }

  public delete(name: LooseAutocomplete<keyof CommonHttpHeaders>, value?: string | number): boolean {
    if(!isHeaderName(name))
      return false;

    const n = normalizeHeader(name);

    if(!this._map.has(n))
      return false;

    const curr = this._map.get(n);

    if(
      typeof value !== "number" &&
      !(typeof value === "string" && !!value.trim())
    ) return this._map.delete(n);

    const v = parseValue(value);

    if(typeof curr === "string") {
      if(curr === v)
        return this._map.delete(n);

      return false;
    }

    if(curr instanceof Set) {
      const r = curr.delete(v as string);

      if(curr.size === 0) {
        this._map.delete(n);
      }

      return r;
    }

    return false;
  }

  public setCookieHeader(): string[] {
    const e = this._map.get(normalizeHeader("set-cookie"));

    if(e instanceof Set)
      return [ ...e ];

    return [];
  }

  public keys(): readonly LooseAutocomplete<keyof CommonHttpHeaders>[] {
    return Object.freeze([ ...this._map.keys() ]);
  }

  public values(): readonly (string | string[])[] {
    return Object.freeze([ ...this._map.values() ].map(x => x instanceof Set ? [...x] : x));
  }

  public entries(): readonly [LooseAutocomplete<keyof CommonHttpHeaders>, string | string[]][] {
    const entries: any = [ ...this._map.entries() ];

    for(let i = 0; i < entries.length; i++) {
      if(entries[i][1] instanceof Set) {
        entries[i][1] = [ ...entries[i][1] ];
      }
    }

    return Object.freeze(entries);
  }

  public clear(): void {
    this._map.clear();
  }

  public concat(...sources: (
    HttpHeaders |
    Headers |
    Iterable<readonly [LooseAutocomplete<keyof CommonHttpHeaders>, string | string[] | number | undefined]>
  )[]): HttpHeaders {
    const result = new HttpHeaders(this.entries());

    for(const source of sources) {
      if(source instanceof HttpHeaders) {
        for(const [key, value] of source.entries()) {
          result.set(key, value, false);
        }
      } else if(Symbol.iterator in source && typeof source[Symbol.iterator] === "function") {
        for(const [key, value] of source) {
          result.set(key, value, false);
        }
      } else if(typeof source === "object" && !!source && isPlainObject(source)) {
        for(const key in source) {
          if(!Object.prototype.hasOwnProperty.call(source, key))
            continue;

          result.set(key, (source as any)[key], false);
        }
      }
    }

    return result;
  }

  public toJSON(): Headers {
    const dict: Headers = {};

    for(const [key, value] of this.entries()) {
      if(!value)
        continue;

      if(isHeaderName(key)) {
        dict[key] = value instanceof Set ? [ ...value ] : value;
      }
    }

    return dict;
  }

  public *[Symbol.iterator](): IterableIterator<readonly [LooseAutocomplete<keyof CommonHttpHeaders>, string | string[]]> {
    for(const e of this.entries()) {
      yield e;
    }
  }
}

export default HttpHeaders;
