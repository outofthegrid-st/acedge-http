interface IEntry<T, R = T> {
  fulfilled: (value: T) => R;
  rejected?: (reason?: unknown) => unknown;
}


class InterceptorHandler<T, R = T> {
  private readonly _chain: IEntry<T, R>[] = [];

  public use(
    fulfilled: (value: T) => R,
    rejected?: (reason?: unknown) => unknown // eslint-disable-line comma-dangle
  ): number {
    this._chain.push({ fulfilled, rejected });
    return this._chain.length - 1;
  }

  public remove(id: number): this {
    this._chain.splice(id, 1);
    return this;
  }

  public clear(): this {
    this._chain.length = 0;
    return this;
  }

  public *[Symbol.iterator](): IterableIterator<IEntry<T,R>> {
    for(let i = 0; i < this._chain.length; i++) {
      yield this._chain[i];
    }
  }
}

export default InterceptorHandler;
