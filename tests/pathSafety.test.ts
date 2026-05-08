import { describe, expect, it } from "vitest";
import { assertSafeRelativeGitPath, resolveInsideRepo } from "../electron/utils/pathSafety";

describe("pathSafety", () => {
  it("allows normal repository-relative paths", () => {
    expect(assertSafeRelativeGitPath("src/App.tsx")).toBe("src/App.tsx");
  });

  it("rejects traversal and absolute paths", () => {
    expect(() => assertSafeRelativeGitPath("../secret")).toThrow();
    expect(() => assertSafeRelativeGitPath("/tmp/secret")).toThrow();
  });

  it("resolves paths inside the repo root", () => {
    expect(resolveInsideRepo("/repo", "src/index.ts")).toBe("/repo/src/index.ts");
  });
});
