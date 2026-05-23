import { describe, it, expect } from "vitest";
import { wrapCdata, escapeCdataInner } from "../src/exe/cdata.ts";

describe("wrapCdata", () => {
  it("wraps plain text", () => {
    expect(wrapCdata("hello")).toBe("<![CDATA[hello]]>");
  });

  it("splits embedded `]]>`", () => {
    const out = wrapCdata("a]]>b");
    expect(out).toBe("<![CDATA[a]]]]><![CDATA[>b]]>");
    expect(out.includes("]]>b")).toBe(false);
  });

  it("handles multiple embedded terminators", () => {
    const out = wrapCdata("]]>]]>");
    expect(out.match(/<!\[CDATA\[/g)!.length).toBeGreaterThan(1);
  });

  it("handles empty and undefined input", () => {
    expect(wrapCdata("")).toBe("<![CDATA[]]>");
    // @ts-expect-error testing runtime nullish path
    expect(wrapCdata(undefined)).toBe("<![CDATA[]]>");
  });

  it("escapeCdataInner mirrors splitting without wrapper", () => {
    expect(escapeCdataInner("x]]>y")).toBe("x]]]]><![CDATA[>y");
  });
});
