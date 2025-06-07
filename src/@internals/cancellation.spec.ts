import { CancellationTokenSource, CancellationToken, isCancellationToken } from "./cancellation";


describe("CancellationTokenSource", () => {
  test("should not be cancelled initially", () => {
    const source = new CancellationTokenSource();
    expect(source.token.isCancellationRequested).toBe(false);
  });

  test("should cancel the token", () => {
    const source = new CancellationTokenSource();
    let wasCalled = false;

    source.token.onCancellationRequested(() => {
      wasCalled = true;
    });

    source.cancel();
    expect(source.token.isCancellationRequested).toBe(true);
    expect(wasCalled).toBe(true);
  });

  test("should notify listener immediately if registered after cancellation", (done) => {
    const source = new CancellationTokenSource();
    source.cancel();

    // Listener should be called async
    source.token.onCancellationRequested(() => {
      done();
    });
  });

  test("should support listener removal", () => {
    const source = new CancellationTokenSource();
    const mockFn = jest.fn();

    const disposable = source.token.onCancellationRequested(mockFn);
    disposable.dispose();
    source.cancel();

    expect(mockFn).not.toHaveBeenCalled();
  });

  test("should dispose resources correctly", () => {
    const source = new CancellationTokenSource();
    const mockFn = jest.fn();

    source.token.onCancellationRequested(mockFn);
    source.dispose(true); // dispose with cancel

    expect(source.token.isCancellationRequested).toBe(true);
    expect(mockFn).toHaveBeenCalled();
  });

  test("should support parent token cancellation", () => {
    const parent = new CancellationTokenSource();
    const child = new CancellationTokenSource(parent.token);

    const mockFn = jest.fn();
    child.token.onCancellationRequested(mockFn);

    parent.cancel();

    expect(child.token.isCancellationRequested).toBe(true);
    expect(mockFn).toHaveBeenCalled();
  });

  test("should correctly identify a valid cancellation token", () => {
    const source = new CancellationTokenSource();
    expect(isCancellationToken(source.token)).toBe(true);
  });

  test("should return Cancelled token if cancel is called before token is accessed", () => {
    const source = new CancellationTokenSource();
    source.cancel();

    expect(source.token.isCancellationRequested).toBe(true);
  });

  test("should return None token if dispose is called before token is accessed", () => {
    const source = new CancellationTokenSource();
    source.dispose();

    expect(source.token.isCancellationRequested).toBe(false);
    expect(source.token).toBe(CancellationToken.None);
  });
});
