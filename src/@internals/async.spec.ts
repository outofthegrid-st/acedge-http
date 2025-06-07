// cancelable-promise.test.ts

import { Exception } from "./errors";
import { toDisposable } from "./disposable";
import { createCancelablePromise } from "./async";
import { CancellationTokenSource } from "./cancellation";
import { ERROR_CODE } from "./errors/exception";


jest.useFakeTimers();


describe("createCancelablePromise", () => {
  test("resolves successfully if not cancelled", async () => {
    const p = createCancelablePromise(async () => {
      await new Promise(resolve => setTimeout(resolve, 50));
      return 42;
    });

    jest.advanceTimersByTime(50);

    await expect(p).resolves.toBe(42);
  });

  test("rejects with Exception when cancelled", async () => {
    const p = createCancelablePromise(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
      return 99;
    });

    p.cancel();

    await expect(p).rejects.toThrow(Exception);
    await expect(p).rejects.toMatchObject({
      code: -ERROR_CODE.ERR_TOKEN_CANCELLED,
    });
  });

  test("cancels and disposes disposable result if returned after cancellation", async () => {
    const disposeFn = jest.fn();

    const p = createCancelablePromise(async () => {
      await new Promise(resolve => setTimeout(resolve, 30));
      return toDisposable(disposeFn);
    });

    p.cancel();

    jest.advanceTimersByTime(50);

    await expect(p).rejects.toBeInstanceOf(Exception);
    expect(disposeFn).toHaveBeenCalled();
  });

  test("rejects when promise callback throws", async () => {
    const err = new Error("fail");

    const p = createCancelablePromise(async () => {
      throw err;
    });

    await expect(p).rejects.toBe(err);
  });

  test("handles cancellation after resolution silently", async () => {
    const p = createCancelablePromise(async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
      return "done";
    });

    jest.advanceTimersByTime(10);

    const result = await p;
    expect(result).toBe("done");

    expect(() => p.cancel()).not.toThrow();
  });

  test("supports finally", async () => {
    const finallyFn = jest.fn();

    const p = createCancelablePromise(async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
      return "ok";
    });

    const wrapped = p.finally(finallyFn);

    jest.advanceTimersByTime(10);

    await expect(wrapped).resolves.toBe("ok");
    expect(finallyFn).toHaveBeenCalled();
  });

  test("cancel disposes CancellationTokenSource", async () => {
    const spy = jest.spyOn(CancellationTokenSource.prototype, "dispose");
    
    const p = createCancelablePromise(async () => {
      await new Promise(resolve => setTimeout(resolve, 20));
      return "should cancel";
    });

    p.cancel();

    jest.advanceTimersByTime(30);

    try {
      await p;
      // eslint-disable-next-line no-empty
    } catch {}

    expect(spy).toHaveBeenCalled();

    spy.mockRestore();
  });
});
