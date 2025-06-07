import { Exception } from "./errors";
import { Event, Emitter } from "./events";
import { DisposableStore } from "./disposable";


type TestEvents = {
  "test": [string];
  "data": [number];
};


describe("@events.Event", () => {
  test("calls the listener with arguments and token", () => {
    const listener = jest.fn();
    const event = new Event(listener);

    event.$call("payload");

    expect(listener).toHaveBeenCalledWith("payload", expect.any(Object));
  });

  test("binds thisArg correctly", () => {
    const context = { value: 123 };
    const listener = jest.fn(function (this: any, _: any) {
      expect(this).toBe(context);
    });

    const event = new Event(listener, { thisArg: context });
    event.$call("test");
  });

  test("throws if called after being disposed", () => {
    const event = new Event(() => {});
    event.dispose();

    expect(() => event.$call("test")).toThrow("disposed");
  });

  test("throws when once event is called more than once", () => {
    const listener = jest.fn();
    const event = new Event(listener, { once: true });

    event.$call("first");
    expect(() => event.$call("second")).toThrow(/once/i);
  });

  test("returns trimmed name or null", () => {
    const named = new Event(() => {}, { name: "  MyEvent " });
    const unnamed = new Event(() => {});

    expect(named.name).toBe("MyEvent");
    expect(unnamed.name).toBeNull();
  });

  test("is cancelable by default", () => {
    const event = new Event(() => {});
    expect(event.cancelable()).toBe(true);
  });

  test("cancels and resets token if not once", () => {
    const event = new Event(() => {});

    event.cancel();
    expect(event.isCancellationRequested()).toBe(true);
  });

  test("does not reset token after cancel if once and already called", () => {
    const event = new Event(() => {}, { once: true });

    event.$call("first");
    const tokenBefore = event["_source"]?.token;

    event.cancel();

    const tokenAfter = event["_source"]?.token;
    expect(tokenBefore).toBe(tokenAfter);
  });

  test("registers with DisposableStore", () => {
    const store = new DisposableStore();
    const event = new Event(() => {}, { disposables: store });
      
    event.dispose();
    expect(store.isDisposed).toBe(true);
  });

  test("disposes CancellationTokenSource on dispose", () => {
    const event = new Event(() => {});
    const source = event["_source"];

    const disposeSpy = jest.spyOn(source!, "dispose");
    event.dispose();

    expect(disposeSpy).toHaveBeenCalled();
  });
});

describe("@events.Emitter", () => {
  let emitter: Emitter<TestEvents>;

  beforeEach(() => {
    emitter = new Emitter<TestEvents>();
  });

  afterEach(() => {
    emitter.dispose();
  });

  test("should register and fire an event", () => {
    const fn = jest.fn();
    emitter.on("test", (msg: any) => {
      fn(msg);
    });

    emitter.fire("test", "hello");
    expect(fn).toHaveBeenCalledWith(["hello"]);
  });

  test("should support multiple events and listeners", () => {
    const mock1 = jest.fn();
    const mock2 = jest.fn();

    emitter.on("test", (msg: any) => mock1(msg));
    emitter.on("data", (num: any) => mock2(num));

    emitter.fire("test", "abc");
    emitter.fire("data", 123);

    expect(mock1).toHaveBeenCalledWith(["abc"]);
    expect(mock2).toHaveBeenCalledWith([123]);
  });

  test("should handle once listeners", () => {
    const fn = jest.fn();
    emitter.once("test", (msg: any) => fn(msg));

    emitter.fire("test", "first");
    emitter.fire("test", "second");

    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith(["first"]);
  });

  test("should remove listener manually", () => {
    const fn = jest.fn();
    const disposable = emitter.on("test", (msg: any) => fn(msg));

    emitter.fire("test", "before-remove");
    disposable.dispose();
    emitter.fire("test", "after-remove");

    expect(fn).toHaveBeenCalledTimes(1);
  });

  test("should clear all listeners", () => {
    const fn1 = jest.fn();
    const fn2 = jest.fn();

    emitter.on("test", fn1);
    emitter.on("test", fn2);

    emitter.clear("test");
    emitter.fire("test", "cleared");

    expect(fn1).not.toHaveBeenCalled();
    expect(fn2).not.toHaveBeenCalled();
  });

  test("should cancel cancelable event", () => {
    const fn = jest.fn((_, token) => {
      if (!token.isCancellationRequested) {
        fn(null, void 0);
      }
    });

    const cancelableEvent = new Event(fn, { cancelable: true });
    cancelableEvent.cancel();
    expect(cancelableEvent.isCancellationRequested()).toBe(true);
    expect(cancelableEvent.cancelable()).toBe(false);
  });

  test("should dispose an event", () => {
    const fn = jest.fn();
    const evt = new Event(fn);
    evt.dispose();

    expect(() => evt.$call("test" as any)).toThrow(/disposed/);
  });

  test("should respect thisArg binding", () => {
    const context = {
      value: 42,
      fn(this: any, _: string) {
        return this.value;
      },
    };

    const event = new Event(context.fn, { thisArg: context });
    expect(event.$call("ignored")).toBe(42);
  });

  test("should not fire events after disposal", () => {
    const fn = jest.fn();
    emitter.on("test", fn);

    emitter.dispose();
    emitter.fire("test", "message");

    expect(fn).not.toHaveBeenCalled();
  });

  test("should track listener count correctly", () => {
    const d1 = emitter.on("test", () => {});
    const d2 = emitter.on("test", () => {});
    expect(emitter.listenersCount("test")).toBe(2);

    d1.dispose();
    expect(emitter.listenersCount("test")).toBe(1);

    d2.dispose();
    expect(emitter.listenersCount("test")).toBe(0);
  });

  test("should return correct hasListeners result", () => {
    expect(emitter.hasListeners()).toBe(false);

    emitter.on("test", () => {});
    expect(emitter.hasListeners()).toBe(true);
    expect(emitter.hasListeners("test")).toBe(true);
  });

  test("should support Event as listener", () => {
    const mock = jest.fn();
    const event = new Event((msg: string) => mock(msg));
    emitter.on("test", event as any);

    emitter.fire("test", "hello");
    expect(mock).toHaveBeenCalledWith(["hello"]);
  });

  test("should throw for invalid event keys", () => {
    expect(() => emitter.on(123 as unknown as any, () => {})).toThrow(Exception);
  });
});
