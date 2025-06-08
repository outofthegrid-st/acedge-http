import * as stream from "../streams";
import HttpHeaders from "../headers";
import type { CommonHttpHeaders, Headers, HttpMethod, LooseAutocomplete } from "../_types";


export type RequestCredentials = "include" | "omit" | "same-origin";
export type RequestRedirect = "error" | "follow" | "manual";


export interface InferredRequestUpdateObject {
  method?: HttpMethod;
  redirect?: RequestRedirect;
  credentials?: RequestCredentials;
}

export interface RequestOptions {
  timeout?: number;
  method?: HttpMethod;
  headers?: HttpHeaders | Headers;
}


export interface IRequest {
  readonly url: URL;
  readonly method: HttpMethod;
  readonly timeout?: number;
  readonly headers: HttpHeaders;
  readonly redirect: RequestRedirect;
  readonly credentials: RequestCredentials;
  readonly body: stream.ReadableStream<Uint8Array>;

  setHeader<K extends keyof CommonHttpHeaders>(
    name: LooseAutocomplete<K>,
    value: string | string[] | number | undefined
  ): void;

  hasHeader(name: LooseAutocomplete<keyof CommonHttpHeaders>): boolean;
  removeHeader(name: LooseAutocomplete<keyof CommonHttpHeaders>, value?: string | number): void;

  update(o: InferredRequestUpdateObject): void;
}
