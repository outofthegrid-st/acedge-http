import * as stream from "./iface";
import { Emitter } from "../@internals/events";
import {  onUnexpected } from "../@internals/errors";
import type { GenericFunction, MaybePromise } from "../_types";
import { CancellationToken, ICancellationToken } from "../@internals/cancellation";


export interface WriteableStreamOptions {

	/**
	 * The number of objects to buffer before WriteableStream#write()
	 * signals back that the buffer is full. Can be used to reduce
	 * the memory pressure when the stream is not flowing.
	 */
	highWaterMark?: number;

  /**
   * When provided, the corresponding `CancellationTokenSource`
   * can be used to cancel an asynchronous action.
   */
  token?: ICancellationToken;

  /**
   * Called when some listener didn't work as expected
   * @param err The error occured in event listener
   * @returns {void}
   */
  onListenerError?: (err: Error) => void;
}


type SPE = {
  onData: GenericFunction;
  onError: GenericFunction;
  onEnd: GenericFunction;
};

const pipeListeners = new WeakMap<WritableStream | stream.WriteableStream<any>, SPE>();


class UniversalWritableStream<T = any> implements stream.WriteableStream<T> {
  private readonly _state = {
    folowing: false,
    ended: false,
    destroyed: false,
  };

  private readonly _buffer = {
    data: [] as T[],
    error: [] as Error[],
  };

  private readonly _emitter: Emitter;
  private readonly _pendingPromises: GenericFunction[] = [];

  private readonly _pipeDestinations: Set<WritableStream | stream.WriteableStream<T>> = new Set();

  /**
	 * @param reducer a function that reduces the buffered data into a single object;
	 * 				  because some objects can be complex and non-reducible, we also
	 * 				  allow passing the explicit `null` value to skip the reduce step
	 * @param options stream options
	 */
  public constructor(
    private readonly _reducer: stream.Reducer<T> | null,
    private readonly _options?: WriteableStreamOptions // eslint-disable-line comma-dangle
  ) {
    const token = _options?.token ?? CancellationToken.None;
    
    if(token.isCancellationRequested) {
      this.pause();
      this._emitEnd();
      this.destroy();

      return;
    }

    this._emitter = new Emitter({
      leakWarningThreshold: 16,
      _profName: "UniversalWritableStream",
      onListenerError: _options?.onListenerError,
    });

    token.onCancellationRequested(() => {
      this.pause();
      this._emitEnd();
      this.destroy();
    });
  }

  public pause(): void {
    if(this._state.destroyed)
      return;

    this._state.folowing = false;
  }

  public resume(): void {
    if(this._state.destroyed)
      return;

    if(!this._state.folowing) {
      this._state.folowing = true;

      this._flowData();
      this._flowErrors();
      this._flowEnd();
    }
  }

  public write(data: T): MaybePromise<void> {
    if(this._state.destroyed)
      return;

    if(this._state.folowing) {
      this._emitData(data);
      return;
    }

    this._buffer.data.push(data);

    if(typeof this._options?.highWaterMark === "number" && this._buffer.data.length > this._options.highWaterMark)
      return new Promise(resolve => this._pendingPromises.push(resolve));
  }

  public error(err: Error): void {
    if(this._state.destroyed)
      return;

    if(this._state.folowing) {
      this._emitError(err);
      return;
    }

    this._buffer.error.push(err);
  }

  public end(result?: T): void {
    if(this._state.destroyed)
      return;

    if(typeof result !== "undefined") {
      this.write(result);
    }

    if(this._state.folowing) {
      this._emitEnd();
      this.destroy();

      return;
    }

    this._state.ended = true;
  }

  public destroy(): void {
    if(!this._state.destroyed) {
      this._state.destroyed = true;
      this._state.ended = true;

      this._buffer.data.length = 0;
      this._buffer.error.length = 0;

      this._emitter.dispose();
      this._pipeDestinations.clear();
      this._pendingPromises.length = 0;
    }
  }

  public on(event: "data", callback: (data: T) => void): void;
  public on(event: "error", callback: (err: Error) => void): void;
  public on(event: "end", callback: () => void): void;
  public on(event: "drain", callback: () => void): void;
  public on(event: "data" | "error" | "end" | "drain", callback: (arg0?: any) => void): void {
    if(this._state.destroyed)
      return;

    switch(event) {
      case "data": {
        this._emitter.on("data", ([chunk]) => {
          callback(chunk);
        });

        this.resume();
      } break;
      case "end": {
        this._emitter.on("end", callback);

        if(this._state.folowing && this._flowEnd()) {
          this.destroy();
        }
      } break;
      case "error": {
        this._emitter.on("error", ([err]) => {
          callback(err);
        });

        if(this._state.folowing) {
          this._flowErrors();
        }
      } break;
      case "drain": {
        this._emitter.on("drain", callback);
      } break;
    }
  }

  public once(event: "data", callback: (data: T) => void): void;
  public once(event: "error", callback: (err: Error) => void): void;
  public once(event: "end", callback: () => void): void;
  public once(event: "drain", callback: () => void): void;
  public once(event: "data" | "error" | "end" | "drain", callback: (arg0?: any) => void): void {
    if(this._state.destroyed)
      return;

    switch(event) {
      case "data": {
        this._emitter.on("data", ([chunk]) => {
          callback(chunk);
        });

        this.resume();
      } break;
      case "end": {
        this._emitter.on("end", callback);

        if(this._state.folowing && this._flowEnd()) {
          this.destroy();
        }
      } break;
      case "error": {
        this._emitter.on("error", ([err]) => {
          callback(err);
        });

        if(this._state.folowing) {
          this._flowErrors();
        }
      } break;
      case "drain": {
        this._emitter.once("drain", callback);
      } break;
    }
  }

  public removeListener(event: string, callback: GenericFunction): void {
    if(this._state.destroyed)
      return;

    this._emitter.off(event, callback);
  }

  public pipe<TStream extends WritableStream | stream.WriteableStream<T>>(dest: TStream): TStream {
    if(this._state.destroyed)
      return dest;

    const onData = async (data: T) => {
      try {
        if("write" in dest) {
          const shouldContinue = dest.write(data);

          if(!shouldContinue && typeof this.pause === "function") {
            const e = "once" in dest ? "once" : "on";
            
            if(e in dest) {
              dest[e]!("drain", () => this.resume());
              this.pause();
            }
          }
        } else if("getWriter" in dest) {
          await dest.getWriter().write(data);
        }
      } catch (err: any) {
        this.error(err);
      }
    };

    const onError = (err: Error) => {
      if("error" in dest) {
        dest.error?.(err);
      }

      if("destroy" in dest) {
        (dest.destroy as any)?.(err);
      }
    };

    const onEnd = () => {
      if("end" in dest) {
        dest.end?.();
      } else if("getWriter" in dest) {
        dest.getWriter().close();
      }
    };

    pipeListeners.set(dest, { onData, onError, onEnd });

    this.on("data", onData);
    this.on("error", onError);
    this.on("end", onEnd);

    return dest;
  }

  public unpipe(dest: WritableStream | stream.WriteableStream<T>): void {
    if(this._state.destroyed)
      return;

    if(!this._pipeDestinations.has(dest))
      return;

    const listeners = pipeListeners.get(dest);

    if(!listeners)
      return;

    this.removeListener("data", listeners.onData);
    this.removeListener("error", listeners.onError);
    this.removeListener("end", listeners.onEnd);

    pipeListeners.delete(dest);
    this._pipeDestinations.delete(dest);
  }

  private _flowData(): void {
    if(this._buffer.data.length === 0)
      return;

    if(typeof this._reducer === "function") {
      this._emitData(this._reducer(this._buffer.data));
    } else {
      for(let i = 0; i < this._buffer.data.length; i++) {
        this._emitData(this._buffer.data[i]);
      }
    }

    this._buffer.data.length = 0;

    const pending = [ ...this._pendingPromises ];
    const hasPending = pending.length > 0;
    this._pendingPromises.length = 0;

    pending.forEach(r => r());

    if(hasPending) {
      this._emitDrain();
    }
  }

  private _flowErrors(): void {
    if(this._emitter.listenersCount("error") > 0) {
      for(let i = 0; i < this._buffer.error.length; i++) {
        this._emitError(this._buffer.error[i]);
      }

      this._buffer.error.length = 0;
    }
  }

  private _flowEnd(): boolean {
    if(this._state.ended) {
      this._emitEnd();
      return this._emitter.listenersCount("end") > 0;
    }

    return false;
  }

  private _emitDrain(): void {
    this._emitter.fire("drain", void 0);
  }

  private _emitData(data: T): void {
    this._emitter.fire("data", data);
  }

  private _emitError(err: Error): void {
    if(this._emitter.listenersCount("error") === 0) {
      onUnexpected(err);
      return;
    }

    this._emitter.fire("error", err);
  }

  private _emitEnd(): void {
    this._emitter.fire("end", void 0);
  }
}

export default UniversalWritableStream;
