import { default as HeadersCollection, type HeaderValue } from "./index";


describe("HeadersCollection", () => {
  let headers: HeadersCollection;

  beforeEach(() => {
    headers = new HeadersCollection();
  });

  test("setHeader and hasHeader should add and recognize a header", () => {
    headers.setHeader("content-type", "application/json");
    expect(headers.hasHeader("content-type")).toBe(true);
  });

  test("removeHeader should remove a header", () => {
    headers.setHeader("authorization", "Bearer token");
    headers.removeHeader("authorization");

    expect(headers.hasHeader("authorization")).toBe(false);
  });

  test("deleteHeader should also remove a header", () => {
    headers.setHeader("x-custom-header", "test");
    headers.deleteHeader("x-custom-header");

    expect(headers.hasHeader("x-custom-header")).toBe(false);
  });

  test("toJSON should return object with headers", () => {
    headers.setHeader("content-type", "application/json");
    headers.setHeader("accept", "application/xml");

    const json = headers.toJSON();

    expect(json).toEqual({
      "content-type": "application/json",
      "accept": "application/xml",
    });
  });

  test("keys should return an iterator over header keys", () => {
    headers.setHeader("content-type", "application/json");
    headers.setHeader("x-header", "value");

    const keys = [...headers.keys()];

    expect(keys).toContain("content-type");
    expect(keys).toContain("x-header");
  });

  test("entries should return correct key-value pairs", () => {
    headers.setHeader("accept", "application/json");
    const entries = [...headers.entries()];

    expect(entries).toContainEqual(["accept", "application/json"]);
  });

  test("should support iteration using for...of", () => {
    headers.setHeader("x-token", "abc123");
    const result: [string, HeaderValue][] = [];

    for(const entry of headers) {
      result.push(entry as any);
    }

    expect(result).toContainEqual(["x-token", "abc123"]);
  });

  test("constructor accepts initial object of headers", () => {
    const initial = {
      "x-init": "start",
      "content-type": "text/plain",
    };

    const h = new HeadersCollection(initial);

    expect(h.hasHeader("x-init")).toBe(true);
    expect(h.hasHeader("content-type")).toBe(true);
  });
});
