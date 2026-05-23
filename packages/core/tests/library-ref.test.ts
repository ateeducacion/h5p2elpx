import { describe, it, expect } from "vitest";
import { parseLibraryRef, libraryRefString, machineNameOnly } from "../src/h5p/library-ref.ts";

describe("library-ref", () => {
  it("parses `Name maj.min`", () => {
    expect(parseLibraryRef("H5P.CoursePresentation 1.26")).toEqual({
      machineName: "H5P.CoursePresentation",
      majorVersion: 1,
      minorVersion: 26
    });
  });

  it("parses `Name-maj.min.patch`", () => {
    const r = parseLibraryRef("H5P.MultiChoice-1.16.2");
    expect(r.machineName).toBe("H5P.MultiChoice");
    expect(r.majorVersion).toBe(1);
    expect(r.minorVersion).toBe(16);
    expect(r.patchVersion).toBe(2);
  });

  it("falls back gracefully when no version", () => {
    expect(parseLibraryRef("H5P.Text")).toEqual({ machineName: "H5P.Text" });
  });

  it("roundtrips via libraryRefString", () => {
    const ref = parseLibraryRef("H5P.TrueFalse 1.8");
    expect(libraryRefString(ref)).toBe("H5P.TrueFalse 1.8");
  });

  it("normalises versioned name down to machine only", () => {
    expect(machineNameOnly("H5P.MultiChoice 1.16")).toBe("H5P.MultiChoice");
  });
});
