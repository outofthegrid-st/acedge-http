import { Exception } from "./errors";
import { ERROR_CODE } from "./errors/exception";
import { EventMonitoring } from "./events";


describe("EventMonitoring.LeakageMonitor", () => {
  let mockErrorHandler: jest.Mock;
  let monitor: EventMonitoring.LeakageMonitor;

  beforeEach(() => {
    mockErrorHandler = jest.fn();
    monitor = new EventMonitoring.LeakageMonitor(mockErrorHandler, 3, "testLeakMonitor");
  });

  test("should not warn below threshold", () => {
    const stack = { value: "stack_trace_1" } as any;

    for(let i = 0; i < 2; i++) {
      const remove = monitor.check(stack, i);
      expect(remove).toBeNull();
    }

    expect(mockErrorHandler).not.toHaveBeenCalled();
  });

  test("should warn on exceeding threshold", () => {
    const stack = { value: "stack_trace_warn" } as any;

    // Simulate exceeding threshold
    for(let i = 0; i < 6; i++) {
      monitor.check(stack, 4);
    }

    expect(mockErrorHandler).toHaveBeenCalled();

    const call = mockErrorHandler.mock.calls[0][0];

    expect(call).toBeInstanceOf(Exception);
    expect(call.code).toBe(-ERROR_CODE.ERR_LISTENER_LEAK);
    expect((call as Exception).getErrorCode()).toBe("ERR_LISTENER_LEAK");
  });

  test("should call cleanup function returned by check", () => {
    const stack = { value: "unique_stack_trace" } as any;
    const cleanup = monitor.check(stack, 4);

    expect(typeof cleanup).toBe("function");

    // simulate removal
    cleanup?.();

    const [trace, count] = monitor.getMostFrequentStack()!;

    expect(trace).toBe("unique_stack_trace");
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test("getMostFrequentStack should return null with no stacks", () => {
    const emptyMonitor = new EventMonitoring.LeakageMonitor(mockErrorHandler, 2);
    expect(emptyMonitor.getMostFrequentStack()).toBeNull();
  });

  test("dispose clears internal state", () => {
    const stack = { value: "some_stack_trace" } as any;
    
    monitor.check(stack, 4);
    monitor.dispose();

    expect(monitor.getMostFrequentStack()).toBeNull();
  });
});

describe("EventMonitoring.Profiling", () => {
  test("should track durations and invocations correctly", async () => {
    const profiling = new EventMonitoring.Profiling("test-profile");

    expect(profiling.invocationCount).toBe(0);
    expect(profiling.elapsedOverall).toBe(0);

    profiling.start(2);

    // Wait a bit to simulate elapsed time
    await new Promise((r) => setTimeout(r, 10));
    profiling.stop();

    expect(profiling.invocationCount).toBe(1);
    expect(profiling.durations.length).toBe(1);
    expect(profiling.elapsedOverall).toBeGreaterThan(0);
  });

  test("should not update if stop is called without start", () => {
    const profiling = new EventMonitoring.Profiling("no-start");

    profiling.stop(); // should not crash or update anything

    expect(profiling.invocationCount).toBe(0);
    expect(profiling.elapsedOverall).toBe(0);
    expect(profiling.durations.length).toBe(0);
  });

  test("should keep track of multiple profiling instances", () => {
    const one = new EventMonitoring.Profiling("first");
    const two = new EventMonitoring.Profiling("second");

    expect(EventMonitoring.Profiling.all.has(one)).toBe(true);
    expect(EventMonitoring.Profiling.all.has(two)).toBe(true);
  });
});
