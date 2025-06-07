import Exception from "./exception";
import { immediate } from "../util";

export { default as Exception } from "./exception";


export function onUnexpected(err: unknown): void {
  immediate(() => {
    if(err instanceof Exception) {
      // TODO: log error
      throw new Error(`[${err.getErrorCode()}] ${err.message}\n\n${err.stack}`);
    }

    throw err;
  });
}
