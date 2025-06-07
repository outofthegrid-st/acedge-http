import type { Dict, MaybeArray } from "../_types";
import { isPlainObject } from "../@internals/util";


export type HeaderValue = string | string[] | undefined;


export function normalizeHeader(name: string): string {
  return name.trim().toLowerCase();
}

export function normalizeValue(value: MaybeArray<HeaderValue | number>): MaybeArray<string> {
  return (Array.isArray(value) ? value.map(normalizeValue) : String(value)) as MaybeArray<string>;
}


abstract class HeadersSet {
  private _state: number;
  private readonly _map: Map<string, HeaderValue>;

  public constructor(iter?: Dict<HeaderValue | number>);
  public constructor(iter?: Iterable<readonly [string, HeaderValue | number]>);
  public constructor(iter?: Iterable<readonly [string, HeaderValue | number]> | Dict<HeaderValue | number>) {
    this._state = 0;
    this._map = new Map();

    if(typeof iter === "object" && !!iter && typeof (iter as any)[Symbol.iterator] === "function") {
      for(const [k, v] of (iter as Iterable<[string, HeaderValue]>)) {
        this._setHeaer(k, v);
      }
    } else if(typeof iter === "object" && isPlainObject(iter)) {
      for(const [k, v] of Object.entries(iter)) {
        this._setHeaer(k, v);
      }
    }
  }

  public get size(): number {
    return this._map.size;
  }

  public get count(): number {
    let r: number = 0;

    for(const v of this._map.values()) {
      if(Array.isArray(v)) {
        r += v.length;
      } else {
        r++;
      }
    }

    return r;
  }

  protected _setHeaer(name: string, value: HeaderValue): this {
    name = normalizeHeader(name);
    value = normalizeValue(value);

    if(!this._map.has(name)) {
      this._map.set(name, normalizeValue(value));
      return this;
    }

    const existing = this._map.get(name)!;

    if(Array.isArray(existing)) {
      const va = Array.isArray(value) ? value : [value];
      existing.push(...va);
    } else {
      const va = Array.isArray(value) ? value : [value];
      this._map.set(name, [existing, ...va]);
    }

    return this;
  }

  protected _removeHeader(name: string, whereValue?: HeaderValue): this {
    name = normalizeHeader(name);

    if(!this._map.has(name))    
      return this;

    if(typeof whereValue === "undefined" || whereValue == null) {
      this._map.delete(name);
      return this;
    }

    const c = this._map.get(name)!;
    const nr = normalizeValue(whereValue);

    if(Array.isArray(c)) {
      const vr = Array.isArray(nr) ?
        new Set(nr) :
        new Set([nr]);

      const f = c.filter(v => !vr.has(v));

      if(f.length === 0) {
        this._map.delete(name);
        this._state++;
      } else {
        this._map.set(name, f.length === 1 ? f[0] : f);
      }
    } else {
      if(
        (Array.isArray(nr) && nr.includes(c)) ||
        c === nr
      ) {
        this._map.delete(name);
      }
    }

    return this;
  }

  protected _deleteHeader(name: string): this {
    this._map.delete(normalizeHeader(name));
    return this;
  }

  protected _hasHeader(name: string): boolean {
    return this._map.has(normalizeHeader(name));
  }

  public clear(): this {
    this._map.clear();
    this._state++;

    return this;
  }
  
  protected _keys(): IterableIterator<string> {
    return this._map.keys();
  }

  public values(): IterableIterator<HeaderValue> {
    return this._map.values();
  }

  protected _entries(): IterableIterator<readonly [string, HeaderValue]> {
    return this._map.entries();
  }

  protected _removeDuplicates(key?: string): void {
    let ic = false;

    if(!key || !this._map.has(normalizeHeader(key))) {
      for(const k of this._map.keys()) {
        const c = this._map.get(k)!;

        if(!Array.isArray(c))
          continue;

        const s = new Set(c);

        if(s.size !== c.length) {
          ic = true;
          this._map.set(k, [...s.values()]);
        }
      }
    } else {
      const c = this._map.get(normalizeHeader(key))!;

      if(Array.isArray(c)) {
        const s = new Set(c);

        if(s.size !== c.length) {
          ic = true;
          this._map.set(name, [...s.values()]);
        }
      }
    }

    if(ic) {
      this._state++;
    }
  }
}

export default HeadersSet;
