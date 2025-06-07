// disposable.test.ts

import {
  DisposableStore,
  dispose,
  isDisposable,
  Disposable,
  toDisposable,
  disposeIfDisposable,
} from "./disposable";


describe("DisposableStore", () => {
  let store: DisposableStore;
  let mockDisposable: { dispose: jest.Mock };

  beforeEach(() => {
    store = new DisposableStore();
    mockDisposable = { dispose: jest.fn() };
  });

  test("adds and disposes disposables on dispose", () => {
    store.add(mockDisposable);
    store.dispose();

    expect(mockDisposable.dispose).toHaveBeenCalledTimes(1);
    expect(store.isDisposed).toBe(true);
  });

  test("clear disposes without marking as disposed", () => {
    store.add(mockDisposable);
    store.clear();

    expect(mockDisposable.dispose).toHaveBeenCalled();
    expect(store.isDisposed).toBe(false);
  });

  test("add after dispose warns and leaks", () => {
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    store.dispose();

    store.add(mockDisposable);

    expect(warnSpy).toHaveBeenCalled();
    expect(mockDisposable.dispose).not.toHaveBeenCalled(); // not auto-disposed
    warnSpy.mockRestore();
  });

  test("delete disposes the item", () => {
    store.add(mockDisposable);
    store.delete(mockDisposable);

    expect(mockDisposable.dispose).toHaveBeenCalled();
  });

  test("deleteAndLeak removes without disposing", () => {
    store.add(mockDisposable);
    store.deleteAndLeak(mockDisposable);

    expect(mockDisposable.dispose).not.toHaveBeenCalled();
  });

  test("adding store to itself throws", () => {
    expect(() => store.add(store)).toThrow("Cannot register a disposable on itself!");
  });

  test("deleting self from store throws", () => {
    expect(() => store.delete(store)).toThrow("Cannot dispose a disposable on itself!");
  });
});

describe("Disposable.Disposable", () => {
  class MyDisposable extends Disposable.Disposable {
    didDispose = false;
    constructor() {
      super();
    }

    override dispose() {
      this.didDispose = true;
      super.dispose();
    }
  }

  test("registers and disposes sub-disposables", () => {
    const d = new MyDisposable();
    const child = toDisposable(jest.fn());

    d["_register"](child);
    d.dispose();

    expect(d.didDispose).toBe(true);
    expect(child.dispose).toHaveBeenCalled();
  });

  test("register after dispose warns and disposes immediately", () => {
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    const d = new MyDisposable();
    const child = toDisposable(jest.fn());

    d.dispose();

    d["_register"](child); // late registration

    expect(warnSpy).toHaveBeenCalled();
    expect(child.dispose).toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});

describe("Utility Functions", () => {
  test("dispose single item", () => {
    const item = toDisposable(jest.fn());
    dispose(item);

    expect(item.dispose).toHaveBeenCalled();
  });

  test("dispose array of items", () => {
    const items = [toDisposable(jest.fn()), toDisposable(jest.fn())];
    dispose(items);

    for (const item of items) {
      expect(item.dispose).toHaveBeenCalled();
    }
  });

  test("dispose iterable", () => {
    const s = new Set([toDisposable(jest.fn()), toDisposable(jest.fn())]);
    dispose(s);

    for (const item of s) {
      expect(item.dispose).toHaveBeenCalled();
    }
  });

  test("dispose throws AggregateError on multiple errors", () => {
    const one = toDisposable(() => { throw new Error("e1"); });
    const two = toDisposable(() => { throw new Error("e2"); });

    expect(() => dispose([one, two])).toThrow(AggregateError);
  });

  test("disposeIfDisposable disposes valid ones only", () => {
    const a = toDisposable(jest.fn());
    const b = {};
    const c = toDisposable(jest.fn());

    disposeIfDisposable([a, b, c]);

    expect(a.dispose).toHaveBeenCalled();
    expect(c.dispose).toHaveBeenCalled();
  });

  test("isDisposable returns correct result", () => {
    expect(isDisposable(toDisposable(() => {}))).toBe(true);
    expect(isDisposable({})).toBe(false);
    expect(isDisposable(null)).toBe(false);
  });
});
