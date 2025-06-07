import HeadersSet, { HeaderValue } from "./headers-set";
import type { CommonHttpHeaders, Dict, LooseAutocomplete } from "../_types";


export { type HeaderValue, normalizeHeader, normalizeValue } from "./headers-set";


type V<K> = K extends keyof CommonHttpHeaders ?
  CommonHttpHeaders[K] :
  HeaderValue;

class HeadersCollection extends HeadersSet {
  public constructor(iter?: CommonHttpHeaders & Dict<HeaderValue>);
  public constructor(iter?: Iterable<readonly [LooseAutocomplete<keyof CommonHttpHeaders>, HeaderValue]>);
  public constructor(iter?: any) {
    super(iter);
  }

  public setHeader<K extends keyof CommonHttpHeaders>(
    name: LooseAutocomplete<K>,
    value: V<typeof name> // eslint-disable-line comma-dangle
  ): this {
    return super._setHeaer(name as string, value as HeaderValue);
  }

  public removeHeader<K extends keyof CommonHttpHeaders>(
    name: LooseAutocomplete<K>,
    value?: V<typeof name> // eslint-disable-line comma-dangle
  ): this {
    return super._removeHeader(name as string, value as HeaderValue);
  }

  public deleteHeader(name: LooseAutocomplete<keyof CommonHttpHeaders>): this {
    return super._deleteHeader(name as string);
  }

  public hasHeader(name: LooseAutocomplete<keyof CommonHttpHeaders>): boolean {
    return super._hasHeader(name as string);
  }

  public keys(): IterableIterator<LooseAutocomplete<keyof CommonHttpHeaders>> {
    return super._keys();
  }

  public entries(): IterableIterator<readonly [LooseAutocomplete<keyof CommonHttpHeaders>, HeaderValue]> {
    return super._entries();
  }

  public toJSON<T extends Dict<HeaderValue> = CommonHttpHeaders & Dict<HeaderValue>>(): T {
    this._removeDuplicates();
    return Object.fromEntries(super._entries()) as any;
  }

  public [Symbol.iterator]() {
    return this.entries();
  }
}

export default HeadersCollection;
