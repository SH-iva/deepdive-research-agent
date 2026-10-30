import { describe, it, expect } from "vitest";
import { parseInline } from "./parseInline";

describe("parseInline", () => {
  it("parses citation links the agent is instructed to write", () => {
    expect(parseInline("Revenue rose 12% [Reuters](https://reuters.com/a).")).toEqual([
      { type: "text", value: "Revenue rose 12% " },
      { type: "link", value: "Reuters", href: "https://reuters.com/a" },
      { type: "text", value: "." },
    ]);
  });
  it("parses bold and links together", () => {
    const t = parseInline("**Key:** see [Doc](http://x.io)");
    expect(t.map((x) => x.type)).toEqual(["bold", "text", "link"]);
  });
  it("does not turn non-http(s) schemes into links", () => {
    const t = parseInline("[click](javascript:alert(1))");
    expect(t.every((x) => x.type !== "link")).toBe(true);
  });
  it("returns plain text untouched", () => {
    expect(parseInline("no markup")).toEqual([{ type: "text", value: "no markup" }]);
  });
});
