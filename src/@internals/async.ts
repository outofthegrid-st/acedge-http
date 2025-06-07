import { Exception } from "./errors";
import { isDisposable } from "./disposable";
import { CancellationTokenSource, ICancellationToken } from "./cancellation";


export interface CancelablePromise<T> extends Promise<T> {
  cancel(): void;
}


export function createCancelablePromise<T>(callback: (token: ICancellationToken) => Promise<T>): CancelablePromise<T> {
  const source = new CancellationTokenSource();

  const thenable = callback(source.token);
  let isCancelled = false;

  const promise = new Promise<T>((resolve, reject) => {
    const sub = source.token.onCancellationRequested(() => {
      isCancelled = true;
      sub.dispose();

      reject(new Exception("Asynchronous operation was cancelled", "ERR_TOKEN_CANCELLED"));
    });

    Promise.resolve(thenable)
      .then(value => {
        sub.dispose();
        source.dispose();

        if(!isCancelled)
          return resolve(value);

        if(isDisposable(value)) {
          value.dispose();
        }
      }, err => {
        sub.dispose();
        source.dispose();

        reject(err);
      });
  });

  return <CancelablePromise<T>>new class {
    public cancel(): void {
      source.cancel();
      source.dispose();
    }

    public then<TR1 = T, TR2 = never>(
      resolve?: ((value: T) => TR1 | Promise<TR1>) | undefined | null,
      reject?: ((reason: unknown) => TR2 | Promise<TR2>) | undefined | null // eslint-disable-line comma-dangle
    ): Promise<TR1 | TR2> {
      return promise.then(resolve, reject);
    }

    public catch<TR = never>(
      reject?: ((reason: unknown) => TR | Promise<TR>) | undefined | null // eslint-disable-line comma-dangle 
    ): Promise<T | TR> {
      return this.then(void 0, reject);
    }

    public finally(onfinally?: (() => void) | undefined | null): Promise<T> {
      return promise.finally(onfinally);
    }
  };
}
